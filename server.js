require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const app = express();
const mime = require("mime-types");
const sharp = require("sharp");
const archiver = require("archiver");
const unzipper = require("unzipper");
const { spawn } = require('child_process');
const STAGING_PATH  = path.join(__dirname, 'scraper_output', 'saatchi_staging.json');
const PROGRESS_PATH = path.join(__dirname, 'scraper_output', 'saatchi_progress.json');

// Used by /analyze-art endpoint to validate AI-returned study factors
const VALID_FACTOR_NAMES = [
  "Line", "Shape", "Form", "Space", "Color/Hue", "Texture", "Tone/Value", 
  "Saturation", "Cohesiveness", "Pattern", "Balance", "Contrast", "Emphasis", 
  "Movement", "Rhythm", "Variety", "Proportion", "Harmony", "Perspective", 
  "Composition", "Brushwork", "Chiaroscuro", "Impasto", "Sfumato", "Glazing", 
  "Scumbling", "Pointillism", "Wet-on-Wet", "Uniqueness", "Creativity", 
  "Mood", "Viewer Engagement", "Emotional Resonance"
];

const FACTOR_DEFINITIONS = {
  "Line": "using line to create rhythm and guide the eye",
  "Shape": "relationships between forms and negative space",
  "Form": "creating three-dimensional volume and mass",
  "Space": "depth and spatial relationships between elements",
  "Color/Hue": "palette selection and emotional color impact",
  "Texture": "surface quality and tactile visual experience",
  "Tone/Value": "light and dark relationships for depth",
  "Saturation": "color intensity to create focus and atmosphere",
  "Cohesiveness": "unity of style, technique, and concept",
  "Pattern": "rhythmic repetition of visual elements",
  "Balance": "distribution of visual weight in composition",
  "Contrast": "abrupt tonal shift for emphasis and drama",
  "Emphasis": "creating clear focal points for the viewer",
  "Movement": "visual flow and directional energy",
  "Rhythm": "tempo and progression through repetition",
  "Variety": "diversity of elements to maintain interest",
  "Proportion": "size relationships between elements",
  "Harmony": "elements working together in unity",
  "Perspective": "creating convincing illusion of depth",
  "Composition": "structural arrangement of all elements",
  "Brushwork": "stroke quality and paint application",
  "Chiaroscuro": "light and shadow modeling technique",
  "Impasto": "thick paint application for texture",
  "Sfumato": "soft, blended edge transitions",
  "Glazing": "transparent layering for luminosity",
  "Scumbling": "semi-opaque layering for atmospheric effects",
  "Pointillism": "optical color mixing using dots",
  "Wet-on-Wet": "blending paint while still wet",
  "Uniqueness": "personal voice and innovative approach",
  "Creativity": "imaginative concept and vision",
  "Mood": "emotional atmosphere and tone",
  "Viewer Engagement": "drawing and holding viewer attention",
  "Emotional Resonance": "connecting to universal human emotions"
};

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = [
  "https://robert-clark-4dee.mykajabi.com",
  "https://valora-analytics-api.onrender.com",
  "https://advisory.valoraanalytics.com",
  "https://stunning-arithmetic-16de6b.netlify.app",
  "https://profound-mandazi-3e8fd7.netlify.app"
];

// Global CORS middleware for all routes
app.use(
  cors({
origin: [
  "https://robert-clark-4dee.mykajabi.com",
  "https://valora-analytics-api.onrender.com",
  "https://advisory.valoraanalytics.com",
  "https://stunning-arithmetic-16de6b.netlify.app",
  "https://profound-mandazi-3e8fd7.netlify.app",
  /\.netlify\.app$/
],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"]
  })
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Global default temperature (you can change this number)
const DEFAULT_TEMPERATURE = 0.0;

// ====================
// MODEL CONFIGURATION
// ====================

const VALID_AI_MODELS = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "claude-sonnet-4-5-20250929"];
const MODEL_CONFIG_PATH = '/mnt/data/model_config.json';

function readModelConfig() {
  try {
    if (!fs.existsSync(MODEL_CONFIG_PATH)) {
      return null;  // No model configured yet
    }
    const data = fs.readFileSync(MODEL_CONFIG_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading model config:", error);
    return null;
  }
}

function writeModelConfig(model) {
  try {
    const config = {
      activeModel: model,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(MODEL_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Model config updated: ${model}`);
    return true;
  } catch (error) {
    console.error('Error writing model config:', error.message);
    return false;
  }
}

// ====================
// UTILITY FUNCTIONS
// ====================

// Used by legacy batch endpoint to round SMI to nearest 0.25 increment
function roundSMIUp(value) {
  const increments = Math.ceil(value * 4) / 4;
  return Math.round(increments * 100) / 100;
}

// ====================
// SMI ANCHOR STORAGE
// ====================

// Persisted at startup by initializeAnchors(). Never modified after that.
const anchorAnalyses = {}; // keyed 1–5

// ====================
// SMI PROMPTS
// ====================

const PROMPT_A = `ARTWORK ANALYSIS

You are an objective evaluator of artistic skill. Examine the artwork image carefully and produce a complete textual analysis. You must follow these rules without exception:

- Evaluate only what you see in the work before you
- Do not consider the identity, reputation, or historical significance of the artist
- Do not factor in provenance, attribution, or authorship
- If you recognize the work as a known masterpiece, disregard that recognition entirely — it is irrelevant to your evaluation
- A perfect forgery and the original deploy identical skill on the canvas
- Do not adjust your evaluation based on the apparent age, experience level, or intent of the artist
- Do not soften or qualify scores out of kindness or encouragement
- A work that deploys little skill should score low regardless of who made it or why
- Evaluate only the skill deployed in the work as it exists visually, nothing else

---

FIRST READ

Observe and record what is deployed in this work across all three dimensions:

- Technical execution: mark-making, color handling, edge control, spatial construction, medium mastery
- Compositional intelligence: arrangement, balance, movement, focal structure, use of negative space
- Expressive voice: the degree to which a personal artistic vision is present, intentional, and realized

---

SECOND LOOK

Before writing your analysis, examine the image again with fresh attention. Look specifically for elements that may not have been immediately obvious — figures, faces, animals, landscapes, or objects emerging from abstraction; imagery embedded within texture or gestural marks; superimposed transparencies or dual narratives occupying the same visual space. If such layered complexity is discovered, it must be captured in your analysis, as it represents genuinely additional skill deployed.

---

OUTPUT

Write a thorough analytical description of what is deployed in this artwork across technical execution, compositional intelligence, and expressive voice. Include anything discovered in the second look. Be specific and observational — do not evaluate against a scale, do not assign a score. Your output will be used later for comparative analysis against other works.`;

const PROMPT_B_TEMPLATE = `SMI SCORING

You are an objective evaluator of artistic skill assigning a Skill Mastery Index (SMI) score. You must follow these rules without exception:

- Do not consider the identity, reputation, or historical significance of the artist
- Do not factor in provenance, attribution, or authorship
- Do not soften or qualify scores out of kindness or encouragement
- Score only the skill deployed in the work, nothing else

---

THE SCALE — CONCEPTUAL FRAMEWORK

The SMI scale runs from 1.0 to 5.0 in increments of 0.25. The five integer levels represent named thresholds in artistic development:

- 1.0 — Novice: The artist is beginning. Work shows basic attempts at representation with limited technical foundation. Marks are symbolic rather than observed. This is the entry point of the scale.

- 2.0 — Apprentice: The artist has crossed into intentional representational work. Basic competence is emerging — subjects are recognizable, color is purposeful, composition is attempted. Technical understanding is present but incomplete.

- 3.0 — Journeyman: The artist has crossed into confident, competent execution. Technical fundamentals are established. Personal color preferences and compositional approaches are beginning to emerge. Work is professional in character.

- 4.0 — Artisan: The artist has crossed into distinctive, sophisticated work. Multiple technical and expressive skills are deployed simultaneously and intentionally. A personal voice is present and recognizable. This is the level The Artisan's Ascent is named for — the accomplished working artist.

- 5.0 — Master: The artist has crossed into mastery. Technical execution, compositional intelligence, and expressive voice operate at the highest level simultaneously. Work stops the viewer. Note: 5.0 is the threshold of Master — the minimum score for a work of master-level skill. Some masters deploy more skill than others, but the scale does not express gradations above 5.0. All master-level work scores 5.0.

On decimal scoring:
- The integer (1.0, 2.0, 3.0, 4.0, 5.0) represents the threshold — the point at which a work has just crossed into that level. The anchor analysis for each integer is a representative example of work at that threshold.
- 0.25 above the integer (e.g. 3.25) indicates the work has clearly crossed the threshold and shows meaningful development beyond the entry point.
- 0.50 above the integer (e.g. 3.50) indicates the work sits solidly in the middle of that level.
- 0.75 above the integer (e.g. 3.75) indicates the work is approaching the next threshold but has not yet crossed it.
- The score is never less than 1.0 and never greater than 5.0.

---

THE ANCHOR ANALYSES

The following five analyses describe the anchor works that define the SMI scale. Each represents the threshold entry point for its level.

ANCHOR 1 — SMI 1.0 (Novice):
{{ANCHOR_1_ANALYSIS}}

ANCHOR 2 — SMI 2.0 (Apprentice):
{{ANCHOR_2_ANALYSIS}}

ANCHOR 3 — SMI 3.0 (Journeyman):
{{ANCHOR_3_ANALYSIS}}

ANCHOR 4 — SMI 4.0 (Artisan):
{{ANCHOR_4_ANALYSIS}}

ANCHOR 5 — SMI 5.0 (Master):
{{ANCHOR_5_ANALYSIS}}

---

SUBJECT ANALYSIS:
{{SUBJECT_ANALYSIS}}

---

STEP 1 — BRACKET THE WORK

Using the analyses above, determine which two adjacent anchors the subject falls between, based on this question:

"Considering the full range of artistic skill — technical execution, compositional intelligence, and expressive voice — which artwork had more skill deployed during its rendering?"

Identify the two anchors that bound the subject — the highest anchor the subject exceeds and the lowest anchor that exceeds the subject. State your bracketing clearly before proceeding.

If the subject essentially matches an anchor, note that and proceed to Step 2.

---

STEP 2 — LOCATE WITHIN THE BAND

Now compare the subject only against the two bounding anchors using the same question:

"Considering the full range of artistic skill — technical execution, compositional intelligence, and expressive voice — which artwork had more skill deployed during its rendering?"

Determine which of these five positions best describes where the subject sits:

- Essentially matches the lower anchor → score = lower anchor integer (e.g. 3.0)
- Closer to the lower anchor → score = lower anchor integer + 0.25 (e.g. 3.25)
- Squarely between the two anchors → score = lower anchor integer + 0.50 (e.g. 3.50)
- Closer to the upper anchor → score = lower anchor integer + 0.75 (e.g. 3.75)
- Essentially matches the upper anchor → score = upper anchor integer (e.g. 4.0)

---

FINAL OUTPUT

Respond with ONLY valid JSON in this exact format, nothing else:

{
  "smi": 3.25,
  "justification": "Brief 3-4 sentence explanation of what specifically places the work at this score."
}

The smi value must be a number (not a string). Valid values: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0`;

// ====================
// AI CALLER FUNCTION
// ====================
async function callAI(
  messages,
  maxTokens = 3000,
  systemContent = "",
  useJSON = false,
  temperature = DEFAULT_TEMPERATURE
) {
  const modelConfig = readModelConfig();
  
  if (!modelConfig || !modelConfig.activeModel) {
    throw new Error("NO_MODEL_CONFIGURED: Admin must select an AI model in Admin Menu before any apps can function");
  }
  
  const activeModel = modelConfig.activeModel;
  console.log(`Using AI model: ${activeModel}`);
  
  // Detect if this is Claude or OpenAI
  const isClaude = activeModel.startsWith('claude-');
  
  if (isClaude) {
    return await callClaude(messages, maxTokens, systemContent, useJSON, temperature, activeModel);
  } else {
    return await callOpenAI(messages, maxTokens, systemContent, useJSON, temperature, activeModel);
  }
}

// ====================
// OPENAI API CALLER
// ====================
async function callOpenAI(messages, maxTokens, systemContent, useJSON, temperature, activeModel) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found");
  }
  
  const finalMessages = systemContent
    ? [{ role: "system", content: systemContent }, ...messages]
    : messages;
    
  const requestBody = {
    model: activeModel,
    messages: finalMessages,
    max_tokens: maxTokens,
    temperature
  };
  
  if (useJSON) {
    requestBody.response_format = { type: "json_object" };
  }
  
  let response;
  try {
    response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
  } catch (error) {
    console.error("OpenAI API Error Details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorData: error.response?.data,
      requestedModel: activeModel,
      messageCount: finalMessages.length,
      hasImages: JSON.stringify(requestBody).includes('image_url')
    });
    throw error;
  }
  
  const responseText = response.data.choices[0]?.message?.content || "";
  
  if (useJSON) {
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`OpenAI returned invalid JSON: ${responseText}`);
    }
  }
  
  return responseText;
}

// ====================
// ANTHROPIC API CALLER
// ====================
async function callClaude(messages, maxTokens, systemContent, useJSON, temperature, activeModel) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not found");
  }
  
  // Convert OpenAI message format to Anthropic format
  const claudeMessages = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      if (Array.isArray(msg.content)) {
        const convertedContent = msg.content.map(item => {
          if (item.type === 'image_url') {
            const imageUrl = item.image_url.url;
            const match = imageUrl.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/);
            if (match) {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: `image/${match[1]}`,
                  data: match[2]
                }
              };
            }
          }
          return item;
        });
        return {
          role: msg.role,
          content: convertedContent
        };
      }
      return msg;
    });
  
  const requestBody = {
    model: activeModel,
    messages: claudeMessages,
    max_tokens: maxTokens,
    temperature
  };
  
  if (systemContent) {
    requestBody.system = systemContent;
  }
  
  let response;
  try {
    response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        }
      }
    );
  } catch (error) {
    console.error("Anthropic API Error Details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorData: error.response?.data,
      requestedModel: activeModel,
      messageCount: claudeMessages.length,
      hasImages: JSON.stringify(requestBody).includes('image')
    });
    throw error;
  }
  
  const responseText = response.data.content[0]?.text || "";

  if (useJSON) {
    try {
      let cleanedJSON = responseText.trim();
      if (cleanedJSON.startsWith('```json')) {
        cleanedJSON = cleanedJSON.replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
      } else if (cleanedJSON.startsWith('```')) {
        cleanedJSON = cleanedJSON.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
      }
      return JSON.parse(cleanedJSON.trim());
    } catch (parseError) {
      throw new Error(`Claude returned invalid JSON: ${responseText}`);
    }
  }

  return responseText;
}

// ====================
// TEMPORARY IMAGE STORAGE ENDPOINTS
// ====================

const multer = require('multer');

// Configure multer for file uploads (in memory) — used for temp image storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure multer for backup ZIP uploads — streams to disk, no size limit enforced here
// (Render's reverse proxy handles connection limits; we want to accept large files)
const uploadBackup = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tempDir = '/mnt/data/temp_restore';
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      cb(null, `backup_upload_${Date.now()}.zip`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.zip') ||
        file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

// In-memory storage for temporary images
const tempImageStore = new Map();

// Cleanup expired images every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [imageId, data] of tempImageStore.entries()) {
    if (now > data.expiry) {
      tempImageStore.delete(imageId);
      console.log(`🗑️ Cleaned up expired temp image: ${imageId}`);
    }
  }
}, 30 * 60 * 1000);

// Store temporary image endpoint
app.post('/store-temp-image', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 Received temp image storage request');
    
    const { userId, filename, expiry } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    if (!userId || !filename) {
      return res.status(400).json({ error: 'Missing userId or filename' });
    }
    
    const imageId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiryTime = Date.now() + (parseInt(expiry) || 7200) * 1000;
    
    tempImageStore.set(imageId, {
      buffer: imageFile.buffer,
      mimeType: imageFile.mimetype,
      originalName: filename,
      userId: userId,
      uploadTime: Date.now(),
      expiry: expiryTime,
      size: imageFile.size
    });
    
    console.log(`✅ Stored temp image: ${imageId} (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`);
    
    res.json({
      success: true,
      imageId: imageId,
      tempUrl: `/get-temp-image/${imageId}`,
      expiresIn: parseInt(expiry) || 7200,
      fileSize: imageFile.size
    });
    
  } catch (error) {
    console.error('❌ Error storing temp image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Retrieve temporary image endpoint
app.get('/get-temp-image/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.query;
    
    console.log(`📥 Retrieving temp image: ${imageId} for user: ${userId}`);
    
    const imageData = tempImageStore.get(imageId);
    
    if (!imageData) {
      console.log(`❌ Image not found: ${imageId}`);
      return res.status(404).json({ error: 'Image not found or expired' });
    }
    
    if (imageData.userId !== userId) {
      console.log(`❌ Access denied for image: ${imageId}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (Date.now() > imageData.expiry) {
      tempImageStore.delete(imageId);
      console.log(`❌ Image expired: ${imageId}`);
      return res.status(410).json({ error: 'Image expired' });
    }
    
    console.log(`✅ Serving temp image: ${imageId} (${(imageData.size / 1024 / 1024).toFixed(2)}MB)`);
    
    res.set({
      'Content-Type': imageData.mimeType,
      'Content-Length': imageData.buffer.length,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${imageData.originalName}"`
    });
    
    res.send(imageData.buffer);
    
  } catch (error) {
    console.error('❌ Error retrieving temp image:', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================
// /api/valuation_v2  —  v2 comparable selection pipeline
//
// Phase 1: valid pool → artist multiples → RI bracket → WED (cut to 40)
// Phase 2: adjustments → CoV → similarity scalar (cut to 10)
//
// All shared functions (readDatabase, callAI, formatAIAnalysisForReport,
// readModelConfig, etc.) are unchanged from v1 and called directly.
// Only the comp-selection logic and metadata fields are new.
// ============================================================

app.post("/api/valuation_v2", async (req, res) => {
  try {
    console.log("Starting valuation_v2 process");

    const {
      smi, ri_integer, ri_decimal, cli,
      subjectImageBase64, skipNarrative,
      media, title, artist, subjectDescription, height, width
    } = req.body;

    const narrativeTemperature = 0.5;

    if (smi        === undefined || smi        === null) throw new Error("Missing required input: smi");
    if (ri_integer === undefined || ri_integer === null) throw new Error("Missing required input: ri_integer");
    if (ri_decimal === undefined || ri_decimal === null) throw new Error("Missing required input: ri_decimal");
    if (cli        === undefined || cli        === null) throw new Error("Missing required input: cli");
    if (!height)  throw new Error("Missing required input: height");
    if (!width)   throw new Error("Missing required input: width");
    if (!media)   throw new Error("Missing required input: media");
    if (!skipNarrative && !subjectImageBase64) throw new Error("Missing required input: subjectImageBase64");

    const db           = readDatabase();
    const allRecords   = db.records || [];
    const coefficients = db.metadata.coefficients;
    const mediumTable  = db.metadata.medium;

    // ── Validate all required metadata fields ────────────────────────────────
    const requiredCoefs = [
      'coef_size_constant', 'coef_size_exponent',
      'coef_frame_constant', 'coef_frame_exponent',
      'target_quantity', 'target_multiple',
      'coef_A', 'coef_B', 'coef_C',
      'coef_p5', 'coef_p25', 'coef_p50', 'coef_p75', 'coef_p95',
      // v1 similarity scalar weights (preserved, not used in v2 pipeline)
      'w_smi', 'w_adj',
      // v2 WED weights
      'w_wed_smi', 'w_wed_cli', 'w_wed_ridecimal', 'w_wed_size',
      // v2 similarity scalar weights
      'w_sim_medium', 'w_sim_subject', 'w_sim_netadj'
    ];
    for (const field of requiredCoefs) {
      if (coefficients[field] === undefined || coefficients[field] === null) {
        throw new Error(`Server configuration error: metadata field "${field}" is missing.`);
      }
    }

    const targetQuantity  = parseInt(coefficients['target_quantity']);
    const targetMultiple  = parseFloat(coefficients['target_multiple']);
    const targetRangeHigh = targetQuantity * targetMultiple;   // 40

    // v2 WED weights
    const wWedSMI      = parseFloat(coefficients['w_wed_smi']);
    const wWedCLI      = parseFloat(coefficients['w_wed_cli']);
    const wWedRIDec    = parseFloat(coefficients['w_wed_ridecimal']);
    const wWedSize     = parseFloat(coefficients['w_wed_size']);
    if (Math.abs(wWedSMI + wWedCLI + wWedRIDec + wWedSize - 1.0) > 0.0001) {
      throw new Error(
        `Metadata error: w_wed_smi (${wWedSMI}) + w_wed_cli (${wWedCLI}) + ` +
        `w_wed_ridecimal (${wWedRIDec}) + w_wed_size (${wWedSize}) must equal 1.0.`
      );
    }

    // v2 similarity scalar weights
    const wSimMedium  = parseFloat(coefficients['w_sim_medium']);
    const wSimSubject = parseFloat(coefficients['w_sim_subject']);
    const wSimNetAdj  = parseFloat(coefficients['w_sim_netadj']);
    if (Math.abs(wSimMedium + wSimSubject + wSimNetAdj - 1.0) > 0.0001) {
      throw new Error(
        `Metadata error: w_sim_medium (${wSimMedium}) + w_sim_subject (${wSimSubject}) + ` +
        `w_sim_netadj (${wSimNetAdj}) must equal 1.0.`
      );
    }

    const subjectSSI = parseFloat(height) * parseFloat(width);
    const subjectRIDecimal = parseInt(ri_decimal);

    const filterCounts = [{ label: 'Total Works in Database', count: allRecords.length }];

    // ── Valid pool ────────────────────────────────────────────────────────────
    let pool = allRecords.filter(r =>
      typeof r.appsi      === "number" && r.appsi  > 0 &&
      typeof r.aop        === "number" && r.aop    > 0 &&
      typeof r.ssi        === "number" && r.ssi    > 0 &&
      typeof r.smi        === "number" &&
      typeof r.cli        === "number" &&
      r.ri_integer !== undefined && r.ri_integer !== null &&
      r.ri_decimal !== undefined && r.ri_decimal !== null &&
      r.thumbnailBase64 && r.artistName && r.title &&
      r.height && r.width && r.medium && r.price && r.framed !== undefined
    );

    console.log(`Valid pool: ${pool.length} records with all required fields`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient valid records in database: ${pool.length} found, ${targetQuantity} required.`);
    }

    // ── Phase 1 Step 1 — Artist multiples ────────────────────────────────────
    // Keep highest appsi record per artist across the full valid pool.
    {
      const best = new Map();
      pool.forEach(r => {
        const key = r.artistName.trim().toLowerCase();
        if (!best.has(key) || r.appsi > best.get(key).appsi) {
          best.set(key, r);
        }
      });
      const dedupedPool = Array.from(best.values());
      console.log(`Phase 1 Step 1 — Artist multiples: ${pool.length} → ${dedupedPool.length} records`);
      pool = dedupedPool;
    }
    filterCounts.push({ label: 'Unique Artists Identified', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after artist multiples: ${pool.length} records remain.`);
    }

    // ── Phase 1 Step 2 — RI bracket ──────────────────────────────────────────
    const riMin = Math.max(1, ri_integer - 1);
    const riMax = Math.min(5, ri_integer + 1);
    pool = pool.filter(r => r.ri_integer >= riMin && r.ri_integer <= riMax);
    filterCounts.push({ label: 'Matched by Representational Style', count: pool.length });
    console.log(`Phase 1 Step 2 — RI bracket [${riMin}–${riMax}]: ${pool.length} records`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after RI bracket filter: ${pool.length} records remain.`);
    }

    // ── Phase 1 Step 3 — Medium filter ───────────────────────────────────────
    if (media === 'Oil') {
      pool = pool.filter(r => r.medium === 'Oil');
    } else if (media === 'Acrylic') {
      pool = pool.filter(r => r.medium === 'Acrylic');
    } else {
      pool = pool.filter(r => r.medium !== 'Oil');
    }
    filterCounts.push({ label: 'Filtered by Medium', count: pool.length });
    console.log(`Phase 1 Step 3 — Medium filter (subject: ${media}): ${pool.length} records`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after medium filter: ${pool.length} records remain.`);
    }

    // ── Phase 1 Step 5 — Weighted Euclidean Distance (WED) → targetRangeHigh ─
    // Z-score SMI, CLI, RI decimal, and SSI across the post-RI-bracket pool.
    // Subject z-scores use the same pool stats (pool only, subject not included).
    // WED = √[ wA*(z_smi_s − z_smi_i)² + wB*(z_cli_s − z_cli_i)²
    //          + wC*(z_rid_s − z_rid_i)² + wD*(z_ssi_s − z_ssi_i)² ]
    // Cut to nearest targetRangeHigh records by ascending WED.
    {
      const smiValues = pool.map(r => r.smi);
      const cliValues = pool.map(r => r.cli);
      const ridValues = pool.map(r => parseFloat(r.ri_decimal));
      const ssiValues = pool.map(r => r.ssi);

      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const std  = (arr, m) => {
        const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
        return Math.sqrt(variance);
      };

      const smiMean = mean(smiValues); const smiStd = std(smiValues, smiMean);
      const cliMean = mean(cliValues); const cliStd = std(cliValues, cliMean);
      const ridMean = mean(ridValues); const ridStd = std(ridValues, ridMean);
      const ssiMean = mean(ssiValues); const ssiStd = std(ssiValues, ssiMean);

      // Subject z-scores against pool stats
      const zSmiS = smiStd > 0 ? (smi        - smiMean) / smiStd : 0;
      const zCliS = cliStd > 0 ? (cli        - cliMean) / cliStd : 0;
      const zRidS = ridStd > 0 ? (subjectRIDecimal - ridMean) / ridStd : 0;
      const zSsiS = ssiStd > 0 ? (subjectSSI  - ssiMean) / ssiStd : 0;

      const scored = pool.map(r => {
        const zSmiI = smiStd > 0 ? (r.smi              - smiMean) / smiStd : 0;
        const zCliI = cliStd > 0 ? (r.cli              - cliMean) / cliStd : 0;
        const zRidI = ridStd > 0 ? (parseFloat(r.ri_decimal) - ridMean) / ridStd : 0;
        const zSsiI = ssiStd > 0 ? (r.ssi              - ssiMean) / ssiStd : 0;

        const wed = Math.sqrt(
          wWedSMI   * Math.pow(zSmiS - zSmiI, 2) +
          wWedCLI   * Math.pow(zCliS - zCliI, 2) +
          wWedRIDec * Math.pow(zRidS - zRidI, 2) +
          wWedSize  * Math.pow(zSsiS - zSsiI, 2)
        );
        return { ...r, _wed: wed };
      });

      scored.sort((a, b) => a._wed - b._wed);

      console.log(`Phase 1 Step 4 — WED top ${targetRangeHigh} of ${scored.length}:`);
      scored.slice(0, Math.min(5, scored.length)).forEach((r, i) => {
        console.log(`  ${i + 1}. ID=${r.id} WED=${r._wed.toFixed(4)} smi=${r.smi} cli=${r.cli} rid=${r.ri_decimal} ssi=${r.ssi}`);
      });

      pool = scored.slice(0, targetRangeHigh).map(({ _wed, ...r }) => r);
      console.log(`Phase 1 Step 4 — WED cut: kept ${pool.length} records`);
    }
    filterCounts.push({ label: 'Filtered by SMI, CLI, Subject & Size', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after WED filter: ${pool.length} records remain.`);
    }

    // ── Narrative (AI analysis) ───────────────────────────────────────────────
    // Identical to v1 — no changes to narrative generation.
    let aiAnalysis = "";
    if (!skipNarrative) {
      try {
        const promptPath = path.join(__dirname, "public", "prompts", "VALUATION_DESCRIPTION.txt");
        const prompt = fs.readFileSync(promptPath, "utf8").trim();
        if (prompt.length < 50) throw new Error("VALUATION_DESCRIPTION.txt not found or too short");

        const textContent = subjectDescription
          ? `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}\nArtist's subject description: "${subjectDescription}"`
          : `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}`;

        let processedImageBase64 = subjectImageBase64;
        let processedImageType   = "image/jpeg";

        try {
          const sharp       = require('sharp');
          const inputBuffer = Buffer.from(subjectImageBase64, 'base64');
          console.log(`v2 original image buffer size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
          const resized = await sharp(inputBuffer)
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
          console.log(`v2 processed image buffer size: ${(resized.length / 1024 / 1024).toFixed(2)} MB`);
          if (resized.length > 4.5 * 1024 * 1024) {
            const recompressed = await sharp(resized).jpeg({ quality: 75 }).toBuffer();
            processedImageBase64 = recompressed.toString('base64');
            console.log(`v2 recompressed image buffer size: ${(recompressed.length / 1024 / 1024).toFixed(2)} MB`);
          } else {
            processedImageBase64 = resized.toString('base64');
          }
          processedImageType = 'image/jpeg';
        } catch (sharpError) {
          console.error("v2 sharp preprocessing failed:", sharpError.message);
          return res.status(500).json({
            error: "We were unable to process your image. Please try a different image or contact support@theartisansascent.com."
          });
        }

        const messages = [{
          role: "user",
          content: [
            { type: "text", text: textContent },
            { type: "image_url", image_url: { url: `data:${processedImageType};base64,${processedImageBase64}` } }
          ]
        }];

        aiAnalysis = await callAI(messages, 300, prompt, false, narrativeTemperature);
        console.log("v2 AI analysis completed successfully");
      } catch (error) {
        console.error("v2 analysis failed:", error.message);
        return res.status(500).json({
          error: "Analysis failed",
          details: error.response?.data?.error?.message || error.message
        });
      }
    }

    // ── Phase 2 Step 1 — Price adjustments on all 40 ─────────────────────────
    const sizeConstant = parseFloat(coefficients['coef_size_constant']);
    const sizeExponent = parseFloat(coefficients['coef_size_exponent']);
    const coef_A       = parseFloat(coefficients['coef_A']);
    const coef_B       = parseFloat(coefficients['coef_B']);
    const coef_C       = parseFloat(coefficients['coef_C']);
    const coef_p5      = parseFloat(coefficients['coef_p5']);
    const coef_p25     = parseFloat(coefficients['coef_p25']);
    const coef_p50     = parseFloat(coefficients['coef_p50']);
    const coef_p75     = parseFloat(coefficients['coef_p75']);
    const coef_p95     = parseFloat(coefficients['coef_p95']);

    if (mediumTable[media] === undefined) {
      throw new Error(`Phase 2: no medium index found for subject medium: ${media}`);
    }
    const subjectMediumIdx          = parseFloat(mediumTable[media]);
    const predictedPPSI_at_subject  = sizeConstant * Math.pow(Math.log(subjectSSI), sizeExponent);

    const adjComps = pool.map(r => {
      if (mediumTable[r.medium] === undefined) {
        throw new Error(`Phase 2: no medium index found for comp medium: ${r.medium} (comp ID: ${r.id})`);
      }
      const compMediumIdx         = parseFloat(mediumTable[r.medium]);
      const mediumAdjPPSI         = r.aoppsi * (subjectMediumIdx / compMediumIdx);
      const predictedPPSI_at_comp = sizeConstant * Math.pow(Math.log(r.ssi), sizeExponent);
      const residualFactor        = mediumAdjPPSI / predictedPPSI_at_comp;
      const adjPPSI               = predictedPPSI_at_subject * residualFactor;
      const adjPrice              = adjPPSI * subjectSSI;
      const compSSI               = r.height * r.width;
      const signs = {
        frame:  r.framed === 'Y' ? '−' : '=',
        size:   compSSI > subjectSSI ? '−' : compSSI < subjectSSI ? '+' : '=',
        medium: compMediumIdx > subjectMediumIdx ? '−' : compMediumIdx < subjectMediumIdx ? '+' : '='
      };
      const netAdjPct = Math.round(((adjPrice / r.price) - 1) * 100);
      console.log(`v2 Comp ${r.id}: aoppsi=${r.aoppsi.toFixed(4)}, mediumAdj=${mediumAdjPPSI.toFixed(4)}, residual=${residualFactor.toFixed(4)}, adjPPSI=${adjPPSI.toFixed(4)}, adjPrice=${adjPrice.toFixed(2)}`);
      return {
        id: r.id, aop: r.aop, aoppsi: r.aoppsi, appsi: r.appsi, ssi: r.ssi,
        framed: r.framed, smi: r.smi, cli: r.cli, ri_integer: r.ri_integer, ri_decimal: r.ri_decimal,
        medium: r.medium, artistName: r.artistName, title: r.title,
        height: r.height, width: r.width, price: r.price, thumbnailBase64: r.thumbnailBase64,
        adjPrice, adjPPSI, residualFactor, netAdjPct, signs
      };
    });

    // ── Phase 2 Step 2 — Similarity scalar → targetQuantity ──────────────────
    // Medium penalty:
    //   0   — exact medium match
    //   0.5 — subject Oil & comp Acrylic, or subject Acrylic & comp Oil
    //   1   — all other mismatches
    //
    // Subject penalty (RI decimal group):
    //   Group A: 0, 8  (Abstract / Geometric)
    //   Group B: 1, 2  (Portrait / Figurative)
    //   Group C: 3, 4, 5 (Landscape / Seascape / Cityscape)
    //   Group D: 6, 7  (Floral / Still Life)
    //   Group E: 9     (Animals — isolated)
    //   0 if same group, 1 if different group
    //
    // netAdjPct: z-scored across adjComps, use absolute value
    //
    // score = wSimMedium * mediumPenalty
    //       + wSimSubject * subjectPenalty
    //       + wSimNetAdj * |z_netAdj|
    // Lower score = better match. Ties broken by higher appsi.

    const riDecimalGroup = dec => {
      const d = parseInt(dec);
      if (d === 0 || d === 8) return 'A';
      if (d === 1 || d === 2) return 'B';
      if (d === 3 || d === 4 || d === 5) return 'C';
      if (d === 6 || d === 7) return 'D';
      if (d === 9) return 'E';
      throw new Error(`v2 similarity scalar: unrecognized ri_decimal value: ${dec}`);
    };

    const mediumPenalty = (subjectMedium, compMedium) => {
      if (subjectMedium === compMedium) return 0;
      if (
        (subjectMedium === 'Oil'     && compMedium === 'Acrylic') ||
        (subjectMedium === 'Acrylic' && compMedium === 'Oil')
      ) return 0.5;
      return 1;
    };

    const subjectGroup = riDecimalGroup(subjectRIDecimal);

    const adjValues   = adjComps.map(c => Math.abs(c.netAdjPct));
    const adjMeanV    = adjValues.reduce((s, v) => s + v, 0) / adjValues.length;
    const adjStdV     = Math.sqrt(adjValues.reduce((s, v) => s + Math.pow(v - adjMeanV, 2), 0) / adjValues.length);

    const scored = adjComps.map(c => {
      const mPenalty = mediumPenalty(media, c.medium);
      const sPenalty = riDecimalGroup(c.ri_decimal) === subjectGroup ? 0 : 1;
      const zAdj     = adjStdV > 0 ? Math.abs(c.netAdjPct) / adjStdV : 0;
      const score    = wSimMedium * mPenalty + wSimSubject * sPenalty + wSimNetAdj * zAdj;
      return { ...c, _score: score };
    });

    scored.sort((a, b) => a._score !== b._score ? a._score - b._score : b.appsi - a.appsi);

    console.log(`v2 Phase 2 Step 2 — Similarity scalar (w_sim_medium=${wSimMedium}, w_sim_subject=${wSimSubject}, w_sim_netadj=${wSimNetAdj}):`);
    scored.forEach((c, i) => {
      console.log(`  ${i + 1}. ID=${c.id} score=${c._score.toFixed(4)} medium=${c.medium} rid=${c.ri_decimal} netAdj=${c.netAdjPct}%`);
    });

    const similarityFiltered = scored.slice(0, targetQuantity).map(({ _score, ...c }) => c);
    filterCounts.push({ label: 'Filtered by Amount of Adjustment', count: similarityFiltered.length });
    console.log(`v2 Phase 2 Step 2 — Similarity filter: kept ${similarityFiltered.length} from ${adjComps.length}`);

    const topComps = similarityFiltered.sort((a, b) => a.id - b.id);

    // ── Phase 2 Step 5 — CoV10: from final 10 comps ──────────────────────────
    // Used to compute strategic price points — anchored to the actual presented comps.
    const prices10     = topComps.map(c => c.adjPrice);
    const mean10       = prices10.reduce((s, v) => s + v, 0) / prices10.length;
    const std10        = Math.sqrt(prices10.reduce((s, v) => s + Math.pow(v - mean10, 2), 0) / (prices10.length - 1));
    const pooledCoV    = std10 / mean10;
    const poolMean     = mean10;
    console.log(`v2 CoV10 (${topComps.length} final comps): mean=${mean10.toFixed(2)}, std=${std10.toFixed(2)}, CoV=${pooledCoV.toFixed(4)}`);

    // ── Reconciliation outputs ────────────────────────────────────────────────
    const adjPrices    = topComps.map(c => c.adjPrice);
    const sortedAdj    = [...adjPrices].sort((a, b) => a - b);
    const mid          = Math.floor(sortedAdj.length / 2);
    const centralValue = sortedAdj.length % 2 !== 0
      ? sortedAdj[mid]
      : (sortedAdj[mid - 1] + sortedAdj[mid]) / 2;

    console.log(`v2 Reconciliation: centralValue=${centralValue.toFixed(2)} (median of ${topComps.length}), CoV10=${pooledCoV.toFixed(4)}, mean10=${poolMean.toFixed(2)}`);

    const premiumValue     = centralValue * (1 + (coef_A * pooledCoV));
    const marketValue      = centralValue * (1 + (coef_B * pooledCoV));
    const competitiveValue = centralValue * (1 + (coef_C * pooledCoV));

    const qPrice = coef => centralValue * (1 + coef * pooledCoV);
    const qLow   = qPrice(coef_p5);
    const qQ1    = qPrice(coef_p25);
    const qQ2    = qPrice(coef_p50);
    const qQ3    = qPrice(coef_p75);
    const qHigh  = qPrice(coef_p95);

    const poolMinSMI = Math.min(...topComps.map(c => c.smi));
    const poolMaxSMI = Math.max(...topComps.map(c => c.smi));
    const poolMinCLI = Math.min(...topComps.map(c => c.cli));
    const poolMaxCLI = Math.max(...topComps.map(c => c.cli));
    const smiBelow   = smi < poolMinSMI;
    const smiAbove   = smi > poolMaxSMI;
    const cliBelow   = cli < poolMinCLI;
    const cliAbove   = cli > poolMaxCLI;
    const isOutlier  = smiBelow || smiAbove || cliBelow || cliAbove;

    console.log(`v2 Strategic prices: competitive=${competitiveValue.toFixed(2)}, market=${marketValue.toFixed(2)}, premium=${premiumValue.toFixed(2)}`);

    res.json({
      topComps, filterCounts, centralValue, pooledCoV,
      competitiveValue, marketValue, premiumValue,
      qLow, qQ1, qQ2, qQ3, qHigh,
      smiBelow, smiAbove, cliBelow, cliAbove, isOutlier,
      metadata: { coefficients: db.metadata.coefficients, medium: db.metadata.medium },
      ...(skipNarrative ? {} : { aiAnalysis: formatAIAnalysisForReport(aiAnalysis) })
    });

  } catch (error) {
    console.error("v2 Valuation request failed:", error.message);
    console.error("v2 Error stack:", error.stack);
    res.status(500).json({
      error: "Valuation processing failed",
      details: error.response?.data?.error?.message || error.message
    });
  }
});





// ====================
// MAINTENANCE MODE ENDPOINTS
// ====================

const MAINTENANCE_CONFIG_PATH = '/mnt/data/maintenance_config.json';

function readMaintenanceConfig() {
  try {
    if (!fs.existsSync(MAINTENANCE_CONFIG_PATH)) {
      const defaultConfig = {
        offline: false,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(MAINTENANCE_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Created new maintenance config file');
      return defaultConfig;
    }
    
    const data = fs.readFileSync(MAINTENANCE_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading maintenance config:', error.message);
    return { offline: false, lastUpdated: new Date().toISOString() };
  }
}

function writeMaintenanceConfig(offline) {
  try {
    const config = {
      offline: offline,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(MAINTENANCE_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Maintenance config updated: ${offline ? 'OFFLINE' : 'ONLINE'}`);
    return true;
  } catch (error) {
    console.error('Error writing maintenance config:', error.message);
    return false;
  }
}

// GET endpoint - Check if site is in maintenance mode
app.get('/api/maintenance-status', (req, res) => {
  try {
    const config = readMaintenanceConfig();
    console.log(`📊 Maintenance status check: ${config.offline ? 'OFFLINE' : 'ONLINE'}`);
    res.json({ 
      offline: config.offline,
      timestamp: new Date().toISOString(),
      lastUpdated: config.lastUpdated
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST endpoint - Toggle maintenance mode (admin only)
app.post('/api/maintenance-toggle', (req, res) => {
  try {
    const { password, offline } = req.body;
    console.log(`🔧 Maintenance toggle request received: ${offline ? 'OFFLINE' : 'ONLINE'}`);
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-secret-password';
    if (password !== ADMIN_PASSWORD) {
      console.log('❌ Unauthorized maintenance toggle attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const success = writeMaintenanceConfig(offline);
    if (!success) {
      return res.status(500).json({ error: 'Failed to update maintenance status' });
    }
    console.log(`✅ Maintenance mode ${offline ? 'ENABLED' : 'DISABLED'}`);
    res.json({ 
      success: true,
      offline: offline,
      message: `Site is now ${offline ? 'OFFLINE' : 'ONLINE'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET endpoint - Retrieve current active model and valid model list
app.get("/api/model-status", (req, res) => {
  try {
    const modelConfig = readModelConfig();
    if (!modelConfig) {
      return res.json({
        success: true,
        activeModel: null,
        message: "No model configured. Please select a model to activate TAA apps."
      });
    }
    res.json({
      success: true,
      activeModel: modelConfig.activeModel,
      lastUpdated: modelConfig.lastUpdated
    });
  } catch (error) {
    console.error("Error getting model status:", error);
    res.status(500).json({ success: false, error: "Failed to read model status" });
  }
});

// POST endpoint - Switch active model (admin only)
app.post('/api/model-switch', (req, res) => {
  try {
    const { password, model } = req.body;
    console.log(`🤖 Model switch request received: ${model}`);
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-secret-password';
    if (password !== ADMIN_PASSWORD) {
      console.log('❌ Unauthorized model switch attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!VALID_AI_MODELS.includes(model)) {
      console.log(`❌ Invalid model requested: ${model}`);
      return res.status(400).json({ error: `Invalid model. Must be one of: ${VALID_AI_MODELS.join(', ')}` });
    }
    const success = writeModelConfig(model);
    if (!success) {
      return res.status(500).json({ error: 'Failed to update model config' });
    }
    console.log(`✅ Active model switched to: ${model}`);
    res.json({
      success: true,
      activeModel: model,
      message: `Active model switched to ${model}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error switching model:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================
// API ROUTES
// ====================

// Serve full-size images from disk
app.get("/api/records/:id/full-image", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }
    const imagePath = path.join("/mnt/data/images", `record_${recordId}.jpg`);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Full image not found" });
    }
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving full image:", error);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

app.get("/api/records/:id/full-image-base64", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }
    const imagePath = path.join("/mnt/data/images", `record_${recordId}.jpg`);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Full image not found" });
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    res.json({ base64, imageType: "image/jpeg" });
  } catch (error) {
    console.error("Error serving full image as base64:", error);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

// Generic endpoint for serving prompts
app.get("/prompts/:calculatorType", (req, res) => {
  const { calculatorType } = req.params;
  let promptPath = path.join(__dirname, "public", "prompts", `${calculatorType}_prompt.txt`);
  if (!fs.existsSync(promptPath)) {
    promptPath = path.join(__dirname, "public", "prompts", `${calculatorType}.txt`);
  }
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.status(404).json({
      error: { message: `Prompt for ${calculatorType} not found` }
    });
  }
});

// Legacy endpoints for backward compatibility
app.get("/PromptCalcRI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "RI_prompt.txt");
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.redirect("/prompts/RI");
  }
});

app.get("/PromptCalcCLI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "CLI_prompt.txt");
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.redirect("/prompts/CLI");
  }
});

app.get("/PromptCalcSMI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "SMI_prompt.txt");
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.redirect("/prompts/SMI");
  }
});

app.get("/PromptAnalyzeArt.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "PromptAnalyzeArt.txt");
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.status(404).json({
      error: { message: "Analyze Art prompt not found" }
    });
  }
});

// ====================
// REVISED ENDPOINT: Convert Bio to Questionnaire Only
// ====================
app.post("/analyze-cli", async (req, res) => {
  try {
    console.log("Received CLI bio-to-questionnaire request");
    const { prompt, artistName, artistResume, temperature: requestedTemp } = req.body;
    const temperature = typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    if (!artistName) {
      return res.status(400).json({ error: { message: "Artist name is required" } });
    }
    if (!prompt) {
      return res.status(400).json({ error: { message: "Prompt is required" } });
    }

    if (!artistResume || artistResume.trim().length < 10) {
      console.log("Empty or minimal bio provided, returning default questionnaire");
      return res.json({
        questionnaire: {
          education: "none",
          exhibitions: "none",
          awards: "none",
          commissions: "none",
          collections: "none",
          publications: "none",
          institutional: "none"
        },
        source: "default_answers"
      });
    }

    console.log(`Processing bio-to-questionnaire for artist: "${artistName}"`);
    console.log("Sending bio to AI for questionnaire conversion");

    const messages = [
      {
        role: "user",
        content: `Artist: "${artistName}"\n\nArtist Career Information:\n${artistResume}\n\n${prompt}`
      }
    ];

    const systemContent = "You are an expert art career analyst. Analyze the artist's bio and respond with only the requested JSON format.";
    const aiResponse = await callAI(messages, 3000, systemContent, true, temperature);

    const requiredFields = ["education", "exhibitions", "awards", "commissions", "collections", "publications", "institutional"];
    const missingFields = requiredFields.filter(field => !aiResponse[field]);

    if (missingFields.length > 0) {
      console.log(`AI response missing fields: ${missingFields.join(", ")}`);
      return res.status(500).json({
        error: { message: `AI analysis incomplete: missing ${missingFields.join(", ")}` }
      });
    }

    console.log("Sending questionnaire response to frontend");
    res.json({ questionnaire: aiResponse, source: "ai_converted" });
  } catch (error) {
    console.error("Error in bio-to-questionnaire conversion:", error.message);
    res.status(500).json({ error: { message: error.message || "Bio analysis failed" } });
  }
});

app.post("/generate-career-summary", async (req, res) => {
  try {
    console.log("Received career summary request");
    const questionnaire = req.body;
    const { artistName, temperature: requestedTemp } = req.body;
    const temperature = typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    const requiredFields = ["education", "exhibitions", "awards", "commissions", "collections", "publications", "institutional"];
    const missingFields = requiredFields.filter(field => !questionnaire[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: { message: `Missing questionnaire fields: ${missingFields.join(", ")}` }
      });
    }

    const summaryPrompt = `
Based on the following artist career questionnaire responses, write a neutral and academic 1-2 sentence summary about ${artistName}'s career accomplishments.

IMPORTANT: Use a conversational tone with neutral emotional valence, suitable for an academic audience. Be truthful and straightforward. Write in the 3rd person, referring to the artist by name. Focus on their accomplishments and frame any gaps as opportunities for development.

Guidelines:
- Use conversational tone with neutral emotional valence
- Write for an academic audience  
- Write in 3rd person using the artist's name
- Be straightforward about current accomplishments
- Frame gaps as "opportunities" or "potential for development"
- Avoid flowery or overly enthusiastic language
- Keep tone professional but accessible

Artist: ${artistName}

Questionnaire Responses:
- Art Education: ${questionnaire.education}
- Exhibitions: ${questionnaire.exhibitions}  
- Awards & Competitions: ${questionnaire.awards}
- Commissions: ${questionnaire.commissions}
- Collections: ${questionnaire.collections}
- Publications: ${questionnaire.publications}
- Institutional Interest: ${questionnaire.institutional}

Write exactly 1-2 sentences about ${artistName}'s current career level using neutral, academic language that acknowledges accomplishments and notes development opportunities.`;

    console.log("Generating diplomatic career summary in 3rd person");

    const messages = [{ role: "user", content: summaryPrompt }];
    const systemContent = `You are an art career analyst writing about ${artistName}. Use a neutral, academic tone that is conversational but not flowery. Be straightforward and professional.`;
    const summaryText = await callAI(messages, 200, systemContent, false, temperature);

    console.log("Diplomatic career summary generated successfully");
    res.json({ summary: summaryText.trim() });
  } catch (error) {
    console.error("Error generating career summary:", error.message);
    res.status(500).json({ error: { message: "Failed to generate career summary: " + error.message } });
  }
});

// ====================================================================================
// ENDPOINT: SKILL MASTERY INDEX (SMI) - HOLISTIC EVALUATION
// ====================================================================================
app.post("/analyze-smi", async (req, res) => {
  try {
    console.log("Received SMI analysis request");

    // Verify anchors are initialized
    for (let i = 1; i <= 5; i++) {
      if (!anchorAnalyses[i]) {
        console.error(`/analyze-smi: anchor ${i} analysis is missing — server not fully initialized`);
        return res.status(503).json({ error: { message: "Server is still initializing. Please try again in a moment." } });
      }
    }

    const { image, imageType, artTitle, artistName } = req.body;

    if (!image) {
      console.log("Missing image in request");
      return res.status(400).json({ error: { message: "Image is required" } });
    }

    const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!imageType) {
      console.log("Missing imageType in request");
      return res.status(400).json({
        error: { message: "Image type is required. Please contact support@theartisansascent.com if this problem persists." }
      });
    }
    if (!validImageTypes.includes(imageType.toLowerCase())) {
      console.log(`Invalid imageType in request: ${imageType}`);
      return res.status(400).json({
        error: { message: `Unsupported image type: ${imageType}. Please upload a JPEG or PNG file.` }
      });
    }

    console.log(`Processing SMI for: "${artTitle}" by ${artistName}`);

    // Preprocess image
    let processedImageBase64;
    try {
      const inputBuffer = Buffer.from(image, "base64");
      console.log(`Original image buffer size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      const resized = await sharp(inputBuffer)
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      console.log(`Processed image buffer size: ${(resized.length / 1024 / 1024).toFixed(2)} MB`);
      if (resized.length > 4.5 * 1024 * 1024) {
        const recompressed = await sharp(resized).jpeg({ quality: 75 }).toBuffer();
        processedImageBase64 = recompressed.toString("base64");
        console.log(`Recompressed image buffer size: ${(recompressed.length / 1024 / 1024).toFixed(2)} MB`);
      } else {
        processedImageBase64 = resized.toString("base64");
      }
    } catch (sharpError) {
      console.error("analyze-smi sharp preprocessing failed:", sharpError.message);
      return res.status(500).json({
        error: { message: "We were unable to process your image. Please try a different image or contact support@theartisansascent.com." }
      });
    }

    // Step 1: Analyze the subject image using PROMPT_A
    console.log("Analyzing subject artwork...");
    let subjectAnalysis;
    try {
      subjectAnalysis = await analyzeArtwork(processedImageBase64);
    } catch (err) {
      console.error("Subject analysis failed:", err.message);
      return res.status(500).json({ error: { message: "SMI evaluation failed during artwork analysis: " + err.message } });
    }

    // Step 2: Build PROMPT_B with anchor analyses and subject analysis substituted in
    const promptB = PROMPT_B_TEMPLATE
      .replace("{{ANCHOR_1_ANALYSIS}}", anchorAnalyses[1])
      .replace("{{ANCHOR_2_ANALYSIS}}", anchorAnalyses[2])
      .replace("{{ANCHOR_3_ANALYSIS}}", anchorAnalyses[3])
      .replace("{{ANCHOR_4_ANALYSIS}}", anchorAnalyses[4])
      .replace("{{ANCHOR_5_ANALYSIS}}", anchorAnalyses[5])
      .replace("{{SUBJECT_ANALYSIS}}", subjectAnalysis);

    const scoringMessages = [
      { role: "user", content: promptB }
    ];

    console.log("Scoring subject artwork against anchors...");
    let aiResponse;
    try {
      aiResponse = await callAI(scoringMessages, 1000, "", true);
    } catch (err) {
      console.error("Scoring AI call failed:", err.message);
      return res.status(500).json({ error: { message: "SMI evaluation failed during scoring: " + err.message } });
    }

    const smiRaw = aiResponse.smi;
    const justification = aiResponse.justification;

    if (smiRaw === undefined || smiRaw === null) {
      console.error("AI scoring response missing smi field");
      return res.status(500).json({ error: { message: "AI returned incomplete response — missing smi" } });
    }
    if (typeof smiRaw !== "number" || isNaN(smiRaw)) {
      console.error(`AI returned non-numeric smi: ${smiRaw}`);
      return res.status(500).json({ error: { message: `AI returned invalid smi value: ${smiRaw}` } });
    }
    if (smiRaw < 1.0 || smiRaw > 5.0) {
      console.error(`AI returned out-of-range smi: ${smiRaw}`);
      return res.status(500).json({ error: { message: `AI returned out-of-range smi: ${smiRaw}. Must be 1.0–5.0.` } });
    }
    if (!justification || typeof justification !== "string" || justification.trim().length === 0) {
      console.error("AI scoring response missing justification field");
      return res.status(500).json({ error: { message: "AI returned incomplete response — missing justification" } });
    }

    const validIncrements = [1.0,1.25,1.5,1.75,2.0,2.25,2.5,2.75,3.0,3.25,3.5,3.75,4.0,4.25,4.5,4.75,5.0];
    if (!validIncrements.includes(smiRaw)) {
      console.error(`AI returned smi not on 0.25 increment: ${smiRaw}`);
      return res.status(500).json({ error: { message: `AI returned smi not on valid 0.25 increment: ${smiRaw}` } });
    }

    console.log(`SMI result: ${smiRaw}`);
    res.json({ smi: smiRaw, justification: justification.trim() });

  } catch (error) {
    console.error("Unexpected error in SMI analysis:", error);
    res.status(500).json({ error: { message: "Internal server error during analysis" } });
  }
});

// Error handler function
function handleApiError(error, res) {
  console.error("Error in API endpoint:", error);
  if (error.response) {
    console.error("Response status:", error.response.status);
    console.error("Response headers:", error.response.headers);
    console.error("Response data:", JSON.stringify(error.response.data));
  } else if (error.request) {
    console.error("No response received:", error.request);
  } else {
    console.error("Error setting up request:", error.message);
  }
  const errorMessage = error.response?.data?.error?.message || error.message || "An unknown error occurred";
  res.status(500).json({ error: { message: errorMessage, details: error.toString() } });
}

// Endpoint for Representational Index (RI) analysis
app.post("/analyze-ri", async (req, res) => {
  try {
    console.log("Received RI analyze request");
    const { prompt, image, imageType, artTitle, artistName, userDecimal, temperature: requestedTemp } = req.body;
    const temperature = typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!imageType) {
      console.log("Missing imageType in /analyze-ri request");
      return res.status(400).json({
        error: { message: "Image type is required. Please contact support@theartisansascent.com if this problem persists." }
      });
    }
    if (!validImageTypes.includes(imageType.toLowerCase())) {
      console.log(`Invalid imageType in /analyze-ri request: ${imageType}`);
      return res.status(400).json({
        error: { message: `Unsupported image type: ${imageType}. Please upload a JPEG or PNG file.` }
      });
    }
    const validImageType = imageType;

    if (!prompt) {
      console.log("Missing prompt in request");
      return res.status(400).json({ error: { message: "Prompt is required" } });
    }
    if (!image) {
      console.log("Missing image in request");
      return res.status(400).json({ error: { message: "Image is required" } });
    }

    if (userDecimal === undefined || userDecimal === null) {
      console.log("Missing userDecimal in request");
      return res.status(400).json({ error: { message: "Subject category selection is required" } });
    }
    const userDecimalInt = parseInt(userDecimal);
    if (isNaN(userDecimalInt) || userDecimalInt < 0 || userDecimalInt > 9) {
      console.log(`Invalid userDecimal: ${userDecimal}`);
      return res.status(400).json({ error: { message: "Invalid subject category selection" } });
    }

    console.log(`Processing RI request for artwork: "${artTitle}" by ${artistName}`);
    console.log(`Prompt length: ${prompt.length} characters, userDecimal: ${userDecimalInt}`);

    let processedImageBase64 = image;
    let processedImageType = validImageType;

    try {
      const sharp = require('sharp');
      const inputBuffer = Buffer.from(image, 'base64');
      console.log(`RI original image buffer size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      const resized = await sharp(inputBuffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      console.log(`RI processed image buffer size: ${(resized.length / 1024 / 1024).toFixed(2)} MB`);
      if (resized.length > 4.5 * 1024 * 1024) {
        const recompressed = await sharp(resized).jpeg({ quality: 75 }).toBuffer();
        processedImageBase64 = recompressed.toString('base64');
        console.log(`RI recompressed image buffer size: ${(recompressed.length / 1024 / 1024).toFixed(2)} MB`);
      } else {
        processedImageBase64 = resized.toString('base64');
      }
      processedImageType = 'image/jpeg';
    } catch (sharpError) {
      console.error("analyze-ri sharp preprocessing failed:", sharpError.message);
      return res.status(500).json({
        error: { message: "We were unable to process your image. Please try a different image or contact support@theartisansascent.com." }
      });
    }

    console.log("Sending request to AI for RI analysis");

    const messages = [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${processedImageType};base64,${processedImageBase64}` } },
          { type: "text", text: prompt }
        ]
      }
    ];

    const systemContent = "You are an expert fine art analyst specializing in evaluating representational accuracy. Respond with ONLY valid JSON.";

    let aiResponse;
    try {
      aiResponse = await callAI(messages, 2000, systemContent, true, temperature);
      console.log("RI Analysis completed successfully");
    } catch (error) {
      console.log("AI request failed:", error.message);
      return res.status(500).json({ error: { message: "AI analysis failed: " + error.message } });
    }

    const requiredRiFields = ['ri_integer', 'category', 'summary', 'ri_explanation'];
    for (const field of requiredRiFields) {
      if (aiResponse[field] === undefined || aiResponse[field] === null) {
        console.error(`RI response missing required field: ${field}`);
        return res.status(500).json({ error: { message: `AI returned incomplete response — missing field: ${field}` } });
      }
    }

    const riInteger = parseInt(aiResponse.ri_integer);
    if (isNaN(riInteger) || riInteger < 1 || riInteger > 5) {
      console.error(`Invalid ri_integer: ${aiResponse.ri_integer}`);
      return res.status(500).json({ error: { message: `AI returned invalid ri_integer: ${aiResponse.ri_integer}. Must be 1–5.` } });
    }

    const riDecimal = riInteger <= 2 ? 0 : userDecimalInt;
    const riScore = parseFloat(`${riInteger}.${riDecimal}`);

    const subjectCategoryMap = {
      0: 'None (abstract)', 1: 'Portrait', 2: 'Figurative', 3: 'Landscape',
      4: 'Seascape', 5: 'Cityscape', 6: 'Floral', 7: 'Still Life',
      8: 'Geometric / Patterns', 9: 'Animals'
    };
    const subjectCategoryName = subjectCategoryMap[riDecimal];

    const subjectLine = riInteger >= 3
      ? `<p class="ri-meta"><strong>Subject:</strong> ${subjectCategoryName}</p>`
      : '';

    const markdownReport = `
<p class="ri-meta"><strong>RI Category:</strong> ${aiResponse.category}</p>
${subjectLine}

### Analysis
${aiResponse.ri_explanation}

<div class="final-smi"><h2>Representational Index (RI): ${riScore.toFixed(1)}</h2></div>
`;

    console.log(`Sending RI analysis response: integer=${riInteger}, decimal=${riDecimal}, score=${riScore}`);
    res.json({
      analysis:         markdownReport.trim(),
      ri_score:         riScore,
      ri_integer:       riInteger,
      ri_decimal:       riDecimal,
      category:         aiResponse.category,
      subject_category: subjectCategoryName
    });
  } catch (error) {
    console.error("Unexpected error in RI analysis:", error);
    res.status(500).json({ error: { message: "Internal server error during analysis" } });
  }
});

// =======================================
// ART VALUATION SYSTEM API ENDPOINTS
// =======================================

const DB_PATH = '/mnt/data/art_database.json';

function encodeImageWithMime(buffer, originalName) {
  const mimeType = mime.lookup(originalName) || "image/jpeg";
  const base64 = buffer.toString("base64");
  return { imageBase64: `data:${mimeType};base64,${base64}`, mimeType };
}

function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error("Database file not found. The system cannot operate without its database. Please contact support@theartisansascent.com.");
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (Array.isArray(data.records)) {
      data.records.forEach(record => {
        if (record.imageBase64 && !record.imageMimeType) {
          record.imageMimeType = 'image/jpeg';
        }
      });
    }
    return data;
  } catch (error) {
    console.error('Error reading database:', error);
    throw new Error('Database error: ' + error.message);
  }
}

function writeDatabase(data) {
  try {
    console.log(`Writing to database: ${DB_PATH}, records: ${data.records.length}`);
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created directory: ${dbDir}`);
    }
    if (fs.existsSync(DB_PATH)) {
      fs.chmodSync(DB_PATH, 0o666);
      console.log(`Set permissions to 666 for ${DB_PATH}`);
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), { flag: 'w' });
    console.log(`Database write successful`);
  } catch (error) {
    console.error(`Error writing database: ${error.message}, stack: ${error.stack}`);
    throw new Error(`Failed to write database: ${error.message}`);
  }
}

function recalculateAllDerivedFields(data) {
  data.records.forEach(record => {
    calculateDerivedFields(record, data.metadata);
  });
  return data;
}

function calculateRSquared(points, constant, exponent) {
  let sumResidualSquared = 0;
  let sumTotalSquared = 0;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  for (const point of points) {
    const predicted = constant * Math.pow(point.x, exponent);
    sumResidualSquared += Math.pow(point.y - predicted, 2);
    sumTotalSquared += Math.pow(point.y - meanY, 2);
  }
  return 1 - (sumResidualSquared / sumTotalSquared);
}

// ====================================================
// DATA ACCESS ENDPOINTS
// ====================================================

// POST /api/admin/flag-pending-records
// One-time fix: sets pendingScores=true for a hardcoded list of record IDs.
app.post('/api/admin/flag-pending-records', (req, res) => {
  try {
    const targetIds = [748,1354,1837,1991,2138,2155,2210,2445,2557,2830,2862,2904,2943,3130];
    const data = readDatabase();
    const flagged = [];
    const notFound = [];
    for (const id of targetIds) {
      const record = data.records.find(r => parseInt(r.id) === id);
      if (record) {
        record.pendingScores = true;
        flagged.push(id);
      } else {
        notFound.push(id);
      }
    }
    writeDatabase(data);
    res.json({ flagged, notFound, message: `Flagged ${flagged.length} records as pending. Not found: ${notFound.length}` });
  } catch (err) {
    console.error('flag-pending-records error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/create-backup', async (req, res) => {
  try {
    const dbPath = '/mnt/data/art_database.json';
    const imagesDir = '/mnt/data/images';
    const backupDir = '/mnt/data';
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const backupFileName = `backup_art_database_${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupFileName);

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    console.log(`Creating backup with ${data.records.length} records`);

    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    let missingImageCount = 0;

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const publicUrl = `/download/${backupFileName}`;
        console.log(`✅ Backup created: ${backupFileName} (${archive.pointer()} bytes)`);
        if (missingImageCount > 0) {
          console.log(`⚠️ Warning: ${missingImageCount} records had missing full images`);
        }
        resolve(res.json({ 
          message: `Backup created: ${backupFileName}`, 
          downloadUrl: publicUrl,
          warnings: missingImageCount > 0 ? `${missingImageCount} records had missing full images` : null
        }));
      });
      output.on('error', (err) => {
        console.error('❌ Backup output stream error:', err);
        reject(res.status(500).json({ error: 'Failed to create backup file.' }));
      });
      archive.on('error', (err) => {
        console.error('❌ Archive creation error:', err);
        reject(res.status(500).json({ error: 'Failed to create backup archive.' }));
      });
      archive.pipe(output);
      archive.file(dbPath, { name: 'art_database.json' });
      data.records.forEach(record => {
        const imagePath = path.join(imagesDir, `record_${record.id}.jpg`);
        if (fs.existsSync(imagePath)) {
          archive.file(imagePath, { name: `images/record_${record.id}.jpg` });
        } else {
          console.log(`⚠️ Warning: Missing full image for record ${record.id}`);
          missingImageCount++;
        }
      });
      archive.finalize();
    });

  } catch (err) {
    console.error("❌ Failed to create backup:", err);
    res.status(500).json({ error: "Failed to create backup: " + err.message });
  }
});

// GET all records
app.get("/api/records", (req, res) => {
  try {
    const data = readDatabase();
    const includeInactive = req.query.inactive === 'true';
    let records = data.records;
    if (!includeInactive) {
      records = records.filter(record => record.isActive !== false);
    }
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET statistical information
app.get("/api/stats", (req, res) => {
  try {
    const data = readDatabase();
    const totalRecords = data.records.length;
    const incompleteRecords = [];
    data.records.forEach(record => {
      const requiredFields = ['ri_integer', 'ri_decimal', 'cli', 'ssi', 'aop', 'aoppsi', 'appsi'];
      const missingFields = [];
      requiredFields.forEach(field => {
        const value = record[field];
        if (field === 'ri_decimal') {
          if (value === null || value === undefined) missingFields.push(field);
        } else {
          if (value === null || value === undefined || value === 0) missingFields.push(field);
        }
      });
      if (missingFields.length > 0) {
        incompleteRecords.push(record.id);
      }
    });
    res.json({
      totalRecords: totalRecords,
      missingRequiredFields: incompleteRecords.length,
      missingRequiredFieldsIds: incompleteRecords,
      lastUpdated: data.metadata.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/records/:id/image", async (req, res) => {
  console.log(`PATCH /api/records/${req.params.id}/image called`);
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image")) {
      return res.status(400).json({ error: "Invalid or missing Base64 image data" });
    }
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imagePath = path.join("/mnt/data/images", `record_${recordId}.jpg`);
      await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(imagePath);
      console.log(`Full image saved: ${imagePath}`);
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(120, 120, { fit: 'inside' })
        .jpeg({ quality: 70 })
        .toBuffer();
      record.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
      record.imageMimeType = mimeType;
      console.log(`Thumbnail generated for record ${recordId}`);
      delete record.imageBase64;
      writeDatabase(data);
      res.json({ success: true, recordId: record.id, mimeType });
    } catch (imgError) {
      console.error('Image processing failed:', imgError.message);
      res.status(500).json({ error: 'Image processing failed: ' + imgError.message });
    }
  } catch (error) {
    console.error("Error patching imageBase64:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/records/:id/image", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);
    if (!record || !record.imageBase64) {
      return res.status(404).json({ error: "Image not found" });
    }
    const match = record.imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
    if (!match) {
      return res.status(500).json({ error: "Malformed imageBase64 format" });
    }
    const mimeType = match[1];
    const imageData = Buffer.from(match[2], "base64");
    res.setHeader("Content-Type", mimeType);
    res.send(imageData);
  } catch (error) {
    console.error("Image fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET single record by ID
app.get("/api/records/:id", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all metadata (coefficients + medium multipliers)
app.get("/api/coefficients", (req, res) => {
  try {
    const data = readDatabase();
    const metadata = {
      coefficients: data.metadata.coefficients !== undefined && data.metadata.coefficients !== null
        ? data.metadata.coefficients
        : (() => { throw new Error('Database metadata.coefficients is missing.'); })(),
      medium: data.metadata.medium || {},
      mobileApp: data.metadata.mobileApp || {},
      lastUpdated: data.metadata.lastUpdated,
      lastCalculated: data.metadata.lastCalculated
    };
    res.json(metadata);
  } catch (error) {
    console.error('Error loading metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================================================
// POST /api/admin/replace-database — Restore database and images from a ZIP backup.
// Accepts a multipart/form-data upload with field name "backup".
// Streams the file directly to disk via multer — no base64, no memory bloat.
// Supports files of 150MB+ without hitting the express.json 50MB body limit.
// ====================================================================================
app.post('/api/admin/replace-database', uploadBackup.single('backup'), async (req, res) => {
  const tempDir = '/mnt/data/temp_restore';
  const dbPath = '/mnt/data/art_database.json';
  const imagesDir = '/mnt/data/images';
  const backupDbPath = `${dbPath}.backup_${Date.now()}`;
  const backupImagesDir = `${imagesDir}_backup_${Date.now()}`;
  let uploadedFilePath = null;

  try {
    console.log('Starting full database and images restore from ZIP');

    if (!req.file) {
      return res.status(400).json({ error: "No backup file received. Please upload a ZIP file." });
    }

    uploadedFilePath = req.file.path;
    console.log(`ZIP uploaded to: ${uploadedFilePath} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Step 1: Extract ZIP from uploaded temp file
    console.log('Extracting ZIP file...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(uploadedFilePath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // Step 2: Validate extracted contents
    const extractedDbPath = path.join(tempDir, 'art_database.json');
    const extractedImagesDir = path.join(tempDir, 'images');

    if (!fs.existsSync(extractedDbPath)) {
      throw new Error('Invalid backup: art_database.json not found in ZIP');
    }

    console.log('Validating database structure...');
    const restoredData = JSON.parse(fs.readFileSync(extractedDbPath, 'utf-8'));

    if (!restoredData.records || !Array.isArray(restoredData.records)) {
      throw new Error('Invalid backup: missing or invalid records array');
    }

    console.log(`Validated database with ${restoredData.records.length} records`);

    // Step 3: Create safety backups of current data
    console.log('Creating safety backups of current data...');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupDbPath);
    }
    if (fs.existsSync(imagesDir)) {
      fs.cpSync(imagesDir, backupImagesDir, { recursive: true });
    }

    // Step 4: Restore database
    console.log('Restoring database...');
    fs.writeFileSync(dbPath, JSON.stringify(restoredData, null, 2));

    // Step 5: Restore images
    console.log('Restoring images...');
    if (fs.existsSync(imagesDir)) {
      fs.rmSync(imagesDir, { recursive: true });
    }
    fs.mkdirSync(imagesDir, { recursive: true });

    let restoredImageCount = 0;
    let missingImageCount = 0;

    if (fs.existsSync(extractedImagesDir)) {
      const imageFiles = fs.readdirSync(extractedImagesDir);
      for (const filename of imageFiles) {
        const sourcePath = path.join(extractedImagesDir, filename);
        const destPath = path.join(imagesDir, filename);
        try {
          fs.copyFileSync(sourcePath, destPath);
          restoredImageCount++;
        } catch (err) {
          console.error(`Failed to restore image ${filename}:`, err);
          throw new Error(`Failed to restore image ${filename}: ${err.message}`);
        }
      }
    }

    // Verify all records have corresponding images
    restoredData.records.forEach(record => {
      const imagePath = path.join(imagesDir, `record_${record.id}.jpg`);
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️ Warning: Record ${record.id} has no corresponding full image`);
        missingImageCount++;
      }
    });

    // Step 6: Cleanup
    console.log('Cleaning up temporary files...');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    if (fs.existsSync(backupDbPath)) fs.unlinkSync(backupDbPath);
    if (fs.existsSync(backupImagesDir)) fs.rmSync(backupImagesDir, { recursive: true });

    console.log('✅ Restore completed successfully');
    res.json({ 
      message: "Database and images restored successfully.",
      recordCount: restoredData.records.length,
      restoredImages: restoredImageCount,
      missingImages: missingImageCount,
      warnings: missingImageCount > 0 ? `${missingImageCount} records have no corresponding full image` : null
    });

  } catch (error) {
    // ROLLBACK: Restore from safety backups
    console.error('❌ Restore failed, rolling back changes:', error.message);
    try {
      if (fs.existsSync(backupDbPath)) {
        fs.copyFileSync(backupDbPath, dbPath);
        fs.unlinkSync(backupDbPath);
        console.log('✅ Database rollback completed');
      }
      if (fs.existsSync(backupImagesDir)) {
        if (fs.existsSync(imagesDir)) fs.rmSync(imagesDir, { recursive: true });
        fs.cpSync(backupImagesDir, imagesDir, { recursive: true });
        fs.rmSync(backupImagesDir, { recursive: true });
        console.log('✅ Images rollback completed');
      }
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    // Cleanup temp dir and uploaded file
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);

    res.status(500).json({ error: "Failed to restore database and images: " + error.message });
  }
});

app.post('/api/records/batch-delete', (req, res) => {
  try {
    const { recordIds } = req.body;
    const data = readDatabase();
    const initialCount = data.records.length;
    const updatedRecords = data.records.filter(record => !recordIds.includes(record.id));
    const deletedCount = initialCount - updatedRecords.length;
    data.records = updatedRecords;
    data.metadata.lastUpdated = new Date().toISOString();
    writeDatabase(data);
    recordIds.forEach(id => {
      const imagePath = path.join('/mnt/data/images', `record_${id}.jpg`);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Deleted image file: ${imagePath}`);
      }
    });
    console.log(`✅ Batch deleted ${deletedCount} records: ${recordIds.join(', ')}`);
    res.json({ success: true, deletedCount: deletedCount, remainingRecords: updatedRecords.length });
  } catch (error) {
    console.error('❌ Batch delete failed:', error);
    res.status(500).json({ error: 'Batch delete failed' });
  }
});

// MUST be registered before DELETE /api/records/:id
app.delete("/api/records/remove-cli1", (req, res) => {
  try {
    const data = readDatabase();
    const toDelete = data.records.filter(r =>
      r.cli !== null && r.cli !== undefined && parseFloat(r.cli) === 1.0
    );
    if (toDelete.length === 0) {
      console.log("remove-cli1: no records with CLI = 1.0 found.");
      return res.json({ deletedCount: 0 });
    }
    const idsToDelete = toDelete.map(r => r.id);
    data.records = data.records.filter(r => !idsToDelete.includes(r.id));
    data.metadata.lastUpdated = new Date().toISOString();
    writeDatabase(data);
    idsToDelete.forEach(id => {
      const imagePath = path.join('/mnt/data/images', `record_${id}.jpg`);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`remove-cli1: deleted image file ${imagePath}`);
      }
    });
    console.log(`remove-cli1: deleted ${toDelete.length} record(s) with CLI = 1.0 (IDs: ${idsToDelete.join(', ')})`);
    res.json({ deletedCount: toDelete.length });
  } catch (error) {
    console.error("Error in remove-cli1:", error.message);
    res.status(500).json({ error: "Failed to remove CLI 1.0 records", details: error.message });
  }
});

app.delete("/api/records/:id", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }
    const data = readDatabase();
    const index = data.records.findIndex(record => record.id === recordId);
    if (index === -1) {
      return res.status(404).json({ error: "Record not found" });
    }
    data.records.splice(index, 1);
    writeDatabase(data);
    const imagePath = path.join('/mnt/data/images', `record_${recordId}.jpg`);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Deleted image file: ${imagePath}`);
    }
    res.json({ message: "Record permanently deleted" });
  } catch (error) {
    console.error("Error deleting record:", error.message);
    res.status(500).json({ error: "Failed to delete record." });
  }
});

app.get("/api/coefficients/calculate", (req, res) => {
  try {
    const data = readDatabase();
    const activeRecords = data.records.filter(record =>
      record.isActive !== false && (record.ssi || record.size) && (record.aop || record.artOnlyPrice));
    if (activeRecords.length < 10) {
      return res.status(400).json({ error: 'Not enough active records for reliable coefficient calculation' });
    }
    const points = activeRecords.map(record => {
      const ssi = record.ssi || record.size;
      const aop = record.aop || record.artOnlyPrice;
      return { x: Math.log(ssi), y: aop / ssi };
    });
    let bestExponent = 0;
    let bestConstant = 0;
    let bestR2 = -Infinity;
    for (let e = -5; e <= 5; e += 0.1) {
      let sumXeY = 0; let sumXe2 = 0;
      for (const point of points) {
        const xPowE = Math.pow(point.x, e);
        sumXeY += xPowE * point.y;
        sumXe2 += xPowE * xPowE;
      }
      const constant = sumXeY / sumXe2;
      let sumResidualSquared = 0; let sumTotalSquared = 0;
      const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      for (const point of points) {
        const predicted = constant * Math.pow(point.x, e);
        sumResidualSquared += Math.pow(point.y - predicted, 2);
        sumTotalSquared    += Math.pow(point.y - meanY, 2);
      }
      const r2 = 1 - (sumResidualSquared / sumTotalSquared);
      if (r2 > bestR2) { bestR2 = r2; bestExponent = e; bestConstant = constant; }
    }
    res.json({
      current: data.metadata.coefficients,
      proposed: { coef_size_exponent: bestExponent, coef_size_constant: bestConstant, r2: bestR2 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function formatAIAnalysisForReport(aiAnalysis) {
  if (!aiAnalysis) return '';
  try {
    let cleanJson = aiAnalysis;
    if (aiAnalysis.includes('```json')) {
      cleanJson = aiAnalysis.replace(/```json\s*/, '').replace(/\s*```$/, '');
    }
    const startIndex = cleanJson.indexOf('{');
    if (startIndex === -1) throw new Error('No JSON object found');
    let braceCount = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < cleanJson.length; i++) {
      if (cleanJson[i] === '{') braceCount++;
      if (cleanJson[i] === '}') braceCount--;
      if (braceCount === 0) { endIndex = i; break; }
    }
    const jsonOnly = cleanJson.substring(startIndex, endIndex + 1);
    const analysis = JSON.parse(jsonOnly);
    let formattedText = '';
    if (analysis.overview) formattedText += analysis.overview;
    if (analysis.strengths && analysis.strengths.length > 0) {
      formattedText += '\n\nStrengths: ';
      formattedText += analysis.strengths.map(s => `${s.title} - ${s.description}`).join(' ');
    }
    if (analysis.opportunities && analysis.opportunities.length > 0) {
      formattedText += '\n\nAreas for Development: ';
      formattedText += analysis.opportunities.map(opp => {
        let text = opp.category || '';
        if (opp.steps) text += ' ' + opp.steps.map(step => step.description).filter(d => d).join(' ');
        return text;
      }).join(' ');
    }
    return convertToSentenceCase(formattedText.trim());
  } catch (e) {
    console.error('Error formatting AI analysis:', e);
    return convertToSentenceCase(String(aiAnalysis).replace(/[\{\}"]/g, '').trim());
  }
}

function convertToSentenceCase(text) {
  if (!text) return '';
  const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[A-Za-z]/g) || []).length;
  if (uppercaseCount / letterCount > 0.7) {
    return text.toLowerCase().replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
  }
  return text;
}

// =============================================================
// CORE CALCULATION HELPERS
// =============================================================

function calculateAOP(price, framed, coefficients) {
  if (!price || price <= 0) return 0;
  let framePercent = 0;
  if (framed === 'Y' && coefficients &&
      coefficients['coef_frame_constant'] !== undefined &&
      coefficients['coef_frame_exponent'] !== undefined) {
    framePercent = coefficients['coef_frame_constant'] *
                   Math.pow(price, coefficients['coef_frame_exponent']);
    framePercent = Math.max(0, Math.min(1, framePercent));
  }
  return Math.max(0, price - (price * framePercent));
}

function calculateAPPSI(ssi, aop, coefficients) {
  if (!ssi || !aop || !coefficients ||
      !coefficients['coef_size_constant'] || !coefficients['coef_size_exponent'] ||
      ssi <= 0 || aop <= 0) return 0;
  try {
    const aoppsi = aop / ssi;
    const lssi = Math.log(ssi);
    const predictedPPSI = coefficients['coef_size_constant'] * Math.pow(lssi, coefficients['coef_size_exponent']);
    const residualPercentage = (aoppsi - predictedPPSI) / predictedPPSI;
    const standardLSSI = Math.log(200);
    const predictedPPSIStandard = coefficients['coef_size_constant'] * Math.pow(standardLSSI, coefficients['coef_size_exponent']);
    const appsi = predictedPPSIStandard * (1 + residualPercentage);
    return isFinite(appsi) && appsi > 0 ? appsi : 0;
  } catch (error) {
    console.error("APPSI calculation error: " + error.message);
    return 0;
  }
}

function getMediumIndex(medium, mediumCoefficients) {
  if (!medium || !mediumCoefficients) return 1.0;
  if (mediumCoefficients[medium] !== undefined) return parseFloat(mediumCoefficients[medium]) || 1.0;
  const key = Object.keys(mediumCoefficients).find(k => k.toLowerCase() === medium.toLowerCase());
  return key ? (parseFloat(mediumCoefficients[key]) || 1.0) : 1.0;
}




function calculateDerivedFields(record, metadata) {
  if (!metadata.coefficients) throw new Error('calculateDerivedFields: metadata.coefficients is missing.');
  const coefficients = metadata.coefficients;
  const height = parseFloat(record.height) || 0;
  const width  = parseFloat(record.width)  || 0;
  record.ssi = height * width;
  const price = parseFloat(record.price) || 0;
  record.aop = calculateAOP(price, record.framed || 'N', coefficients);
  record.aoppsi = (record.ssi > 0 && record.aop > 0) ? record.aop / record.ssi : 0;
  record.appsi = calculateAPPSI(record.ssi, record.aop, coefficients);

  return record;
}

function calculateArtOnlyPrice(price, framed, coefficients) {
  return calculateAOP(price, framed, coefficients);
}

// POST /api/records — Add new record
app.post("/api/records", async (req, res) => {
  try {
    const data = readDatabase();
    const requiredFields = ['artistName', 'title', 'height', 'width', 'price'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    // SMI, CLI, RI are optional — missing any one triggers pendingScores
    const smiRaw    = req.body.smi        !== undefined && req.body.smi        !== null && req.body.smi        !== '' ? parseFloat(req.body.smi)        : null;
    const cliRaw    = req.body.cli        !== undefined && req.body.cli        !== null && req.body.cli        !== '' ? parseFloat(req.body.cli)        : null;
    const riInteger = req.body.ri_integer !== undefined && req.body.ri_integer !== null && req.body.ri_integer !== '' ? parseInt(req.body.ri_integer)   : null;
    const riDecimal = req.body.ri_decimal !== undefined && req.body.ri_decimal !== null && req.body.ri_decimal !== '' ? parseInt(req.body.ri_decimal)   : null;

    if (smiRaw !== null) {
      const validIncrements = [1.0,1.25,1.5,1.75,2.0,2.25,2.5,2.75,3.0,3.25,3.5,3.75,4.0,4.25,4.5,4.75,5.0];
      if (isNaN(smiRaw) || !validIncrements.includes(smiRaw)) {
        return res.status(400).json({ error: `smi must be a valid 0.25-increment value between 1.0 and 5.0. Got: "${req.body.smi}"` });
      }
    }
    if (cliRaw !== null && (isNaN(cliRaw) || cliRaw < 1.0 || cliRaw > 5.0)) {
      return res.status(400).json({ error: `cli must be 1.00 to 5.00. Got: "${req.body.cli}"` });
    }
    if (riInteger !== null || riDecimal !== null) {
      if (riInteger === null || riDecimal === null) {
        return res.status(400).json({ error: 'ri_integer and ri_decimal must both be provided together.' });
      }
      if (isNaN(riInteger) || riInteger < 1 || riInteger > 5) {
        return res.status(400).json({ error: `ri_integer must be 1 to 5. Got: "${req.body.ri_integer}"` });
      }
      if (isNaN(riDecimal) || riDecimal < 0 || riDecimal > 9) {
        return res.status(400).json({ error: `ri_decimal must be 0 to 9. Got: "${req.body.ri_decimal}"` });
      }
      if (riInteger <= 2 && riDecimal !== 0) {
        return res.status(400).json({ error: `RI validation failed: ri_integer ${riInteger} requires ri_decimal 0, got ${riDecimal}.` });
      }
      if (riInteger >= 3 && riDecimal === 0) {
        return res.status(400).json({ error: `RI validation failed: ri_integer ${riInteger} requires ri_decimal 1–9, got 0.` });
      }
    }

    const pendingScores = (smiRaw === null || cliRaw === null || riInteger === null || riDecimal === null);

    const maxId = data.records.length > 0
      ? data.records.reduce((max, record) => {
          const id = Number(record.id);
          return isNaN(id) ? max : Math.max(max, id);
        }, 0)
      : 0;
    const newId = maxId + 1;
    const { id, ...bodyWithoutId } = req.body;
    const newRecord = {
      id: newId,
      isActive: true,
      dateAdded: new Date().toISOString(),
      ...bodyWithoutId,
      smi:         smiRaw,
      cli:         cliRaw,
      ri_integer:  riInteger,
      ri_decimal:  riDecimal,
      pendingScores: pendingScores
    };

    calculateDerivedFields(newRecord, data.metadata);
    delete newRecord.imagePath;
    delete newRecord.size;
    delete newRecord.artOnlyPrice;
    delete newRecord.ppsi;

    if (newRecord.imageBase64) {
      try {
        const base64Data = newRecord.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imagePath = path.join("/mnt/data/images", `record_${newId}.jpg`);
        await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(imagePath);
        console.log(`Full image saved: ${imagePath}`);
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(120, 120, { fit: 'inside' })
          .jpeg({ quality: 70 })
          .toBuffer();
        newRecord.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
        delete newRecord.imageBase64;
      } catch (imgError) {
        console.error('Image processing failed:', imgError.message);
      }
    }

    data.records.push(newRecord);
    console.log(`New record: ID=${newId}, Artist=${newRecord.artistName}, Title=${newRecord.title}, aop=${newRecord.aop}, appsi=${newRecord.appsi}, smi=${newRecord.smi}`);
    writeDatabase(data);
    res.status(201).json({ ...newRecord, id: newId });
  } catch (error) {
    console.error('Error saving record:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/records/:id — Update existing record
app.put("/api/records/:id", async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }
    const data = readDatabase();
    const index = data.records.findIndex(r => r.id === recordId);
    if (index === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }
    const updatedRecord = {
      ...data.records[index],
      ...req.body,
      id: recordId,
      dateAdded: data.records[index].dateAdded
    };

    if (req.body.smi !== undefined) {
      const v = req.body.smi === null || req.body.smi === '' ? null : parseFloat(req.body.smi);
      if (v !== null) {
        const validIncrements = [1.0,1.25,1.5,1.75,2.0,2.25,2.5,2.75,3.0,3.25,3.5,3.75,4.0,4.25,4.5,4.75,5.0];
        if (isNaN(v) || !validIncrements.includes(v)) return res.status(400).json({ error: `smi must be a valid 0.25-increment value between 1.0 and 5.0. Got: "${req.body.smi}"` });
      }
      updatedRecord.smi = v;
    }
    if (req.body.cli !== undefined) {
      const v = parseFloat(req.body.cli);
      if (isNaN(v) || v < 1.0 || v > 5.0) return res.status(400).json({ error: 'cli must be 1.00 to 5.00' });
      updatedRecord.cli = v;
    }
    if (req.body.ri_integer !== undefined || req.body.ri_decimal !== undefined) {
      if (req.body.ri_integer === undefined || req.body.ri_decimal === undefined) {
        return res.status(400).json({ error: 'ri_integer and ri_decimal must both be provided together.' });
      }
      const riInt = parseInt(req.body.ri_integer);
      const riDec = parseInt(req.body.ri_decimal);
      if (isNaN(riInt) || riInt < 1 || riInt > 5) {
        return res.status(400).json({ error: 'ri_integer must be 1 to 5.' });
      }
      if (isNaN(riDec) || riDec < 0 || riDec > 9) {
        return res.status(400).json({ error: 'ri_decimal must be 0 to 9.' });
      }
      if (riInt <= 2 && riDec !== 0) {
        return res.status(400).json({ error: `RI validation failed: ri_integer ${riInt} requires ri_decimal 0, got ${riDec}.` });
      }
      if (riInt >= 3 && riDec === 0) {
        return res.status(400).json({ error: `RI validation failed: ri_integer ${riInt} requires ri_decimal 1–9, got 0.` });
      }
      updatedRecord.ri_integer = riInt;
      updatedRecord.ri_decimal = riDec;
    }

    delete updatedRecord.size;
    delete updatedRecord.artOnlyPrice;
    delete updatedRecord.ppsi;
    delete updatedRecord.imagePath;

    // If caller explicitly sets pendingScores (e.g. batch error handler), honor it.
    // Otherwise recalculate from the current state of all three score groups.
    if (req.body.pendingScores === true) {
      updatedRecord.pendingScores = true;
    } else {
      updatedRecord.pendingScores = (
        updatedRecord.smi        === null || updatedRecord.smi        === undefined ||
        updatedRecord.cli        === null || updatedRecord.cli        === undefined ||
        updatedRecord.ri_integer === null || updatedRecord.ri_integer === undefined ||
        updatedRecord.ri_decimal === null || updatedRecord.ri_decimal === undefined
      );
    }

    calculateDerivedFields(updatedRecord, data.metadata);

    if (req.body.imageBase64) {
      try {
        const base64Data = updatedRecord.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imagePath = path.join("/mnt/data/images", `record_${recordId}.jpg`);
        await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(imagePath);
        console.log(`Full image saved: ${imagePath}`);
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(120, 120, { fit: 'inside' })
          .jpeg({ quality: 70 })
          .toBuffer();
        updatedRecord.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
        delete updatedRecord.imageBase64;
      } catch (imgError) {
        console.error('Image processing failed:', imgError.message);
      }
    }

    data.records[index] = updatedRecord;
    writeDatabase(data);
    console.log(`Updated record ${recordId}: aop=${updatedRecord.aop}, appsi=${updatedRecord.appsi}, smi=${updatedRecord.smi}`);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate all derived fields across all records (admin utility)
app.post("/api/records/recalculate-all", (req, res) => {
  try {
    const data = readDatabase();
    let updatedCount = 0;
    data.records.forEach(record => {
      calculateDerivedFields(record, data.metadata);
      updatedCount++;
    });
    writeDatabase(data);
    res.json({
      message: "Successfully recalculated all derived fields for all records",
      updatedRecords: updatedCount
    });
  } catch (error) {
    console.error("Error in recalculate-all:", error);
    res.status(500).json({ error: "Failed to recalculate derived fields", details: error.message });
  }
});

// POST /api/records/remove-obsolete-fields
app.post("/api/records/remove-obsolete-fields", (req, res) => {
  try {
    const data = readDatabase();
    const obsoleteFields = ['smi_subject', 'smi_render', 'integer', 'gate1_score', 'gate2_score'];
    let recordsUpdated = 0;
    let fieldsRemoved = 0;
    data.records.forEach(record => {
      let touched = false;
      obsoleteFields.forEach(field => {
        if (field in record) { delete record[field]; fieldsRemoved++; touched = true; }
      });
      if (touched) recordsUpdated++;
    });
    writeDatabase(data);
    res.json({ message: `Obsolete record fields removed successfully`, recordsUpdated, fieldsRemoved });
  } catch (error) {
    console.error("Error removing obsolete record fields:", error.message);
    res.status(500).json({ error: "Failed to remove obsolete record fields", details: error.message });
  }
});

// POST /api/metadata/remove-obsolete-fields
app.post("/api/metadata/remove-obsolete-fields", (req, res) => {
  try {
    const data = readDatabase();
    const obsoleteFields = ['coef_smi_subject', 'coef_smi_render'];
    const fieldsRemoved = [];
    obsoleteFields.forEach(field => {
      if (field in data.metadata.coefficients) {
        delete data.metadata.coefficients[field];
        fieldsRemoved.push(field);
      }
    });
    data.metadata.lastUpdated = new Date().toISOString();
    writeDatabase(data);
    res.json({ message: `Obsolete metadata fields removed successfully`, fieldsRemoved });
  } catch (error) {
    console.error("Error removing obsolete metadata fields:", error.message);
    res.status(500).json({ error: "Failed to remove obsolete metadata fields", details: error.message });
  }
});

// POST /api/coefficients — Save metadata and recalculate all derived fields
app.post("/api/coefficients", (req, res) => {
  try {
    const data = readDatabase();
    const numericFields = ['coef_size_constant', 'coef_size_exponent', 'coef_frame_constant', 'coef_frame_exponent',
                           'target_quantity', 'target_multiple'];
    for (const field of numericFields) {
      if (req.body[field] !== undefined) {
        const v = parseFloat(req.body[field]);
        if (isNaN(v)) return res.status(400).json({ error: `${field} must be a valid number. Got: "${req.body[field]}"` });
      }
    }

    if (!data.metadata.coefficients) {
      data.metadata.coefficients = {};
    }
    Object.keys(req.body).forEach(key => {
      if (key !== "medium" && key !== "mobileApp") {
        data.metadata.coefficients[key] = req.body[key];
      }
    });
    if (req.body.medium) {
      data.metadata.medium = { ...data.metadata.medium, ...req.body.medium };
    }
    if (req.body.mobileApp) {
      data.metadata.mobileApp = { ...data.metadata.mobileApp, ...req.body.mobileApp };
    }
    data.metadata.lastUpdated = new Date().toISOString();
    let recalculatedCount = 0;
    data.records.forEach(record => {
      calculateDerivedFields(record, data.metadata);
      recalculatedCount++;
    });
    writeDatabase(data);
    res.json({
      message: "Coefficients updated successfully",
      recalculatedRecords: recalculatedCount,
      coefficients: data.metadata.coefficients,
      medium: data.metadata.medium,
      mobileApp: data.metadata.mobileApp
    });
  } catch (error) {
    console.error("Error updating coefficients:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sizeyourprice", (req, res) => {
  try {
    const data = readDatabase();
    const coefficients = {
      coef_size_constant: data.metadata.coefficients.coef_size_constant,
      coef_size_exponent: data.metadata.coefficients.coef_size_exponent
    };
    const mobileApp = data.metadata.mobileApp || {};
    res.json({
      ...coefficients,
      syp_video_heading: mobileApp.syp_video_heading,
      syp_video_id:      mobileApp.syp_video_id,
      syp_cta_text:      mobileApp.syp_cta_text,
      syp_cta_url:       mobileApp.syp_cta_url,
    });
  } catch (error) {
    console.error("Error in Size Your Price endpoint:", error);
    res.status(500).json({ error: { message: error.message || "An error occurred retrieving the coefficients" } });
  }
});

app.post("/analyze-art", async (req, res) => {
  try {
    console.log("Received art analysis request");
    const { prompt, image, artTitle, artistName, subjectPhrase, medium, temperature: requestedTemp } = req.body;
    const temperature = typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    if (!prompt || !image) {
      return res.status(400).json({ error: { message: "Missing prompt or image" } });
    }

    const finalPrompt = prompt
      .replace("{{TITLE}}", artTitle)
      .replace("{{ARTIST}}", artistName)
      .replace("{{SUBJECT}}", subjectPhrase)
      .replace("{{MEDIUM}}", medium)
      .replace("{{INTENT}}", subjectPhrase);

    let processedImageBase64 = image;
    let processedImageType = "image/jpeg";

    try {
      const sharp = require('sharp');
      const inputBuffer = Buffer.from(image, 'base64');
      console.log(`analyze-art original image buffer size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      const resized = await sharp(inputBuffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      console.log(`analyze-art processed image buffer size: ${(resized.length / 1024 / 1024).toFixed(2)} MB`);
      if (resized.length > 4.5 * 1024 * 1024) {
        const recompressed = await sharp(resized).jpeg({ quality: 75 }).toBuffer();
        processedImageBase64 = recompressed.toString('base64');
        console.log(`analyze-art recompressed image buffer size: ${(recompressed.length / 1024 / 1024).toFixed(2)} MB`);
      } else {
        processedImageBase64 = resized.toString('base64');
      }
      processedImageType = 'image/jpeg';
    } catch (sharpError) {
      console.error("analyze-art sharp preprocessing failed:", sharpError.message);
      return res.status(500).json({
        error: { message: "We were unable to process your image. Please try a different image or contact support at support@theartisansascent.com." }
      });
    }

    const messages = [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${processedImageType};base64,${processedImageBase64}` } },
          { type: "text", text: finalPrompt }
        ]
      }
    ];

    const systemContent = "You are an expert fine art analyst specializing in providing constructive feedback and refinement recommendations for artworks. Always respond with valid JSON only.";
    const parsedAnalysis = await callAI(messages, 4000, systemContent, true, temperature);

    if (!parsedAnalysis.overview) {
      console.error("AI response missing required field: overview");
      return res.status(500).json({ error: { message: "The analysis could not be completed — the AI response was missing required content. Please try again. If this continues, contact support@theartisansascent.com." } });
    }
    if (!parsedAnalysis.strengths) {
      console.error("AI response missing required field: strengths");
      return res.status(500).json({ error: { message: "The analysis could not be completed — the AI response was missing required content. Please try again. If this continues, contact support@theartisansascent.com." } });
    }
    if (!parsedAnalysis.opportunities) {
      console.error("AI response missing required field: opportunities");
      return res.status(500).json({ error: { message: "The analysis could not be completed — the AI response was missing required content. Please try again. If this continues, contact support@theartisansascent.com." } });
    }

    if (!parsedAnalysis.recommendedStudy || !Array.isArray(parsedAnalysis.recommendedStudy)) {
      console.error("AI response missing recommendedStudy array");
      return res.status(500).json({ error: { message: "The analysis could not be completed — recommended study factors were missing from the AI response. Please try again. If this continues, contact support@theartisansascent.com." } });
    }

    if (parsedAnalysis.recommendedStudy.length !== 3) {
      console.warn(`Expected 3 recommended study factors, got ${parsedAnalysis.recommendedStudy.length}`);
    }

    const invalidFactors = [];
    parsedAnalysis.recommendedStudy = parsedAnalysis.recommendedStudy.map((study, index) => {
      if (typeof study === 'string') {
        const cleanName = study.replace(/^\d+\.\s*/, "").trim();
        if (VALID_FACTOR_NAMES.includes(cleanName)) {
          return { factor: cleanName, definition: FACTOR_DEFINITIONS[cleanName] };
        } else {
          invalidFactors.push(study);
          return null;
        }
      }
      if (!study || !study.factor) {
        console.error(`Study item at index ${index} missing factor:`, study);
        invalidFactors.push(`[Missing factor at index ${index}]`);
        return null;
      }
      const cleanName = study.factor.replace(/^\d+\.\s*/, "").trim();
      if (VALID_FACTOR_NAMES.includes(cleanName)) {
        return { factor: cleanName, definition: study.definition || FACTOR_DEFINITIONS[cleanName] };
      } else {
        invalidFactors.push(study.factor);
        return null;
      }
    }).filter(Boolean);

    if (invalidFactors.length > 0) {
      console.error("Invalid factors:", invalidFactors);
      return res.status(500).json({ error: { message: "The analysis could not be completed — the AI returned unrecognized study factors. Please try again. If this continues, contact support@theartisansascent.com." } });
    }

    const finalResponse = {
      title: "Analysis: 33 Essential Factors",
      artTitle: artTitle,
      artistName: artistName,
      subjectPhrase: subjectPhrase,
      overview: parsedAnalysis.overview,
      strengths: parsedAnalysis.strengths,
      opportunities: parsedAnalysis.opportunities,
      recommendedStudy: parsedAnalysis.recommendedStudy,
      timestamp: new Date().toISOString()
    };

    console.log("Sending structured art analysis response to client");
    res.json(finalResponse);
  } catch (error) {
    console.error("Error in /analyze-art:", error.message);
    const errMsg = error.response?.data?.error?.message || error.message || "Unknown error";
    res.status(500).json({ error: { message: errMsg } });
  }
});

function formatAIAnalysisForReport(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.warn("No AI response to format");
    return "Analysis not available";
  }
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (e) {
    console.log("AI response is not JSON, returning as plain text");
  }
  return aiResponse.trim();
}

app.post("/api/valuation", async (req, res) => {
  try {
    console.log("Starting valuation process");

    const {
      smi, ri_integer, ri_decimal, cli,
      subjectImageBase64, skipNarrative,
      media, title, artist, subjectDescription, height, width
    } = req.body;

    const narrativeTemperature = 0.5;

    if (smi === undefined || smi === null) throw new Error("Missing required input: smi");
    if (ri_integer === undefined || ri_integer === null) throw new Error("Missing required input: ri_integer");
    if (ri_decimal === undefined || ri_decimal === null) throw new Error("Missing required input: ri_decimal");
    if (cli === undefined || cli === null) throw new Error("Missing required input: cli");
    if (!height) throw new Error("Missing required input: height");
    if (!width) throw new Error("Missing required input: width");
    if (!media) throw new Error("Missing required input: media");
    if (!skipNarrative && !subjectImageBase64) throw new Error("Missing required input: subjectImageBase64");

    const db           = readDatabase();
    const allRecords   = db.records || [];
    const coefficients = db.metadata.coefficients;
    const mediumTable  = db.metadata.medium;

    const requiredCoefs = [
      'coef_size_constant', 'coef_size_exponent',
      'coef_frame_constant', 'coef_frame_exponent',
      'target_quantity', 'target_multiple',
      'coef_A', 'coef_B', 'coef_C',
      'size_prefilter_reduction',
      'w_smi', 'w_adj'
    ];
    for (const field of requiredCoefs) {
      if (coefficients[field] === undefined || coefficients[field] === null) {
        throw new Error(`Server configuration error: metadata field "${field}" is missing.`);
      }
    }

    const targetQuantity         = parseInt(coefficients['target_quantity']);
    const targetMultiple         = parseFloat(coefficients['target_multiple']);
    const targetRangeHigh        = targetQuantity * targetMultiple;
    const sizePrefilterReduction = parseFloat(coefficients['size_prefilter_reduction']);
    const wSMI                   = parseFloat(coefficients['w_smi']);
    const wADJ                   = parseFloat(coefficients['w_adj']);
    const wCLI                   = parseFloat((1 - wSMI - wADJ).toFixed(10));
    if (Math.abs(wSMI + wCLI + wADJ - 1.0) > 0.0001) {
      throw new Error(`Metadata error: w_smi (${wSMI}) + w_adj (${wADJ}) + w_cli (${wCLI}) must equal 1.0.`);
    }
    const subjectSSI             = parseFloat(height) * parseFloat(width);

    const filterCounts = [{ label: 'Database', count: allRecords.length }];

    let pool = allRecords.filter(r =>
      typeof r.appsi      === "number" && r.appsi  > 0 &&
      typeof r.aop        === "number" && r.aop    > 0 &&
      typeof r.ssi        === "number" && r.ssi    > 0 &&
      typeof r.smi        === "number" &&
      typeof r.cli        === "number" &&
      r.ri_integer !== undefined && r.ri_integer !== null &&
      r.ri_decimal !== undefined && r.ri_decimal !== null &&
      r.thumbnailBase64 && r.artistName && r.title &&
      r.height && r.width && r.medium && r.price && r.framed !== undefined
    );

    console.log(`Valid pool: ${pool.length} records with all required fields`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient valid records in database: ${pool.length} found, ${targetQuantity} required.`);
    }

    // Step 1 — Artist multiples
    // Keep highest appsi record per artist across the full valid pool.
    {
      const best = new Map();
      pool.forEach(r => {
        const key = r.artistName.trim().toLowerCase();
        if (!best.has(key) || r.appsi > best.get(key).appsi) {
          best.set(key, r);
        }
      });
      const dedupedPool = Array.from(best.values());
      console.log(`Step 1 — Artist multiples: ${pool.length} → ${dedupedPool.length} records (removed ${pool.length - dedupedPool.length} duplicate artist entries)`);
      pool = dedupedPool;
    }
    filterCounts.push({ label: 'After artist multiples', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after artist multiples: ${pool.length} records remain.`);
    }

    // Step 2 — RI bracket
    const riMin = Math.max(1, ri_integer - 1);
    const riMax = Math.min(5, ri_integer + 1);
    pool = pool.filter(r => r.ri_integer >= riMin && r.ri_integer <= riMax);
    filterCounts.push({ label: 'After RI bracket', count: pool.length });
    console.log(`Step 2 — RI bracket [${riMin}–${riMax}]: ${pool.length} records`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after RI bracket filter: ${pool.length} records remain.`);
    }

    // Step 3 — Size pre-filter
    // Sort by absolute SSI distance from subject (symmetric, both directions).
    // Retain the top (1 - sizePrefilterReduction) fraction, dropping the most
    // distant records first. Guaranteed exactly sizePrefilterReduction reduction.
    {
      const keepCount = Math.ceil(pool.length * (1 - sizePrefilterReduction));
      pool = pool
        .map(r => ({ ...r, _ssiDist: Math.abs(r.ssi - subjectSSI) }))
        .sort((a, b) => a._ssiDist - b._ssiDist)
        .slice(0, keepCount)
        .map(({ _ssiDist, ...r }) => r);
      console.log(`Step 3 — Size pre-filter: kept ${pool.length} closest by |ssi - ${subjectSSI}| (${(sizePrefilterReduction * 100).toFixed(0)}% reduction)`);
    }
    filterCounts.push({ label: 'After size pre-filter', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after size pre-filter: ${pool.length} records remain.`);
    }

    // Step 4 — Medium filter
    if (media === 'Oil') {
      pool = pool.filter(r => r.medium === 'Oil');
    } else if (media === 'Acrylic') {
      pool = pool.filter(r => r.medium === 'Acrylic');
    } else {
      pool = pool.filter(r => r.medium !== 'Oil');
    }
    filterCounts.push({ label: 'After medium filter', count: pool.length });
    console.log(`Step 4 — Medium filter (subject: ${media}): ${pool.length} records`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after medium filter: ${pool.length} records remain.`);
    }

    // Step 5 — Subject filter (ri_decimal rules)
    // If strict filter would drop below targetRangeHigh, supplement with the
    // highest-ID records from the Step 4 pool that did not pass the filter.
    const step4Pool     = pool.slice(); // preserve Step 4 pool for supplementation
    const subjectDecimal = parseInt(ri_decimal);
    const decimalMap = {
      0: [0], 1: 'portrait_special', 2: [2],
      3: [3, 4, 5], 4: [3, 4, 5], 5: [3, 4, 5],
      6: [6, 7, 9, 3], 7: [6, 7, 9, 3], 8: [8, 0], 9: [6, 7, 9, 3]
    };
    const decimalRule = decimalMap[subjectDecimal];
    if (decimalRule === undefined) {
      throw new Error(`No subject category mapping found for ri_decimal: ${subjectDecimal}`);
    }

    let strictFiltered;
    if (decimalRule === 'portrait_special') {
      const portraits   = pool.filter(r => parseInt(r.ri_decimal) === 1);
      const figuratives = pool.filter(r => parseInt(r.ri_decimal) === 2);
      const shuffled    = figuratives.sort(() => Math.random() - 0.5).slice(0, portraits.length);
      strictFiltered    = [...portraits, ...shuffled];
      console.log(`Step 5 — Subject filter (Portrait special): ${portraits.length} portraits + ${shuffled.length} figuratives = ${strictFiltered.length} records`);
    } else {
      strictFiltered = pool.filter(r => decimalRule.includes(parseInt(r.ri_decimal)));
      console.log(`Step 5 — Subject filter (ri_decimal=${subjectDecimal}, allowed: [${decimalRule.join(',')}]): ${strictFiltered.length} records`);
    }

    if (strictFiltered.length >= targetRangeHigh) {
      pool = strictFiltered;
    } else {
      // Supplement with highest-ID records from Step 4 pool that didn't pass subject filter
      const strictIds    = new Set(strictFiltered.map(r => r.id));
      const remainder    = step4Pool
        .filter(r => !strictIds.has(r.id))
        .sort((a, b) => b.id - a.id);
      const needed       = targetRangeHigh - strictFiltered.length;
      const supplemental = remainder.slice(0, needed);
      pool = [...strictFiltered, ...supplemental];
      console.log(`Step 5 — Subject filter supplemented: ${strictFiltered.length} subject matches + ${supplemental.length} newest records = ${pool.length} records`);
    }
    filterCounts.push({ label: 'After subject filter', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after subject filter: ${pool.length} records remain.`);
    }

    // Step 6 — Combined similarity scalar → targetQuantity
    // Z-score normalize SMI, CLI, and |netAdjPct| across the pool.
    // score = w_smi×|z_smi| + w_cli×|z_cli| + w_adj×|z_adj|
    // Lower score = better match. Ties broken by higher appsi.
    // Runs post-adjustment since netAdjPct requires adjPrice.
    console.log(`Phase 1 complete: ${pool.length} records entering Phase 2 adjustments (similarity scalar will select final ${targetQuantity})`);

    let aiAnalysis = "";
    if (!skipNarrative) {
      try {
        const promptPath = path.join(__dirname, "public", "prompts", "VALUATION_DESCRIPTION.txt");
        const prompt = fs.readFileSync(promptPath, "utf8").trim();
        if (prompt.length < 50) throw new Error("VALUATION_DESCRIPTION.txt not found or too short");

        const textContent = subjectDescription
          ? `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}\nArtist's subject description: "${subjectDescription}"`
          : `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}`;

        let processedImageBase64 = subjectImageBase64;
        let processedImageType   = "image/jpeg";

        try {
          const sharp       = require('sharp');
          const inputBuffer = Buffer.from(subjectImageBase64, 'base64');
          console.log(`Valuation original image buffer size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
          const resized = await sharp(inputBuffer)
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
          console.log(`Valuation processed image buffer size: ${(resized.length / 1024 / 1024).toFixed(2)} MB`);
          if (resized.length > 4.5 * 1024 * 1024) {
            const recompressed = await sharp(resized).jpeg({ quality: 75 }).toBuffer();
            processedImageBase64 = recompressed.toString('base64');
            console.log(`Valuation recompressed image buffer size: ${(recompressed.length / 1024 / 1024).toFixed(2)} MB`);
          } else {
            processedImageBase64 = resized.toString('base64');
          }
          processedImageType = 'image/jpeg';
        } catch (sharpError) {
          console.error("Valuation sharp preprocessing failed:", sharpError.message);
          return res.status(500).json({
            error: "We were unable to process your image. Please try a different image or contact support@theartisansascent.com."
          });
        }

        const messages = [{
          role: "user",
          content: [
            { type: "text", text: textContent },
            { type: "image_url", image_url: { url: `data:${processedImageType};base64,${processedImageBase64}` } }
          ]
        }];

        aiAnalysis = await callAI(messages, 300, prompt, false, narrativeTemperature);
        console.log("AI analysis completed successfully");
      } catch (error) {
        console.error("Analysis failed:", error.message);
        return res.status(500).json({
          error: "Analysis failed",
          details: error.response?.data?.error?.message || error.message
        });
      }
    }

    const sizeConstant = parseFloat(coefficients['coef_size_constant']);
    const sizeExponent = parseFloat(coefficients['coef_size_exponent']);
    const coef_A       = parseFloat(coefficients['coef_A']);
    const coef_B       = parseFloat(coefficients['coef_B']);
    const coef_C       = parseFloat(coefficients['coef_C']);
    const coef_p5      = parseFloat(coefficients['coef_p5']);
    const coef_p25     = parseFloat(coefficients['coef_p25']);
    const coef_p50     = parseFloat(coefficients['coef_p50']);
    const coef_p75     = parseFloat(coefficients['coef_p75']);
    const coef_p95     = parseFloat(coefficients['coef_p95']);

    if (mediumTable[media] === undefined) {
      throw new Error(`Phase 2: no medium index found for subject medium: ${media}`);
    }
    const subjectMediumIdx = parseFloat(mediumTable[media]);
    const predictedPPSI_at_subject = sizeConstant * Math.pow(Math.log(subjectSSI), sizeExponent);

    // Capture the full Step 5 pool before similarity filter — used for CoV computation
    const coVPool = pool.slice();

    const adjComps = coVPool.map(r => {
      if (mediumTable[r.medium] === undefined) {
        throw new Error(`Phase 2: no medium index found for comp medium: ${r.medium} (comp ID: ${r.id})`);
      }
      const compMediumIdx = parseFloat(mediumTable[r.medium]);
      const mediumAdjPPSI = r.aoppsi * (subjectMediumIdx / compMediumIdx);
      const predictedPPSI_at_comp = sizeConstant * Math.pow(Math.log(r.ssi), sizeExponent);
      const residualFactor = mediumAdjPPSI / predictedPPSI_at_comp;
      const adjPPSI = predictedPPSI_at_subject * residualFactor;
      const adjPrice = adjPPSI * subjectSSI;
      const compSSI = r.height * r.width;
      const signs = {
        frame:  r.framed === 'Y' ? '−' : '=',
        size:   compSSI > subjectSSI ? '−' : compSSI < subjectSSI ? '+' : '=',
        medium: compMediumIdx > subjectMediumIdx ? '−' : compMediumIdx < subjectMediumIdx ? '+' : '='
      };
      const netAdjPct = Math.round(((adjPrice / r.price) - 1) * 100);
      console.log(`Comp ${r.id}: aoppsi=${r.aoppsi.toFixed(4)}, mediumAdj=${mediumAdjPPSI.toFixed(4)}, residual=${residualFactor.toFixed(4)}, adjPPSI=${adjPPSI.toFixed(4)}, adjPrice=${adjPrice.toFixed(2)}`);
      return {
        id: r.id, aop: r.aop, aoppsi: r.aoppsi, appsi: r.appsi, ssi: r.ssi,
        framed: r.framed, smi: r.smi, cli: r.cli, ri_integer: r.ri_integer, ri_decimal: r.ri_decimal,
        medium: r.medium, artistName: r.artistName, title: r.title,
        height: r.height, width: r.width, price: r.price, thumbnailBase64: r.thumbnailBase64,
        adjPrice, adjPPSI, residualFactor, netAdjPct, signs
      };
    });

    // CoV computed from the full coVPool (target_multiple × targetQuantity records)
    // for stability — not affected by which specific records survive the similarity filter
    const coVAdjPrices = adjComps.map(c => c.adjPrice);
    const poolMean     = coVAdjPrices.reduce((s, v) => s + v, 0) / coVAdjPrices.length;
    const poolStd      = Math.sqrt(coVAdjPrices.reduce((s, v) => s + Math.pow(v - poolMean, 2), 0) / (coVAdjPrices.length - 1));
    const pooledCoV    = poolStd / poolMean;
    console.log(`CoV pool (${adjComps.length} records): mean=${poolMean.toFixed(2)}, std=${poolStd.toFixed(2)}, CoV=${pooledCoV.toFixed(4)}`);

    // Step 6 (post-adjustment) — Combined similarity scalar → targetQuantity
    // Z-score normalize SMI, CLI, and |netAdjPct| across adjComps.
    // score = w_smi×|z_smi| + w_cli×|z_cli| + w_adj×|z_adj|
    // Lower score = better match. Ties broken by higher appsi.
    {
      const smiValues = adjComps.map(c => c.smi);
      const cliValues = adjComps.map(c => c.cli);
      const adjValues = adjComps.map(c => Math.abs(c.netAdjPct));

      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const std  = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);

      const smiMean = mean(smiValues);  const smiStd = std(smiValues, smiMean);
      const cliMean = mean(cliValues);  const cliStd = std(cliValues, cliMean);
      const adjMean = mean(adjValues);  const adjStd = std(adjValues, adjMean);

      const subjectSMIz = smiStd > 0 ? (smi - smiMean) / smiStd : 0;
      const subjectCLIz = cliStd > 0 ? (cli - cliMean) / cliStd : 0;

      const scored = adjComps.map(c => {
        const zSMI  = smiStd > 0 ? (c.smi - smiMean) / smiStd : 0;
        const zCLI  = cliStd > 0 ? (c.cli - cliMean) / cliStd : 0;
        const zADJ  = adjStd > 0 ? Math.abs(c.netAdjPct) / adjStd : 0;  // distance from zero
        const score = wSMI * Math.abs(zSMI - subjectSMIz)
                    + wCLI * Math.abs(zCLI - subjectCLIz)
                    + wADJ * zADJ;
        return { ...c, _score: score };
      });

      scored.sort((a, b) => a._score !== b._score ? a._score - b._score : b.appsi - a.appsi);

      console.log(`Step 6 — Similarity scalar (w_smi=${wSMI}, w_cli=${wCLI}, w_adj=${wADJ}):`);
      scored.forEach((c, i) => {
        console.log(`  ${i + 1}. ID=${c.id} score=${c._score.toFixed(4)} smi=${c.smi} cli=${c.cli} netAdj=${c.netAdjPct}%`);
      });

      const similarityFiltered = scored.slice(0, targetQuantity).map(({ _score, ...c }) => c);
      filterCounts.push({ label: 'After similarity filter', count: similarityFiltered.length });
      console.log(`Step 6 — Similarity filter: kept ${similarityFiltered.length} from ${adjComps.length}`);

      var topComps = similarityFiltered.sort((a, b) => a.id - b.id);
    }

    // centralValue = median of final targetQuantity adjPrices
    const adjPrices   = topComps.map(c => c.adjPrice);
    const sortedAdj   = [...adjPrices].sort((a, b) => a - b);
    const mid         = Math.floor(sortedAdj.length / 2);
    const centralValue = sortedAdj.length % 2 !== 0
      ? sortedAdj[mid]
      : (sortedAdj[mid - 1] + sortedAdj[mid]) / 2;

    console.log(`Reconciliation: centralValue=${centralValue.toFixed(2)} (median of ${topComps.length}), poolMean=${poolMean.toFixed(2)}, pooledCoV=${pooledCoV.toFixed(4)} (from ${adjComps.length} records)`);

    const premiumValue     = centralValue * (1 + (coef_A * pooledCoV));
    const marketValue      = centralValue * (1 + (coef_B * pooledCoV));
    const competitiveValue = centralValue * (1 + (coef_C * pooledCoV));

    const qPrice = coef => centralValue * (1 + coef * pooledCoV);
    const qLow   = qPrice(coef_p5);
    const qQ1    = qPrice(coef_p25);
    const qQ2    = qPrice(coef_p50);
    const qQ3    = qPrice(coef_p75);
    const qHigh  = qPrice(coef_p95);

    const poolMinSMI = Math.min(...topComps.map(c => c.smi));
    const poolMaxSMI = Math.max(...topComps.map(c => c.smi));
    const poolMinCLI = Math.min(...topComps.map(c => c.cli));
    const poolMaxCLI = Math.max(...topComps.map(c => c.cli));
    const smiBelow   = smi < poolMinSMI;
    const smiAbove   = smi > poolMaxSMI;
    const cliBelow   = cli < poolMinCLI;
    const cliAbove   = cli > poolMaxCLI;
    const isOutlier  = smiBelow || smiAbove || cliBelow || cliAbove;

    console.log(`Strategic prices: competitive=${competitiveValue.toFixed(2)}, market=${marketValue.toFixed(2)}, premium=${premiumValue.toFixed(2)}`);

    res.json({
      topComps, filterCounts, centralValue, pooledCoV,
      competitiveValue, marketValue, premiumValue,
      qLow, qQ1, qQ2, qQ3, qHigh,
      smiBelow, smiAbove, cliBelow, cliAbove, isOutlier,
      metadata: { coefficients: db.metadata.coefficients, medium: db.metadata.medium },
      ...(skipNarrative ? {} : { aiAnalysis: formatAIAnalysisForReport(aiAnalysis) })
    });

  } catch (error) {
    console.error("Valuation request failed:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Valuation processing failed",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

app.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join("/mnt/data", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  fileStream.on("error", err => {
    console.error("❌ Download failed:", err);
    res.status(500).send("Error downloading file.");
  });
});

app.get("/api/health", (req, res) => {
  try {
    const stats = fs.statSync(DB_PATH);
    res.json({
      status: "healthy",
      db: { path: DB_PATH, exists: true, size: stats.size, lastModified: stats.mtime }
    });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", error: error.message, dbPath: DB_PATH });
  }
});

// =============================================================
// POST /api/batch/process-record
// =============================================================

function calculateCLI(questionnaire) {
  const weights = {
    education: 0.10, exhibitions: 0.25, awards: 0.15,
    commissions: 0.10, collections: 0.15, publications: 0.15, institutional: 0.10
  };
  const scores = { high: 5.0, mid: 3.0, none: 1.0 };
  let totalScore  = 0;
  let totalWeight = 0;
  for (const [category, weight] of Object.entries(weights)) {
    if (questionnaire[category]) {
      const score = scores[questionnaire[category]] || 1.0;
      totalScore  += score * weight;
      totalWeight += weight;
    }
  }
  const cli = totalWeight > 0 ? totalScore / totalWeight : 1.0;
  return Math.round(cli * 100) / 100;
}

app.post('/api/batch/process-record', async (req, res) => {
  try {
    const { recordId, mode } = req.body;
    if (!recordId || isNaN(parseInt(recordId))) {
      return res.status(400).json({ error: 'recordId is required and must be a valid integer.' });
    }
    if (!mode || typeof mode !== 'object') {
      return res.status(400).json({ error: 'mode must be an object with smi, ri, cli boolean properties.' });
    }
    if (!mode.smi && !mode.ri && !mode.cli) {
      return res.status(400).json({ error: 'At least one of smi, ri, cli must be true in mode.' });
    }

    const id = parseInt(recordId);
    const data = readDatabase();
    const record = data.records.find(r => r.id === id);
    if (!record) {
      return res.status(404).json({ error: `Record ${id} not found.` });
    }
    if (!record.title)      throw new Error(`Record ${id} is missing title`);
    if (!record.artistName) throw new Error(`Record ${id} is missing artistName`);


    const result = { recordId: id };

    let processedImageBase64 = null;
    if (mode.smi || mode.ri) {
      const imagePath = path.join('/mnt/data/images', `record_${id}.jpg`);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Record ${id}: image not found at ${imagePath}. Cannot process SMI/RI without an image.`);
      }
      const rawImageBuffer = fs.readFileSync(imagePath);
      try {
        const resized = await sharp(rawImageBuffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
        processedImageBase64 = (resized.length > 4.5 * 1024 * 1024)
          ? (await sharp(resized).jpeg({ quality: 75 }).toBuffer()).toString('base64')
          : resized.toString('base64');
        console.log(`Record ${id}: image preprocessed (${(processedImageBase64.length / 1024).toFixed(0)}kb base64)`);
      } catch (sharpError) {
        console.warn(`Record ${id}: sharp preprocessing failed — using original:`, sharpError.message);
        processedImageBase64 = rawImageBuffer.toString('base64');
      }
    }

    if (mode.smi) {
      console.log(`Record ${id}: running SMI...`);

      // Verify anchors are initialized
      for (let i = 1; i <= 5; i++) {
        if (!anchorAnalyses[i]) {
          throw new Error(`Record ${id}: SMI cannot run — anchor ${i} analysis is missing. Server may not be fully initialized.`);
        }
      }

      // Step 1: Analyze the subject image
      let subjectAnalysis;
      try {
        subjectAnalysis = await analyzeArtwork(processedImageBase64);
      } catch (err) {
        throw new Error(`Record ${id}: SMI artwork analysis failed — ${err.message}`);
      }

      // Step 2: Score against anchor analyses
      const promptB = PROMPT_B_TEMPLATE
        .replace('{{ANCHOR_1_ANALYSIS}}', anchorAnalyses[1])
        .replace('{{ANCHOR_2_ANALYSIS}}', anchorAnalyses[2])
        .replace('{{ANCHOR_3_ANALYSIS}}', anchorAnalyses[3])
        .replace('{{ANCHOR_4_ANALYSIS}}', anchorAnalyses[4])
        .replace('{{ANCHOR_5_ANALYSIS}}', anchorAnalyses[5])
        .replace('{{SUBJECT_ANALYSIS}}', subjectAnalysis);

      let smiAiResponse;
      try {
        smiAiResponse = await callAI([{ role: 'user', content: promptB }], 1000, '', true, DEFAULT_TEMPERATURE);
      } catch (err) {
        throw new Error(`Record ${id}: SMI scoring failed — ${err.message}`);
      }

      const smiRaw = smiAiResponse.smi;
      if (smiRaw === undefined || smiRaw === null) {
        throw new Error(`Record ${id}: SMI response missing smi field`);
      }
      if (typeof smiRaw !== 'number' || isNaN(smiRaw)) {
        throw new Error(`Record ${id}: SMI returned non-numeric smi: ${smiRaw}`);
      }
      if (smiRaw < 1.0 || smiRaw > 5.0) {
        throw new Error(`Record ${id}: SMI returned out-of-range smi: ${smiRaw}`);
      }
      const validIncrements = [1.0,1.25,1.5,1.75,2.0,2.25,2.5,2.75,3.0,3.25,3.5,3.75,4.0,4.25,4.5,4.75,5.0];
      if (!validIncrements.includes(smiRaw)) {
        throw new Error(`Record ${id}: SMI returned smi not on valid 0.25 increment: ${smiRaw}`);
      }

      result.smi = smiRaw;
      console.log(`Record ${id}: SMI=${result.smi}`);
    }

    if (mode.ri) {
      console.log(`Record ${id}: running RI...`);
      const riPromptPath = path.join(__dirname, 'public', 'prompts', 'RI_decimal_prompt.txt');
      if (!fs.existsSync(riPromptPath)) throw new Error('RI_decimal_prompt.txt not found on disk.');
      const riPrompt = fs.readFileSync(riPromptPath, 'utf8');
      const riSystemContent = 'You are an expert fine art analyst specializing in evaluating representational accuracy. Respond with ONLY valid JSON.';
      const riMessages = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${processedImageBase64}` } },
            { type: 'text', text: riPrompt }
          ]
        }
      ];
      let riAiResponse;
      try {
        riAiResponse = await callAI(riMessages, 2000, riSystemContent, true, DEFAULT_TEMPERATURE);
      } catch (err) {
        throw new Error(`Record ${id}: RI AI call failed — ${err.message}`);
      }
      const requiredRiFields = ['ri_integer', 'ri_decimal', 'ri_score', 'category', 'subject_category'];
      for (const field of requiredRiFields) {
        if (riAiResponse[field] === undefined || riAiResponse[field] === null) {
          throw new Error(`Record ${id}: RI response missing required field: ${field}`);
        }
      }
      const riInteger = parseInt(riAiResponse.ri_integer);
      if (isNaN(riInteger) || riInteger < 1 || riInteger > 5) {
        throw new Error(`Record ${id}: RI returned invalid ri_integer: ${riAiResponse.ri_integer}. Must be 1–5.`);
      }
      const riDecimal = parseInt(riAiResponse.ri_decimal);
      if (isNaN(riDecimal) || riDecimal < 0 || riDecimal > 9) {
        throw new Error(`Record ${id}: RI returned invalid ri_decimal: ${riAiResponse.ri_decimal}. Must be 0–9.`);
      }
      if (riInteger <= 2 && riDecimal !== 0) {
        throw new Error(`Record ${id}: RI business rule violation — integer ${riInteger} requires decimal 0, got ${riDecimal}.`);
      }
      if (riInteger >= 3 && riDecimal === 0) {
        throw new Error(`Record ${id}: RI business rule violation — integer ${riInteger} requires decimal 1–9, got 0.`);
      }
      result.ri_integer = riInteger;
      result.ri_decimal = riDecimal;
      console.log(`Record ${id}: RI=${riInteger}.${riDecimal}`);
    }

    if (mode.cli) {
      if (!record.artistBio || record.artistBio.trim().length < 10) {
        console.log(`Record ${id}: CLI skipped — no artistBio. Using existing CLI value.`);
        result.cli = record.cli || null;
      } else {
        console.log(`Record ${id}: running CLI...`);
        const cliPromptPath = path.join(__dirname, 'public', 'prompts', 'CLI_prompt.txt');
        if (!fs.existsSync(cliPromptPath)) throw new Error('CLI_prompt.txt not found on disk.');
        const cliPrompt = fs.readFileSync(cliPromptPath, 'utf8');
        const cliMessages = [
          {
            role: 'user',
            content: `Artist: "${record.artistName}"\n\nArtist Career Information:\n${record.artistBio}\n\n${cliPrompt}`
          }
        ];
        const cliSystemContent = 'You are an expert art career analyst. Analyze the artist\'s bio and respond with only the requested JSON format.';
        let cliAiResponse;
        try {
          cliAiResponse = await callAI(cliMessages, 3000, cliSystemContent, true, DEFAULT_TEMPERATURE);
        } catch (err) {
          throw new Error(`Record ${id}: CLI AI call failed — ${err.message}`);
        }
        const requiredFields = ['education', 'exhibitions', 'awards', 'commissions', 'collections', 'publications', 'institutional'];
        const missingFields  = requiredFields.filter(f => !cliAiResponse[f]);
        if (missingFields.length > 0) {
          throw new Error(`Record ${id}: CLI response missing fields: ${missingFields.join(', ')}`);
        }
        const cli = calculateCLI(cliAiResponse);
        if (isNaN(cli) || cli < 1.0 || cli > 5.0) {
          throw new Error(`Record ${id}: CLI calculated invalid value: ${cli}`);
        }
        result.cli = cli;
        console.log(`Record ${id}: CLI=${result.cli}`);
      }
    }

    res.json(result);

  } catch (error) {
    console.error(`Batch process-record error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================
// SCRAPER ENDPOINTS
// =============================================================

let activeScrapeJob = null;

app.post('/api/scrape/start', (req, res) => {
  const limit = parseInt(req.body.limit);
  if (isNaN(limit) || limit < 1) {
    return res.status(400).json({ error: 'limit must be a positive integer.' });
  }
  const skip = req.body.skip !== undefined ? parseInt(req.body.skip) : 0;
  if (isNaN(skip) || skip < 0) {
    return res.status(400).json({ error: 'skip must be a non-negative integer.' });
  }
  if (activeScrapeJob && activeScrapeJob.status === 'running') {
    return res.status(409).json({ error: 'A scrape job is already running. Wait for it to complete.' });
  }
  const jobId   = Date.now().toString();
  const scraper = path.join(__dirname, 'scraper_saatchi.js');
  const outputDir = path.join(__dirname, 'scraper_output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({
    status: 'starting', current: 0, total: limit, message: 'Launching scraper...'
  }));
  const child = spawn('node', [scraper, '--limit', String(limit), '--skip', String(skip)], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  activeScrapeJob = { jobId, status: 'running', pid: child.pid, limit, skip };
  child.stdout.on('data', d => console.log('[scraper]', d.toString().trim()));
  child.stderr.on('data', d => console.error('[scraper ERR]', d.toString().trim()));
  child.on('close', (code) => {
    if (activeScrapeJob && activeScrapeJob.jobId === jobId) {
      activeScrapeJob.status = code === 0 ? 'complete' : 'error';
    }
    console.log(`Scraper process exited with code ${code}`);
  });
  res.json({ jobId, status: 'started', limit, skip });
});

app.get('/api/scrape/status/:jobId', (req, res) => {
  if (!activeScrapeJob || activeScrapeJob.jobId !== req.params.jobId) {
    return res.status(404).json({ error: 'Job not found.' });
  }
  if (!fs.existsSync(PROGRESS_PATH)) {
    return res.json({ status: 'starting', current: 0, total: activeScrapeJob.limit, message: 'Starting...' });
  }
  try {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    res.json(progress);
  } catch {
    res.json({ status: 'running', current: 0, total: activeScrapeJob.limit, message: 'Working...' });
  }
});

// POST /api/records/import
app.post('/api/records/import', async (req, res) => {
  try {
    if (!Array.isArray(req.body.records) || req.body.records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty.' });
    }
    const data = readDatabase();
    const report = {
      imported: 0, updated: [], unchanged: 0, probableDuplicates: [], errors: [], skipped: 0
    };

    const byLocationUrl = new Map();
    const byNameTitle   = new Map();
    for (const r of data.records) {
      if (r.locationURL) byLocationUrl.set(r.locationURL.trim().toLowerCase(), r);
      const nameTitle = normalizeNameTitle(r.artistName, r.title);
      if (nameTitle) byNameTitle.set(nameTitle, r);
    }

    let maxId = data.records.length > 0
      ? data.records.reduce((max, r) => {
          const id = Number(r.id);
          return isNaN(id) ? max : Math.max(max, id);
        }, 0)
      : 0;

    for (const incoming of req.body.records) {
      if (incoming.scrapeError) {
        report.errors.push({ locationURL: incoming.locationURL || 'Missing', error: incoming.scrapeError });
        report.skipped++;
        continue;
      }
      const missing = [];
      if (!incoming.artistName || incoming.artistName === 'Missing') missing.push('artistName');
      if (!incoming.title      || incoming.title      === 'Missing') missing.push('title');
      if (!incoming.height     || incoming.height     === 'Missing') missing.push('height');
      if (!incoming.width      || incoming.width      === 'Missing') missing.push('width');
      if (!incoming.price      || incoming.price      === 'Missing') missing.push('price');
      if (missing.length > 0) {
        report.errors.push({ locationURL: incoming.locationURL || 'Missing', error: `Missing required fields: ${missing.join(', ')}` });
        report.skipped++;
        continue;
      }
      const incomingKey = incoming.locationURL ? incoming.locationURL.trim().toLowerCase() : null;
      if (incomingKey && byLocationUrl.has(incomingKey)) {
        const existing = byLocationUrl.get(incomingKey);
        const changes  = {};
        for (const field of ['price', 'lorS', 'framed']) {
          if (incoming[field] !== undefined && incoming[field] !== 'Missing' &&
              String(incoming[field]) !== String(existing[field])) {
            changes[field] = { from: existing[field], to: incoming[field] };
            existing[field] = incoming[field];
          }
        }
        if (Object.keys(changes).length > 0) {
          report.updated.push({ id: existing.id, artistName: existing.artistName, title: existing.title, changes });
        } else {
          report.unchanged++;
        }
        continue;
      }
      const incomingNameTitle = normalizeNameTitle(incoming.artistName, incoming.title);
      if (incomingNameTitle && byNameTitle.has(incomingNameTitle)) {
        report.probableDuplicates.push({
          artistName: incoming.artistName, title: incoming.title,
          locationURL: incoming.locationURL || 'Missing',
          reason: 'Artist name + title match existing record (URL did not match)'
        });
        report.skipped++;
        continue;
      }
      maxId++;
      const newRecord = {
        id: maxId, isActive: true,
        dateAdded: incoming.dateAdded || new Date().toISOString().slice(0, 10),
        pendingScores: true,
        artistName: incoming.artistName, title: incoming.title,
        height: incoming.height, width: incoming.width,
        depth: incoming.depth || 'Missing', price: incoming.price,
        medium: incoming.medium || 'Missing', framed: incoming.framed || 'Missing',
        lorS: incoming.lorS || 'L',
        shortDescription: incoming.shortDescription || 'Missing',
        locationURL: incoming.locationURL || 'Missing',
        website: 'Saatchi Art',
        imageUrl: incoming.imageUrl || 'Missing',
        artistProfileUrl: incoming.artistProfileUrl || 'Missing',
        artistBio: incoming.artistBio || null,
        smi: null, cli: null,
        ri_integer: null, ri_decimal: null,
        ssi: null, aop: null, aoppsi: null, appsi: null,
        pendingScores: true
      };
	  
	  // NEW — uses imageBase64 already fetched by the scraper
if (incoming.imageBase64) {
  try {
    const match = incoming.imageBase64.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/);
    if (!match) throw new Error('imageBase64 is not a valid data URI');
    const imageBuffer = Buffer.from(match[2], 'base64');
    const imagePath = path.join('/mnt/data/images', `record_${maxId}.jpg`);
    await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(imagePath);
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(120, 120, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();
    newRecord.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
    console.log(`Image saved for imported record ${maxId}`);
  } catch (imgError) {
    console.error(`Image processing failed for record ${maxId}:`, imgError.message);
  }
} else if (incoming.imageUrl && incoming.imageUrl !== 'Missing') {
  // Fallback for any staging records that pre-date imageBase64 storage
  try {
    const imgResponse = await axios.get(incoming.imageUrl, {
      responseType: 'arraybuffer', timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.saatchiart.com/'
      }
    });
    const imageBuffer = Buffer.from(imgResponse.data);
    const imagePath = path.join('/mnt/data/images', `record_${maxId}.jpg`);
    await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(imagePath);
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(120, 120, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();
    newRecord.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
    console.log(`Image saved for imported record ${maxId} (CDN fallback)`);
  } catch (imgError) {
    console.error(`Image fetch/processing failed for record ${maxId}:`, imgError.message);
  }
}
 
      data.records.push(newRecord);
      if (incoming.locationURL) byLocationUrl.set(incoming.locationURL.trim().toLowerCase(), newRecord);
      if (incomingNameTitle) byNameTitle.set(incomingNameTitle, newRecord);
      report.imported++;
    }

    writeDatabase(data);
    res.json({ success: true, report });
  } catch (error) {
    console.error('Import error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

function normalizeNameTitle(artistName, title) {
  if (!artistName || !title) return null;
  const parts    = artistName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!lastName || !normTitle) return null;
  return `${lastName}::${normTitle}`;
}



// ====================
// MAILERLITE SUBSCRIBER REGISTRATION
// ====================

const MAILERLITE_API_TOKEN = process.env.MAILERLITE_API_TOKEN;
const MAILERLITE_GROUP_ID  = process.env.MAILERLITE_GROUP_ID;

app.post('/api/register-subscriber', async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!MAILERLITE_API_TOKEN) throw new Error('MAILERLITE_API_TOKEN is not set in environment');
    if (!MAILERLITE_GROUP_ID)  throw new Error('MAILERLITE_GROUP_ID is not set in environment');

    const cleanEmail = email.trim().toLowerCase();

    console.log(`📧 SizeYourPrice subscriber registration: ${cleanEmail}`);

    const response = await axios.post(
      'https://connect.mailerlite.com/api/subscribers',
      {
        email:  cleanEmail,
        groups: [MAILERLITE_GROUP_ID]
      },
      {
        headers: {
          'Authorization': `Bearer ${MAILERLITE_API_TOKEN}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json'
        }
      }
    );

    const subscriberId = response.data?.data?.id;
    console.log(`✅ MailerLite subscriber added: ID ${subscriberId}`);

    res.json({ success: true, message: 'Subscriber registered successfully' });

  } catch (error) {
    console.error('❌ MailerLite subscriber registration failed:', {
      message: error.message,
      status:  error.response?.status,
      data:    error.response?.data
    });
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});



// Serve static files from the "public" folder
app.use(express.static("public"));

// ====================
// START THE SERVER
// ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await initializeAnchors();
  } catch (err) {
    console.error("FATAL: SMI anchor initialization failed:", err.message);
    process.exit(1);
  }
});

// ====================
// SMI ARTWORK ANALYZER
// ====================

async function analyzeArtwork(imageBase64) {
  const messages = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        { type: "text", text: PROMPT_A }
      ]
    }
  ];
  const analysis = await callAI(messages, 1000, "", false);
  if (!analysis || typeof analysis !== "string" || analysis.trim().length === 0) {
    throw new Error("analyzeArtwork: AI returned empty analysis");
  }
  return analysis.trim();
}

// ====================
// ANCHOR INITIALIZATION
// ====================

async function initializeAnchors() {
  console.log("Initializing SMI anchors...");
  const anchorsDir = path.join(__dirname, "public", "anchors");

  for (let i = 1; i <= 5; i++) {
    const imagePath = path.join(anchorsDir, `${i}.jpg`);
    let imageBuffer;
    try {
      imageBuffer = fs.readFileSync(imagePath);
    } catch (err) {
      throw new Error(`initializeAnchors: Failed to read anchor image ${i}.jpg — ${err.message}`);
    }

    const imageBase64 = imageBuffer.toString("base64");
    console.log(`Analyzing anchor ${i}...`);

    let analysis;
    try {
      analysis = await analyzeArtwork(imageBase64);
    } catch (err) {
      throw new Error(`initializeAnchors: Failed to analyze anchor ${i} — ${err.message}`);
    }

    anchorAnalyses[i] = analysis;
    console.log(`Anchor ${i} analysis complete (${analysis.length} chars)`);
  }

  console.log("All 5 SMI anchors initialized.");
}
