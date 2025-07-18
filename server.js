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


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


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




// NEW ENDPOINT: SMI 33-Factor Analysis with Hardwired Prompt
app.post("/analyze-smi-33-factors", async (req, res) => {
  try {
    console.log("Received SMI 33-factors analyze request");
    const { image, artTitle, artistName } = req.body;

    if (!image) {
      console.log("Missing image in request");
      return res.status(400).json({ error: { message: "Image is required" } });
    }

    if (!OPENAI_API_KEY) {
      console.log("Missing OpenAI API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    console.log(`Processing SMI 33-factors request for artwork: "${artTitle}" by ${artistName}`);
    
    // HARDWIRED 33-FACTOR PROMPT (simplified to just return factor scores)
    const smi33FactorsPrompt = `
Analyze this artwork and score it on 33 specific skill mastery factors. 

**INSTRUCTIONS:**
1. Analyze the artwork based on the 33 factors listed below
2. For each factor, assign the appropriate score based on the rubric
3. Calculate SMI = SumExtended ÷ Denom (weighted average)
4. Output ONLY the factor scores in the exact format specified

**OUTPUT FORMAT:**
Return your analysis in this exact format:

FACTOR_SCORES_START
Factor_1,Line,0.037,[score]
Factor_2,Shape,0.037,[score]
Factor_3,Form,0.031,[score]
Factor_4,Space,0.037,[score]
Factor_5,Color_Hue,0.037,[score]
Factor_6,Texture,0.031,[score]
Factor_7,Tone_Value,0.031,[score]
Factor_8,Saturation,0.031,[score]
Factor_9,Composition,0.049,[score]
Factor_10,Volume,0.025,[score]
Factor_11,Balance,0.043,[score]
Factor_12,Contrast,0.037,[score]
Factor_13,Emphasis,0.037,[score]
Factor_14,Movement,0.031,[score]
Factor_15,Rhythm,0.031,[score]
Factor_16,Variety,0.031,[score]
Factor_17,Proportion,0.031,[score]
Factor_18,Harmony,0.037,[score]
Factor_19,Cohesiveness,0.031,[score]
Factor_20,Pattern,0.018,[score]
Factor_21,Brushwork,0.037,[score]
Factor_22,Chiaroscuro,0.031,[score]
Factor_23,Impasto,0.025,[score]
Factor_24,Sfumato,0.025,[score]
Factor_25,Glazing,0.025,[score]
Factor_26,Scumbling,0.018,[score]
Factor_27,Pointillism,0.018,[score]
Factor_28,Wet_on_wet,0.018,[score]
Factor_29,Uniqueness,0.043,[score]
Factor_30,Creativity,0.049,[score]
Factor_31,Mood,0.043,[score]
Factor_32,Viewer_Engagement,0.037,[score]
Factor_33,Emotional_Resonance,0.043,[score]
FACTOR_SCORES_END

SMI_CALCULATED:[calculated SMI value]

**SCORING RUBRIC:**

Factor 1 - Line (0.037):
- 0: Not applicable/not used
- 1.35: Lines are uneven, uncontrolled, or lack purpose
- 2.20: Lines show some control but are inconsistent
- 3.20: Lines are deliberate, controlled, and exhibit variation
- 4.20: Lines are consistently confident with expressive rhythm
- 4.85: Linework is flawless and innovative

Factor 2 - Shape (0.037):
- 0: Not applicable/not used
- 1.35: Shapes are flat, unbalanced, or awkward
- 2.20: Shapes are simple but improving in structure
- 3.20: Shapes are clear, intentional, and well-integrated
- 4.20: Shapes are complex, harmonious, and refined
- 4.85: Shapes are groundbreaking in design and innovation

Factor 3 - Form (0.031):
- 0: Not applicable/not used
- 1.35: Forms appear flat, with little or no depth
- 2.20: Forms show some depth but inconsistent execution
- 3.20: Forms are well-constructed with believable depth
- 4.20: Forms are sophisticated, enhancing spatial dynamics
- 4.85: Forms achieve perfection in depth and innovation

Factor 4 - Space (0.037):
- 0: Not applicable/not used
- 1.35: Poor spatial relationships; feels flat or crowded
- 2.20: Some sense of depth but inconsistent
- 3.20: Effective use of space to create depth and balance
- 4.20: Skillful spatial manipulation enhances flow and mood
- 4.85: Exceptional spatial control creating immersive experience

Factor 5 - Color/Hue (0.037):
- 0: Not applicable/not used
- 1.35: Colors are muddy, clashing, or poorly chosen
- 2.20: Colors show some harmony but inconsistent
- 3.20: Colors are well-chosen and enhance mood
- 4.20: Colors are nuanced, harmonious, emotionally impactful
- 4.85: Colors are innovative and integral to success

Factor 6 - Texture (0.031):
- 0: Not applicable/not used
- 1.35: Texture absent or added without purpose
- 2.20: Some texture attempt but artificial or incomplete
- 3.20: Texture effectively integrated, adding depth
- 4.20: Sophisticated texture enhances realism/abstraction
- 4.85: Texture expertly controlled, conveying meaning

Factor 7 - Tone/Value (0.031):
- 0: Not applicable/not used
- 1.35: Poor tonal control; flat or lacking contrast
- 2.20: Some tonal awareness but limited contrasts
- 3.20: Strong tone usage defines forms and creates depth
- 4.20: Subtle intentional tonal transitions elevate mood
- 4.85: Mastery of tone with exceptional dynamic range

Factor 8 - Saturation (0.031):
- 0: Not applicable/not used
- 1.35: Overly saturated or washed-out colors detract
- 2.20: Some saturation awareness but unbalanced intensity
- 3.20: Effective saturation control creates emphasis and unity
- 4.20: Sophisticated saturation heightens mood with seamless transitions
- 4.85: Saturation expertly controlled with innovative use

Factor 9 - Composition (0.049):
- 0: Not applicable/not used
- 1.35: Disorganized composition; elements feel random
- 2.20: Some organization attempt but inconsistent balance
- 3.20: Clear effective composition with strong balance
- 4.20: Dynamic intentional composition enhances storytelling
- 4.85: Groundbreaking composition with innovative layouts

Factor 10 - Volume (0.025):
- 0: Not applicable/not used
- 1.35: Objects lack volume and appear flat
- 2.20: Some volume indication but inconsistent lighting
- 3.20: Volume well-represented with strong lighting
- 4.20: Masterful volume depiction enhances realism
- 4.85: Volume depicted with exceptional skill and presence

Factor 11 - Balance (0.043):
- 0: Not applicable/not used
- 1.35: Composition feels lopsided or overly heavy
- 2.20: Some balance awareness but uneven distribution
- 3.20: Balanced arrangement enhances harmony
- 4.20: Complex intentional balancing guides viewer's eye
- 4.85: Balance used innovatively for dynamic tension

Factor 12 - Contrast (0.037):
- 0: Not applicable/not used
- 1.35: Minimal contrast, lacks visual interest
- 2.20: Contrast attempts but inconsistent impact
- 3.20: Strong purposeful contrasts enhance clarity
- 4.20: Subtle dynamic contrasts enrich composition
- 4.85: Masterful contrasts elevate work creating mood

Factor 13 - Emphasis (0.037):
- 0: Not applicable/not used
- 1.35: No clear focal point; eye wanders
- 2.20: Some focal elements but they compete
- 3.20: Clear emphasis guides viewer's attention
- 4.20: Sophisticated emphasis enhances storytelling
- 4.85: Flawless emphasis creating commanding focal point

Factor 14 - Movement (0.031):
- 0: Not applicable/not used
- 1.35: Visual movement absent or disjointed
- 2.20: Some movement sense but awkward
- 3.20: Effective movement leads viewer's eye
- 4.20: Dynamic intentional movement enhances engagement
- 4.85: Masterful movement control creates fluidity

Factor 15 - Rhythm (0.031):
- 0: Not applicable/not used
- 1.35: Visual rhythm chaotic or nonexistent
- 2.20: Basic rhythm attempts but inconsistent patterns
- 3.20: Rhythm effectively established with clear flow
- 4.20: Dynamic intentional rhythm enhances visual harmony
- 4.85: Rhythm masterfully controlled creating energy

Factor 16 - Variety (0.031):
- 0: Not applicable/not used
- 1.35: Minimal variety resulting in monotony
- 2.20: Some variety exploration but disjointed
- 3.20: Thoughtful variation creates interest with unity
- 4.20: Sophisticated variety creates depth and engagement
- 4.85: Variety innovatively enhances richness without compromising cohesion

Factor 17 - Proportion (0.031):
- 0: Not applicable/not used
- 1.35: Proportions feel awkward or poorly thought out
- 2.20: Proportion awareness evident but inconsistent
- 3.20: Proportions accurate and well-suited to style
- 4.20: Proportions intentionally manipulated for expressiveness
- 4.85: Proportions expertly controlled with innovative use

Factor 18 - Harmony (0.037):
- 0: Not applicable/not used
- 1.35: Elements clash with little unity sense
- 2.20: Some harmony evident but inconsistent cohesion
- 3.20: Elements well-integrated creating pleasing unity
- 4.20: Sophisticated harmony reinforces themes/emotions
- 4.85: Masterful harmony with seamless element interplay

Factor 19 - Cohesiveness (0.031):
- 0: Not applicable/not used
- 1.35: Artwork feels fragmented with no unifying theme
- 2.20: Some cohesion but elements feel disconnected
- 3.20: Clear cohesiveness with elements working together
- 4.20: Skillfully maintained cohesiveness creates unified composition
- 4.85: Exceptionally cohesive with deeply integrated components

Factor 20 - Pattern (0.018):
- 0: Not applicable/not used
- 1.35: Patterns absent or poorly executed
- 2.20: Basic patterns present but lack refinement
- 3.20: Patterns effectively integrated enhancing texture/rhythm
- 4.20: Complex intentional patterns add depth/symbolism
- 4.85: Patterns innovatively executed elevating composition

Factor 21 - Brushwork (0.037):
- 0: Not applicable/not used (not a painted medium)
- 1.35: Inconsistent, sloppy, or unintentional brushwork
- 2.20: Some control but lacks refinement
- 3.20: Brushwork intentional and enhances texture
- 4.20: Highly refined brushwork adds depth/emotion
- 4.85: Brushwork innovative and masterful

Factor 22 - Chiaroscuro (0.031):
- 0: Not applicable/not used
- 1.35: Poor light/dark contrast resulting in flat effects
- 2.20: Chiaroscuro attempts evident but lack control
- 3.20: Light and shadow skillfully used for form/depth
- 4.20: Advanced light/shadow manipulation enhances mood
- 4.85: Chiaroscuro masterfully executed with dramatic impact

Factor 23 - Impasto (0.025):
- 0: Not applicable/not used
- 1.35: Impasto applied haphazardly without intention
- 2.20: Some impasto use but inconsistent
- 3.20: Impasto effectively applied adding texture
- 4.20: Sophisticated impasto emphasizes depth/energy
- 4.85: Impasto innovatively controlled as expressive feature

Factor 24 - Sfumato (0.025):
- 0: Not applicable/not used
- 1.35: Harsh transitions with no blending
- 2.20: Some blending evident but lacks subtlety
- 3.20: Smooth deliberate blending creates atmospheric effects
- 4.20: Masterful sfumato enhances mood and realism
- 4.85: Sfumato applied with exceptional subtlety and innovation

Factor 25 - Glazing (0.025):
- 0: Not applicable/not used
- 1.35: Glazing poorly executed with little layering understanding
- 2.20: Some glazing use but uneven layers
- 3.20: Glazing effectively enhances color depth/luminosity
- 4.20: Advanced glazing creates rich multi-dimensional effects
- 4.85: Glazing expertly executed transforming surface

Factor 26 - Scumbling (0.018):
- 0: Not applicable/not used
- 1.35: Scumbling appears unintentional and poorly controlled
- 2.20: Some scumbling attempted but lacks refinement
- 3.20: Scumbling effectively creates texture/atmospheric effects
- 4.20: Sophisticated scumbling enhances mood/movement
- 4.85: Scumbling innovatively executed transforming surface

Factor 27 - Pointillism (0.018):
- 0: Not applicable/not used
- 1.35: Dots/marks random and lack cohesion
- 2.20: Some pointillism attempt but inconsistent execution
- 3.20: Pointillism effectively creates texture/light effects
- 4.20: Skillful pointillism creates vibrant complex imagery
- 4.85: Pointillism masterfully executed with unparalleled intricacy

Factor 28 - Wet-on-wet (0.018):
- 0: Not applicable/not used
- 1.35: Wet-on-wet results in muddy uncontrolled effects
- 2.20: Some success but inconsistent transitions
- 3.20: Wet-on-wet effectively creates smooth atmospheric effects
- 4.20: Advanced control enhances movement/light/texture
- 4.85: Wet-on-wet expertly executed with innovative applications

Factor 29 - Uniqueness (0.043):
- 0: Not applicable/not used
- 1.35: Minimal innovation, relies on established methods
- 2.20: Some uniqueness attempts but inconsistent
- 3.20: Consistently applies unique approaches enhancing originality
- 4.20: Distinctive vision with sophisticated innovation
- 4.85: Unparalleled distinctiveness creating groundbreaking work

Factor 30 - Creativity (0.049):
- 0: Not applicable/not used
- 1.35: Limited creativity with conventional ideas
- 2.20: Some creative thinking but underdeveloped concepts
- 3.20: Imaginative well-developed concepts enhance artwork
- 4.20: High creativity with innovative ideas elevating impact
- 4.85: Extraordinary creativity with visionary concepts

Factor 31 - Mood (0.043):
- 0: Not applicable/not used
- 1.35: Struggles to evoke specific mood; flat atmosphere
- 2.20: Some mood creation ability but inconsistent
- 3.20: Successfully establishes clear intentional mood
- 4.20: Skillfully crafts strong immersive atmosphere
- 4.85: Achieves profound evocative mood with lasting impression

Factor 32 - Viewer Engagement (0.037):
- 0: Not applicable/not used
- 1.35: Fails to capture viewer's attention
- 2.20: Some engaging elements but uneven impact
- 3.20: Successfully captures attention inviting exploration
- 4.20: Creates compelling immersive experience
- 4.85: Exceptional engagement drawing profound exploration

Factor 33 - Emotional Resonance (0.043):
- 0: Not applicable/not used
- 1.35: Struggles to inspire emotional response
- 2.20: Some emotion evocation but weak impact
- 3.20: Successfully elicits clear intentional emotional response
- 4.20: Creates powerful moving experience with strong emotions
- 4.85: Extraordinary emotional resonance with profound lasting impact

Replace [score] with the appropriate numerical score for each factor.
`;

    const finalPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${smi33FactorsPrompt}`;

    console.log("Sending request to OpenAI API for SMI 33-factors analysis");
    
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert fine art analyst. Follow the instructions exactly and provide factor scores in the precise format requested." 
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

    console.log("Received response from OpenAI API for SMI 33-factors");
    
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.log("Invalid response format from OpenAI:", JSON.stringify(response.data));
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API" } });
    }

    let analysisText = response.data.choices[0].message.content;
    console.log("SMI 33-factors Analysis text length:", analysisText.length);

    // Parse the structured factor scores
    const factorData = parse33FactorScores(analysisText);
    
    if (!factorData || !factorData.factors || Object.keys(factorData.factors).length < 30) {
      console.log("Failed to extract sufficient factor scores from the analysis");
      return res.status(500).json({ 
        error: { 
          message: "Failed to extract all required 33 factor scores. Please try again." 
        } 
      });
    }
    
    console.log(`Successfully extracted ${Object.keys(factorData.factors).length} factor scores`);
    console.log("Calculated SMI:", factorData.smi);

    const finalResponse = {
      analysis: analysisText,
      smi_total: factorData.smi,
      individual_factors: factorData.factors,
      factor_count: Object.keys(factorData.factors).length
    };

    console.log("Sending final SMI 33-factors response to client");
    res.json(finalResponse);

  } catch (error) {
    console.error("Error in SMI 33-factors endpoint:", error);
    handleApiError(error, res);
  }
});

// Helper function to parse the 33 factor scores from the structured response
function parse33FactorScores(analysisText) {
  console.log("Parsing 33 factor scores from structured response...");
  
  const factors = {};
  let calculatedSMI = null;
  
  try {
    // Extract the factor scores section
    const factorSectionMatch = analysisText.match(/FACTOR_SCORES_START([\s\S]*?)FACTOR_SCORES_END/);
    
    if (!factorSectionMatch) {
      console.log("No structured factor scores section found");
      return null;
    }
    
    const factorSection = factorSectionMatch[1];
    console.log("Found factor scores section");
    
    // Parse each factor line: Factor_1,Line,0.037,3.20
    const lines = factorSection.split('\n').filter(line => line.trim() && line.includes(','));
    
    for (const line of lines) {
      const parts = line.trim().split(',');
      if (parts.length >= 4) {
        const factorKey = parts[0].trim();
        const factorName = parts[1].trim();
        const weight = parseFloat(parts[2].trim());
        const score = parseFloat(parts[3].trim());
        
        if (factorKey.startsWith('Factor_') && !isNaN(score) && score >= 0 && score <= 5) {
          factors[factorKey.toLowerCase()] = score;
          console.log(`Parsed ${factorKey}: ${factorName} = ${score}`);
        }
      }
    }
    
    // Extract calculated SMI
    const smiMatch = analysisText.match(/SMI_CALCULATED:\s*(\d+\.?\d*)/);
    if (smiMatch) {
      calculatedSMI = parseFloat(smiMatch[1]);
      console.log("Found calculated SMI:", calculatedSMI);
    } else {
      console.log("No calculated SMI found, will use default");
      calculatedSMI = 3.00;
    }
    
  } catch (error) {
    console.error("Error parsing 33 factor scores:", error);
    return null;
  }
  
  console.log(`Successfully parsed ${Object.keys(factors).length} factors`);
  
  return {
    factors: factors,
    smi: calculatedSMI ? calculatedSMI.toFixed(2) : "3.00"
  };
}





// NEW HELPER FUNCTION: Parse the factors CSV data to extract individual scores
function parseFactorsCSV(csvText) {
  if (!csvText) {
    console.log("No factors CSV text provided");
    return {};
  }
  
  console.log("Parsing factors CSV data...");
  const factors = {};
  
  try {
    // Split into lines and process each line
    const lines = csvText.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Skip header line
      if (line.startsWith('Factor#') || line.includes('Factor')) {
        continue;
      }
      
      // Parse CSV line: typically "FactorNumber,FactorName,FactorDescription,Score"
      const columns = line.split(',');
      
      if (columns.length >= 4) {
        const factorNumber = columns[0] ? columns[0].trim() : '';
        const factorName = columns[1] ? columns[1].trim().replace(/"/g, '') : '';
        const scoreText = columns[3] ? columns[3].trim() : '';
        
        // Extract numeric score
        const scoreMatch = scoreText.match(/(\d+\.?\d*)/);
        if (scoreMatch) {
          const score = parseFloat(scoreMatch[1]);
          
          // Validate score is in expected range
          if (score >= 1.0 && score <= 5.0) {
            // Create factor key (factor_1, factor_2, etc.)
            const factorKey = `factor_${factorNumber}`;
            factors[factorKey] = score;
            
            console.log(`Parsed ${factorKey}: ${factorName} = ${score}`);
          } else {
            console.log(`Invalid score for factor ${factorNumber}: ${score}`);
          }
        } else {
          console.log(`Could not extract score from: ${scoreText}`);
        }
      } else {
        console.log(`Skipping malformed CSV line: ${line}`);
      }
    }
    
  } catch (error) {
    console.error("Error parsing factors CSV:", error);
    return {};
  }
  
  console.log(`Successfully parsed ${Object.keys(factors).length} factors from CSV`);
  return factors;
}










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







      const openaiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: prompt },
            {
              role: "user",
              content: [


{ type: "text", text: subjectDescription ? `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}\nArtist's subject description: "${subjectDescription}"` : `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}` },


                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${subjectImageBase64}` } }
              ]
            }
          ],








          max_tokens: 300
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );
      aiAnalysis = openaiResponse.data.choices[0]?.message?.content || "";
      console.log("AI analysis completed successfully");
    } catch (error) {
      console.error("AI analysis failed:", error.message);
      return res.status(500).json({ 
        error: "AI analysis failed", 
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

    console.log("Sending enhanced valuation response with AI analysis and complete comparable data");
    
    res.json({
      topComps,
      coefficients,
      medium: db.metadata.medium, 
      aiAnalysis
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





// Add this to your backend codebase (server.js or new file migrate.js)

// UPDATE THIS PATH to match where your JSON file is mounted
const DATABASE_FILE_PATH = '/mnt/data/art_database.json';  // Common mount path
// OR it might be something like:
// const DATABASE_FILE_PATH = '/app/data/art_database.json';
// const DATABASE_FILE_PATH = process.env.DB_PATH || './art_database.json';

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
            console.log(`Record ${record.id}: price=$${record.price}, framed=${record.framed}, artOnlyPrice=$${record.artOnlyPrice}`);
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



  

