// =============================================================
// scraper_saatchi.js — Saatchi Art Painting Scraper
// =============================================================
// Usage: node scraper_saatchi.js --limit 25
//
// Called programmatically by server.js via child_process.spawn.
// Writes results to scraper_output/saatchi_staging.json.
// Progress is written to scraper_output/saatchi_progress.json
// so the server can poll and report status to the UI.
// =============================================================

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── CLI argument parsing ──────────────────────────────────────
const args  = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
if (limitIndex === -1 || args[limitIndex + 1] === undefined) {
    console.error('ERROR: --limit N is required. Example: node scraper_saatchi.js --limit 25 --skip 0');
    process.exit(1);
}
const LIMIT = parseInt(args[limitIndex + 1], 10);
if (isNaN(LIMIT) || LIMIT < 1) {
    console.error('ERROR: --limit must be a positive integer.');
    process.exit(1);
}

const skipIndex = args.indexOf('--skip');
const SKIP = (skipIndex !== -1 && args[skipIndex + 1] !== undefined)
    ? parseInt(args[skipIndex + 1], 10)
    : 0;
if (isNaN(SKIP) || SKIP < 0) {
    console.error('ERROR: --skip must be a non-negative integer.');
    process.exit(1);
}

// ── Paths ─────────────────────────────────────────────────────
const OUTPUT_DIR      = path.join(__dirname, 'scraper_output');
const STAGING_PATH    = path.join(OUTPUT_DIR, 'saatchi_staging.json');
const PROGRESS_PATH   = path.join(OUTPUT_DIR, 'saatchi_progress.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Progress helpers ──────────────────────────────────────────
function writeProgress(status, current, total, message, results) {
    const payload = { status, current, total, message };
    if (results !== undefined) payload.results = results;
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(payload, null, 2));
}

// ── HTTP fetch (returns string) ───────────────────────────────
function fetchUrl(url, retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = (remaining) => {
            const req = https.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const location = res.headers.location;
                    if (location) return fetchUrl(location, remaining).then(resolve).catch(reject);
                    return reject(new Error(`Redirect with no location header: ${url}`));
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                }
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve(body));
            });
            req.on('error', (err) => {
                if (remaining > 1) {
                    console.warn(`Retrying ${url} — ${err.message}`);
                    setTimeout(() => attempt(remaining - 1), 2000);
                } else {
                    reject(err);
                }
            });
            req.setTimeout(15000, () => {
                req.destroy();
                if (remaining > 1) {
                    console.warn(`Timeout on ${url}, retrying...`);
                    setTimeout(() => attempt(remaining - 1), 2000);
                } else {
                    reject(new Error(`Timeout fetching ${url}`));
                }
            });
        };
        attempt(retries);
    });
}

// ── Delay helper ──────────────────────────────────────────────
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── API base URL (same server that spawned this process) ──────
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';

// ── Fetch existing artist names from the database ─────────────
// Returns a Set of normalized artist names (lowercase, trimmed).
// If the fetch fails for any reason, returns an empty Set so the
// scraper continues normally rather than aborting.
async function fetchExistingArtists() {
    return new Promise((resolve) => {
        const url = `${API_BASE_URL}/api/records`;
        const isHttps = url.startsWith('https://');
        const transport = isHttps ? https : require('http');
        const req = transport.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const records = JSON.parse(body);
                    const names = new Set(
                        records
                            .map(r => (r.artistName || '').trim().toLowerCase())
                            .filter(n => n.length > 0)
                    );
                    console.log(`Loaded ${names.size} existing artist names from database.`);
                    resolve(names);
                } catch {
                    console.warn('Could not parse existing artists response — proceeding without artist filter.');
                    resolve(new Set());
                }
            });
        });
        req.on('error', (err) => {
            console.warn(`Could not fetch existing artists (${err.message}) — proceeding without artist filter.`);
            resolve(new Set());
        });
        req.setTimeout(15000, () => {
            req.destroy();
            console.warn('Timeout fetching existing artists — proceeding without artist filter.');
            resolve(new Set());
        });
    });
}

// ── Parse artwork URLs from a sitemap XML string ──────────────
// Filters to Painting- URLs only.
function parseArtworkUrlsFromSitemap(xml) {
    const entries = [];
    // Split on <url> blocks and parse each one
    const urlBlocks = xml.split(/<url>/i).slice(1); // first element is before any <url>
    for (const block of urlBlocks) {
        const locMatch = block.match(/<loc>[\s]*(?:<!\[CDATA\[)?(https:\/\/www\.saatchiart\.com\/art\/Painting-[^\]<\s]+)(?:\]\]>)?[\s]*<\/loc>/i);
        if (!locMatch) continue;
        const url = locMatch[1].trim();
        const lastmodMatch = block.match(/<lastmod>([\d-]+)<\/lastmod>/i);
        const lastmod = lastmodMatch ? lastmodMatch[1].trim() : null;
        entries.push({ url, lastmod });
    }
    return entries;
}

// ── Extract field from __NEXT_DATA__ JSON ─────────────────────
function extractNextData(html) {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

// ── Parse a text value from HTML by label ─────────────────────
// Looks for a label like "Height:" followed by a value.
function extractByLabel(html, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped + '[\\s\\S]*?<[^>]+>([^<]+)<', 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : null;
}

// ── Strip HTML tags ───────────────────────────────────────────
function stripHtml(str) {
    return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Detect foreign-language bio ───────────────────────────────
// Returns true if the bio contains a significant proportion of
// non-Latin characters (Cyrillic, Arabic, CJK, Hebrew, Devanagari,
// Thai, Greek, etc.). Threshold: >15% of all letters are non-Latin.
// A null or empty bio is also considered non-English.
function isForeignLanguageBio(bio) {
    if (!bio || bio.trim().length === 0) return true;
    const letters = bio.match(/\p{L}/gu);
    if (!letters || letters.length === 0) return true;
    const nonLatin = letters.filter(ch => !/\p{Script=Latin}/u.test(ch));
    return (nonLatin.length / letters.length) > 0.15;
}

// ── Detect Saatchi footer/navigation content masquerading as bio ─
// When scrapeArtistProfile captures page footer instead of bio text,
// the result contains repeated Saatchi site navigation phrases.
// Returns true if the text looks like footer junk rather than a bio.
function isFooterContent(bio) {
    if (!bio) return false;
    const lower = bio.toLowerCase();
    // Footer junk contains multiple Saatchi navigation markers
    const footerMarkers = [
        'saatchi art',
        'buy art online',
        'sell your art',
        'art advisory',
        'gift cards',
        'ship to',
        'currency:',
        'follow us',
        'newsletter',
        'terms of use',
        'privacy policy',
        'accessibility'
    ];
    const markerCount = footerMarkers.filter(m => lower.includes(m)).length;
    return markerCount >= 3;
}

// ── Check bio for career credential signals ───────────────────
// Returns true if the bio contains at least one keyword indicating
// the artist has exhibition, education, or award credentials.
// Bios with no credential signals almost always produce CLI=1.
function hasCareerCredentials(bio) {
    if (!bio) return false;
    const lower = bio.toLowerCase();
    const credentialKeywords = [
        'exhibition', 'exhibited', 'gallery', 'galleries',
        'museum', 'award', 'prize', 'residency', 'resident',
        'degree', 'university', 'college', 'academy', 'school of',
        'studied', 'graduated', 'mfa', 'bfa', 'collection',
        'commissioned', 'commission', 'publication', 'published',
        'solo show', 'group show', 'art fair', 'biennial',
        'fellowship', 'grant', 'scholarship', 'juried'
    ];
    return credentialKeywords.some(kw => lower.includes(kw));
}

// ── Map Saatchi medium text to our finite list ────────────────
const MEDIUM_MAP = [
    { pattern: /oil\s+over\s+acrylic/i,           value: 'Oil over Acrylic' },
    { pattern: /oil/i,                             value: 'Oil'              },
    { pattern: /acrylic/i,                         value: 'Acrylic'          },
    { pattern: /watercolou?r/i,                    value: 'Watercolor'       },
    { pattern: /pastel/i,                          value: 'Pastel'           },
    { pattern: /gouache/i,                         value: 'Gouache'          },
    { pattern: /pen|ink/i,                         value: 'Pen & Ink'        },
];

function mapMedium(raw) {
    if (!raw) return 'Missing';
    for (const entry of MEDIUM_MAP) {
        if (entry.pattern.test(raw)) return entry.value;
    }
    return 'Mixed';
}

// ── Parse dimensions from a string like "12 W x 16 H x 1 D in" ──
function parseDimensions(raw) {
    if (!raw) return { height: 'Missing', width: 'Missing', depth: 'Missing' };
    const w = raw.match(/(\d+(?:\.\d+)?)\s*W/i);
    const h = raw.match(/(\d+(?:\.\d+)?)\s*H/i);
    const d = raw.match(/(\d+(?:\.\d+)?)\s*D/i);
    return {
        width:  w ? w[1] : 'Missing',
        height: h ? h[1] : 'Missing',
        depth:  d ? d[1] : 'Missing'
    };
}

// ── Scrape a single artwork detail page ───────────────────────
async function scrapeArtworkPage(artworkUrl) {
    const html = await fetchUrl(artworkUrl);
    const record = {
        locationURL:     artworkUrl,
        website:         'Saatchi Art',
        pendingScores:   true,
        smi_subject:     null,
        smi_render:      null,
        cli:             null,
        ri:              null,
        integer:         null,
        gate1_score:     null,
        gate2_score:     null
    };

    // ── Try __NEXT_DATA__ first (structured, most reliable) ───
    const nextData = extractNextData(html);
    if (nextData) {
        try {
            // Navigate to artwork data — structure varies, try common paths
            const props = nextData.props?.pageProps;
            const artwork = props?.artwork || props?.artworkData || props?.data?.artwork || null;

            if (artwork) {
                // Title — strip trailing " Painting" appended by Saatchi
                const rawTitle = (artwork.title || artwork.name || '').replace(/\s+Painting\.?\s*$/i, '').trim();
                record.title = rawTitle || 'Missing';

                // Artist
                const artist = artwork.artist || artwork.artistData || {};
                record.artistName = artist.fullName || artist.name || artwork.artistName || 'Missing';

                // Price
                const priceRaw = artwork.price || artwork.sellingPrice ||
                    artwork.products?.[0]?.original?.price || null;
                record.price = priceRaw !== null && priceRaw !== undefined
                    ? String(priceRaw).replace(/[^0-9.]/g, '')
                    : 'Missing';

                // Dimensions
                const dims = artwork.dimensions || artwork.size || null;
                if (dims && typeof dims === 'object') {
                    record.width  = dims.width  !== undefined ? String(dims.width)  : 'Missing';
                    record.height = dims.height !== undefined ? String(dims.height) : 'Missing';
                    record.depth  = dims.depth  !== undefined ? String(dims.depth)  : 'Missing';
                } else if (typeof dims === 'string') {
                    const parsed = parseDimensions(dims);
                    record.width  = parsed.width;
                    record.height = parsed.height;
                    record.depth  = parsed.depth;
                } else {
                    record.width  = 'Missing';
                    record.height = 'Missing';
                    record.depth  = 'Missing';
                }

                // Medium
                const mediumRaw = artwork.medium || artwork.materials ||
                    artwork.aboutArtwork?.medium || null;
                record.medium = mapMedium(mediumRaw);

                // Category / shortDescription
                record.shortDescription = artwork.category ||
                    artwork.subject || artwork.style || 'Missing';

                // Framed
                const framedRaw = artwork.framed || artwork.hasFrame ||
                    artwork.products?.[0]?.original?.hasFrame || null;
                if (framedRaw === true || framedRaw === 'Y' || framedRaw === 'Yes') {
                    record.framed = 'Y';
                } else if (framedRaw === false || framedRaw === 'N' || framedRaw === 'No') {
                    record.framed = 'N';
                } else {
                    record.framed = 'Missing';
                }

                // Sold status — use og:availability as primary source
                const ogAvailMatch = html.match(/og:availability[^>]*content="([^"]+)"/i) ||
                                     html.match(/content="([^"]+)"[^>]*og:availability/i);
                if (ogAvailMatch) {
                    record.lorS = ogAvailMatch[1].toLowerCase() === 'instock' ? 'L' : 'S';
                } else {
                    const soldRaw = artwork.isSoldOut || artwork.sold ||
                        artwork.products?.[0]?.isSoldOut || null;
                    record.lorS = (soldRaw === true) ? 'S' : 'L';
                }

                // Image URL
                record.imageUrl = artwork.artworkImage?.imageUrl ||
                    artwork.imageUrl || artwork.image?.url || 'Missing';

                // Artist profile URL
                record.artistProfileUrl = artist.profileUrl ||
                    artist.url || 'Missing';

                return record;
            }
        } catch (e) {
            console.warn(`__NEXT_DATA__ parse failed for ${artworkUrl}: ${e.message}`);
        }
    }

    // ── Fallback: parse raw HTML ───────────────────────────────
    // All patterns confirmed against actual Saatchi HTML.

    // Title + Artist — <title> tag is the most reliable single source:
    // "Collage 3 Painting by Janet Darley | Saatchi Art"
    const pageTitleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (pageTitleMatch) {
        const pageTitle = pageTitleMatch[1].trim();
        // Artist: everything after " by " and before " | Saatchi Art"
        const byMatch = pageTitle.match(/\sby\s+(.+?)\s*\|\s*Saatchi Art/i);
        record.artistName = byMatch ? byMatch[1].trim() : 'Missing';
        // Title: everything before " Painting by "
        const titlePartMatch = pageTitle.match(/^(.+?)\s+Painting\s+by\s+/i);
        record.title = titlePartMatch ? titlePartMatch[1].trim() : 'Missing';
    } else {
        record.artistName = 'Missing';
        record.title      = 'Missing';
    }

    // Artist profile URL — single-path saatchiart.com hrefs, skipping known non-profile paths
    const NON_PROFILE = /^(paintings|photography|sculpture|drawings|prints|stories|artadvisory|trade|curated-deals|cart|authentication|collections|commissions|giftcard|about-us|terms|privacy|accessibility|art|en-)/;
    const allHrefs = [...html.matchAll(/href="https:\/\/www\.saatchiart\.com\/([a-z0-9_-]+)"/gi)];
    const profileHref = allHrefs.find(m => !NON_PROFILE.test(m[1]));
    record.artistProfileUrl = profileHref
        ? `https://www.saatchiart.com/${profileHref[1]}`
        : 'Missing';

    // Price — og meta tag: product:price:amount content="520"
    const ogPriceMatch = html.match(/product:price:amount[^>]*content="([\d.]+)"/i);
    if (ogPriceMatch) {
        record.price = ogPriceMatch[1];
    } else {
        const dollarMatch = html.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
        record.price = dollarMatch ? dollarMatch[1].replace(/,/g, '') : 'Missing';
    }

    // Image URL — og:image meta tag
    const ogImageMatch = html.match(/og:image[^>]*content="([^"]+)"/i);
    record.imageUrl = ogImageMatch ? ogImageMatch[1] : 'Missing';

    // Dimensions — "11.8 W x 15.7 H x 0.4 D in"
    const dimMatch = html.match(/([\d.]+)\s*W\s*x\s*([\d.]+)\s*H(?:\s*x\s*([\d.]+)\s*D)?/i);
    if (dimMatch) {
        record.width  = dimMatch[1];
        record.height = dimMatch[2];
        record.depth  = dimMatch[3] || 'Missing';
    } else {
        record.width  = 'Missing';
        record.height = 'Missing';
        record.depth  = 'Missing';
    }

    // Medium — "Painting, Gouache on Glass" confirmed present in HTML
    const mediumRawMatch = html.match(/Painting,\s*([A-Za-z][^<"]{2,60}?)(?:<|"|\.(?:\s|$))/);
    record.medium = mapMedium(mediumRawMatch ? mediumRawMatch[1].trim() : null);

    // Framed — "Not Framed" confirmed present in HTML
    if (/Not\s+Framed/i.test(html)) {
        record.framed = 'N';
    } else if (/Framed/i.test(html)) {
        record.framed = 'Y';
    } else {
        record.framed = 'Missing';
    }

    // Sold status — use og:availability meta tag (most reliable)
    const ogAvailMatch = html.match(/og:availability[^>]*content="([^"]+)"/i) ||
                         html.match(/content="([^"]+)"[^>]*og:availability/i);
    if (ogAvailMatch) {
        record.lorS = ogAvailMatch[1].toLowerCase() === 'instock' ? 'L' : 'S';
    } else {
        record.lorS = /sold[\s-]*out/i.test(html) ? 'S' : 'L';
    }

    // shortDescription — always Painting for our filter
    record.shortDescription = 'Painting';

    return record;
}

// ── Fetch an image URL and return as base64 data URI ─────────
function fetchImageAsBase64(url) {
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.saatchiart.com/'
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                console.warn(`Image fetch failed HTTP ${res.statusCode}: ${url}`);
                return resolve(null);
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'] || 'image/jpeg';
                const mimeType = contentType.split(';')[0].trim();
                resolve(`data:${mimeType};base64,${buffer.toString('base64')}`);
            });
        });
        req.on('error', (err) => {
            console.warn(`Image fetch error: ${err.message} — ${url}`);
            resolve(null);
        });
        req.setTimeout(15000, () => {
            req.destroy();
            console.warn(`Image fetch timeout: ${url}`);
            resolve(null);
        });
    });
}
// ── Scrape artist bio from Saatchi artist profile page ────────
// Extracts About, Education, Exhibitions, and Recognition text.
// Returns concatenated text string, or null if nothing useful found.
// Resolves without throwing — a missing bio is not fatal.
async function scrapeArtistProfile(profileUrl) {
    if (!profileUrl || profileUrl === 'Missing') return null;
    try {
        const html = await fetchUrl(profileUrl);

        // The profile page renders sections as labeled blocks in the HTML.
        // We extract text between known section markers.
        // Sections appear as: content between one heading and the next hr or heading.

        // Strip all HTML tags to get clean text
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

        const sections = [];

        // Extract each labeled section using regex on the cleaned text
        const sectionPatterns = [
            { label: 'About',       pattern: /ABOUT\s+([\s\S]+?)(?:EDUCATION|EXHIBITIONS|RECOGNITION|---|\n{3}|$)/i },
            { label: 'Education',   pattern: /EDUCATION\s+([\s\S]+?)(?:EXHIBITIONS|RECOGNITION|ABOUT|---|\n{3}|$)/i },
            { label: 'Exhibitions', pattern: /EXHIBITIONS\s+([\s\S]+?)(?:RECOGNITION|EDUCATION|ABOUT|---|\n{3}|$)/i },
            { label: 'Recognition', pattern: /RECOGNITION\s+([\s\S]+?)(?:EDUCATION|EXHIBITIONS|ABOUT|---|\n{3}|$)/i },
        ];

        for (const { label, pattern } of sectionPatterns) {
            const match = text.match(pattern);
            if (match) {
                const content = match[1].trim().slice(0, 1000); // cap each section at 1000 chars
                if (content.length > 20) {
                    sections.push(`${label}: ${content}`);
                }
            }
        }

        if (sections.length > 0) {
            return sections.join('\n\n');
        }

        // Fallback: look for a substantial paragraph of text near the artist name
        // The bio often appears as a long paragraph early in the page
        const paragraphMatch = text.match(/(?:Belgian|French|American|British|German|Spanish|Italian|Chinese|Japanese|Korean|Canadian|Australian|Brazilian|Dutch|Swedish|Norwegian|Danish|Finnish|Polish|Russian|Israeli|Indian|Mexican|Argentine|Colombian)\s+[\w\s,]{50,500}/i);
        if (paragraphMatch) {
            return paragraphMatch[0].trim();
        }

        return null;
    } catch (err) {
        console.warn(`  Artist profile fetch failed (${profileUrl}): ${err.message}`);
        return null;
    }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
    writeProgress('starting', 0, LIMIT, 'Initializing scraper...');
    console.log(`Starting Saatchi scraper — limit: ${LIMIT}`);

    // Step 0: Load existing artist names for duplicate filtering
    writeProgress('starting', 0, LIMIT, 'Loading existing artists from database...');
    const existingArtists = await fetchExistingArtists();

    // Step 1: Set up on-demand sitemap URL feed
    // Sitemaps are fetched as needed rather than all upfront, so we can
    // keep going until we have LIMIT accepted records without pre-loading
    // a huge URL list.
    const MAX_ATTEMPTS = LIMIT * 5; // safety cap — stop if we can't find enough new records
    const urlBuffer    = [];        // buffer of { url, lastmod } entries not yet processed
    let sitemapIndex   = 1;
    let urlCursor      = 0;         // how many URLs we have consumed from the buffer total (including skipped ones)
    let sitemapsExhausted = false;

    // Pre-load sitemaps until we have enough URLs to cover the SKIP offset
    writeProgress('collecting', 0, LIMIT, 'Reading sitemaps...');
    while (urlBuffer.length < SKIP + 1 && !sitemapsExhausted) {
        const sitemapUrl = `https://www.saatchiart.com/sitemap-artworks-${sitemapIndex}.xml`;
        console.log(`Fetching sitemap ${sitemapIndex}...`);
        try {
            const xml   = await fetchUrl(sitemapUrl);
            const found = parseArtworkUrlsFromSitemap(xml);
            console.log(`  Sitemap ${sitemapIndex}: ${found.length} painting URLs`);
            urlBuffer.push(...found);
            await delay(1000);
        } catch (err) {
            console.warn(`  Sitemap ${sitemapIndex} failed: ${err.message} — no more sitemaps.`);
            sitemapsExhausted = true;
            break;
        }
        sitemapIndex++;
    }

    if (urlBuffer.length <= SKIP) {
        writeProgress('error', 0, LIMIT, 'No artwork URLs found after applying skip offset.');
        process.exit(1);
    }

    // Apply skip offset
    urlCursor = SKIP;
    console.log(`Skipped first ${SKIP} URLs. Starting scrape from position ${SKIP + 1}.`);

    // Helper: get the next URL from the buffer, fetching more sitemaps if needed
    async function nextUrl() {
        while (urlCursor >= urlBuffer.length && !sitemapsExhausted) {
            const sitemapUrl = `https://www.saatchiart.com/sitemap-artworks-${sitemapIndex}.xml`;
            console.log(`Fetching sitemap ${sitemapIndex}...`);
            try {
                const xml   = await fetchUrl(sitemapUrl);
                const found = parseArtworkUrlsFromSitemap(xml);
                console.log(`  Sitemap ${sitemapIndex}: ${found.length} painting URLs`);
                urlBuffer.push(...found);
                await delay(1000);
            } catch (err) {
                console.warn(`  Sitemap ${sitemapIndex} failed: ${err.message} — no more sitemaps.`);
                sitemapsExhausted = true;
                break;
            }
            sitemapIndex++;
        }
        if (urlCursor >= urlBuffer.length) return null; // exhausted
        return urlBuffer[urlCursor++];
    }

    // Step 2: Scrape until we have LIMIT accepted records or hit MAX_ATTEMPTS
    const results  = [];
    let attempts   = 0;

    while (results.length < LIMIT && attempts < MAX_ATTEMPTS) {
        const entry = await nextUrl();
        if (!entry) {
            console.warn('Sitemaps exhausted — stopping scrape.');
            break;
        }
        const { url, lastmod } = entry;
        attempts++;
        writeProgress('scraping', results.length, LIMIT,
            `Collected ${results.length} of ${LIMIT} — attempting URL ${attempts} (max ${MAX_ATTEMPTS})...`);
        console.log(`[${results.length}/${LIMIT} collected | attempt ${attempts}] ${url}`);

        try {
            const record = await scrapeArtworkPage(url);
            // Store lastmod as dateAdded — reflects Saatchi's last modification date
            record.dateAdded = lastmod || new Date().toISOString().slice(0, 10);

            // ── Skip artists already in the database ─────────────────
            const normalizedArtist = (record.artistName || '').trim().toLowerCase();
            if (normalizedArtist && normalizedArtist !== 'missing' && existingArtists.has(normalizedArtist)) {
                console.warn(`  SKIPPED — artist already in database: ${record.artistName}`);
                continue;
            }
            if (record.imageUrl && record.imageUrl !== 'Missing') {
                console.log(`  Fetching image...`);
                const imageBase64 = await fetchImageAsBase64(record.imageUrl);
                if (imageBase64) {
                    record.imageBase64 = imageBase64;
                    console.log(`  Image fetched (${Math.round(imageBase64.length / 1024)}kb)`);
                } else {
                    console.warn(`  Image fetch failed — will import without image`);
                }
            }

            // Fetch artist bio from profile page
            if (record.artistProfileUrl && record.artistProfileUrl !== 'Missing') {
                console.log(`  Fetching artist bio...`);
                const bio = await scrapeArtistProfile(record.artistProfileUrl);
                record.artistBio = bio || null;
                if (bio) {
                    console.log(`  Artist bio fetched (${bio.length} chars)`);
                } else {
                    console.warn(`  Artist bio not found`);
                }
            } else {
                record.artistBio = null;
            }

            // ── Skip records with no bio or a foreign-language bio ────
            // A null bio produces CLI = 1.0. A foreign-language bio causes
            // the scoring questionnaire to answer at the lowest level,
            // also producing CLI = 1.0. Skip both cases here to avoid
            // wasting import and scoring resources.
            if (record.artistBio === null) {
                console.warn(`  SKIPPED — no artist bio found: ${url}`);
                continue;
            }
            if (isForeignLanguageBio(record.artistBio)) {
                console.warn(`  SKIPPED — foreign-language bio detected: ${url}`);
                continue;
            }
            if (isFooterContent(record.artistBio)) {
                console.warn(`  SKIPPED — bio is footer/navigation content: ${url}`);
                continue;
            }
            if (!hasCareerCredentials(record.artistBio)) {
                console.warn(`  SKIPPED — bio has no career credential signals: ${url}`);
                continue;
            }

            // Add to set so a second work by this artist is skipped later in the same run
            if (normalizedArtist && normalizedArtist !== 'missing') {
                existingArtists.add(normalizedArtist);
            }
            results.push(record);
        } catch (err) {
            console.error(`  FAILED: ${err.message} — not counted toward limit`);
        }

        // Polite delay between artwork pages — 1.5 seconds
        await delay(1500);
    }

    // Step 3: Write staging file (full data including imageBase64)
    fs.writeFileSync(STAGING_PATH, JSON.stringify(results, null, 2));
    console.log(`Staging file written: ${STAGING_PATH}`);

    // Strip imageBase64 from progress results — UI doesn't need it, keeps payload small
    const resultsForUI = results.map(({ imageBase64, ...rest }) => rest);

    const hitCap = attempts >= MAX_ATTEMPTS && results.length < LIMIT;
    const capNote = hitCap ? ` (stopped after ${MAX_ATTEMPTS} attempts — sitemap section may be heavily overlapping with existing database)` : '';
    writeProgress('complete', results.length, LIMIT,
        `Scrape complete — ${results.length} of ${LIMIT} requested records collected after ${attempts} attempts.${capNote}`, resultsForUI);

    console.log(`Done. ${results.length} records collected in ${attempts} attempts.${capNote}`);
}

main().catch(err => {
    console.error('Fatal scraper error:', err.message);
    writeProgress('error', 0, LIMIT, `Fatal error: ${err.message}`);
    process.exit(1);
});
