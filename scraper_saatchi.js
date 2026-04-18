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
    console.error('ERROR: --limit N is required. Example: node scraper_saatchi.js --limit 25');
    process.exit(1);
}
const LIMIT = parseInt(args[limitIndex + 1], 10);
if (isNaN(LIMIT) || LIMIT < 1) {
    console.error('ERROR: --limit must be a positive integer.');
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

// ── Parse artwork URLs from a sitemap XML string ──────────────
// Filters to Painting- URLs only.
function parseArtworkUrlsFromSitemap(xml) {
    const urls = [];
    // Match all <loc> CDATA or plain text values
    const locRegex = /<loc>[\s]*(?:<!\[CDATA\[)?(https:\/\/www\.saatchiart\.com\/art\/Painting-[^\]<\s]+)(?:\]\]>)?[\s]*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
        urls.push(match[1].trim());
    }
    return urls;
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
                // Title
                record.title = artwork.title || artwork.name || 'Missing';

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

                // Sold status
                const soldRaw = artwork.isSoldOut || artwork.sold ||
                    artwork.products?.[0]?.isSoldOut || null;
                record.lorS = (soldRaw === true || soldRaw === 'S') ? 'S' : 'L';

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

    // ── Fallback: parse HTML directly ─────────────────────────
    // Title — H1
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    record.title = titleMatch ? titleMatch[1].trim() : 'Missing';

    // Artist name — look for common patterns
    const artistMatch = html.match(/itemprop="name"[^>]*>([^<]+)<\/[a-z]+>/i) ||
                        html.match(/class="[^"]*artist[^"]*name[^"]*"[^>]*>([^<]+)<\/[a-z]+>/i);
    record.artistName = artistMatch ? artistMatch[1].trim() : 'Missing';

    // Price — look for $ amount
    const priceMatch = html.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    record.price = priceMatch ? priceMatch[1].replace(/,/g, '') : 'Missing';

    // Dimensions — look for "W x H" pattern in inches
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

    // Medium
    const mediumMatch = html.match(/Materials?[^:]*:\s*<[^>]+>([^<]+)</i) ||
                        html.match(/Medium[^:]*:\s*<[^>]+>([^<]+)</i);
    record.medium = mapMedium(mediumMatch ? mediumMatch[1] : null);

    // Category from breadcrumb
    const breadcrumbMatch = html.match(/breadcrumb[^>]*>[\s\S]*?Painting[^<]*<\/[a-z]+>/i);
    record.shortDescription = breadcrumbMatch ? 'Painting' : 'Missing';

    // Framed
    record.framed = /framed/i.test(html) ? 'Y' : 'Missing';

    // Sold
    record.lorS = /sold\s*out|is\s*sold/i.test(html) ? 'S' : 'L';

    // Image URL — look for images.saatchiart.com
    const imgMatch = html.match(/https:\/\/images\.saatchiart\.com\/[^\s"']+\.jpg/i);
    record.imageUrl = imgMatch ? imgMatch[0] : 'Missing';

    // Artist profile URL
    const profileMatch = html.match(/href="(\/[a-z0-9_-]+\/[a-z0-9_-]+)"[^>]*class="[^"]*artist/i);
    record.artistProfileUrl = profileMatch
        ? 'https://www.saatchiart.com' + profileMatch[1]
        : 'Missing';

    return record;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
    writeProgress('starting', 0, LIMIT, 'Initializing scraper...');
    console.log(`Starting Saatchi scraper — limit: ${LIMIT}`);

    // Step 1: Collect artwork URLs from sitemaps until we have enough
    writeProgress('collecting', 0, LIMIT, 'Reading sitemaps to collect artwork URLs...');
    const artworkUrls = [];
    let sitemapIndex = 1;

    while (artworkUrls.length < LIMIT) {
        const sitemapUrl = `https://www.saatchiart.com/sitemap-artworks-${sitemapIndex}.xml`;
        console.log(`Fetching sitemap ${sitemapIndex}...`);
        try {
            const xml = await fetchUrl(sitemapUrl);
            const found = parseArtworkUrlsFromSitemap(xml);
            console.log(`  Sitemap ${sitemapIndex}: ${found.length} painting URLs`);
            artworkUrls.push(...found);
            await delay(1000); // polite delay between sitemaps
        } catch (err) {
            console.warn(`  Sitemap ${sitemapIndex} failed: ${err.message} — stopping sitemap collection`);
            break;
        }
        sitemapIndex++;
    }

    const urlsToProcess = artworkUrls.slice(0, LIMIT);
    console.log(`Collected ${urlsToProcess.length} artwork URLs to scrape`);

    if (urlsToProcess.length === 0) {
        writeProgress('error', 0, LIMIT, 'No artwork URLs found in sitemaps.');
        process.exit(1);
    }

    // Step 2: Scrape each artwork page
    const results = [];
    for (let i = 0; i < urlsToProcess.length; i++) {
        const url = urlsToProcess[i];
        const current = i + 1;
        writeProgress('scraping', current, urlsToProcess.length,
            `Scraping artwork ${current} of ${urlsToProcess.length}...`);
        console.log(`[${current}/${urlsToProcess.length}] ${url}`);

        try {
            const record = await scrapeArtworkPage(url);
            results.push(record);
        } catch (err) {
            console.error(`  FAILED: ${err.message}`);
            results.push({
                locationURL:   url,
                website:       'Saatchi Art',
                scrapeError:   err.message,
                pendingScores: true
            });
        }

        // Polite delay between artwork pages — 1.5 seconds
        if (i < urlsToProcess.length - 1) await delay(1500);
    }

    // Step 3: Write staging file
    fs.writeFileSync(STAGING_PATH, JSON.stringify(results, null, 2));
    console.log(`Staging file written: ${STAGING_PATH}`);

    writeProgress('complete', urlsToProcess.length, urlsToProcess.length,
        `Scrape complete — ${results.length} records written to staging.`, results);

    console.log(`Done. ${results.length} records scraped.`);
}

main().catch(err => {
    console.error('Fatal scraper error:', err.message);
    writeProgress('error', 0, LIMIT, `Fatal error: ${err.message}`);
    process.exit(1);
});
