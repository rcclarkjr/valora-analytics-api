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

    const { image, imageType, artTitle, artistName, medium, temperature: requestedTemp } = req.body;
    const temperature = typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

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
    const validImageType = imageType;

    console.log(`Processing SMI for: "${artTitle}" by ${artistName}`);
    console.log(`Medium: ${medium}`);

    let processedImageBase64 = image;
    let processedImageType = validImageType;

    try {
      const sharp = require('sharp');
      const inputBuffer = Buffer.from(image, 'base64');
      console.log(`Original image buffer size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      const resized = await sharp(inputBuffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      console.log(`Processed image buffer size: ${(resized.length / 1024 / 1024).toFixed(2)} MB`);
      if (resized.length > 4.5 * 1024 * 1024) {
        const recompressed = await sharp(resized).jpeg({ quality: 75 }).toBuffer();
        processedImageBase64 = recompressed.toString('base64');
        console.log(`Recompressed image buffer size: ${(recompressed.length / 1024 / 1024).toFixed(2)} MB`);
      } else {
        processedImageBase64 = resized.toString('base64');
      }
      processedImageType = 'image/jpeg';
    } catch (sharpError) {
      console.error("analyze-smi sharp preprocessing failed:", sharpError.message);
      return res.status(500).json({
        error: { message: "We were unable to process your image. Please try a different image or contact support@theartisansascent.com." }
      });
    }

    console.log("Loading SMI_prompt...");
    let smiPrompt;
    try {
      const promptResponse = await axios.get('https://valora-analytics-api.onrender.com/prompts/SMI_prompt');
      smiPrompt = promptResponse.data;
    } catch (fileError) {
      console.error("Failed to load SMI_prompt:", fileError.message);
      return res.status(500).json({
        error: { message: "Server configuration error: Missing SMI_prompt file" }
      });
    }

    const fullPrompt = `Medium: ${medium}
(Note: Evaluate the subject and rendering considering what was achieved with this medium. Some mediums make certain techniques easier or harder. The quality of what was achieved in the image is the only measure — the prestige or historical associations of the medium play no role in the evaluation.)

${smiPrompt}`;

    const systemContent = `You are an expert fine art analyst evaluating artwork for relative collector market value. Analyze the artwork and return your evaluation in valid JSON format only.

CRITICAL EVALUATION RULES:
1. Evaluate only what you observe in this image. Every artwork is assessed entirely on its own merits.
2. If you recognize this artwork or its artist, set that recognition aside completely. The historical reputation, critical standing, fame, or importance of the artist or work must play no role in your evaluation. Evaluate what you see, not what you know.
3. Do not reference any other works by this artist, their broader practice, or their development over time.
4. The title and artist name provided are for identification only. Do not use them to infer anything about the work's significance or the artist's stature.`;

    const messages = [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${processedImageType};base64,${processedImageBase64}` } },
          { type: "text", text: fullPrompt }
        ]
      }
    ];

    console.log("Calling AI for SMI evaluation...");

    let aiResponse;
    try {
      aiResponse = await callAI(messages, 1000, systemContent, true, temperature);
    } catch (error) {
      console.error("AI call failed:", error.message);
      return res.status(500).json({ error: { message: "SMI evaluation failed: " + error.message } });
    }

    const { integer, gate1_score, gate2_score, subject_scores, rendering_scores, subject_description, rendering_description } = aiResponse;

    if (integer === undefined || integer === null) {
      console.error("AI response missing integer");
      return res.status(500).json({ error: { message: "AI returned incomplete response — missing integer" } });
    }
    const integerVal = parseInt(integer);
    if (isNaN(integerVal) || integerVal < 1 || integerVal > 5) {
      console.error(`AI returned invalid integer: ${integer}`);
      return res.status(500).json({ error: { message: `AI returned invalid integer: ${integer}. Must be 1–5.` } });
    }

    if (integerVal === 3 || integerVal === 4) {
      if (gate1_score === undefined || gate1_score === null) {
        console.error("AI response missing gate1_score for integer 3/4");
        return res.status(500).json({ error: { message: "AI returned incomplete response — missing gate1_score" } });
      }
      if (gate2_score === undefined || gate2_score === null) {
        console.error("AI response missing gate2_score for integer 3/4");
        return res.status(500).json({ error: { message: "AI returned incomplete response — missing gate2_score" } });
      }
      if (![0, 1, 2].includes(parseInt(gate1_score))) {
        return res.status(500).json({ error: { message: `AI returned invalid gate1_score: ${gate1_score}. Must be 0, 1, or 2.` } });
      }
      if (![0, 1, 2].includes(parseInt(gate2_score))) {
        return res.status(500).json({ error: { message: `AI returned invalid gate2_score: ${gate2_score}. Must be 0, 1, or 2.` } });
      }
    }

    if (integerVal === 5) {
      console.log(`SMI integer=5 (Master) — sub-scores not evaluated`);
      return res.json({
        smi:               5.00,
        smi_subject:       null,
        smi_render:        null,
        integer:           5,
        gate1_score:       0,
        gate2_score:       0,
        subject_scores:    null,
        rendering_scores:  null,
        subject_description:   subject_description !== undefined ? subject_description : null,
        rendering_description: rendering_description !== undefined ? rendering_description : null
      });
    }

    if (!subject_scores || !rendering_scores) {
      console.error("AI response missing subject_scores or rendering_scores");
      return res.status(500).json({ error: { message: "AI returned incomplete response — missing pillar scores" } });
    }

    if (!subject_description || !rendering_description) {
      console.error("AI response missing description fields");
      return res.status(500).json({ error: { message: "AI returned incomplete response — missing description fields" } });
    }

    const sKeys = ['S1','S2','S3','S4','S5'];
    const rKeys = ['R1','R2','R3','R4','R5'];

    for (const k of sKeys) {
      const v = parseFloat(subject_scores[k]);
      if (isNaN(v) || v < 0 || v > 1) {
        console.error(`Invalid subject score ${k}: ${subject_scores[k]}`);
        return res.status(500).json({ error: { message: `Invalid subject score ${k}: ${subject_scores[k]}` } });
      }
    }
    for (const k of rKeys) {
      const v = parseFloat(rendering_scores[k]);
      if (isNaN(v) || v < 0 || v > 1) {
        console.error(`Invalid rendering score ${k}: ${rendering_scores[k]}`);
        return res.status(500).json({ error: { message: `Invalid rendering score ${k}: ${rendering_scores[k]}` } });
      }
    }

    console.log(`SUBJECT SCORES: ${JSON.stringify(subject_scores)}`);
    console.log(`RENDERING SCORES: ${JSON.stringify(rendering_scores)}`);

    const data = readDatabase();
    if (!data.metadata || !data.metadata.coefficients) {
      console.error("Database metadata or coefficients missing in /analyze-smi");
      return res.status(500).json({
        error: { message: "System configuration error: scoring coefficients are missing from the database. Please contact support@theartisansascent.com." }
      });
    }
    const coefficients = data.metadata.coefficients;

    let smiResult;
    try {
      smiResult = calculateSMI_fromScores(subject_scores, rendering_scores, coefficients, integerVal);
    } catch (smiError) {
      console.error('SMI calculation failed inside /analyze-smi:', smiError.message);
      return res.status(500).json({ error: { message: 'SMI calculation failed: ' + smiError.message } });
    }

    console.log(`SMI result: smi=${smiResult.smi}, integer=${smiResult.integer}, smi_subject=${smiResult.smi_subject}, smi_render=${smiResult.smi_render}`);

    res.json({
      smi:               smiResult.smi,
      smi_subject:       smiResult.smi_subject,
      smi_render:        smiResult.smi_render,
      integer:           integerVal,
      gate1_score:       (integerVal === 3 || integerVal === 4) ? parseInt(gate1_score) : 0,
      gate2_score:       (integerVal === 3 || integerVal === 4) ? parseInt(gate2_score) : 0,
      subject_scores,
      rendering_scores,
      subject_description,
      rendering_description
    });

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

function calculateSMI(smiSubject, smiRender, integer, coefficients) {
  if (smiSubject === null || smiSubject === undefined ||
      smiRender  === null || smiRender  === undefined) return null;
  if (integer === null || integer === undefined)
    throw new Error('calculateSMI: integer is required but missing from record.');
  const integerVal = parseInt(integer);
  if (isNaN(integerVal) || integerVal < 1 || integerVal > 5)
    throw new Error(`calculateSMI: integer must be 1–5. Got: ${integer}`);
  if (integerVal === 5) return 5.00;
  const rawSubject = coefficients['coef_smi_subject'];
  if (rawSubject === undefined || rawSubject === null)
    throw new Error('calculateSMI: coef_smi_subject is not set in metadata.');
  const coefSubject = parseFloat(rawSubject);
  if (isNaN(coefSubject) || coefSubject < 0 || coefSubject > 1)
    throw new Error(`calculateSMI: coef_smi_subject "${rawSubject}" is invalid. Must be 0 to 1.`);
  const coefRender = parseFloat((1 - coefSubject).toFixed(4));
  const weighted = Math.min(
    (parseFloat(smiSubject) * coefSubject) + (parseFloat(smiRender) * coefRender),
    0.99
  );
  return parseFloat((integerVal + weighted).toFixed(2));
}

function calculateSMI_fromScores(subjectScores, renderingScores, coefficients, integer) {
  const sKeys = ['S1','S2','S3','S4','S5'];
  const rKeys = ['R1','R2','R3','R4','R5'];
  if (integer === undefined || integer === null)
    throw new Error('calculateSMI_fromScores: integer is required.');
  const integerVal = parseInt(integer);
  if (isNaN(integerVal) || integerVal < 1 || integerVal > 5)
    throw new Error(`calculateSMI_fromScores: integer must be 1–5. Got: ${integer}`);
  if (integerVal === 5)
    return { smi: 5.00, smi_subject: null, smi_render: null, integer: 5 };
  for (const k of sKeys) {
    const v = parseFloat(subjectScores[k]);
    if (isNaN(v) || v < 0 || v > 1)
      throw new Error(`Invalid subject score ${k}: ${subjectScores[k]}`);
  }
  for (const k of rKeys) {
    const v = parseFloat(renderingScores[k]);
    if (isNaN(v) || v < 0 || v > 1)
      throw new Error(`Invalid rendering score ${k}: ${renderingScores[k]}`);
  }
  const smi_subject = parseFloat((sKeys.reduce((sum, k) => sum + parseFloat(subjectScores[k]), 0) / 5).toFixed(4));
  const smi_render  = parseFloat((rKeys.reduce((sum, k) => sum + parseFloat(renderingScores[k]), 0) / 5).toFixed(4));
  const smi = calculateSMI(smi_subject, smi_render, integerVal, coefficients);
  return { smi, smi_subject, smi_render, integer: integerVal };
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
  if (record.smi_subject !== null && record.smi_subject !== undefined &&
      record.smi_render  !== null && record.smi_render  !== undefined) {
    if (record.integer === null || record.integer === undefined)
      throw new Error('calculateDerivedFields: record.integer is missing — cannot calculate SMI.');
    record.smi = calculateSMI(record.smi_subject, record.smi_render, record.integer, coefficients);
  } else {
    record.smi = null;
  }
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
    const smiSubject = req.body.smi_subject !== undefined ? parseFloat(req.body.smi_subject) : undefined;
    const smiRender  = req.body.smi_render  !== undefined ? parseFloat(req.body.smi_render)  : undefined;
    const cli        = req.body.cli         !== undefined ? parseFloat(req.body.cli)         : undefined;
    const riInteger  = req.body.ri_integer  !== undefined ? parseInt(req.body.ri_integer)    : undefined;
    const riDecimal  = req.body.ri_decimal  !== undefined ? parseInt(req.body.ri_decimal)    : undefined;

    if (smiSubject === undefined || isNaN(smiSubject) || smiSubject < 0 || smiSubject > 1) {
      return res.status(400).json({ error: 'SMI Subject Score (smi_subject) is required (0.00 to 1.00). Please calculate this value using the SMI Calculator before adding a record.' });
    }
    if (smiRender === undefined || isNaN(smiRender) || smiRender < 0 || smiRender > 1) {
      return res.status(400).json({ error: 'SMI Render Score (smi_render) is required (0.00 to 1.00). Please calculate this value using the SMI Calculator before adding a record.' });
    }
    if (cli === undefined || isNaN(cli) || cli < 1.0 || cli > 5.0) {
      return res.status(400).json({ error: 'Career Level Index (cli) is required (1.00 to 5.00). Please calculate this value using the CLI Calculator before adding a record.' });
    }
    if (riInteger === undefined || isNaN(riInteger) || riInteger < 1 || riInteger > 5) {
      return res.status(400).json({ error: 'RI Integer (ri_integer) is required (1 to 5). Please calculate this value using the RI Calculator before adding a record.' });
    }
    if (riDecimal === undefined || isNaN(riDecimal) || riDecimal < 0 || riDecimal > 9) {
      return res.status(400).json({ error: 'RI Decimal (ri_decimal) is required (0 to 9). Please calculate this value using the RI Calculator before adding a record.' });
    }
    if (riInteger <= 2 && riDecimal !== 0) {
      return res.status(400).json({ error: `RI validation failed: ri_integer ${riInteger} requires ri_decimal 0, got ${riDecimal}.` });
    }
    if (riInteger >= 3 && riDecimal === 0) {
      return res.status(400).json({ error: `RI validation failed: ri_integer ${riInteger} requires ri_decimal 1–9, got 0.` });
    }

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
      smi_subject: parseFloat(smiSubject),
      smi_render:  parseFloat(smiRender),
      cli:         parseFloat(cli),
      ri_integer:  parseInt(riInteger),
      ri_decimal:  parseInt(riDecimal)
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

    if (req.body.smi_subject !== undefined) {
      const v = parseFloat(req.body.smi_subject);
      if (isNaN(v) || v < 0 || v > 1) return res.status(400).json({ error: 'smi_subject must be 0.00 to 1.00' });
      updatedRecord.smi_subject = v;
    }
    if (req.body.smi_render !== undefined) {
      const v = parseFloat(req.body.smi_render);
      if (isNaN(v) || v < 0 || v > 1) return res.status(400).json({ error: 'smi_render must be 0.00 to 1.00' });
      updatedRecord.smi_render = v;
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
    const obsoleteFields = ['lssi', 'medium_adj_ppsi', 'cli_adj_ppsi', 'smi_adj_ppsi', 'stdppsi'];
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
    const obsoleteFields = ['pass1_cutoff_pct', 'pass3_top_quantity', 'std_CLI', 'coef_CLI', 'std_SMI', 'coef_SMI'];
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
                           'target_quantity', 'target_multiple', 'z_filter_threshold', 'cli_bracket_size'];
    for (const field of numericFields) {
      if (req.body[field] !== undefined) {
        const v = parseFloat(req.body[field]);
        if (isNaN(v)) return res.status(400).json({ error: `${field} must be a valid number. Got: "${req.body[field]}"` });
      }
    }
    if (req.body['coef_smi_subject'] !== undefined) {
      const v = parseFloat(req.body['coef_smi_subject']);
      if (isNaN(v) || v < 0 || v > 1) return res.status(400).json({ error: `coef_smi_subject must be a number between 0 and 1. Got: "${req.body['coef_smi_subject']}"` });
      req.body['coef_smi_render'] = parseFloat((1 - v).toFixed(4));
    }
    if (!data.metadata.coefficients) {
      data.metadata.coefficients = {};
    }
    Object.keys(req.body).forEach(key => {
      if (key !== "medium") {
        data.metadata.coefficients[key] = req.body[key];
      }
    });
    if (req.body.medium) {
      data.metadata.medium = { ...data.metadata.medium, ...req.body.medium };
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
      medium: data.metadata.medium
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
    res.json(coefficients);
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
      'z_filter_threshold', 'cli_bracket_size',
      'coef_A', 'coef_B', 'coef_C',
      'size_prefilter_reduction'
    ];
    for (const field of requiredCoefs) {
      if (coefficients[field] === undefined || coefficients[field] === null) {
        throw new Error(`Server configuration error: metadata field "${field}" is missing.`);
      }
    }

    const targetQuantity        = parseInt(coefficients['target_quantity']);
    const targetMultiple        = parseFloat(coefficients['target_multiple']);
    const targetRangeHigh       = targetQuantity * targetMultiple;
    const zFilterThreshold      = parseFloat(coefficients['z_filter_threshold']);
    const cliBracketSize        = parseFloat(coefficients['cli_bracket_size']);
    const sizePrefilterReduction = parseFloat(coefficients['size_prefilter_reduction']);
    const subjectSSI            = parseFloat(height) * parseFloat(width);

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

    const riMin = Math.max(1, ri_integer - 1);
    const riMax = Math.min(5, ri_integer + 1);
    pool = pool.filter(r => r.ri_integer >= riMin && r.ri_integer <= riMax);
    filterCounts.push({ label: 'After RI bracket', count: pool.length });
    console.log(`Step 1 — RI bracket [${riMin}–${riMax}]: ${pool.length} records`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after RI bracket filter: ${pool.length} records remain.`);
    }

    // Step 2 — Size pre-filter
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
      console.log(`Step 2 — Size pre-filter: kept ${pool.length} closest by |ssi - ${subjectSSI}| (${(sizePrefilterReduction * 100).toFixed(0)}% reduction)`);
    }
    filterCounts.push({ label: 'After size pre-filter', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after size pre-filter: ${pool.length} records remain.`);
    }

    if (media === 'Oil') {
      pool = pool.filter(r => r.medium === 'Oil');
    } else if (media === 'Acrylic') {
      pool = pool.filter(r => r.medium === 'Acrylic');
    } else {
      pool = pool.filter(r => r.medium !== 'Oil');
    }
    filterCounts.push({ label: 'After medium filter', count: pool.length });
    console.log(`Step 3 — Medium filter (subject: ${media}): ${pool.length} records`);
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after medium filter: ${pool.length} records remain.`);
    }

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

    if (decimalRule === 'portrait_special') {
      const portraits   = pool.filter(r => parseInt(r.ri_decimal) === 1);
      const figuratives = pool.filter(r => parseInt(r.ri_decimal) === 2);
      const maxFig      = portraits.length;
      const shuffled    = figuratives.sort(() => Math.random() - 0.5).slice(0, maxFig);
      pool = [...portraits, ...shuffled];
      console.log(`Step 4 — Subject filter (Portrait special): ${portraits.length} portraits + ${shuffled.length} figuratives = ${pool.length} records`);
    } else {
      pool = pool.filter(r => decimalRule.includes(parseInt(r.ri_decimal)));
      console.log(`Step 4 — Subject filter (ri_decimal=${subjectDecimal}, allowed: [${decimalRule.join(',')}]): ${pool.length} records`);
    }
    filterCounts.push({ label: 'After subject filter', count: pool.length });
    if (pool.length < targetQuantity) {
      throw new Error(`Insufficient comps after subject category filter: ${pool.length} records remain.`);
    }

    const cliLow   = Math.max(1, cli - cliBracketSize);
    const cliHigh  = Math.min(5, cli + cliBracketSize);
    const afterCLI = pool.filter(r => r.cli >= cliLow && r.cli <= cliHigh);
    if (afterCLI.length > targetRangeHigh) {
      pool = afterCLI;
      filterCounts.push({ label: 'After CLI bracket', count: pool.length });
      console.log(`Step 5 — CLI bracket [${cliLow.toFixed(2)}–${cliHigh.toFixed(2)}]: ${pool.length} records (applied)`);
    } else {
      console.log(`Step 5 — CLI bracket: skipped (would reduce pool to ${afterCLI.length}, at or within target range)`);
    }

    {
      const best = new Map();
      pool.forEach(r => {
        const key = r.artistName.trim().toLowerCase();
        if (!best.has(key) || r.appsi > best.get(key).appsi) {
          best.set(key, r);
        }
      });
      const dedupedPool = Array.from(best.values());
      if (dedupedPool.length < pool.length) {
        console.log(`Artist dedup: ${pool.length} → ${dedupedPool.length} records (removed ${pool.length - dedupedPool.length} duplicate artist entries)`);
      }
      pool = dedupedPool;
    }

    const appsiValues = pool.map(r => r.appsi);
    const appsiMean   = appsiValues.reduce((sum, v) => sum + v, 0) / appsiValues.length;
    const appsiStdDev = Math.sqrt(
      appsiValues.reduce((sum, v) => sum + Math.pow(v - appsiMean, 2), 0) / appsiValues.length
    );
    pool = pool.filter(r => {
      const z = (r.appsi - appsiMean) / appsiStdDev;
      return z >= zFilterThreshold;
    });
    filterCounts.push({ label: 'After outliers & artist multiples', count: pool.length });
    console.log(`Step 6 — Z-filter (threshold=${zFilterThreshold}, mean=${appsiMean.toFixed(4)}, stddev=${appsiStdDev.toFixed(4)}): ${pool.length} records`);

    pool = pool
      .map(r => ({ ...r, _smiDist: Math.abs(r.smi - smi) }))
      .sort((a, b) => a._smiDist !== b._smiDist ? a._smiDist - b._smiDist : b.appsi - a.appsi)
      .slice(0, targetQuantity)
      .map(({ _smiDist, ...r }) => r);
    filterCounts.push({ label: 'After SMI bracket', count: pool.length });
    console.log(`Step 7 — SMI bracket: kept ${pool.length} closest by |smi - ${smi}| (ties → higher appsi)`);

    console.log(`Phase 1 complete: ${pool.length} records in final pool (target: ${targetQuantity})`);

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

    const adjComps = pool.map(r => {
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

    const topComps = adjComps.sort((a, b) => a.id - b.id);

    const adjPrices  = topComps.map(c => c.adjPrice);
    const sortedAdj  = [...adjPrices].sort((a, b) => a - b);
    const mid        = Math.floor(sortedAdj.length / 2);
    const centralValue = sortedAdj.length % 2 !== 0
      ? sortedAdj[mid]
      : (sortedAdj[mid - 1] + sortedAdj[mid]) / 2;

    const poolMean  = adjPrices.reduce((s, v) => s + v, 0) / adjPrices.length;
    const poolStd   = Math.sqrt(adjPrices.reduce((s, v) => s + Math.pow(v - poolMean, 2), 0) / (adjPrices.length - 1));
    const pooledCoV = poolStd / poolMean;

    console.log(`Reconciliation: centralValue=${centralValue.toFixed(2)}, poolMean=${poolMean.toFixed(2)}, pooledCoV=${pooledCoV.toFixed(4)}`);

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
    if (mode.smi && !record.medium) {
      throw new Error(`Record ${id} is missing medium — required for SMI`);
    }

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
      const smiPromptPath = path.join(__dirname, 'public', 'prompts', 'SMI_prompt.txt');
      if (!fs.existsSync(smiPromptPath)) throw new Error('SMI_prompt.txt not found on disk.');
      const smiPromptRaw = fs.readFileSync(smiPromptPath, 'utf8');
      const fullSmiPrompt = `Medium: ${record.medium}
(Note: Evaluate the subject and rendering considering what was achieved with this medium. Some mediums make certain techniques easier or harder. The quality of what was achieved in the image is the only measure — the prestige or historical associations of the medium play no role in the evaluation.)

${smiPromptRaw}`;
      const smiSystemContent = `You are an expert fine art analyst evaluating artwork for relative collector market value. Analyze the artwork and return your evaluation in valid JSON format only.

CRITICAL EVALUATION RULES:
1. Evaluate only what you observe in this image. Every artwork is assessed entirely on its own merits.
2. If you recognize this artwork or its artist, set that recognition aside completely. The historical reputation, critical standing, fame, or importance of the artist or work must play no role in your evaluation. Evaluate what you see, not what you know.
3. Do not reference any other works by this artist, their broader practice, or their development over time.
4. The title and artist name provided are for identification only. Do not use them to infer anything about the work's significance or the artist's stature.`;
      const smiMessages = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${processedImageBase64}` } },
            { type: 'text', text: fullSmiPrompt }
          ]
        }
      ];
      let smiAiResponse;
      try {
        smiAiResponse = await callAI(smiMessages, 1000, smiSystemContent, true, DEFAULT_TEMPERATURE);
      } catch (err) {
        throw new Error(`Record ${id}: SMI AI call failed — ${err.message}`);
      }
      const { integer, gate1_score, gate2_score, subject_scores, rendering_scores } = smiAiResponse;
      const integerVal = parseInt(integer);
      if (isNaN(integerVal) || integerVal < 1 || integerVal > 5) {
        throw new Error(`Record ${id}: SMI returned invalid integer: ${integer}`);
      }
      if (integerVal === 5) {
        result.smi = 5.00; result.smi_subject = null; result.smi_render = null;
        result.integer = 5; result.gate1_score = 0; result.gate2_score = 0;
      } else {
        if (!subject_scores || !rendering_scores) {
          throw new Error(`Record ${id}: SMI response missing pillar scores`);
        }
        if (!data.metadata || !data.metadata.coefficients) {
          throw new Error(`Record ${id}: SMI calculation failed — scoring coefficients are missing from the database. Please contact support@theartisansascent.com.`);
        }
        const coefficients = data.metadata.coefficients;
        let smiResult;
        try {
          smiResult = calculateSMI_fromScores(subject_scores, rendering_scores, coefficients, integerVal);
        } catch (smiError) {
          throw new Error(`Record ${id}: SMI calculation failed — ${smiError.message}`);
        }
        result.smi         = smiResult.smi;
        result.smi_subject = smiResult.smi_subject;
        result.smi_render  = smiResult.smi_render;
        result.integer     = integerVal;
        result.gate1_score = (integerVal === 3 || integerVal === 4) ? parseInt(gate1_score) : 0;
        result.gate2_score = (integerVal === 3 || integerVal === 4) ? parseInt(gate2_score) : 0;
      }
      console.log(`Record ${id}: SMI=${result.smi}, integer=${result.integer}`);
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
        smi_subject: null, smi_render: null, cli: null,
        ri_integer: null, ri_decimal: null, integer: null,
        gate1_score: null, gate2_score: null,
        smi: null, ssi: null, aop: null, aoppsi: null, appsi: null
      };
      if (incoming.imageUrl && incoming.imageUrl !== 'Missing') {
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
          console.log(`Image saved for imported record ${maxId}`);
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
// KAJABI SUBSCRIBER REGISTRATION
// ====================

const KAJABI_API_KEY     = process.env.KAJABI_API_KEY;
const KAJABI_API_SECRET  = process.env.KAJABI_API_SECRET;
const KAJABI_TAG_33FACTORS   = process.env.KAJABI_TAG_33FACTORS;
const KAJABI_TAG_TAAPROSPECT = process.env.KAJABI_TAG_TAAPROSPECT;
const KAJABI_TAG_SYPUSERS    = process.env.KAJABI_TAG_SYPUSERS;

app.post('/api/register-subscriber', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'A valid name is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    const cleanName  = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    console.log(`📧 SizeYourPrice subscriber registration: ${cleanName} <${cleanEmail}>`);
    const basicAuth = Buffer.from(`${KAJABI_API_KEY}:${KAJABI_API_SECRET}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json'
    };
    let contactId;
    try {
      const contactResponse = await axios.post(
        'https://api.kajabi.com/v1/contacts',
        { data: { type: 'contacts', attributes: { name: cleanName, email: cleanEmail, subscribed: true } } },
        { headers }
      );
      contactId = contactResponse.data?.data?.id;
      if (!contactId) throw new Error('Kajabi did not return a contact ID');
      console.log(`✅ Kajabi contact created/updated: ID ${contactId}`);
    } catch (contactError) {
      if (contactError.response?.status === 422) {
        console.log(`ℹ️ Contact may already exist, searching by email...`);
        const searchResponse = await axios.get(
          `https://api.kajabi.com/v1/contacts?filter[email]=${encodeURIComponent(cleanEmail)}`,
          { headers }
        );
        const existingContact = searchResponse.data?.data?.[0];
        if (!existingContact) throw new Error('Could not create or find contact in Kajabi');
        contactId = existingContact.id;
        console.log(`✅ Found existing Kajabi contact: ID ${contactId}`);
      } else {
        throw contactError;
      }
    }
    await axios.post(
      `https://api.kajabi.com/v1/contacts/${contactId}/relationships/tags`,
      { data: [
        { type: 'contact_tags', id: KAJABI_TAG_33FACTORS },
        { type: 'contact_tags', id: KAJABI_TAG_TAAPROSPECT },
        { type: 'contact_tags', id: KAJABI_TAG_SYPUSERS }
      ]},
      { headers }
    );
    console.log(`✅ Tags applied to contact ${contactId}: 33Factors + TAAprospect`);
    res.json({ success: true, message: 'Subscriber registered successfully' });
  } catch (error) {
    console.error('❌ Kajabi subscriber registration failed:', {
      message: error.message, status: error.response?.status, data: error.response?.data
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
