require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();

// Allow larger image sizes (50MB) for the RI calculator
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure CORS to accept requests from all your sites
app.use(cors({
  origin: [
    'https://robert-clark-4dee.mykajabi.com', 
    'http://localhost:5000', 
    'https://cli-backend-g0lg.onrender.com',
    'https://ri-backend-bozm.onrender.com',
    'https://advisory.valoraanalytics.com',
    // Add any other origins you need
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add a fallback CORS handler for any missed routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Serve static files from the "public" folder
app.use(express.static("public"));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =============== PROMPTS ENDPOINT ===============

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

// =============== ANALYSIS ENDPOINTS ===============

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

    if (!OPENAI_API_KEY) {
      console.log("Missing OpenAI API key");
      return res.status(500).json({ error: { message: "Server configuration error: Missing API key" } });
    }

    // Log info about the request (without the full image data for brevity)
    console.log(`Processing RI request for artwork: "${artTitle}" by ${artistName}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    // Construct the prompt with art title and artist name
    const finalPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${prompt}`;

    console.log("Sending request to OpenAI API for RI analysis");
    
    // Send request to OpenAI API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert art critic specializing in analyzing the representational nature of artwork. Your task is to evaluate the representational characteristics of the provided artwork and calculate an accurate RI (Representational Index) value between 1.00 and 5.00. Provide only the RI value and a 2-3 sentence explanation - no additional commentary or analysis." 
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 600
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    console.log("Received response from OpenAI API for RI");
    
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.log("Invalid response format from OpenAI:", JSON.stringify(response.data));
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API" } });
    }

    let analysisText = response.data.choices[0].message.content;
    console.log("RI Analysis text:", analysisText);

    // Extract the RI value using regex
    const riRegex = /Representational\s+Index\s*\(?RI\)?\s*=\s*(\d+\.\d+)/i;
    const riMatch = analysisText.match(riRegex);
    let riValue = "3.00"; // Default value if extraction fails
    
    if (riMatch && riMatch[1]) {
      riValue = riMatch[1];
      // Ensure it's formatted to 2 decimal places
      if (riValue.split('.')[1].length === 1) {
        riValue = `${riValue}0`;
      }
      console.log("Extracted RI value:", riValue);
    } else {
      console.log("Could not extract RI value from response");
    }
    
    // Extract the explanation text (everything after the RI value statement)
    const explanationRegex = /Representational\s+Index\s*\(?RI\)?\s*=\s*\d+\.\d+\s*(.+?)(?:\n\n|\n$|$)/i;
    const explanationMatch = analysisText.match(explanationRegex);
    let explanation = "";
    
    if (explanationMatch && explanationMatch[1]) {
      explanation = explanationMatch[1].trim();
      console.log("Extracted explanation:", explanation);
    } else {
      console.log("Could not extract explanation from response");
    }

    const finalResponse = {
      analysis: analysisText,
      ri: riValue,
      explanation: explanation
    };

    console.log("Sending final RI response to client");
    // Send the response
    res.json(finalResponse);

  } catch (error) {
    handleApiError(error, res);
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

// Helper function to extract category scores from analysis text with improved regex patterns
function extractCategoryScores(analysisText) {
  console.log("Extracting category scores from analysis text...");
  
  // More robust regex patterns that look for category names followed by scores
  const categoryScoreRegex = {
    composition: /(?:1\.\s*)?(?:Composition\s*&\s*Design|Composition[\s:]+)[\s:]*(\d+\.?\d*)/i,
    color: /(?:2\.\s*)?(?:Color\s+Harmony\s*&\s*Use\s+of\s+Light|Color(?:\s+&\s+Light)?[\s:]+)[\s:]*(\d+\.?\d*)/i,
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

// Add this new endpoint after your existing analyze endpoints

// Endpoint for combined SMI and RI analysis
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
    
    // First, get the SMI prompt
    const smiPromptPath = path.join(__dirname, "public", "prompts", "SMI_prompt.txt");
    let smiPrompt;
    
    if (fs.existsSync(smiPromptPath)) {
      smiPrompt = fs.readFileSync(smiPromptPath, 'utf8');
    } else {
      return res.status(404).json({ 
        error: { message: "SMI prompt file not found" } 
      });
    }
    
    // Next, get the RI prompt
    const riPromptPath = path.join(__dirname, "public", "prompts", "RI_prompt.txt");
    let riPrompt;
    
    if (fs.existsSync(riPromptPath)) {
      riPrompt = fs.readFileSync(riPromptPath, 'utf8');
    } else {
      return res.status(404).json({ 
        error: { message: "RI prompt file not found" } 
      });
    }

    // Construct the prompts with art title and artist name
    const finalSmiPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${smiPrompt}`;

    const finalRiPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${riPrompt}`;

    console.log("Sending request to OpenAI API for SMI analysis");
    
    // First, get the SMI value
    const smiResponse = await axios.post(
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
              { type: "text", text: finalSmiPrompt },
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
    
    if (!smiResponse.data || !smiResponse.data.choices || !smiResponse.data.choices[0] || !smiResponse.data.choices[0].message) {
      console.log("Invalid response format from OpenAI for SMI:", JSON.stringify(smiResponse.data));
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API for SMI analysis" } });
    }

    let smiAnalysisText = smiResponse.data.choices[0].message.content;
    
    // Extract category scores
    const categoryScores = extractCategoryScores(smiAnalysisText);
    
    // Check if all category scores were successfully extracted
    if (!categoryScores) {
      console.log("Failed to extract all category scores from the analysis");
      return res.status(500).json({ 
        error: { 
          message: "Failed to extract all required category scores. Please try again." 
        } 
      });
    }
    
    // Calculate the SMI value using the weighted formula
    const calculatedSMI = (
      (categoryScores.composition * 0.20) +
      (categoryScores.color * 0.20) +
      (categoryScores.technical * 0.25) +
      (categoryScores.originality * 0.20) +
      (categoryScores.emotional * 0.15)
    );
    
    // Round up to the nearest 0.25 increment
    const roundedSMI = roundSMIUp(calculatedSMI);
    
    // Format to ensure 2 decimal places
    const smiValue = roundedSMI.toFixed(2);

    console.log("Sending request to OpenAI API for RI analysis");
    
    // Now, get the RI value
    const riResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert art critic specializing in analyzing the representational nature of artwork. Your task is to evaluate the representational characteristics of the provided artwork and calculate an accurate RI (Representational Index) value between 1.00 and 5.00. Provide only the RI value and a 2-3 sentence explanation - no additional commentary or analysis." 
          },
          { 
            role: "user", 
            content: [
              { type: "text", text: finalRiPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 600
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
      console.log("Invalid response format from OpenAI for RI:", JSON.stringify(riResponse.data));
      return res.status(500).json({ error: { message: "Invalid response from OpenAI API for RI analysis" } });
    }

    let riAnalysisText = riResponse.data.choices[0].message.content;
    
    // Extract the RI value using regex
    const riRegex = /Representational\s+Index\s*\(?RI\)?\s*=\s*(\d+\.\d+)/i;
    const riMatch = riAnalysisText.match(riRegex);
    let riValue = "3.0"; // Default value if extraction fails
    
    if (riMatch && riMatch[1]) {
      riValue = riMatch[1];
      console.log("Extracted RI value:", riValue);
    } else {
      console.log("Could not extract RI value from response");
    }

    // Send the final response with just the SMI and RI values
    const finalResponse = {
      smi: smiValue,
      ri: riValue
    };

    console.log("Sending final combined response to client");
    res.json(finalResponse);

  } catch (error) {
    handleApiError(error, res);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));