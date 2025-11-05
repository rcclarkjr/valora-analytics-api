// ====================
// IMPORTS AND SETUP
// ====================

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

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = [
  'https://robert-clark-4dee.mykajabi.com',
  'https://valora-analytics-api.onrender.com',
  'https://advisory.valoraanalytics.com',
  'https://stunning-arithmetic-16de6b.netlify.app'
];

// Global CORS middleware for all routes
app.use(cors({
  origin: [
    'https://robert-clark-4dee.mykajabi.com',
    'https://valora-analytics-api.onrender.com',
    'https://advisory.valoraanalytics.com',
    'https://stunning-arithmetic-16de6b.netlify.app',
    /\.netlify\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

// THE ONE LINE TO SWITCH AIs - Change true/false to switch everything
const USE_CLAUDE = false; // true = Claude Opus, false = OpenAI GPT-4

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ====================
// UTILITY FUNCTIONS
// ====================

// Helper function to extract category scores from analysis text with improved regex patterns
function extractCategoryScores(analysisText) {
  console.log("Extracting category scores from analysis text...");
  
  // More robust regex patterns that look for category names followed by scores
  const categoryScoreRegex = {
    composition: /(?:1\.\s*)?(?:Composition\s*&\s*Design|Composition[\s:]+)[\s:]*(\d+\.?\d*)/i,
    color: /(?:2\.\s*)?(?:Color\s+Harmony\s*&\s+Use\s+of\s+Light|Color(?:\s+&\s+Light)?[\s:]+)[\s:]*(\d+\.?\d*)/i,
    technical: /(?:3\.\s*)?(?:Technical\s+Skill\s*&\s*Craftsmanship|Technical[\s:]+)[\s:]*(\d+\.?\d*)/i,
    originality: /(?:4\.\s*)?(?:Originality\s*&\s*Innovation|Originality[\s:]+)[\s:]*(\d+\.?\d*)/i,
    emotional: /(?:5\.\s*)?(?:Emotional\s*&\s*Conceptual\s+Depth|Emotional[\s:]+)[\s:]*(\d+\.?\d*)/i
  };
  
  // Try to find a section that might contain all scores
  let scoreSection = analysisText;
  
  // Look for sections that might contain all the category scores
  const categorySection = analysisText.match(/(?:Category|Criteria)\s+Scores[\s\S]*?(?=\n\n|$)/i);
  if (categorySection) {
    scoreSection = categorySection[0];
    console.log("Found dedicated category scores section");
  }
  
  const scores = {};
  
  // Extract each category score and log detailed info for debugging
  for (const [category, regex] of Object.entries(categoryScoreRegex)) {
    const match = scoreSection.match(regex);
    console.log(`Looking for ${category} score with regex: ${regex}`);
    
    if (match && match[1]) {
      const scoreValue = parseFloat(match[1]);
      scores[category] = scoreValue;
      console.log(`Found ${category} score: ${scoreValue}`);
    } else {
      // Check the whole text if not found in the score section
      const fullMatch = analysisText.match(regex);
      if (fullMatch && fullMatch[1]) {
        const scoreValue = parseFloat(fullMatch[1]);
        scores[category] = scoreValue;
        console.log(`Found ${category} score in full text: ${scoreValue}`);
      } else {
        // Don't set a default - we'll detect missing values and abort
        console.log(`Could not find ${category} score`);
      }
    }
  }
  
  // Also try to find scores in a different format
  // Look for all numbers in the format "Score: X.X" or "X.X/5.0"
  const allScores = scoreSection.match(/(?:Score|Rating):\s*(\d+\.?\d*)|(\d+\.?\d*)\/5\.0/g);
  if (allScores && allScores.length >= 5) {
    console.log("Found alternative score format:", allScores);
    // If we have enough scores in this format, use them instead
    const categories = ['composition', 'color', 'technical', 'originality', 'emotional'];
    allScores.slice(0, 5).forEach((scoreText, index) => {
      const scoreMatch = scoreText.match(/(\d+\.?\d*)/);
      if (scoreMatch && scoreMatch[1] && categories[index]) {
        scores[categories[index]] = parseFloat(scoreMatch[1]);
        console.log(`Set ${categories[index]} score to ${scores[categories[index]]} from alternative format`);
      }
    });
  }
  
  // Check if we have all required scores
  const missingCategories = [];
  for (const category of ['composition', 'color', 'technical', 'originality', 'emotional']) {
    if (!scores[category] || isNaN(scores[category]) || scores[category] < 1.0 || scores[category] > 5.0) {
      missingCategories.push(category);
    }
  }
  
  if (missingCategories.length > 0) {
    console.log(`Missing or invalid scores for categories: ${missingCategories.join(', ')}`);
    return null; // Return null to indicate missing scores
  }
  
  console.log("Final extracted category scores:", scores);
  return scores;
}

// Function to round the SMI score up to the nearest 0.25 increment
function roundSMIUp(value) {
  // Calculate how many 0.25 increments in the value
  const increments = Math.ceil(value * 4) / 4;
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(increments * 100) / 100;
}

// ====================
// UNIVERSAL AI CALLER FUNCTIONS
// ====================

// Main function - automatically routes to Claude or OpenAI based on USE_CLAUDE flag
async function callAI(messages, maxTokens = 1000, systemContent = "", useJSON = false) {
  if (USE_CLAUDE) {
    return await callClaudeAPI(messages, maxTokens, systemContent, useJSON);
  } else {
    return await callOpenAIAPI(messages, maxTokens, systemContent, useJSON);
  }
}

// Claude Opus implementation
async function callClaudeAPI(messages, maxTokens, systemContent, useJSON) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not found");
  }

  const anthropicMessages = [];
  let systemPrompt = systemContent;
  
  // Convert OpenAI format to Claude format
  messages.forEach(msg => {
    if (msg.role === "system") {
      systemPrompt = msg.content;
    } else if (msg.role === "user") {
      if (Array.isArray(msg.content)) {
        // Handle mixed content (text + images)
        const content = msg.content.map(item => {
          if (item.type === "text") {
            return { type: "text", text: item.text };
          } else if (item.type === "image_url") {
            const base64Data = item.image_url.url.replace(/^data:image\/[^;]+;base64,/, '');
            return {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data
              }
            };
          }
          return item;
        });
        anthropicMessages.push({ role: "user", content });
      } else {
        anthropicMessages.push({ role: "user", content: [{ type: "text", text: msg.content }] });
      }
    }
  });

  const requestBody = {
    model: "claude-opus-4-20250514",
    max_tokens: maxTokens,
    messages: anthropicMessages
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const response = await axios.post(
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

  const responseText = response.data.content[0].text;
  






// Handle JSON responses
if (useJSON) {
  try {
    // Strip markdown code blocks if present
    let cleanJson = responseText;
    if (responseText.includes('```json')) {
      cleanJson = responseText.replace(/```json\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find the JSON object - everything from first { to the matching closing }
    const startIndex = cleanJson.indexOf('{');
    if (startIndex === -1) {
      throw new Error('No JSON object found in response');
    }
    
    let braceCount = 0;
    let endIndex = startIndex;
    
    // Find the matching closing brace
    for (let i = startIndex; i < cleanJson.length; i++) {
      if (cleanJson[i] === '{') braceCount++;
      if (cleanJson[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    // Extract just the JSON portion
    const jsonOnly = cleanJson.substring(startIndex, endIndex + 1);
    console.log("Extracted JSON:", jsonOnly.substring(0, 100) + "...");
    
    return JSON.parse(jsonOnly);
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    console.error("Raw response length:", responseText.length);
    console.error("First 500 chars:", responseText.substring(0, 500));
    throw new Error(`Claude returned invalid JSON: ${parseError.message}`);
  }
}


const parsedResponse = await callAI(messages, 1500, systemContent, true);

// ADD THIS DETAILED LOGGING BLOCK:
console.log("=== DETAILED CLI BREAKDOWN ===");
console.log("Input Type:", parsedResponse.input_data?.input_type || "unknown");
console.log("Final CLI Value:", parsedResponse.cli_result?.cli_value);
console.log("Raw Score:", parsedResponse.cli_result?.raw_score);

// Log each category in detail
if (parsedResponse.category_analysis) {
  console.log("\n--- CATEGORY ANALYSIS ---");
  const categories = ['art_education', 'exhibitions', 'awards', 'commissions', 'collections', 'publications', 'institutional'];
  
  categories.forEach(category => {
    const data = parsedResponse.category_analysis[category];
    if (data) {
      console.log(`${category.toUpperCase()}:`);
      console.log(`  Score: ${data.score}`);
      console.log(`  Contribution: ${data.contribution}`);
      console.log(`  Reasoning: ${data.reasoning}`);
      console.log("---");
    }
  });
}



  return responseText;
}

// OpenAI implementation (your existing logic)
async function callOpenAIAPI(messages, maxTokens, systemContent, useJSON) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found");
  }

  // Add system message if provided
  const finalMessages = systemContent 
    ? [{ role: "system", content: systemContent }, ...messages]
    : messages;

  const requestBody = {
    model: "gpt-4-turbo",
    messages: finalMessages,
    max_tokens: maxTokens
  };

  if (useJSON) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    requestBody,
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      }
    }
  );

  const responseText = response.data.choices[0]?.message?.content || "";
  
  // Handle JSON responses
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
// TEMPORARY IMAGE STORAGE ENDPOINTS
// Add these to your server.js file
// ====================

const multer = require('multer');

// Configure multer for file uploads (in memory)
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

// In-memory storage for temporary images (you can use Redis in production)
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
}, 30 * 60 * 1000); // 30 minutes

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
    
    // Generate unique image ID
    const imageId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiry time (default 2 hours)
    const expiryTime = Date.now() + (parseInt(expiry) || 7200) * 1000;
    
    // Store image data in memory
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
    
    // Verify ownership
    if (imageData.userId !== userId) {
      console.log(`❌ Access denied for image: ${imageId}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if expired
    if (Date.now() > imageData.expiry) {
      tempImageStore.delete(imageId);
      console.log(`❌ Image expired: ${imageId}`);
      return res.status(410).json({ error: 'Image expired' });
    }
    
    console.log(`✅ Serving temp image: ${imageId} (${(imageData.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Set appropriate headers
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

// Get temp image info (without downloading)
app.get('/temp-image-info/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.query;
    
    const imageData = tempImageStore.get(imageId);
    
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (imageData.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (Date.now() > imageData.expiry) {
      tempImageStore.delete(imageId);
      return res.status(410).json({ error: 'Image expired' });
    }
    
    res.json({
      imageId: imageId,
      originalName: imageData.originalName,
      mimeType: imageData.mimeType,
      size: imageData.size,
      uploadTime: imageData.uploadTime,
      expiry: imageData.expiry,
      remainingTime: Math.max(0, imageData.expiry - Date.now())
    });
    
  } catch (error) {
    console.error('Error getting temp image info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to see stored images
app.get('/debug-temp-images', (req, res) => {
  const images = Array.from(tempImageStore.entries()).map(([id, data]) => ({
    imageId: id,
    userId: data.userId,
    originalName: data.originalName,
    size: data.size,
    uploadTime: new Date(data.uploadTime).toISOString(),
    expiry: new Date(data.expiry).toISOString(),
    expired: Date.now() > data.expiry
  }));
  
  res.json({
    totalImages: images.length,
    images: images
  });
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
    
    // Set appropriate headers
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
    
    // Send the file
    res.sendFile(imagePath);
    
  } catch (error) {
    console.error("Error serving full image:", error);
    res.status(500).json({ error: "Failed to serve image" });
  }
});





// Generic endpoint for serving prompts - more maintainable approach
app.get("/prompts/:calculatorType", (req, res) => {
  const { calculatorType } = req.params;
  
  // First try the _prompt.txt pattern (for SMI, CLI, RI, etc.)
  let promptPath = path.join(__dirname, "public", "prompts", `${calculatorType}_prompt.txt`);
  
  // If not found, try without _prompt (for ART_ANALYSIS, etc.)
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
    // Redirect to the new endpoint
    res.redirect("/prompts/RI");
  }
});

app.get("/PromptCalcCLI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "CLI_prompt.txt");
  
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    // Redirect to the new endpoint
    res.redirect("/prompts/CLI");
  }
});

app.get("/PromptCalcSMI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "SMI_prompt.txt");
  
  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    // Redirect to the new endpoint
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
    const { prompt, artistName, artistResume } = req.body;

    if (!artistName) {
      return res.status(400).json({ 
        error: { message: "Artist name is required" } 
      });
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: { message: "Prompt is required" } 
      });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: { message: "Server configuration error: Missing API key" } 
      });
    }

    // Handle empty or minimal bio
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

    const aiResponse = await callAI(messages, 500, systemContent, true);

    const requiredFields = ['education', 'exhibitions', 'awards', 'commissions', 'collections', 'publications', 'institutional'];
    const missingFields = requiredFields.filter(field => !aiResponse[field]);
    
    if (missingFields.length > 0) {
      console.log(`AI response missing fields: ${missingFields.join(', ')}`);
      return res.status(500).json({ 
        error: { message: `AI analysis incomplete: missing ${missingFields.join(', ')}` } 
      });
    }

    console.log("Sending questionnaire response to frontend");
    res.json({
      questionnaire: aiResponse,
      source: "ai_converted"
    });

  } catch (error) {
    console.error("Error in bio-to-questionnaire conversion:", error.message);
    res.status(500).json({ 
      error: { message: error.message || "Bio analysis failed" } 
    });
  }
});




// ====================
// REVISED ENDPOINT: Convert Bio to Questionnaire Only
// ====================
app.post("/analyze-cli", async (req, res) => {
  try {
    console.log("Received CLI bio-to-questionnaire request");
    const { artistName, artistResume } = req.body;

    if (!artistName) {
      return res.status(400).json({ 
        error: { message: "Artist name is required" } 
      });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: { message: "Server configuration error: Missing API key" } 
      });
    }

    // Handle empty or minimal bio
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
    
    const questionnairePrompt = `
Analyze the following artist's career information and answer the questionnaire by selecting the appropriate level for each category.

For each category, respond with EXACTLY one of these three options:
- "high" for High-Profile accomplishments
- "mid" for Mid-Profile accomplishments  
- "none" for Low-Profile/None

Categories and Criteria:

1. Art Education (10%):
   - High-Profile: MFA, BFA, or formal art school degree
   - Mid-Profile: Art workshops, continuing education classes, or extensive self-study
   - Low-Profile/None: No formal art training or very minimal training

2. Exhibitions (25%):
   - High-Profile: Solo exhibitions, major gallery shows, museum exhibitions
   - Mid-Profile: Group exhibitions, local art fairs, community art centers
   - Low-Profile/None: No exhibitions or very small local venues

3. Awards & Competitions (15%):
   - High-Profile: National or international awards, high ranking in major art competitions
   - Mid-Profile: Regional or local awards, entry in community art contests
   - Low-Profile/None: No awards or very small community recognitions

4. Commissions (10%):
   - High-Profile: Public art, corporate commissions, major private commissions
   - Mid-Profile: Smaller private commissions, local business commissions
   - Low-Profile/None: No commissions or very small personal commissions

5. Collections (15%):
   - High-Profile: Museum collections, well-known collectors, corporate collections
   - Mid-Profile: Private collectors, small businesses, personal collections
   - Low-Profile/None: No collections or very informal sales

6. Publications (15%):
   - High-Profile: Major magazines, newspapers, art journals, podcasts, TV features
   - Mid-Profile: Local newspapers, community newsletters, blogs
   - Low-Profile/None: No media coverage or very small mentions

7. Institutional Interest (10%):
   - High-Profile: Museum representation, major gallery representation, curatorial interest, secondary market sales
   - Mid-Profile: Small gallery representation, art center affiliations
   - Low-Profile/None: No institutional interest or very minimal local connections

Artist Career Information:
${artistResume}

Respond with ONLY a JSON object in this exact format:
{
  "education": "high|mid|none",
  "exhibitions": "high|mid|none", 
  "awards": "high|mid|none",
  "commissions": "high|mid|none",
  "collections": "high|mid|none",
  "publications": "high|mid|none",
  "institutional": "high|mid|none"
}`;

    console.log("Sending bio to AI for questionnaire conversion");

    const messages = [
      { 
        role: "user", 
        content: `Artist: "${artistName}"\n\n${questionnairePrompt}`
      }
    ];

    const systemContent = "You are an expert art career analyst. Analyze the artist's bio and respond with only the requested JSON format.";

    const aiResponse = await callAI(messages, 500, systemContent, true);

    const requiredFields = ['education', 'exhibitions', 'awards', 'commissions', 'collections', 'publications', 'institutional'];
    const missingFields = requiredFields.filter(field => !aiResponse[field]);
    
    if (missingFields.length > 0) {
      console.log(`AI response missing fields: ${missingFields.join(', ')}`);
      return res.status(500).json({ 
        error: { message: `AI analysis incomplete: missing ${missingFields.join(', ')}` } 
      });
    }

    console.log("Sending questionnaire response to frontend");
    res.json({
      questionnaire: aiResponse,
      source: "ai_converted"
    });

  } catch (error) {
    console.error("Error in bio-to-questionnaire conversion:", error.message);
    res.status(500).json({ 
      error: { message: error.message || "Bio analysis failed" } 
    });
  }
});





app.post("/generate-career-summary", async (req, res) => {
  try {
    console.log("Received career summary request");
    const questionnaire = req.body;
    const artistName = req.body.artistName;

    const requiredFields = ['education', 'exhibitions', 'awards', 'commissions', 'collections', 'publications', 'institutional'];
    const missingFields = requiredFields.filter(field => !questionnaire[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: { message: `Missing questionnaire fields: ${missingFields.join(', ')}` } 
      });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: { message: "Server configuration error: Missing API key" } 
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

    const messages = [
      { 
        role: "user", 
        content: summaryPrompt
      }
    ];


const systemContent = `You are an art career analyst writing about ${artistName}. Use a neutral, academic tone that is conversational but not flowery. Be straightforward and professional.`;


    const summaryText = await callAI(messages, 200, systemContent);

    console.log("Diplomatic career summary generated successfully");
    res.json({
      summary: summaryText.trim()
    });

  } catch (error) {
    console.error("Error generating career summary:", error.message);
    res.status(500).json({ 
      error: { message: "Failed to generate career summary: " + error.message } 
    });
  }
});








// Endpoint for Skill Mastery Index (SMI) analysis
app.post("/analyze-smi", async (req, res) => {
  try {
    console.log("Received SMI analyze request");
    const { prompt, image, artTitle, artistName } = req.body;

    if (!prompt) {
      console.log("Missing prompt in request");
      return res.status(400).json({ error: { message: "Prompt is required" } });
    }
    
    if (!image) {
      console.log("Missing image in request");
      return res.status(400).json({ error: { message: "Image is required" } });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      console.log("Missing API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    // Log info about the request
    console.log(`Processing SMI request for artwork: "${artTitle}" by ${artistName}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    // Construct the prompt with artwork information
    const finalPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${prompt}`;

    console.log("Sending request to AI for SMI analysis");

    const messages = [
      { 
        role: "user", 
        content: [
          { type: "text", text: finalPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
        ]
      }
    ];

    const systemContent = "You are an expert fine art analyst specializing in evaluating artistic skill mastery. Your task is to analyze the provided artwork and provide detailed analysis with category scores in valid JSON format only. Follow the prompt instructions exactly and return only valid JSON.";

    let analysisText;
    try {
      analysisText = await callAI(messages, 2000, systemContent);
      console.log("SMI Analysis completed successfully");
    } catch (error) {
      console.log("AI request failed:", error.message);
      return res.status(500).json({ error: { message: "AI analysis failed: " + error.message } });
    }

    console.log("Raw AI response:", analysisText);

    // Parse the JSON response from AI
    let aiResponse;
    try {
      // Clean up the response - remove any markdown code blocks or extra text
      let cleanResponse = analysisText.trim();
      
      // Remove code block markers if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON object if there's extra text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      aiResponse = JSON.parse(cleanResponse);
      console.log("Successfully parsed AI JSON response");
    } catch (parseError) {
      console.log("Failed to parse AI response as JSON:", parseError.message);
      console.log("AI response was:", analysisText);
      return res.status(500).json({ 
        error: { 
          message: "AI did not return valid JSON format. Please try again." 
        } 
      });
    }

    // Validate the JSON structure
    if (!aiResponse.category_scores) {
      console.log("Missing category_scores in AI response");
      return res.status(500).json({ 
        error: { 
          message: "Invalid AI response: missing category_scores" 
        } 
      });
    }

    const requiredCategories = ['composition', 'color', 'technical', 'originality', 'emotional'];
    const categoryScores = aiResponse.category_scores;
    
    // Validate all required categories are present and have valid scores
    for (const category of requiredCategories) {
      if (categoryScores[category] === undefined || categoryScores[category] === null) {
        console.log(`Missing category score: ${category}`);
        return res.status(500).json({ 
          error: { 
            message: `Missing score for category: ${category}` 
          } 
        });
      }
      
      const score = parseFloat(categoryScores[category]);
      if (isNaN(score) || score < 1.0 || score > 5.0) {
        console.log(`Invalid score for ${category}: ${categoryScores[category]}`);
        return res.status(500).json({ 
          error: { 
            message: `Invalid score for ${category}: ${categoryScores[category]}. Must be between 1.0 and 5.0` 
          } 
        });
      }
      
      // Ensure the score is in 0.5 increments
      if ((score * 2) % 1 !== 0) {
        console.log(`Score for ${category} is not in 0.5 increments: ${score}`);
        return res.status(500).json({ 
          error: { 
            message: `Score for ${category} must be in 0.5 increments. Received: ${score}` 
          } 
        });
      }
    }
    
    console.log("All category scores validated successfully:", categoryScores);
    
    // Calculate the SMI value using the weighted formula
    const calculatedSMI = (
      (parseFloat(categoryScores.composition) * 0.20) +
      (parseFloat(categoryScores.color) * 0.20) +
      (parseFloat(categoryScores.technical) * 0.25) +
      (parseFloat(categoryScores.originality) * 0.20) +
      (parseFloat(categoryScores.emotional) * 0.15)
    );
    
    // Format to 2 decimal places without any rounding beyond normal floating point precision
    const smiValue = calculatedSMI.toFixed(2);
    console.log(`Calculated SMI: ${calculatedSMI}, Final SMI: ${smiValue}`);

    const finalResponse = {
      analysis: aiResponse.detailed_analysis || "",
      brief_summary: aiResponse.brief_summary || "",
      category_scores: categoryScores,
      smi: smiValue,
      ai_response: aiResponse // Include the full AI response for transparency
    };

    console.log("Sending final SMI response to client");
    res.json(finalResponse);

  } catch (error) {
    console.error("Unexpected error in SMI analysis:", error);
    res.status(500).json({ 
      error: { 
        message: "Internal server error during analysis" 
      } 
    });
  }
});


// Error handler function
function handleApiError(error, res) {
  console.error("Error in API endpoint:", error);
  
  // Detailed error logging
  if (error.response) {
    console.error("Response status:", error.response.status);
    console.error("Response headers:", error.response.headers);
    console.error("Response data:", JSON.stringify(error.response.data));
  } else if (error.request) {
    console.error("No response received:", error.request);
  } else {
    console.error("Error setting up request:", error.message);
  }
  
  const errorMessage = error.response?.data?.error?.message || 
                       error.message || 
                       "An unknown error occurred";
                       
  res.status(500).json({ 
    error: { 
      message: errorMessage,
      details: error.toString()
    } 
  });
}




// Endpoint for Representational Index (RI) analysis
app.post("/analyze-ri", async (req, res) => {
  try {
    console.log("Received RI analyze request");
    const { prompt, image, artTitle, artistName } = req.body;

    if (!prompt) {
      console.log("Missing prompt in request");
      return res.status(400).json({ error: { message: "Prompt is required" } });
    }
    
    if (!image) {
      console.log("Missing image in request");
      return res.status(400).json({ error: { message: "Image is required" } });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      console.log("Missing API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    console.log(`Processing RI request for artwork: "${artTitle}" by ${artistName}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    // Construct the prompt with artwork information
    const finalPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${prompt}`;

    console.log("Sending request to AI for RI analysis");

    const messages = [
      { 
        role: "user", 
        content: [
          { type: "text", text: finalPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
        ]
      }
    ];

    const systemContent = "You are an expert fine art analyst specializing in evaluating representational accuracy. Respond with ONLY valid JSON.";

    let aiResponse;
    try {
      // Request JSON response from AI
      aiResponse = await callAI(messages, 1500, systemContent, true);
      console.log("RI Analysis completed successfully");
    } catch (error) {
      console.log("AI request failed:", error.message);
      return res.status(500).json({ error: { message: "AI analysis failed: " + error.message } });
    }

    // Validate JSON structure
    if (!aiResponse.ri_score || !aiResponse.category || !aiResponse.analysis) {
      console.error("Invalid RI response structure from AI");
      return res.status(500).json({ 
        error: { message: "AI returned invalid response structure" } 
      });
    }

    // Validate RI score is between 1-5
    if (aiResponse.ri_score < 1 || aiResponse.ri_score > 5) {
      console.error(`Invalid RI score: ${aiResponse.ri_score}`);
      return res.status(500).json({ 
        error: { message: `Invalid RI score: ${aiResponse.ri_score}. Must be between 1-5` } 
      });
    }




// Convert JSON to markdown format for frontend
const markdownReport = `
## Representational Index (RI): ${aiResponse.ri_score}

**Category:** ${aiResponse.category}

### Summary
${aiResponse.summary.trim()}

## Analysis

#### Subject Recognizability
${aiResponse.analysis.subject_recognizability}



#### Fidelity to Reality
${aiResponse.analysis.fidelity_to_reality}

#### Perspective & Depth
${aiResponse.analysis.perspective_depth}

#### Detail & Texture
${aiResponse.analysis.detail_texture}

#### Real-World Reference
${aiResponse.analysis.real_world_reference}

### Explanation
${aiResponse.explanation}
`;

    console.log("Sending RI analysis response to client");
    res.json({ 
      analysis: markdownReport.trim(),
      ri_score: aiResponse.ri_score,
      category: aiResponse.category
    });

  } catch (error) {
    console.error("Unexpected error in RI analysis:", error);
    res.status(500).json({ 
      error: { 
        message: "Internal server error during analysis" 
      } 
    });
  }
});






// =======================================
// ART VALUATION SYSTEM API ENDPOINTS
// =======================================

// Path to your JSON database and images directory
const DB_PATH = '/mnt/data/art_database.json';

function encodeImageWithMime(buffer, originalName) {
  const mimeType = mime.lookup(originalName) || "image/jpeg";
  const base64 = buffer.toString("base64");
  return { imageBase64: `data:${mimeType};base64,${base64}`, mimeType };
}

function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const emptyDb = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          coefficients: {
            constant: 100,
            exponent: 0.5,
            lastCalculated: new Date().toISOString()
          }
        },
        records: []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb, null, 2));
      return emptyDb;
    }

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Ensure all records have imageMimeType if imageBase64 is present
if (Array.isArray(data.records)) {
  data.records.forEach(record => {
    if (record.imageBase64 && !record.imageMimeType) {
      record.imageMimeType = 'image/jpeg'; // default fallback
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

// ====================================================
// Calculate APPSI Function
// ====================================================

function calculateAPPSI(size, ppsi, coefficients) {
  // Calculate LSSI (Log of Size in Square Inches)
  const lssi = Math.log(size);
  
  // Calculate predicted PPSI at original LSSI using the model
  const predictedPPSI = coefficients.constant * Math.pow(lssi, coefficients.exponent);
  
  // Calculate residual as a percentage of predicted PPSI
  const residualPercentage = (ppsi - predictedPPSI) / predictedPPSI;
  
  // Calculate predicted PPSI at standardized LSSI (ln(200))
  const standardLSSI = Math.log(200);
  const predictedPPSIStandard = coefficients.constant * Math.pow(standardLSSI, coefficients.exponent);
  
  // Apply the percentage residual to the standardized predicted PPSI
  return predictedPPSIStandard * (1 + residualPercentage);
}

// ====================================================
// COMPLETE REPLACEMENT: Update All APPSI Function
// ====================================================
function updateAllAPPSI(data) {
  data.records.forEach(record => {
    if (record.ppsi && record.size) {
      record.appsi = calculateAPPSI(record.size, record.ppsi, data.metadata.coefficients);
    }
  });
  return data;
}

// ====================================================
// Calculate R-Squared Function
// ====================================================

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

    // Read database to get list of records
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    console.log(`Creating backup with ${data.records.length} records`);

    // Create ZIP archive
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

      // Add database JSON to root of ZIP
      archive.file(dbPath, { name: 'art_database.json' });

      // Add all image files to images/ folder in ZIP
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
    
    // All records are active (deleted records are physically removed)
    const totalRecords = data.records.length;
    
    // Find records missing required fields (SMI, RI, CLI, PPSI, SSI)
    const incompleteRecords = [];
    
    data.records.forEach(record => {
      const requiredFields = ['smi', 'ri', 'cli', 'ppsi', 'size']; // size is SSI
      const missingFields = [];
      
      requiredFields.forEach(field => {
        const value = record[field];
        // Check if field is null, undefined, or 0
        if (value === null || value === undefined || value === 0) {
          missingFields.push(field);
        }
      });
      
      // If any required fields are missing, add to incomplete list
      if (missingFields.length > 0) {
        incompleteRecords.push(record.id);
      }
    });
    
    const stats = {
      totalRecords: totalRecords,
      missingRequiredFields: incompleteRecords.length,
      missingRequiredFieldsIds: incompleteRecords,
      lastUpdated: data.metadata.lastUpdated
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/records/:id/image", (req, res) => {
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
        record.imageBase64 = imageBase64;
        record.imageMimeType = mimeType;
        writeDatabase(data);
        res.json({ success: true, recordId: record.id, mimeType });
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
    
    // Return complete metadata structure
    const metadata = {
      coefficients: data.metadata.coefficients || {},
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

app.post('/api/admin/replace-database', async (req, res) => {
  try {
    console.log('Starting full database and images restore from ZIP');
    
    if (!req.body || !req.body.zipBase64) {
      return res.status(400).json({ error: "Request body must include 'zipBase64' field." });
    }

    const zipBase64 = req.body.zipBase64;
    const tempDir = '/mnt/data/temp_restore';
    const dbPath = '/mnt/data/art_database.json';
    const imagesDir = '/mnt/data/images';
    const backupDbPath = `${dbPath}.backup_${Date.now()}`;
    const backupImagesDir = `${imagesDir}_backup_${Date.now()}`;

    // Create temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Step 1: Extract ZIP to temp directory
      console.log('Extracting ZIP file...');
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const tempZipPath = path.join(tempDir, 'backup.zip');
      fs.writeFileSync(tempZipPath, zipBuffer);

      // Extract ZIP contents
      await new Promise((resolve, reject) => {
        fs.createReadStream(tempZipPath)
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

      // Step 3: Create backups of current data
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
      
      // Clear existing images directory
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
      fs.rmSync(tempDir, { recursive: true });
      
      // Remove safety backups on success
      if (fs.existsSync(backupDbPath)) {
        fs.unlinkSync(backupDbPath);
      }
      if (fs.existsSync(backupImagesDir)) {
        fs.rmSync(backupImagesDir, { recursive: true });
      }

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
          if (fs.existsSync(imagesDir)) {
            fs.rmSync(imagesDir, { recursive: true });
          }
          fs.cpSync(backupImagesDir, imagesDir, { recursive: true });
          fs.rmSync(backupImagesDir, { recursive: true });
          console.log('✅ Images rollback completed');
        }
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }

      // Cleanup temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }

      throw error; // Re-throw to trigger catch block below
    }

  } catch (err) {
    console.error("❌ Restore operation failed:", err.message);
    res.status(500).json({ 
      error: "Failed to restore database and images: " + err.message 
    });
  }
});

// Pagination endpoint
app.get('/api/records/page/:pageNumber', (req, res) => {
  try {
    const page = parseInt(req.params.pageNumber) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const database = readDatabase();
    
    // Apply any filters from query params
    let filteredRecords = database;
    if (req.query.year) {
      filteredRecords = filteredRecords.filter(r => r.year == req.query.year);
    }
    if (req.query.minPrice) {
      filteredRecords = filteredRecords.filter(r => r.price >= req.query.minPrice);
    }
    
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedRecords = filteredRecords.slice(offset, offset + limit);
    
    res.json({
      records: paginatedRecords,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Pagination error:', error);
    res.status(500).json({ error: 'Failed to load paginated records' });
  }
});

app.post('/api/records/batch-delete', (req, res) => {
  try {
    const { recordIds } = req.body;
    const data = readDatabase(); // Using 'data' instead of 'database' for clarity
    
    // ✅ CORRECT: Work with data.records array
    const initialCount = data.records.length;
    const updatedRecords = data.records.filter(record => !recordIds.includes(record.id));
    const deletedCount = initialCount - updatedRecords.length;
    
    // ✅ CORRECT: Update the records array in the data object
    data.records = updatedRecords;
    data.metadata.lastUpdated = new Date().toISOString(); // Also update timestamp
    writeDatabase(data);
    
    console.log(`✅ Batch deleted ${deletedCount} records: ${recordIds.join(', ')}`);
    res.json({ 
      success: true, 
      deletedCount: deletedCount,
      remainingRecords: updatedRecords.length 
    });
  } catch (error) {
    console.error('❌ Batch delete failed:', error);
    res.status(500).json({ error: 'Batch delete failed' });
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
      record.isActive !== false && record.size && record.ppsi);
    
    if (activeRecords.length < 10) {
      return res.status(400).json({ 
        error: 'Not enough active records for reliable coefficient calculation' 
      });
    }
    
    // Extract LSSI and PPSI data (without log-transforming PPSI)
    const points = activeRecords.map(record => ({
      x: Math.log(record.size), // LSSI
      y: record.ppsi            // PPSI (not log-transformed)
    }));
    
    // Simple non-linear regression approach:
    // 1. Try different exponents
    // 2. For each exponent, find the optimal constant C
    // 3. Choose the exponent that gives the best R^2
    
    let bestExponent = 0;
    let bestConstant = 0;
    let bestR2 = -Infinity;
    
    // Try exponents from -5 to 5 in small increments
    for (let e = -5; e <= 5; e += 0.1) {
      // For a given exponent, find the optimal constant
      let sumXeY = 0;  // Sum of x^e * y
      let sumXe2 = 0;  // Sum of (x^e)^2
      
      for (const point of points) {
        const xPowE = Math.pow(point.x, e);
        sumXeY += xPowE * point.y;
        sumXe2 += xPowE * xPowE;
      }
      
      const constant = sumXeY / sumXe2;
      
      // Calculate R^2 for this model
      let sumResidualSquared = 0;
      let sumTotalSquared = 0;
      const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      
      for (const point of points) {
        const predicted = constant * Math.pow(point.x, e);
        sumResidualSquared += Math.pow(point.y - predicted, 2);
        sumTotalSquared += Math.pow(point.y - meanY, 2);
      }
      
      const r2 = 1 - (sumResidualSquared / sumTotalSquared);
      
      // If this is better than our previous best, update
      if (r2 > bestR2) {
        bestR2 = r2;
        bestExponent = e;
        bestConstant = constant;
      }
    }
    
    // Create proposed coefficients object
    const proposedCoefficients = {
      exponent: bestExponent,
      constant: bestConstant,
      r2: bestR2
    };
    
    res.json({
      current: data.metadata.coefficients,
      proposed: proposedCoefficients
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




function formatAIAnalysisForReport(aiAnalysis) {
  if (!aiAnalysis) return '';
  
  try {
    // Use the same JSON cleaning logic that's already in callClaudeAPI
    let cleanJson = aiAnalysis;
    if (aiAnalysis.includes('```json')) {
      cleanJson = aiAnalysis.replace(/```json\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find the JSON object
    const startIndex = cleanJson.indexOf('{');
    if (startIndex === -1) {
      throw new Error('No JSON object found');
    }
    
    let braceCount = 0;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < cleanJson.length; i++) {
      if (cleanJson[i] === '{') braceCount++;
      if (cleanJson[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    const jsonOnly = cleanJson.substring(startIndex, endIndex + 1);
    const analysis = JSON.parse(jsonOnly);
    
    // Format as readable text
    let formattedText = '';
    
    if (analysis.overview) {
      formattedText += analysis.overview;
    }
    
    if (analysis.strengths && analysis.strengths.length > 0) {
      formattedText += '\n\nStrengths: ';
      formattedText += analysis.strengths.map(s => 
        `${s.title} - ${s.description}`
      ).join(' ');
    }
    
    if (analysis.opportunities && analysis.opportunities.length > 0) {
      formattedText += '\n\nAreas for Development: ';
      formattedText += analysis.opportunities.map(opp => {
        let text = opp.category || '';
        if (opp.steps) {
          text += ' ' + opp.steps.map(step => step.description).filter(d => d).join(' ');
        }
        return text;
      }).join(' ');
    }
    
    return formattedText.trim();
    
  } catch (e) {
    console.error('Error formatting AI analysis:', e);
    return String(aiAnalysis).replace(/[\{\}"]/g, '').trim();
  }
}






// Updated API endpoints with full artOnlyPrice and new APPSI calculation support

// Helper function - add this near your other helper functions
function calculateArtOnlyPrice(price, framed, frameCoefficients) {
    if (!price || price <= 0) return 0;
    
    let framePercent = 0;
    
    if (framed === 'Y' && frameCoefficients && 
        frameCoefficients['frame-constant'] !== undefined && 
        frameCoefficients['frame-exponent'] !== undefined) {
        
        framePercent = frameCoefficients['frame-constant'] * 
                      Math.pow(price, frameCoefficients['frame-exponent']);
        
        // Clamp between 0 and 1 (0% to 100%)
        framePercent = Math.max(0, Math.min(1, framePercent));
    }
    
    const frameValue = price * framePercent;
    const artOnlyPrice = price - frameValue;
    
    return Math.max(0, artOnlyPrice);
}

// Updated APPSI calculation function - uses artOnlyPrice instead of price
function calculateAPPSI(size, artOnlyPrice, coefficients) {
    if (!size || !artOnlyPrice || !coefficients || 
        !coefficients.constant || !coefficients.exponent || 
        size <= 0 || artOnlyPrice <= 0) return 0;
    
    try {
        const artOnlyPPSI = artOnlyPrice / size; // New variable using artOnlyPrice
        const lssi = Math.log(size);
        const predictedPPSI = coefficients.constant * Math.pow(lssi, coefficients.exponent);
        const residualPercentage = (artOnlyPPSI - predictedPPSI) / predictedPPSI; // Only change: use artOnlyPPSI
        const standardLSSI = Math.log(200);
        const predictedPPSIStandard = coefficients.constant * Math.pow(standardLSSI, coefficients.exponent);
        const appsi = predictedPPSIStandard * (1 + residualPercentage);
        
        return isFinite(appsi) && appsi > 0 ? appsi : 0;
    } catch (error) {
        console.error("APPSI calculation error: " + error.message);
        return 0;
    }
}

// Updated POST /api/records
app.post("/api/records", (req, res) => {
    try {
        const data = readDatabase();
        const requiredFields = ['artistName', 'title', 'height', 'width', 'price'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }
        
        console.log(`Total records: ${data.records.length}`);
        const maxId = data.records.length > 0
            ? data.records.reduce((max, record) => {
                const id = Number(record.id);
                return isNaN(id) ? max : Math.max(max, id);
            }, 0)
            : 0;
        console.log(`Calculated maxId: ${maxId}`);
        const newId = maxId + 1;
        
        // Remove the id field from req.body before spreading
        const { id, ...bodyWithoutId } = req.body;

        const newRecord = {
            id: newId,
            isActive: true,
            dateAdded: new Date().toISOString(),
            ...bodyWithoutId
        };

        // Calculate size and LSSI
        newRecord.size = newRecord.height * newRecord.width;
        if (newRecord.size > 0) {
            newRecord.lssi = Math.log(newRecord.size);
        }
        
        // Calculate PPSI (unchanged - still total price / size for reference)
        newRecord.ppsi = newRecord.price / newRecord.size;
        
        // Calculate artOnlyPrice using frame coefficients
        newRecord.artOnlyPrice = calculateArtOnlyPrice(
            newRecord.price, 
            newRecord.framed || 'N', 
            data.metadata.coefficients
        );
        
        // Calculate APPSI using artOnlyPrice (new method)
        if (newRecord.size > 0 && newRecord.artOnlyPrice > 0) {
            newRecord.appsi = calculateAPPSI(
                newRecord.size, 
                newRecord.artOnlyPrice, 
                data.metadata.coefficients
            );
        }
        
        delete newRecord.imagePath;
        data.records.push(newRecord);
        console.log(`New record: ID=${newId}, Artist=${newRecord.artistName}, Title=${newRecord.title}, artOnlyPrice=${newRecord.artOnlyPrice}, APPSI=${newRecord.appsi}`);
        writeDatabase(data);
        
        console.log(`Returning record with ID: ${newRecord.id}`);
        res.status(201).json({ ...newRecord, id: newId });
    } catch (error) {
        console.error('Error saving record:', error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Updated PUT /api/records/:id
app.put("/api/records/:id", (req, res) => {
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
            id: recordId, // Ensure ID doesn't change
            dateAdded: data.records[index].dateAdded // Preserve original dateAdded
        };

        // Recalculate derived fields if height/width/price/framed changed
        if (req.body.height || req.body.width || req.body.price || req.body.framed !== undefined) {
            updatedRecord.size = updatedRecord.height * updatedRecord.width;
            
            // Calculate LSSI (Log of Size in Square Inches)
            if (updatedRecord.size > 0) {
                updatedRecord.lssi = Math.log(updatedRecord.size);
            }
            
            // Calculate PPSI (unchanged - still total price / size for reference)
            updatedRecord.ppsi = updatedRecord.price / updatedRecord.size;
            
            // Calculate artOnlyPrice using frame coefficients
            updatedRecord.artOnlyPrice = calculateArtOnlyPrice(
                updatedRecord.price, 
                updatedRecord.framed || 'N', 
                data.metadata.coefficients
            );
            
            // Calculate APPSI using artOnlyPrice (new method)
            if (updatedRecord.size > 0 && updatedRecord.artOnlyPrice > 0) {
                updatedRecord.appsi = calculateAPPSI(
                    updatedRecord.size, 
                    updatedRecord.artOnlyPrice, 
                    data.metadata.coefficients
                );
            }
        } else if (!updatedRecord.lssi && updatedRecord.size > 0) {
            // Ensure LSSI exists even if height/width didn't change
            updatedRecord.lssi = Math.log(updatedRecord.size);
            
            // If artOnlyPrice doesn't exist, calculate it
            if (!updatedRecord.artOnlyPrice) {
                updatedRecord.artOnlyPrice = calculateArtOnlyPrice(
                    updatedRecord.price, 
                    updatedRecord.framed || 'N', 
                    data.metadata.coefficients
                );
            }
            
            // Recalculate APPSI if needed
            if (updatedRecord.size > 0 && updatedRecord.artOnlyPrice > 0) {
                updatedRecord.appsi = calculateAPPSI(
                    updatedRecord.size, 
                    updatedRecord.artOnlyPrice, 
                    data.metadata.coefficients
                );
            }
        }
        
        // Remove imagePath – now using embedded Base64 images
        delete updatedRecord.imagePath;
        
        data.records[index] = updatedRecord;
        writeDatabase(data);
        
        console.log(`Updated record ${recordId}: artOnlyPrice=${updatedRecord.artOnlyPrice}, APPSI=${updatedRecord.appsi}`);
        res.json(updatedRecord);
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ error: error.message });
    }
});

// Updated recalculate APPSI endpoint - now uses artOnlyPrice method
app.post("/api/records/recalculate-appsi", (req, res) => {
    try {
        const data = readDatabase();
        const coefficients = data.metadata.coefficients;
        
        // Track results
        const results = {
            totalRecords: data.records.length,
            updatedRecords: 0,
            problematicRecords: [],
            addedArtOnlyPrice: 0
        };
        
        // Recalculate APPSI for all records using new method
        data.records.forEach(record => {
            // Ensure artOnlyPrice exists
            if (!record.artOnlyPrice) {
                record.artOnlyPrice = calculateArtOnlyPrice(
                    record.price, 
                    record.framed || 'N', 
                    coefficients
                );
                results.addedArtOnlyPrice++;
            }
            
            // Validate required fields for APPSI calculation
            if (!record.size || !record.artOnlyPrice || 
                isNaN(record.size) || isNaN(record.artOnlyPrice) || 
                record.size <= 0 || record.artOnlyPrice <= 0) {
                
                results.problematicRecords.push({
                    recordId: record.id,
                    issues: {
                        size: record.size,
                        artOnlyPrice: record.artOnlyPrice,
                        hasValidSize: !!record.size && !isNaN(record.size) && record.size > 0,
                        hasValidArtOnlyPrice: !!record.artOnlyPrice && !isNaN(record.artOnlyPrice) && record.artOnlyPrice > 0
                    }
                });
                
                return; // Skip this record
            }
            
            // Calculate APPSI using artOnlyPrice (new method)
            const newAPPSI = calculateAPPSI(
                record.size, 
                record.artOnlyPrice, 
                coefficients
            );
            
            if (newAPPSI && newAPPSI > 0) {
                record.appsi = newAPPSI;
                results.updatedRecords++;
            }
        });
        
        // Write updated database
        writeDatabase(data);
        
        res.json({
            message: 'Successfully recalculated APPSI using artOnlyPrice method',
            ...results
        });
    } catch (error) {
        console.error('Error in APPSI recalculation:', error);
        res.status(500).json({ error: 'Failed to recalculate APPSI', details: error.message });
    }
});

// Updated POST coefficients - recalculates all APPSI when coefficients change
app.post("/api/coefficients", (req, res) => {
    try {
        const data = readDatabase();
        
        // Update coefficients
        if (!data.metadata.coefficients) {
            data.metadata.coefficients = {};
        }
        
        // Update all coefficient fields
        Object.keys(req.body).forEach(key => {
            if (key !== 'medium') {
                data.metadata.coefficients[key] = req.body[key];
            }
        });
        
        // Update medium multipliers if provided
        if (req.body.medium) {
            data.metadata.medium = { ...data.metadata.medium, ...req.body.medium };
        }
        
        data.metadata.lastUpdated = new Date().toISOString();
        
        // Recalculate all artOnlyPrice and APPSI values with new coefficients
        let recalculatedCount = 0;
        data.records.forEach(record => {
            // Recalculate artOnlyPrice with potentially new frame coefficients
            if (record.price && record.price > 0) {
                record.artOnlyPrice = calculateArtOnlyPrice(
                    record.price, 
                    record.framed || 'N', 
                    data.metadata.coefficients
                );
            }
            
            // Recalculate APPSI with new coefficients and artOnlyPrice
            if (record.size && record.artOnlyPrice && record.size > 0 && record.artOnlyPrice > 0) {
                record.appsi = calculateAPPSI(
                    record.size, 
                    record.artOnlyPrice, 
                    data.metadata.coefficients
                );
                recalculatedCount++;
            }
        });
        
        writeDatabase(data);
        
        res.json({
            message: 'Coefficients updated successfully',
            recalculatedRecords: recalculatedCount,
            coefficients: data.metadata.coefficients,
            medium: data.metadata.medium
        });
    } catch (error) {
        console.error('Error updating coefficients:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/sizeyourprice", (req, res) => {
  try {
    const data = readDatabase();
    
    // Extract just the coefficients from the database
    const coefficients = {
      constant: data.metadata.coefficients.constant,
      exponent: data.metadata.coefficients.exponent
    };
    
    res.json(coefficients);
  } catch (error) {
    console.error('Error in Size Your Price endpoint:', error);
    res.status(500).json({ 
      error: { 
        message: error.message || "An error occurred retrieving the coefficients" 
      } 
    });
  }
});








// Add this constant at the top of server.js (after your other constants)
const VALID_FACTOR_NAMES = [
  "Line", "Shape", "Form", "Space", "Color/Hue", "Texture", "Tone/Value", 
  "Saturation", "Composition", "Volume", "Balance", "Contrast", "Emphasis", 
  "Movement", "Rhythm", "Variety", "Proportion", "Harmony", "Cohesiveness", 
  "Pattern", "Brushwork", "Chiaroscuro", "Impasto", "Sfumato", "Glazing", 
  "Scumbling", "Pointillism", "Wet-on-Wet", "Uniqueness", "Creativity", 
  "Mood", "Viewer Engagement", "Emotional Resonance"
];

// REPLACE your entire /analyze-art endpoint with this:
app.post("/analyze-art", async (req, res) => {
  try {
    console.log("Received art analysis request");
    const { prompt, image, artTitle, artistName, subjectPhrase } = req.body;
    
    if (!prompt || !image || (!ANTHROPIC_API_KEY && !OPENAI_API_KEY)) {
      return res.status(400).json({ error: { message: "Missing prompt, image, or API key" } });
    }

    // Simple placeholder replacement - no hardcoded additions
    const finalPrompt = prompt
      .replace('{{TITLE}}', artTitle)
      .replace('{{ARTIST}}', artistName)
      .replace('{{SUBJECT}}', subjectPhrase);

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: finalPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
        ]
      }
    ];

    const systemContent = "You are an expert fine art analyst specializing in providing constructive feedback and refinement recommendations for artworks. Always respond with valid JSON only.";

    const analysisText = await callAI(messages, 2000, systemContent);

    // Parse the JSON response
    let parsedAnalysis;
    try {
      let cleanedResponse = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
      cleanedResponse = cleanedResponse.replace(/\}\s*\]/g, '}]'); // Fix missing closing brackets
      parsedAnalysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("Raw AI response:", analysisText);
      return res.json({
        analysis: analysisText,
        isLegacyFormat: true
      });
    }

    // Validate the JSON structure
    if (!parsedAnalysis.overview || !parsedAnalysis.strengths || !parsedAnalysis.opportunities) {
      console.error("Invalid JSON structure received from AI");
      return res.json({
        analysis: analysisText,
        isLegacyFormat: true
      });
    }

    // Validate recommendedStudy factors
    if (parsedAnalysis.recommendedStudy && Array.isArray(parsedAnalysis.recommendedStudy)) {
      // Check for exactly 3 factors
      if (parsedAnalysis.recommendedStudy.length !== 2) {
        console.warn(`Expected 3 recommended study factors, got ${parsedAnalysis.recommendedStudy.length}`);
      }
      
      // Validate factor names against the 33 approved list
      const invalidFactors = [];
      parsedAnalysis.recommendedStudy.forEach(study => {
        if (!VALID_FACTOR_NAMES.includes(study.factor)) {
          invalidFactors.push(study.factor);
        }
      });
      
      if (invalidFactors.length > 0) {
        console.error(`Invalid factor names detected: ${invalidFactors.join(', ')}`);
        console.error("These factors are not in the approved 33 Essential Factors list");
        return res.status(500).json({ 
          error: { 
            message: `AI used invalid factor names: ${invalidFactors.join(', ')}. Please try again.` 
          } 
        });
      }
    } else {
      console.warn("Missing or invalid recommendedStudy array");
      parsedAnalysis.recommendedStudy = [];
    }

    const finalResponse = {
      title: "Analysis: 33 Essential Factors",
      artTitle: artTitle,
      artistName: artistName,
      subjectPhrase: subjectPhrase,
      overview: parsedAnalysis.overview,
      strengths: parsedAnalysis.strengths,
      opportunities: parsedAnalysis.opportunities,
      recommendedStudy: parsedAnalysis.recommendedStudy || [],
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











app.post("/api/valuation", async (req, res) => {
  try {
    console.log("Starting valuation process");

    const { smi, ri, cli, size, targetedRI, subjectImageBase64, media, title, artist, subjectDescription, height, width } = req.body;

    console.log("Valuation inputs:", {
      smi, ri, cli, size,
      targetedRI: Array.isArray(targetedRI) ? targetedRI : 'Not an array',
      hasSubjectImage: !!subjectImageBase64,
      media, title, artist, subjectDescription, height, width
    });

    const db = readDatabase();
    const allRecords = db.records || [];
    const coefficients = db.metadata.coefficients;

    if (!smi || !ri || !cli || !size || !targetedRI || !Array.isArray(targetedRI) || !subjectImageBase64 || !height || !width) {
      return res.status(400).json({ error: "Missing required valuation inputs." });
    }

    // Step 1: Generate AI analysis (unchanged)
    let aiAnalysis = "";
    try {
      const promptPath = path.join(__dirname, 'public', 'prompts', 'ART_ANALYSIS.txt');
      const prompt = fs.readFileSync(promptPath, 'utf8').trim();
      if (prompt.length < 50) {
        throw new Error("Prompt for ART_ANALYSIS.txt not found or too short");
      }

      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: subjectDescription ? `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}\nArtist's subject description: "${subjectDescription}"` : `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${subjectImageBase64}` } }
          ]
        }
      ];

      aiAnalysis = await callAI(messages, 300, prompt);
      console.log("Analysis completed successfully");
    } catch (error) {
      console.error("Analysis failed:", error.message);
      return res.status(500).json({ 
        error: "Analysis failed", 
        details: error.response?.data?.error?.message || error.message 
      });
    }

    // Step 2: Filter valid comps
    const comps = allRecords.filter(r => {
      const isValid = r.ri !== undefined &&
                      targetedRI.includes(Number(r.ri)) &&
                      typeof r.smi === 'number' &&
                      typeof r.cli === 'number' &&
                      typeof r.appsi === 'number' &&
                      r.thumbnailBase64 &&
                      r.artistName &&
                      r.title &&
                      r.height &&
                      r.width &&
                      r.medium &&
                      r.price;
      return isValid;
    });

    console.log(`Found ${comps.length} valid comparison records`);
    
    if (comps.length === 0) {
      return res.status(400).json({
        error: "No valid comparison records found for the specified criteria.",
        details: { targetedRI, totalRecords: allRecords.length }
      });
    }

    // Step 3: Z-score stats (unchanged)
    const meanStd = (arr, key) => {
      const values = arr.map(r => r[key]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
      return { mean, std };
    };

    const z = (v, mean, std) => std ? (v - mean) / std : 0;

    const stats = {
      smi: meanStd(comps, 'smi'),
      ri: meanStd(comps, 'ri'),
      cli: meanStd(comps, 'cli')
    };

    const zSubject = {
      smi: z(smi, stats.smi.mean, stats.smi.std),
      ri: z(ri, stats.ri.mean, stats.ri.std),
      cli: z(cli, stats.cli.mean, stats.cli.std)
    };

    const weights = { smi: 0.47, ri: 0.33, cli: 0.20 };

    // Step 4: Calculate scalar distances and select top 10
    const enriched = comps.map(r => {
      const zd = {
        smi: z(r.smi, stats.smi.mean, stats.smi.std),
        ri: z(r.ri, stats.ri.mean, stats.ri.std),
        cli: z(r.cli, stats.cli.mean, stats.cli.std)
      };
      const dist = Math.sqrt(
        weights.smi * Math.pow(zd.smi - zSubject.smi, 2) +
        weights.ri * Math.pow(zd.ri - zSubject.ri, 2) +
        weights.cli * Math.pow(zd.cli - zSubject.cli, 2)
      );
      return { ...r, scalarDistance: dist };
    }).sort((a, b) => a.scalarDistance - b.scalarDistance);

    // Step 5: Calculate predictedPPSI for subject
    const subject = {
      smi,
      cli,
      medium: media,
      frame: 0,
      SSI: size,
      height,
      width
    };

    const lssi = Math.log(subject.SSI);
    const predictedPPSI = coefficients.constant * Math.pow(lssi, coefficients.exponent);

    // Step 6: Select top 10 comps with enhanced data and calculate adjustments
    const topComps = enriched.slice(0, 10).map(r => ({
      id: r.id,
      appsi: r.appsi,
      smi: r.smi,
      cli: r.cli,
      ri: r.ri,
      medium: r.medium,
      artistName: r.artistName,
      title: r.title,
      height: r.height,
      width: r.width,
      price: r.price,
      thumbnailBase64: r.thumbnailBase64
    }));

    // Calculate sizeAdjFactor (from existing code)
    subject.predictAt200 = coefficients.constant * Math.pow(Math.log(200), coefficients.exponent);
    subject.predictAtSubj = predictedPPSI;
    subject.ratio = subject.predictAtSubj / subject.predictAt200;
    subject.sizeAdjFactor = subject.ratio - 1;

    console.log("Sending enhanced valuation response with analysis and complete comparable data");
    

res.json({
  topComps,
  coefficients,
  medium: db.metadata.medium, 
  aiAnalysis: formatAIAnalysisForReport(aiAnalysis)
});


  } catch (error) {
    console.error("Valuation request failed:", error.message);
    res.status(500).json({ 
      error: "Valuation processing failed", 
      details: error.response?.data?.error?.message || error.message 
    });
  }
});

app.get('/api/debug-export', (req, res) => {
  try {
    const data = readDatabase();
    const exportSubset = data.records.map(r => ({
      ID: r.id,
      'Artist Name': r.artistName,
      Title: r.title,
      SMI: r.SMI,
      RI: r.RI,
      CLI: r.CLI,
      APPSI: r.APPSI,
      'Price ($)': r['Price ($)']
    }));
    res.json(exportSubset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/compare-subject-comp", async (req, res) => {
  try {
    const { subject, comp } = req.body;
    
    console.log(`Starting comparison for comp ID ${comp.recordId}`);

    if (!subject || !comp) {
      return res.status(400).json({ error: { message: "Missing subject or comp data" } });
    }

    // Check for image data with detailed logging
    if (!subject.imageBase64) {
      console.error("Missing subject imageBase64");
      return res.status(400).json({ error: { message: "Subject must include imageBase64" } });
    }
    
    if (!comp.imageBase64) {
      console.error(`Missing comp imageBase64 for ID ${comp.recordId}`);
      return res.status(400).json({ error: { message: "Comp must include imageBase64" } });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: "Missing API Key" } });
    }

    console.log(`Comparing Subject to Comp ID ${comp.recordId}`);

    // Check image data format
    if (!subject.imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      console.error("Subject image data is not valid base64");
      return res.status(400).json({ error: { message: "Subject image data is not valid base64" } });
    }
    
    if (!comp.imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      console.error(`Comp ID ${comp.recordId} image data is not valid base64`);
      return res.status(400).json({ error: { message: "Comp image data is not valid base64" } });
    }

    // Build the prompt for ChatGPT
    const comparisonPrompt = `
You are an expert fine art evaluator.

Compare the following two artworks (Subject and Comparable) based on six aesthetic criteria.

For each criterion, answer Yes if the Comparable artwork is *Superior* to the Subject; otherwise, answer No.

Criteria (Answer Yes or No for each):
1. Subject Matter Appeal
2. Design and Composition Quality
3. Deployment of Advanced Techniques
4. Demonstration of Core Elements of Art
5. Visual Engagement
6. Emotional Resonance

Respond STRICTLY in the following format:

Criterion 1: Yes or No
Criterion 2: Yes or No
Criterion 3: Yes or No
Criterion 4: Yes or No
Criterion 5: Yes or No
Criterion 6: Yes or No
`;

    // Send request to AI
    console.log("Sending request to AI for comparison");
    
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: comparisonPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${subject.imageBase64}` } },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${comp.imageBase64}` } }
        ]
      }
    ];

    const systemContent = "You are a strict fine art evaluator following exact instructions.";

    const chatReply = await callAI(messages, 200, systemContent);

    console.log(`Received comparison reply for Comp ID ${comp.recordId}:`, chatReply.substring(0, 200));

    // Parse results
    const yesNoResults = chatReply.match(/Criterion\s*\d+:\s*(Yes|No)/gi);

    if (!yesNoResults || yesNoResults.length !== 6) {
      console.error("Invalid format received from AI comparison");
      return res.status(500).json({ error: { message: "Invalid response format from AI" } });
    }

    // Define criterion weights
    const criteriaWeights = [0.20, 0.20, 0.15, 0.10, 0.15, 0.20];

    let totalScore = 0;

    yesNoResults.forEach((line, idx) => {
      const answer = line.split(":")[1].trim().toLowerCase();
      if (answer === "yes") {
        totalScore += criteriaWeights[idx];
      }
    });

    // Determine final result
    const finalResult = totalScore > 0.50 ? "Superior" : "Inferior";
    console.log(`Comparison result for Comp ID ${comp.recordId}: ${finalResult} (score: ${totalScore})`);

    res.json({
      totalScore: Math.round(totalScore * 100), // Return as percentage
      finalResult: finalResult
    });

  } catch (error) {
    console.error("Error in /api/compare-subject-comp:", error.message);
    let errorDetails = "Unknown error";
    
    if (error.response) {
      errorDetails = JSON.stringify({
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.message) {
      errorDetails = error.message;
    }
    
    res.status(500).json({ error: { message: errorDetails } });
  }
});

// ✅ NEW ENDPOINT: Generate Narrative Explanation
app.post("/api/generate-narrative", async (req, res) => {
  try {
    const { superiors, inferiors, comps, ruleUsed, smvppsi } = req.body;

    if (!comps || !Array.isArray(comps) || comps.length === 0 || !ruleUsed || typeof smvppsi !== "number") {
      return res.status(400).json({
        error: "Missing required fields: comps[], ruleUsed, smvppsi (number)"
      });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing API Key" });
    }

    // Format input summary for GPT
    const compLines = comps.map(c => {
      return `RecordID ${c.recordId}: SMI=${c.smi}, RI=${c.ri}, CLI=${c.cli}, APPSI=${c.appsi.toFixed(2)}, Distance=${c.scalarDistance?.toFixed(4) ?? "NA"}, Label=${c.label}`;
    }).join("\n");

    let conditionIntro = "";
    if (ruleUsed === "All Inferior") {
      conditionIntro = "Since all selected comparable artworks were deemed inferior to the subject,";
    } else if (ruleUsed === "All Superior") {
      conditionIntro = "Since all selected comparable artworks were deemed superior to the subject,";
    } else {
      conditionIntro = "Because the selected comparables included a mix of both superior and inferior artworks,";
    }

    const prompt = `
You are a fine art valuation assistant. Based on the visual classification and pricing logic, generate a professional, narrative paragraph titled \"Analysis of Comparable Artworks\".

Use this information:

${conditionIntro}
SMVPPSI: ${smvppsi.toFixed(2)}

Comparable Records:
${compLines}

Write one professional paragraph that:
- Describes how the condition of the selected comparables affected the valuation.
- Refers to the comps by RecordID (not artist or title).
- Explains how SMVPPSI was derived from APPSI.
- Uses a straightforward, professional style of a fine art appraiser.
- Do NOT include any headings — return just the paragraph text.
`;

    const messages = [
      { role: "user", content: prompt }
    ];

    const systemContent = "You are a fine art valuation assistant.";

    const paragraph = await callAI(messages, 400, systemContent);
    
    res.json({ narrative: paragraph.trim() });

  } catch (error) {
    console.error("Narrative generation error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate narrative paragraph"
    });
  }
});

app.get("/api/debug-database", (req, res) => {
  try {
    // Read the database
    const data = readDatabase();

    // Basic diagnostics
    const totalRecords = data.records.length;
    const sampleRecord = totalRecords > 0 ? data.records[0] : null;
    const fieldNames = sampleRecord ? Object.keys(sampleRecord) : [];

    // Get path to database file
    const dbPath = DB_PATH;

    res.json({
      databasePath: dbPath,
      databaseExists: fs.existsSync(DB_PATH),
      totalRecords: totalRecords,
      sampleFieldNames: fieldNames
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Add this endpoint to server.js for record debugging
app.get("/api/debug-record/:id", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({
      id: record.id,
      isActive: record.isActive,
      metrics: {
        smi: record.smi,
        ri: record.ri,
        cli: record.cli,
        appsi: record.appsi
      },
      types: {
        smi_type: typeof record.smi,
        ri_type: typeof record.ri,
        cli_type: typeof record.cli,
        appsi_type: typeof record.appsi
      },
      valid: {
        smi_valid: record.smi !== undefined && record.smi !== null && !isNaN(record.smi),
        ri_valid: record.ri !== undefined && record.ri !== null && !isNaN(record.ri),
        cli_valid: record.cli !== undefined && record.cli !== null && !isNaN(record.cli),
        appsi_valid: record.appsi !== undefined && record.appsi !== null && !isNaN(record.appsi)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ DEBUG: Scan database for legacy image fields
app.get("/api/debug-scan-images", (req, res) => {
  try {
    const data = readDatabase();
    const flagged = [];

    data.records.forEach((record) => {
      const findings = {};
      if ('imagePath' in record) findings.imagePath = record.imagePath;
      if ('imageFile' in record) findings.imageFile = record.imageFile;
      if (record.imageBase64 && typeof record.imageBase64 === 'string' && record.imageBase64.includes('http')) {
        findings.imageBase64 = record.imageBase64;
      }
      if (Object.keys(findings).length > 0) {
        flagged.push({
          recordId: record.id,
          findings
        });
      }
    });

    res.json({
      totalRecords: data.records.length,
      flaggedCount: flagged.length,
      flagged
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/debug-clean-images", (req, res) => {
  try {
    const data = readDatabase();
    let cleanedCount = 0;
    let fixedBase64Count = 0;

    data.records.forEach(record => {
      // Remove legacy fields
      if ('imagePath' in record) {
        delete record.imagePath;
        cleanedCount++;
      }
      if ('imageFile' in record) {
        delete record.imageFile;
        cleanedCount++;
      }

      // Fix raw base64 (no prefix)
      if (record.imageBase64 &&
          typeof record.imageBase64 === "string" &&
          !record.imageBase64.startsWith("data:image")) {
        record.imageBase64 = `data:image/jpeg;base64,${record.imageBase64}`;
        fixedBase64Count++;
      }
    });

    writeDatabase(data);

    res.json({
      success: true,
      cleanedLegacyFields: cleanedCount,
      fixedRawBase64: fixedBase64Count,
      message: `Cleaned ${cleanedCount} legacy fields and fixed ${fixedBase64Count} raw base64 images.`
    });
  } catch (error) {
    console.error("Cleanup error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/records/calculate-lssi", (req, res) => {
    try {
        const data = readDatabase();
        
        // Track records updated
        let recordsUpdated = 0;
        let recordsWithErrors = 0;
        
        // Update LSSI for all records
        data.records.forEach(record => {
            try {
                // Skip records without size
                if (!record.size || isNaN(record.size) || record.size <= 0) {
                    recordsWithErrors++;
                    return;
                }
                
                // Calculate or update LSSI
                record.lssi = Math.log(record.size);
                recordsUpdated++;
            } catch (error) {
                console.error(`Error calculating LSSI for record ${record.id}:`, error);
                recordsWithErrors++;
            }
        });
        
        // Write updated database
        writeDatabase(data);
        
        res.json({
            message: 'Successfully calculated LSSI for records',
            totalRecords: data.records.length,
            recordsUpdated: recordsUpdated,
            recordsWithErrors: recordsWithErrors
        });
    } catch (error) {
        console.error('Error in LSSI calculation endpoint:', error);
        res.status(500).json({ error: 'Failed to calculate LSSI', details: error.message });
    }
});

app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('/mnt/data', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found.');
  }
  
  // ✅ Add these headers for better large file handling:
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // ✅ Use streaming for better performance:
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (err) => {
    console.error('❌ Download failed:', err);
    res.status(500).send('Error downloading file.');
  });
});

app.get('/api/metadata', async (req, res) => {
  try {
    // Use the existing DB_PATH constant
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // Debug log to verify structure
    console.log('Database metadata structure:', {
      hasMetadata: !!db.metadata,
      hasCoefficients: !!db.metadata?.coefficients,
      lastUpdated: db.metadata?.lastUpdated
    });

    // Return coefficients or empty object if none exists
    res.json(db.metadata?.coefficients || {});

  } catch (error) {
    console.error('Metadata endpoint error:', {
      error: error.message,
      dbPath: DB_PATH,
      fileExists: fs.existsSync(DB_PATH),
      fileAccessible: fs.accessSync ? 'Checking...' : 'Cannot check'
    });
    
    res.status(500).json({ 
      error: 'Failed to load metadata',
      // Only show details in development
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        dbPath: DB_PATH
      } : null
    });
  }
});

app.post('/api/metadata/update', async (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // Initialize metadata if it doesn't exist
    db.metadata = db.metadata || {};
    db.metadata.coefficients = db.metadata.coefficients || {};
    
    // Merge updates with existing values
    const updatedCoefficients = {
      ...db.metadata.coefficients,  // Keep existing values
      ...req.body,                  // Apply new values
      lastUpdated: new Date().toISOString() // Add timestamp
    };
    
    // Special handling for medium multipliers
    if (req.body.medium) {
      updatedCoefficients.medium = {
        ...(db.metadata.coefficients.medium || {}), // Keep existing medium values
        ...req.body.medium                         // Apply medium updates
      };
    }
    
    // Save the merged data
    db.metadata.coefficients = updatedCoefficients;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    
    res.json({ 
      success: true,
      updated: updatedCoefficients
    });
    
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({
      error: 'Update failed',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});






app.get('/api/health', (req, res) => {
  try {
    const stats = fs.statSync(DB_PATH);
    res.json({
      status: 'healthy',
      db: {
        path: DB_PATH,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      dbPath: DB_PATH
    });
  }
});










// Add this endpoint to your server.js file

app.post('/api/batch-calculate-smi', async (req, res) => {
  try {
    console.log('Starting batch SMI calculation...');
    
    const imagesDir = '/mnt/data/images';
    const promptPath = path.join(__dirname, 'public', 'prompts', 'SMI_prompt.txt');
    
    // Check if directories exist
    if (!fs.existsSync(imagesDir)) {
      return res.status(400).json({ error: `Images directory not found: ${imagesDir}` });
    }
    
    if (!fs.existsSync(promptPath)) {
      return res.status(400).json({ error: `SMI prompt file not found: ${promptPath}` });
    }
    
    // Load the SMI prompt
    const prompt = fs.readFileSync(promptPath, 'utf8').trim();
    if (prompt.length < 100) {
      return res.status(400).json({ error: 'SMI prompt file appears to be empty or too short' });
    }
    
    // Get all image files
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => file.match(/^\d+\.(jpg|jpeg|png)$/i))
      .sort((a, b) => {
        const aNum = parseInt(a.split('.')[0]);
        const bNum = parseInt(b.split('.')[0]);
        return aNum - bNum;
      });
    
    console.log(`Found ${imageFiles.length} image files to process`);
    
    if (imageFiles.length === 0) {
      return res.status(400).json({ error: 'No valid image files found (expecting format: recordID.jpg)' });
    }
    
    const results = [];
    const errors = [];
    let processedCount = 0;
    
    // Process each image
    for (const filename of imageFiles) {
      try {
        const recordId = filename.split('.')[0];
        console.log(`Processing record ${recordId} (${processedCount + 1}/${imageFiles.length})`);
        
        // Read and convert image to base64
        const imagePath = path.join(imagesDir, filename);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        // Prepare the prompt with minimal info since we don't have artist/title
        const finalPrompt = `Title: "Record ${recordId}"\nArtist: "Unknown"\n\n${prompt}`;
        
        // Create messages for AI
        const messages = [
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ];
        
        const systemContent = "You are an expert fine art analyst specializing in evaluating artistic skill mastery. Provide your response in the exact JSON format specified.";
        
        // Call AI for analysis
        const aiResponse = await callAI(messages, 2000, systemContent, true);
        
        // Validate response
        if (!aiResponse || !aiResponse.category_scores || !aiResponse.final_smi) {
          throw new Error('Invalid AI response format');
        }
        
        // Validate category scores
        const requiredCategories = ['composition', 'color', 'technical', 'originality', 'emotional'];
        for (const category of requiredCategories) {
          const score = aiResponse.category_scores[category];
          if (typeof score !== 'number' || isNaN(score) || score < 1.0 || score > 5.0) {
            throw new Error(`Invalid ${category} score: ${score}`);
          }
          // Check 0.5 increment requirement
          if ((score * 2) % 1 !== 0) {
            throw new Error(`${category} score ${score} is not in 0.5 increments`);
          }
        }
        
        // Recalculate SMI using backend logic for consistency
        const calculatedSMI = (
          (aiResponse.category_scores.composition * 0.20) +
          (aiResponse.category_scores.color * 0.20) +
          (aiResponse.category_scores.technical * 0.25) +
          (aiResponse.category_scores.originality * 0.20) +
          (aiResponse.category_scores.emotional * 0.15)
        );
        
        // Round up to nearest 0.25
        const roundedSMI = roundSMIUp(calculatedSMI);
        const finalSMI = roundedSMI.toFixed(2);
        
        results.push({
          recordId: parseInt(recordId),
          smi: finalSMI,
          composition: aiResponse.category_scores.composition,
          color: aiResponse.category_scores.color,
          technical: aiResponse.category_scores.technical,
          originality: aiResponse.category_scores.originality,
          emotional: aiResponse.category_scores.emotional
        });
        
        processedCount++;
        console.log(`✅ Record ${recordId}: SMI = ${finalSMI}`);
        
        // Add small delay to avoid overwhelming the AI API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const recordId = filename.split('.')[0];
        console.error(`❌ Error processing record ${recordId}:`, error.message);
        errors.push({
          recordId: recordId,
          error: error.message,
          filename: filename
        });
      }
    }
    
    // Generate CSV content
    const csvHeader = 'RecordID,SMI,Composition,Color,Technical,Originality,Emotional\n';
    const csvRows = results.map(r => 
      `${r.recordId},${r.smi},${r.composition},${r.color},${r.technical},${r.originality},${r.emotional}`
    ).join('\n');
    const csvContent = csvHeader + csvRows;
    
    // Save CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvFilename = `batch_smi_results_${timestamp}.csv`;
    const csvPath = path.join('/mnt/data', csvFilename);
    fs.writeFileSync(csvPath, csvContent);
    
    console.log(`✅ Batch processing completed!`);
    console.log(`📊 Successfully processed: ${results.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`💾 Results saved to: ${csvFilename}`);
    
    res.json({
      success: true,
      message: 'Batch SMI calculation completed',
      summary: {
        totalFiles: imageFiles.length,
        successfullyProcessed: results.length,
        errors: errors.length,
        csvFile: csvFilename,
        csvDownloadUrl: `/download/${csvFilename}`
      },
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    res.status(500).json({ 
      error: 'Batch processing failed', 
      details: error.message 
    });
  }
});

// Helper function to trigger batch processing (optional - for testing)
app.get('/api/start-batch-smi', (req, res) => {
  res.json({
    message: 'Send POST request to /api/batch-calculate-smi to start batch processing',
    instructions: 'This will process all images in the images directory and generate a CSV file'
  });
});



const DATABASE_FILE_PATH = '/mnt/data/art_database.json';  // Common mount path


function migrateAddArtOnlyPrice(databaseData) {
    console.log('Starting migration: Adding artOnlyPrice field...');
    
    // Get frame coefficients from metadata
    const frameConstant = databaseData.metadata.coefficients['frame-constant'];
    const frameExponent = databaseData.metadata.coefficients['frame-exponent'];
    
    console.log(`Using frame coefficients: constant=${frameConstant}, exponent=${frameExponent}`);
    
    let processed = 0;
    let added = 0;
    let skipped = 0;
    
    // Process each record
    databaseData.records.forEach(record => {
        processed++;
        
        // Skip if artOnlyPrice already exists
        if (record.hasOwnProperty('artOnlyPrice')) {
            skipped++;
            console.log(`Record ${record.id}: Already has artOnlyPrice (${record.artOnlyPrice}), skipping`);
            return;
        }
        
        // Calculate artOnlyPrice
        const artOnlyPrice = calculateArtOnlyPrice(
            record.price, 
            record.framed, 
            databaseData.metadata.coefficients
        );
        
        // Add the new field
        record.artOnlyPrice = Math.round(artOnlyPrice * 100) / 100; // Round to 2 decimal places
        added++;
        
        // Log some examples
        if (processed <= 5) {
            console.log(`Record ${record.id}: price=${record.price}, framed=${record.framed}, artOnlyPrice=${record.artOnlyPrice}`);
        }
    });
    
    // Update metadata to record migration
    databaseData.metadata.lastUpdated = new Date().toISOString();
    databaseData.metadata.migrations = databaseData.metadata.migrations || [];
    databaseData.metadata.migrations.push({
        name: 'add_artOnlyPrice',
        date: new Date().toISOString(),
        recordsProcessed: processed,
        recordsUpdated: added,
        recordsSkipped: skipped
    });
    
    console.log('Migration completed:');
    console.log(`- Records processed: ${processed}`);
    console.log(`- Records updated: ${added}`);
    console.log(`- Records skipped: ${skipped}`);
    
    return databaseData;
}

// API endpoint to run migration (add to your Express routes)
app.post('/api/migrate/add-artOnlyPrice', (req, res) => {
    try {
        console.log('🚀 Starting artOnlyPrice migration via API...');
        
        // 1. Read the database file
        console.log(`📖 Reading database from: ${DATABASE_FILE_PATH}`);
        const rawData = fs.readFileSync(DATABASE_FILE_PATH, 'utf8');
        const databaseData = JSON.parse(rawData);
        
        console.log(`✅ Database loaded: ${databaseData.records.length} records found`);
        
        // 2. Create automatic backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = DATABASE_FILE_PATH.replace('.json', `_backup_${timestamp}.json`);
        fs.writeFileSync(backupPath, rawData);
        console.log(`💾 Backup created: ${backupPath}`);
        
        // 3. Run migration
        const updatedDatabase = migrateAddArtOnlyPrice(databaseData);
        
        // 4. Save updated database
        const updatedJson = JSON.stringify(updatedDatabase, null, 2);
        fs.writeFileSync(DATABASE_FILE_PATH, updatedJson);
        
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        
        // 5. Verification
        let withArtOnly = 0;
        let framedCount = 0;
        
        updatedDatabase.records.forEach(record => {
            if (record.hasOwnProperty('artOnlyPrice')) {
                withArtOnly++;
                if (record.framed === 'Y') framedCount++;
            }
        });
        
        const result = {
            success: true,
            message: 'Migration completed successfully',
            stats: {
                totalRecords: updatedDatabase.records.length,
                recordsWithArtOnlyPrice: withArtOnly,
                framedPieces: framedCount,
                unframedPieces: withArtOnly - framedCount
            },
            backupFile: backupPath
        };
        
        console.log('Migration stats:', result.stats);
        res.json(result);
        
    } catch (error) {
        console.error('❌ MIGRATION FAILED:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Migration failed - database unchanged'
        });
    }
});

// Optional: CLI script if you want to run it directly on server
function runMigrationCLI() {
    if (process.argv.includes('--migrate-artOnlyPrice')) {
        console.log('🎨 Running artOnlyPrice migration...');
        
        try {
            const rawData = fs.readFileSync(DATABASE_FILE_PATH, 'utf8');
            const databaseData = JSON.parse(rawData);
            
            // Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = DATABASE_FILE_PATH.replace('.json', `_backup_${timestamp}.json`);
            fs.writeFileSync(backupPath, rawData);
            
            // Run migration
            const updatedDatabase = migrateAddArtOnlyPrice(databaseData);
            
            // Save
            fs.writeFileSync(DATABASE_FILE_PATH, JSON.stringify(updatedDatabase, null, 2));
            
            console.log('✅ Migration completed via CLI');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ CLI Migration failed:', error);
            process.exit(1);
        }
    }
}

// Run CLI migration if called with flag
runMigrationCLI();

module.exports = { migrateAddArtOnlyPrice, calculateArtOnlyPrice };

// Serve static files from the "public" folder
app.use(express.static("public"));

// ====================
// START THE SERVER
// ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));