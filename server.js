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


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = [
  'https://robert-clark-4dee.mykajabi.com',
  'https://valora-analytics-api.onrender.com',
  'https://advisory.valoraanalytics.com',
];

// Global CORS middleware for all routes
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin (e.g., server-to-server or mobile apps)
      return callback(null, true);
    }
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.netlify.app') // Allow all Netlify subdomains
    ) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


// ====================
// UTILITY FUNCTIONS
// ====================

function calculateAPPSI(size, ppsi, coefficients) {
    const lssi = Math.log(size);
    const predictedPPSI = coefficients.constant * Math.pow(lssi, coefficients.exponent);
    const residualPercentage = (ppsi - predictedPPSI) / predictedPPSI;
    const standardLSSI = Math.log(200);
    const predictedPPSIStandard = coefficients.constant * Math.pow(standardLSSI, coefficients.exponent);
    return predictedPPSIStandard * (1 + residualPercentage);
}


function ensureAPPSICalculation(req, res, next) {
    try {
        const data = readDatabase();
        const coefficients = data.metadata.coefficients;

        // If we have height and width, calculate size and lssi if not provided
        if (req.body.height && req.body.width && !req.body.size) {
            req.body.size = req.body.height * req.body.width;
        }
        
        // Calculate LSSI if we have size but not LSSI
        if (req.body.size && !req.body.lssi) {
            req.body.lssi = Math.log(req.body.size);
        }
        
        // Calculate PPSI if we have price and size but not PPSI
        if (req.body.price && req.body.size && !req.body.ppsi) {
            req.body.ppsi = req.body.price / req.body.size;
        }

        // Calculate APPSI if we have all required values
        if (req.body.size && req.body.ppsi) {
            req.body.appsi = calculateAPPSI(
                req.body.size, 
                req.body.ppsi, 
                coefficients
            );
        }

        next();
    } catch (error) {
        console.error('Error in APPSI calculation middleware:', error);
        res.status(500).json({ error: 'Failed to calculate APPSI: ' + error.message });
    }
}




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
  const promptPath = path.join(__dirname, "public", "prompts", `${calculatorType}_prompt.txt`);
  
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



// =============== ANALYSIS ENDPOINTS ===============

// Endpoint for Representational Index (RI) analysis
app.post("/analyze-ri", async (req, res) => {
  try {
    console.log("Received RI analyze request");
    const { prompt, image, artTitle, artistName } = req.body;

    if (!prompt || !image || !OPENAI_API_KEY) {
      return res.status(400).json({ error: { message: "Missing prompt, image, or API key" } });
    }

    const finalPrompt = `Title: "${artTitle}"\nArtist: "${artistName}"\n\n${prompt}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const analysisText = response.data.choices[0]?.message?.content || "";

    // Extract the RI value using regex
    const riRegex = /Representational\s+Index\s*\(?RI\)?\s*=\s*(\d+)|\bRI\s*=\s*(\d+)/i;
    const riMatch = analysisText.match(riRegex);
    let riValue = "NA"; // Default value if extraction fails
        
    if (riMatch) {
      // The value could be in group 1 or group 2 depending on which pattern matched
      const extractedValue = riMatch[1] || riMatch[2];
      if (extractedValue) {
        riValue = extractedValue + ".0"; // Add decimal to keep consistent format
        console.log("Extracted RI value:", riValue);
      } else {
        console.log("Match found but no value captured");
      }
    } else {
      console.log("Could not extract RI value from response");
      // Add additional logging to see what we're getting
      console.log("First 100 chars of analysis:", analysisText.substring(0, 100));
    }    

    // Define the category based on the RI value (this is more reliable than trying to extract it)
    let category = "";
    switch(riValue) {
      case 1:
        category = "Non-Objective (Pure Abstraction)";
        break;
      case 2:
        category = "Abstract";
        break;
      case 3:
        category = "Stylized Representation";
        break;
      case 4:
        category = "Representational Realism";
        break;
      case 5:
        category = "Hyper-Realism";
        break;
      default:
        category = "Uncategorized";
    }

    // Get the explanation text - the paragraph that follows the RI value
    const explanationMatch = analysisText.match(/RI\s*=\s*\d+\s*\n\s*([\s\S]+?)(?=\n\s*##|$)/);
    const explanationText = explanationMatch ? explanationMatch[1].trim() : "";

    // Create a completely new analysis text with proper formatting
    // This guarantees the right structure regardless of what GPT returns
    let modifiedAnalysis = analysisText;

    // Replace the RI section and everything after it until the next heading or end
    const riSectionRegex = /## Classification\s*\n\s*###\s*RI\s*=\s*\d+\s*\n\s*[\s\S]+?(?=\n\s*##|$)/;
    const riSection = analysisText.match(riSectionRegex);
    
    if (riSection && riSection[0]) {
      // Create a properly formatted replacement
      const newRISection = `## Classification

### RI = ${riValue}

### ${category}

${explanationText}`;
      
      // Replace the section
      modifiedAnalysis = analysisText.replace(riSectionRegex, newRISection);
    } else {
      // Fallback if we can't find the section to replace
      console.log("Could not find RI section to replace - using fallback method");
      
      // Find just the RI line instead
      const riLineRegex = /###\s*RI\s*=\s*\d+/;
      const riLine = analysisText.match(riLineRegex);
      
      if (riLine && riLine[0]) {
        const newRILines = `### RI = ${riValue}\n\n### ${category}`;
        modifiedAnalysis = analysisText.replace(riLineRegex, newRILines);
      }
    }

    // Extract the summary paragraph
    const summaryMatch = analysisText.match(/## Summary\s+([\s\S]*?)\n##/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : null;

    const finalResponse = {
      analysis: modifiedAnalysis,
      ri: riValue,
      category: category,
      explanation: summary || ""
    };

    console.log("Sending final RI response to client");
    res.json(finalResponse);

  } catch (error) {
    console.error("Error in /analyze-ri:", error.message);
    const errMsg = error.response?.data?.error?.message || error.message || "Unknown error";
    res.status(500).json({ error: { message: errMsg } });
  }
});

// Endpoint for Career Level Index (CLI) analysis
app.post("/analyze-cli", async (req, res) => {
  try {
    console.log("Received CLI analyze request");
    const { prompt, artistName, artistResume } = req.body;

    if (!prompt) {
      console.log("Missing prompt in request");
      return res.status(400).json({ error: { message: "Prompt is required" } });
    }
    
    if (!artistResume) {
      console.log("Missing artist resume in request");
      return res.status(400).json({ error: { message: "Artist resume is required" } });
    }

    if (!OPENAI_API_KEY) {
      console.log("Missing OpenAI API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    // Log info about the request
    console.log(`Processing CLI request for artist: "${artistName}"`);
    console.log(`Prompt length: ${prompt.length} characters`);
    console.log(`Resume length: ${artistResume.length} characters`);
    
    // Construct the prompt with artist name and resume
    const finalPrompt = `Artist: "${artistName}"

Artist Resume/Bio:
${artistResume}

${prompt}`;

    console.log("Sending request to OpenAI API for CLI analysis");
    
    // Send request to OpenAI API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert art career analyst specializing in evaluating artists' professional achievements. Your task is to analyze the provided artist's resume and calculate an accurate CLI (Career Level Index) value between 1.00 and 5.00 based on the specified calculation framework. Provide the CLI value, a brief explanation, and a detailed category breakdown." 
          },
          { 
            role: "user", 
            content: finalPrompt
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    console.log("Received response from OpenAI API for CLI");
    
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.log("Invalid response format from OpenAI:", JSON.stringify(response.data));
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API" } });
    }

    let analysisText = response.data.choices[0].message.content;
    console.log("CLI Analysis text:", analysisText);

    // Extract the CLI value using regex
    const cliRegex = /Career\s+Level\s+Index\s*\(?CLI\)?\s*=\s*(\d+\.\d+)/i;
    const cliMatch = analysisText.match(cliRegex);
    let cliValue = "3.00"; // Default value if extraction fails
    
    if (cliMatch && cliMatch[1]) {
      cliValue = cliMatch[1];
      // Ensure it's formatted to 2 decimal places
      if (cliValue.split('.')[1].length === 1) {
        cliValue = `${cliValue}0`;
      }
      console.log("Extracted CLI value:", cliValue);
    } else {
      console.log("Could not extract CLI value from response");
    }
    
    // Extract the explanation text (everything after the CLI value statement)
    const explanationRegex = /Career\s+Level\s+Index\s*\(?CLI\)?\s*=\s*\d+\.\d+\s*(.+?)(?:\n\n|\n$|$)/i;
    const explanationMatch = analysisText.match(explanationRegex);
    let explanation = "";
    
    if (explanationMatch && explanationMatch[1]) {
      explanation = explanationMatch[1].trim();
      console.log("Extracted explanation:", explanation);
    } else {
      console.log("Could not extract explanation from response");
    }

    // Extract category breakdown
    let categoryBreakdown = "";
    const categoryMatch = analysisText.match(/Category Breakdown[\s\S]*?(?=\n\nRaw Score:|$)/i);
    if (categoryMatch && categoryMatch[0]) {
      // Process the category breakdown to HTML format
      const categoryText = categoryMatch[0].replace(/Category Breakdown[:\s]*/i, '').trim();
      
      // Split by numbered categories and convert to HTML
      const categoryItems = categoryText.split(/\d+\.\s+/).filter(item => item.trim() !== '');
      
      if (categoryItems.length > 0) {
        categoryBreakdown = categoryItems.map(item => {
          const lines = item.split('\n').map(line => line.trim()).filter(line => line !== '');
          if (lines.length > 0) {
            const categoryName = lines[0].replace(/:$/, '');
            const details = lines.slice(1).join('<br>');
            return `<div class="category">
              <span class="category-title">${categoryName}:</span>
              <div class="category-details">${details}</div>
            </div>`;
          }
          return '';
        }).join('');
      }
    }

    const finalResponse = {
      analysis: analysisText,
      cli: cliValue,
      explanation: explanation,
      categoryBreakdown: categoryBreakdown
    };

    console.log("Sending final CLI response to client");
    // Send the response
    res.json(finalResponse);

  } catch (error) {
    handleApiError(error, res);
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

    if (!OPENAI_API_KEY) {
      console.log("Missing OpenAI API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    // Log info about the request
    console.log(`Processing SMI request for artwork: "${artTitle}" by ${artistName}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    // Construct the prompt with artwork information
    const finalPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${prompt}`;

    console.log("Sending request to OpenAI API for SMI analysis");
    
    // Send request to OpenAI API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert fine art analyst specializing in evaluating artistic skill mastery. Your task is to analyze the provided artwork and calculate an accurate SMI (Skill Mastery Index) value between 1.00 and 5.00 based on the specified calculation framework. Provide detailed analysis following the prompt instructions exactly." 
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 2000
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    console.log("Received response from OpenAI API for SMI");
    
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.log("Invalid response format from OpenAI:", JSON.stringify(response.data));
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API" } });
    }

    let analysisText = response.data.choices[0].message.content;
    console.log("SMI Analysis text:", analysisText);

    // Extract category scores
    const categoryScores = extractCategoryScores(analysisText);
    
    // Check if all category scores were successfully extracted
    if (!categoryScores) {
      console.log("Failed to extract all category scores from the analysis");
      return res.status(500).json({ 
        error: { 
          message: "Failed to extract all required category scores. Please try again." 
        } 
      });
    }
    
    console.log("Extracted category scores:", categoryScores);
    
    // Calculate the SMI value using the weighted formula
    const calculatedSMI = (
      (categoryScores.composition * 0.20) +
      (categoryScores.color * 0.20) +
      (categoryScores.technical * 0.25) +
      (categoryScores.originality * 0.20) +
      (categoryScores.emotional * 0.15)
    );
    
    // Round up to the nearest 0.25 increment if exactly halfway
    const roundedSMI = roundSMIUp(calculatedSMI);
    console.log(`Calculated SMI: ${calculatedSMI}, Rounded SMI: ${roundedSMI}`);
    
    // Format to ensure 2 decimal places
    const smiValue = roundedSMI.toFixed(2);
    
    // Extract the explanation text (everything after the SMI value statement)
    const explanationRegex = /Skill\s+Mastery\s+Index\s*\(?SMI\)?\s*=\s*\d+\.\d+\s*(.+?)(?:\n\n|\n$|$)/i;
    const explanationMatch = analysisText.match(explanationRegex);
    let explanation = "";
    
    if (explanationMatch && explanationMatch[1]) {
      explanation = explanationMatch[1].trim();
      console.log("Extracted explanation:", explanation);
    } else {
      console.log("Could not extract explanation from response");
    }

    // Extract any CSV data that might be present
    let csvLinks = {};
    const factorsCsvMatch = analysisText.match(/```csv\s*(Factor#.*[\s\S]*?)```/);
    if (factorsCsvMatch && factorsCsvMatch[1]) {
      csvLinks.factorsCSV = factorsCsvMatch[1];
    }
    
    const questionsCsvMatch = analysisText.match(/```csv\s*(Question#.*[\s\S]*?)```/);
    if (questionsCsvMatch && questionsCsvMatch[1]) {
      csvLinks.questionsCSV = questionsCsvMatch[1];
    }

    const finalResponse = {
      analysis: analysisText,
      smi: smiValue,
      explanation: explanation,
      categoryScores: categoryScores,
      csvLinks: Object.keys(csvLinks).length > 0 ? csvLinks : undefined
    };

    console.log("Sending final SMI response to client");
    // Send the response
    res.json(finalResponse);

  } catch (error) {
    handleApiError(error, res);
  }
});

// Endpoint for combined SMI and RI analysis
// Replace the entire analyze-combined endpoint with this improved version
app.post("/analyze-combined", async (req, res) => {
  try {
    console.log("Received combined SMI and RI analyze request");
    const { image, artTitle, artistName } = req.body;

    if (!image) {
      console.log("Missing image in request");
      return res.status(400).json({ error: { message: "Image is required" } });
    }

    if (!OPENAI_API_KEY) {
      console.log("Missing OpenAI API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    // Log info about the request
    console.log(`Processing combined analysis for artwork: "${artTitle}" by ${artistName}`);
    
    // First, we'll get the RI value using a simplified approach
    console.log("Sending request to OpenAI API for simplified RI analysis");
    
    const riResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert art analyst. Examine this artwork and determine its Representational Index (RI) from 1-5 based on how representational versus abstract it is. 1=Non-Objective (Pure Abstraction), 2=Abstract, 3=Stylized Representation, 4=Representational Realism, 5=Hyper-Realism. Respond with ONLY a number from 1 to 5, no explanation." 
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: `What is the RI value (1-5) for this artwork titled "${artTitle}" by ${artistName}?` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    console.log("Received response from OpenAI API for RI");
    
    if (!riResponse.data || !riResponse.data.choices || !riResponse.data.choices[0] || !riResponse.data.choices[0].message) {
      console.log("Invalid response format from OpenAI for RI");
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API for RI analysis" } });
    }

    let riAnalysisText = riResponse.data.choices[0].message.content.trim();
    console.log("RI response:", riAnalysisText);
    
    // Extract the RI value - should be an integer
	let riValue = "3"; // Changed from "3.0"
	const numberMatch = riAnalysisText.match(/\b([1-5])\b/);

	if (numberMatch && numberMatch[1]) {
 	 riValue = numberMatch[1]; // Removed + ".0"
  	console.log("Extracted RI value:", riValue);
	} else {
  	console.log("Could not extract RI value from simplified response");
	}

    // Now, for the SMI value, we'll use a simplified approach as well
    console.log("Sending request to OpenAI API for simplified SMI analysis");
    
    const smiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert fine art analyst specialized in evaluating artistic skill. Rate this artwork on a Skill Mastery Index (SMI) from 1.00 to 5.00. Consider: Composition (20%), Color & Light (20%), Technical Skill (25%), Originality (20%), and Emotional Depth (15%). Respond with ONLY a decimal number between 1.00 and 5.00, rounded to the nearest 0.25 (e.g. 3.25, 4.50, etc.). No explanation." 
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: `What is the SMI value (1.00-5.00) for this artwork titled "${artTitle}" by ${artistName}?` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    console.log("Received response from OpenAI API for SMI");
    
    if (!smiResponse.data || !smiResponse.data.choices || !smiResponse.data.choices[0] || !smiResponse.data.choices[0].message) {
      console.log("Invalid response format from OpenAI for SMI");
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API for SMI analysis" } });
    }

    let smiAnalysisText = smiResponse.data.choices[0].message.content.trim();
    console.log("SMI response:", smiAnalysisText);
    
    // Extract the SMI value - should be a decimal number
    let smiValue = "3.00"; // Default value if extraction fails
    const decimalMatch = smiAnalysisText.match(/\b(\d+\.\d+)\b/);
    
    if (decimalMatch && decimalMatch[1]) {
      // Ensure it's formatted with 2 decimal places
      smiValue = parseFloat(decimalMatch[1]).toFixed(2);
      console.log("Extracted SMI value:", smiValue);
    } else {
      // Try to match just a whole number
      const wholeNumberMatch = smiAnalysisText.match(/\b(\d+)\b/);
      if (wholeNumberMatch && wholeNumberMatch[1]) {
        // Add .00 to the whole number
        smiValue = parseFloat(wholeNumberMatch[1]).toFixed(2);
        console.log("Extracted SMI whole number value:", smiValue);
      } else {
        console.log("Could not extract SMI value from simplified response");
      }
    }

    // Send the final response with just the SMI and RI values
    const finalResponse = {
      smi: smiValue,
      ri: riValue
    };

    console.log("Sending final combined response to client:", finalResponse);
    res.json(finalResponse);

  } catch (error) {
    console.error("Error in combined endpoint:", error);
    
    if (error.response) {
      console.error("OpenAI API error details:", error.response.data);
    }
    
    res.status(500).json({ 
      error: { 
        message: error.message || "An unknown error occurred in combined analysis" 
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


app.post('/api/admin/create-backup', (req, res) => {
  try {
    const dbPath = '/mnt/data/art_database.json';
    const backupDir = '/mnt/data';
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const backupFileName = `backup_art_database_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    const data = fs.readFileSync(dbPath, 'utf-8');
    fs.writeFileSync(backupPath, data);

    const publicUrl = `/download/${backupFileName}`;

    console.log(`✅ Backup created: ${backupFileName}`);
    res.json({ message: `Backup created: ${backupFileName}`, downloadUrl: publicUrl });
  } catch (err) {
    console.error("❌ Failed to create backup:", err);
    res.status(500).json({ error: "Failed to create backup." });
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



app.post("/api/records/recalculate-appsi", (req, res) => {
    try {
        const data = readDatabase();
        const coefficients = data.metadata.coefficients;

        // Track problematic records
        const problematicRecords = [];

        // Recalculate APPSI for all records
        data.records.forEach(record => {
            // Add more robust validation
            if (!record.size || !record.ppsi || 
                isNaN(record.size) || isNaN(record.ppsi) || 
                record.size <= 0 || record.ppsi <= 0) {
                
                // Log details about problematic record
                problematicRecords.push({
                    recordId: record.id,
                    issues: {
                        size: record.size,
                        ppsi: record.ppsi,
                        hasValidSize: !!record.size && !isNaN(record.size) && record.size > 0,
                        hasValidPPSI: !!record.ppsi && !isNaN(record.ppsi) && record.ppsi > 0
                    }
                });
                
                return; // Skip this record
            }

            // Calculate APPSI for valid records
            record.appsi = calculateAPPSI(
                record.size, 
                record.ppsi, 
                coefficients
            );
        });

        // Write updated database
        writeDatabase(data);

        res.json({
            message: 'Successfully recalculated APPSI for all records',
            totalRecords: data.records.length,
            updatedRecords: data.records.filter(r => r.appsi !== undefined).length,
            problematicRecords: problematicRecords
        });




    } catch (error) {
        console.error('Error in retroactive APPSI calculation:', error);
        res.status(500).json({ error: 'Failed to recalculate APPSI', details: error.message });
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







// Updated POST /api/records to ensure valid ID in response (2025-05-31)
app.post("/api/records", ensureAPPSICalculation, (req, res) => {
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
        
        // FIX: Remove the id field from req.body before spreading
        const { id, ...bodyWithoutId } = req.body;

// Change it to:
const newRecord = {
    id: newId,
    isActive: true,
    dateAdded: new Date().toISOString(),
    ...bodyWithoutId
};

        newRecord.size = newRecord.height * newRecord.width;
        if (newRecord.size > 0) {
            newRecord.lssi = Math.log(newRecord.size);
        }
        newRecord.ppsi = newRecord.price / newRecord.size;
        delete newRecord.imagePath;
        data.records.push(newRecord);
        console.log(`New record: ID=${newId}, Artist=${newRecord.artistName}, Title=${newRecord.title}`);
        writeDatabase(data);
        // Ensure response includes newRecord with ID
        console.log(`Returning record with ID: ${newRecord.id}`);
        res.status(201).json({ ...newRecord, id: newId });
    } catch (error) {
        console.error('Error saving record:', error.message, error.stack);
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






app.put("/api/records/:id", ensureAPPSICalculation, (req, res) => {
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
        


        // Recalculate derived fields if height/width/price changed
        if (req.body.height || req.body.width || req.body.price) {
            updatedRecord.size = updatedRecord.height * updatedRecord.width;
            
            // Calculate LSSI (Log of Size in Square Inches)
            if (updatedRecord.size > 0) {
                updatedRecord.lssi = Math.log(updatedRecord.size);
            }
            
            updatedRecord.ppsi = updatedRecord.price / updatedRecord.size;
        } else if (!updatedRecord.lssi && updatedRecord.size > 0) {
            // Ensure LSSI exists even if height/width didn't change
            updatedRecord.lssi = Math.log(updatedRecord.size);
        }
        
// Remove imagePath – now using embedded Base64 images
delete updatedRecord.imagePath;

        
        data.records[index] = updatedRecord;
        writeDatabase(data);
        
        res.json(updatedRecord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});






// GET current coefficients
app.get("/api/coefficients", (req, res) => {
  try {
    const data = readDatabase();
    res.json(data.metadata.coefficients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post('/api/admin/replace-database', (req, res) => {
  try {
    // Now expects JSON in request body instead of file upload
    const json = req.body;
    
    if (!json || !Array.isArray(json.records)) {
      return res.status(400).json({ error: "Request body must include a 'records' array." });
    }
    
    const db = json; // Preserve entire uploaded structure, including metadata
    const savePath = '/mnt/data/art_database.json';
    const parentDir = path.dirname(savePath);
    
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    fs.writeFileSync(savePath, JSON.stringify(db, null, 2));
    console.log(`Database successfully replaced with ${json.records.length} records.`);
    res.json({ 
      message: "Database replaced successfully.",
      recordCount: json.records.length 
    });
  } catch (err) {
    console.error("Failed to replace database:", err);
    res.status(500).json({ error: "Failed to replace database." });
  }
});



// Add BOTH of these routes right after the closing }); of replace-database

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







app.post("/api/coefficients", (req, res) => {
  try {
    if (!req.body.exponent || !req.body.constant) {
      return res.status(400).json({ error: 'Missing coefficient values' });
    }
    
    const data = readDatabase();
    
    // Update coefficients
    data.metadata.coefficients = {
      exponent: req.body.exponent,
      constant: req.body.constant,
      lastCalculated: new Date().toISOString()
    };
    
    // Recalculate APPSI for all records
    const updatedData = updateAllAPPSI(data);
    writeDatabase(updatedData);
    
    res.json({ 
      success: true, 
      message: 'Coefficients updated and APPSI recalculated for all records',
      coefficients: data.metadata.coefficients
    });
  } catch (error) {
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




// Endpoint for general art analysis with refinement recommendations
app.post("/analyze-art", async (req, res) => {
  try {
    console.log("Received art analysis request");
    const { prompt, image, artTitle, artistName } = req.body;

    if (!prompt || !image || !OPENAI_API_KEY) {
      return res.status(400).json({ error: { message: "Missing prompt, image, or API key" } });
    }

    const finalPrompt = `Title: "${artTitle}"\nArtist: "${artistName}"\n\n${prompt}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are an expert fine art analyst specializing in providing constructive feedback and refinement recommendations for artworks." },
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 2000
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const analysisText = response.data.choices[0]?.message?.content || "";

    const finalResponse = {
      analysis: analysisText
    };

    console.log("Sending art analysis response to client");
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
    const { smi, ri, cli, size, targetedRI, subjectImageBase64 } = req.body;
    
    // Log input parameters (excluding large base64 strings)
    console.log("Valuation inputs:", { 
      smi, ri, cli, size, 
      targetedRI: Array.isArray(targetedRI) ? targetedRI : 'Not an array',
      hasSubjectImage: !!subjectImageBase64
    });
    
    const db = readDatabase();
    const allRecords = db.records || [];
    const coefficients = db.metadata.coefficients;

    if (!smi || !ri || !cli || !size || !targetedRI || !Array.isArray(targetedRI) || !subjectImageBase64) {
      return res.status(400).json({ error: "Missing required valuation inputs." });
    }

    // Step 1: Filter valid comps with detailed logging
    console.log(`Total records in database: ${allRecords.length}`);
    const comps = allRecords.filter(r => {
      const isValid = r.ri !== undefined && 
                     targetedRI.includes(Number(r.ri)) &&
                     typeof r.smi === 'number' &&
                     typeof r.cli === 'number' &&
                     typeof r.appsi === 'number' &&
                     r.imageBase64; // Ensure image exists
                     
      // Debug records that don't match criteria
      if (!isValid) {
        const issues = [];
        if (r.ri === undefined) issues.push("missing ri");
        else if (!targetedRI.includes(Number(r.ri))) issues.push(`ri=${r.ri} not in targetedRI=${targetedRI}`);
        if (typeof r.smi !== 'number') issues.push(`smi type is ${typeof r.smi}`);
        if (typeof r.cli !== 'number') issues.push(`cli type is ${typeof r.cli}`);
        if (typeof r.appsi !== 'number') issues.push(`appsi type is ${typeof r.appsi}`);
        if (!r.imageBase64) issues.push("missing imageBase64");
        
        if (issues.length > 0) {
          console.log(`Record ${r.id} invalid for comparison: ${issues.join(", ")}`);
        }
      }
      return isValid;
    });
    
    console.log(`Found ${comps.length} valid comparison records`);
    
    if (comps.length === 0) {
      return res.status(400).json({ 
        error: "No valid comparison records found for the specified criteria.",
        details: {
          targetedRI,
          totalRecords: allRecords.length
        }
      });
    }

    // The rest of the valuation logic remains the same...
    // Step 2: Calculate z-score distances
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
    
    console.log("Calculated stats:", stats);
    
    const zSubject = {
      smi: z(smi, stats.smi.mean, stats.smi.std),
      ri: z(ri, stats.ri.mean, stats.ri.std),
      cli: z(cli, stats.cli.mean, stats.cli.std)
    };
    const weights = { smi: 0.47, ri: 0.33, cli: 0.20 };

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

    const subjectSum = smi + ri + cli;
    const below = enriched.filter(r => r.smi + r.ri + r.cli <= subjectSum).slice(0, 6);
    const above = enriched.filter(r => r.smi + r.ri + r.cli > subjectSum).slice(0, 6);
    let topComps = [...below, ...above];
    if (topComps.length < 6) topComps = enriched.slice(0, 6);
    
    console.log(`Selected ${topComps.length} top comps for visual comparison`);

    // Step 3: Visual comparison (AI) - THIS IS LIKELY WHERE THE ERROR IS OCCURRING
    const visualComparisons = [];
    for (const comp of topComps) {
      try {
        const compId = comp.id;
        console.log(`Processing visual comparison for comp ID ${compId}`);
        




// Diagnostic logging for comparison image data
if (comp.imageBase64) {
  console.log(`Comp ${compId} image data type: ${typeof comp.imageBase64}`);
  console.log(`Comp ${compId} image data length: ${comp.imageBase64.length}`);
  
  // Is it a valid string?
  if (typeof comp.imageBase64 !== 'string') {
    console.log(`Comp ${compId} image data is not a string!`);
  }
  
  // First few characters
  console.log(`Comp ${compId} first 20 chars: "${comp.imageBase64.substring(0, 20)}..."`);
  
  // Check if it has valid base64 padding
  const validPadding = comp.imageBase64.length % 4 === 0;
  console.log(`Comp ${compId} has valid base64 padding: ${validPadding}`);
  
  // Check for base64 prefix
  const hasPrefix = comp.imageBase64.startsWith('data:image');
  console.log(`Comp ${compId} has image data prefix: ${hasPrefix}`);
  
  // Check for non-base64 characters
  const nonBase64Chars = comp.imageBase64.replace(/[A-Za-z0-9+/=]/g, '');
  if (nonBase64Chars.length > 0) {
    console.log(`Comp ${compId} has ${nonBase64Chars.length} non-base64 characters`);
    console.log(`First few non-base64 chars: '${nonBase64Chars.substring(0, 20)}'`);
  }
} else {
  console.log(`Comp ${compId} has NO imageBase64 property!`);
}





        // Check if the comp has image data and log details
        if (!comp.imageBase64) {
          console.error(`Missing imageBase64 for comp ID ${compId}`);
          console.log(`Record keys available:`, Object.keys(comp));
          continue;
        }

        // Make the API call with error handling
        console.log(`Sending comparison request for comp ID ${compId}`);
        const compareRes = await axios.post("https://valora-analytics-api.onrender.com/api/compare-subject-comp", {
          subject: { imageBase64: subjectImageBase64 },
          comp: { imageBase64: comp.imageBase64, recordId: compId }
        });
        
        console.log(`Received comparison result for comp ID ${compId}: ${compareRes.data.finalResult}`);

        // Add to visualComparisons with proper structure
        visualComparisons.push({
          compId: comp.id,
          classification: compareRes.data.finalResult,
          appsi: comp.appsi,
          scalarDistance: comp.scalarDistance,
          imageBase64: comp.imageBase64 // Ensure imageBase64 is passed through
        });
      } catch (error) {
        console.error(`Error in visual comparison for comp:`, error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        // Continue to next comparison instead of failing the entire process
      }
    }
    
    if (visualComparisons.length === 0) {
      return res.status(500).json({ 
        error: "Failed to perform visual comparisons. Check server logs for details." 
      });
    }
    
    console.log(`Completed ${visualComparisons.length} visual comparisons`);

    // Remainder of the valuation endpoint stays the same...
    // Step 4: Override logic
    let selectedComps = [];
    let sappsi = 0;
    let sappsiCompIds = [];

    const labels = visualComparisons.map(v => v.classification);
    const allInferior = labels.every(l => l === "Inferior");
    const allSuperior = labels.every(l => l === "Superior");
    const ruleUsed = allInferior ? "All Inferior" : allSuperior ? "All Superior" : "Mixed";

    if (ruleUsed === "All Inferior") {
      selectedComps = visualComparisons.sort((a, b) => b.appsi - a.appsi).slice(0, 3);
    } else if (ruleUsed === "All Superior") {
      selectedComps = visualComparisons.sort((a, b) => a.appsi - b.appsi).slice(0, 3);
    } else {
      // Mixed Rule
      const nearestThree = visualComparisons
        .slice()
        .sort((a, b) => a.scalarDistance - b.scalarDistance)
        .slice(0, 3);

      selectedComps = nearestThree;

      const avgNearestThree = nearestThree.reduce((sum, c) => sum + c.appsi, 0) / nearestThree.length;
      
      // Ensure there are both superior and inferior classifications before calculating midpoint
      const superiorComps = visualComparisons.filter(c => c.classification === "Superior");
      const inferiorComps = visualComparisons.filter(c => c.classification === "Inferior");
      
      let midpoint;
      if (superiorComps.length > 0 && inferiorComps.length > 0) {
        const lowestSuperior = Math.min(...superiorComps.map(c => c.appsi));
        const highestInferior = Math.max(...inferiorComps.map(c => c.appsi));
        midpoint = (lowestSuperior + highestInferior) / 2;
      } else {
        // Fallback if we don't have both categories
        midpoint = avgNearestThree;
      }

      sappsi = 0.5 * avgNearestThree + 0.5 * midpoint;
      sappsiCompIds = nearestThree.map(c => c.compId);

      console.log("Selected comps used for SAPPSI:");
      nearestThree.forEach(c => {
        console.log(`ID: ${c.compId}, APPSI: ${c.appsi.toFixed(2)}, Distance: ${c.scalarDistance.toFixed(4)}, Classification: ${c.classification}`);
      });
    }

    // If sappsi wasn't set by Mixed Rule, calculate it from selected comps
    if (!sappsi) {
      sappsi = selectedComps.reduce((sum, c) => sum + c.appsi, 0) / selectedComps.length;
      sappsiCompIds = selectedComps.map(c => c.compId);
    }

    // Step 5: Final valuation
    const ln200 = Math.log(200);
    const lnSize = Math.log(size);
    const predictAt200 = coefficients.constant * Math.pow(ln200, coefficients.exponent);
    const predictAtSize = coefficients.constant * Math.pow(lnSize, coefficients.exponent);
    const residual = sappsi / predictAt200;
    const smvppsi = predictAtSize * residual;
    const marketValue = Math.round(size * smvppsi);

    // Step 6: Narrative
    const superiors = visualComparisons.filter(c => c.classification === "Superior");
    const inferiors = visualComparisons.filter(c => c.classification === "Inferior");

    try {
      console.log("Generating narrative");
      const narrativeRes = await axios.post("https://valora-analytics-api.onrender.com/api/generate-narrative", {
        superiors,
        inferiors,
        comps: visualComparisons,
        ruleUsed,
        smvppsi
      });
      
      const narrative = narrativeRes.data.narrative || "Narrative not available";
      
      console.log("Valuation process completed successfully");
      return res.json({
        constant: coefficients.constant,
        exponent: coefficients.exponent,
        sappsi,
        sappsiCompIds,
        smvppsi,
        marketValue,
        summaryLabel: ruleUsed === "All Inferior" ? "All Below" : ruleUsed === "All Superior" ? "All Above" : "Mixed",
        narrative: narrative,
        visualComparisons
      });
    } catch (narrativeError) {
      console.error("Error generating narrative:", narrativeError.message);
      // Continue even if narrative generation fails
      return res.json({
        constant: coefficients.constant,
        exponent: coefficients.exponent,
        sappsi,
        sappsiCompIds,
        smvppsi,
        marketValue,
        summaryLabel: ruleUsed === "All Inferior" ? "All Below" : ruleUsed === "All Superior" ? "All Above" : "Mixed",
        narrative: "A detailed analysis could not be generated at this time.",
        visualComparisons
      });
    }
  } catch (error) {
    console.error("Valuation error:", error);
    let errorDetails = error.message || "Unknown error";
    
    // Add more detailed error information if available
    if (error.response) {
      errorDetails += ` - ${JSON.stringify(error.response.data)}`;
    }
    
    res.status(500).json({ error: errorDetails });
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



// Diagnostic logging for comparison image data
if (comp.imageBase64) {
  // Log the length of the string
  console.log(`Comp image length: ${comp.imageBase64.length}`);
  
  // Check if it starts with a data URI prefix
  const hasPrefix = comp.imageBase64.startsWith('data:image');
  console.log(`Has data:image prefix: ${hasPrefix}`);
  
  // Check if it contains non-base64 characters
  const nonBase64Chars = comp.imageBase64.replace(/[A-Za-z0-9+/=]/g, '');
  console.log(`Non-base64 characters: '${nonBase64Chars.substring(0, 50)}...'`);
  console.log(`Number of non-base64 characters: ${nonBase64Chars.length}`);
  
  // Check the first few characters
  console.log(`First 20 chars: '${comp.imageBase64.substring(0, 20)}'`);
  
  // If there's a prefix, extract and check the actual base64 part
  if (hasPrefix) {
    const base64Part = comp.imageBase64.split(',')[1];
    if (base64Part) {
      console.log(`Base64 part length: ${base64Part.length}`);
      // Check if the base64 part contains non-base64 characters
      const nonBase64InBase64Part = base64Part.replace(/[A-Za-z0-9+/=]/g, '');
      console.log(`Non-base64 chars in base64 part: '${nonBase64InBase64Part.substring(0, 50)}...'`);
    } else {
      console.log('Could not extract base64 part from data URI');
    }
  }
} else {
  console.log('No imageBase64 data for comp');
}

// Diagnostic logging for subject image data
if (subject.imageBase64) {
  console.log(`Subject image length: ${subject.imageBase64.length}`);
  const hasPrefix = subject.imageBase64.startsWith('data:image');
  console.log(`Subject has data:image prefix: ${hasPrefix}`);
}


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

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: "Missing OpenAI API Key" } });
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

    // Send request to OpenAI
    console.log("Sending request to OpenAI for comparison");
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are a strict fine art evaluator following exact instructions." },
          {
            role: "user",
            content: [
              { type: "text", text: comparisonPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${subject.imageBase64}` } },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${comp.imageBase64}` } }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.0 // strict and deterministic
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const chatReply = response.data.choices[0].message.content;
    console.log(`Received comparison reply for Comp ID ${comp.recordId}:`, chatReply.substring(0, 200));

    // Parse results
    const yesNoResults = chatReply.match(/Criterion\s*\d+:\s*(Yes|No)/gi);

    if (!yesNoResults || yesNoResults.length !== 6) {
      console.error("Invalid format received from ChatGPT comparison");
      return res.status(500).json({ error: { message: "Invalid response format from ChatGPT" } });
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

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OpenAI API Key" });
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

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are a fine art valuation assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const paragraph = response.data.choices[0].message.content.trim();
    res.json({ narrative: paragraph });

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

// Serve static files from the "public" folder
app.use(express.static("public"));


// ====================
// START THE SERVER
// ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


