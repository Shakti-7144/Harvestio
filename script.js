import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

// Load environment variables
dotenv.config();

// Function to normalize quality strings to handle variations and typos
function normalizeQuality(quality) {
  const normalized = quality.toUpperCase().trim();

  // Handle common variations and typos
  if (normalized.includes('EXCELLENT') || normalized.includes('EXCELLENT') || normalized.includes('EXCELENT') || normalized.includes('EXELENT')) {
    return 'EXCELLENT';
  } else if (normalized.includes('GOOD') || normalized.includes('GOOOD') || normalized.includes('GUD')) {
    return 'GOOD';
  } else if (normalized.includes('POOR') || normalized.includes('POOR') || normalized.includes('POOR') || normalized.includes('POOR')) {
    return 'POOR';
  } else if (normalized.includes('AVERAGE') || normalized.includes('MEDIUM')) {
    return 'GOOD'; // Map average/medium to GOOD as closest match
  } else if (normalized.includes('BAD') || normalized.includes('TERRIBLE')) {
    return 'POOR'; // Map bad/terrible to POOR
  } else if (normalized.includes('BEST') || normalized.includes('PREMIUM')) {
    return 'EXCELLENT'; // Map best/premium to EXCELLENT
  }

  return normalized; // Return as-is if no match found
}

// Function to read crop prices from CSV
function getCropPrices() {
  return new Promise((resolve, reject) => {
    const prices = {};
    console.log('Loading crop prices from CSV...');

    fs.createReadStream('crop_prices.csv')
      .pipe(csv())
      .on('data', (data) => {
        try {
          const crop = data.Crop ? data.Crop.toLowerCase().trim() : '';
          let quality = data.Quality ? data.Quality.toUpperCase().trim() : '';

          // Normalize quality from CSV as well
          quality = normalizeQuality(quality);

          const price = parseFloat(data.Price_per_kg);
          const market = data.Market ? data.Market.trim() : 'Local Market';

          if (!crop || !quality || isNaN(price)) {
            console.warn('Invalid data row:', data);
            return;
          }

          if (!prices[crop]) {
            prices[crop] = {};
          }

          prices[crop][quality] = {
            price: price,
            market: market
          };

          console.log(`Loaded price for ${crop} (${quality}): ₹${price} at ${market} (original: ${data.Quality})`);
        } catch (error) {
          console.error('Error processing CSV row:', data, error);
        }
      })
      .on('end', () => {
        console.log(`CSV loading complete. Loaded ${Object.keys(prices).length} crops.`);
        resolve(prices);
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));

// Helper function for retrying API calls with exponential backoff
async function retryApiCall(apiUrl, options, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, options);

      if (response.ok) {
        return response;
      }

      // For 503, clone response to log error without consuming body
      if (response.status === 503) {
        const clone = response.clone();
        let errorData;
        try {
          errorData = await clone.json();
        } catch (parseError) {
          console.error('Failed to parse 503 error response:', parseError);
          errorData = { message: 'Service unavailable' };
        }
        lastError = errorData;
        console.log(`API overloaded (503):`, errorData);
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // For other non-ok errors, don't consume body, let caller handle
      // Set lastError to response status for throwing if needed, but since no retry, return response
      lastError = { status: response.status, statusText: response.statusText };

      return response;

    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Network error. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError;
}

// API endpoint for crop quality assessment and price prediction
app.post("/api/assess-crop", (req, res, next) => {
  upload.single('cropImage')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: "File upload error: " + err.message });
      } else {
        return res.status(400).json({ error: err.message });
      }
    }
    next();
  });
}, async (req, res) => {
  // Validate input
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  try {
    // Load crop prices data
    const cropPrices = await getCropPrices();
    console.log('Crop prices loaded:', Object.keys(cropPrices));

    // Convert image to base64
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Use Gemini Vision API for crop quality assessment
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

    const prompt = `Analyze this crop image and provide the following information:

1. Identify the crop type (e.g., tomato, potato, onion, carrot, etc.)
2. Assess the quality based on:
   - Color and appearance
   - Size and shape
   - Presence of defects, diseases, or damage
   - Overall health and freshness
   - Ripeness (if applicable)

3. Rate the crop quality as one of: EXCELLENT, GOOD, or POOR.

4. Detect any visible diseases or pest damage. If none, state "No diseases or pests detected."
   - Provide a description of the disease/pest if found.
   - Classify the infection level: HEALTHY, MILDLY INFECTED, or SEVERELY INFECTED.
   - Provide a confidence score (0-100%) for the detection.

5. Based on the crop type and its condition, provide specific storage and preservation advice:
   - Recommended temperature range
   - Humidity levels
   - Shelf life expectations
   - Handling and storage tips to maintain quality

Format your response as:
CROP: [crop name]
QUALITY: [EXCELLENT/GOOD/POOR]
DISEASE_PEST: [description or "No diseases or pests detected"]
INFECTION_LEVEL: [HEALTHY/MILDLY INFECTED/SEVERELY INFECTED]
CONFIDENCE: [0-100%]
STORAGE_ADVICE: [detailed advice on temperature, humidity, shelf life, and tips]
EXPLANATION: [brief explanation of overall assessment]`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: req.file.mimetype,
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    const response = await retryApiCall(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error response:", errorData);

      if (response.status === 400) {
        return res.status(400).json({ error: "Invalid image. Please upload a valid crop image." });
      } else if (response.status === 401) {
        return res.status(401).json({ error: "Invalid API key. Please check your Gemini API key." });
      } else if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
      } else if (response.status === 503) {
        return res.status(503).json({ error: "AI service is temporarily overloaded. Please try again in a few minutes." });
      } else {
        return res.status(response.status).json({ error: "Failed to assess crop quality. Please try again." });
      }
    }

    const data = await response.json();

    // Validate Gemini response structure
    if (!data.candidates || data.candidates.length === 0 ||
        !data.candidates[0].content || !data.candidates[0].content.parts ||
        data.candidates[0].content.parts.length === 0 ||
        typeof data.candidates[0].content.parts[0].text !== 'string') {
      console.error("Invalid Gemini API response structure:", data);
      return res.status(500).json({ error: "Invalid response from AI service. Please try again." });
    }

    const assessment = data.candidates[0].content.parts[0].text;

    // Parse the response
    const cropMatch = assessment.match(/CROP:\s*(.+)/i);
    const qualityMatch = assessment.match(/QUALITY:\s*(EXCELLENT|GOOD|POOR|EXCELLENT|GOOD|POOR)/i);
    const diseasePestMatch = assessment.match(/DISEASE_PEST:\s*(.+)/i);
    const infectionLevelMatch = assessment.match(/INFECTION_LEVEL:\s*(HEALTHY|MILDLY INFECTED|SEVERELY INFECTED)/i);
    const confidenceMatch = assessment.match(/CONFIDENCE:\s*(\d+)%?/i);
    const storageAdviceMatch = assessment.match(/STORAGE_ADVICE:\s*(.+)/i);
    const explanationMatch = assessment.match(/EXPLANATION:\s*(.+)/i);

    const cropType = cropMatch ? cropMatch[1].trim().toLowerCase() : "unknown";
    let quality = qualityMatch ? qualityMatch[1].toUpperCase() : "UNKNOWN";
    const diseasePest = diseasePestMatch ? diseasePestMatch[1].trim() : "No diseases or pests detected";
    const infectionLevel = infectionLevelMatch ? infectionLevelMatch[1].toUpperCase() : "HEALTHY";
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
    const storageAdvice = storageAdviceMatch ? storageAdviceMatch[1].trim() : "General storage advice not available";
    const explanation = explanationMatch ? explanationMatch[1].trim() : assessment;

    // Normalize quality to handle variations and typos
    quality = normalizeQuality(quality);

    console.log(`AI Analysis: Crop: ${cropType}, Quality: ${quality} (normalized from: ${qualityMatch ? qualityMatch[1] : 'unknown'})`);

    // Get price information with improved matching
    let priceInfo = null;
    console.log(`Attempting to find price for crop: "${cropType}" with quality: "${quality}"`);

    // First, try exact match
    if (cropPrices[cropType] && cropPrices[cropType][quality]) {
      priceInfo = cropPrices[cropType][quality];
      console.log(`Found exact price match: ₹${priceInfo.price} at ${priceInfo.market}`);
    } else {
      console.log(`No exact match found. Available crops:`, Object.keys(cropPrices));

      // Try to find the crop with partial matching (case-insensitive)
      let matchedCrop = null;
      for (const csvCrop of Object.keys(cropPrices)) {
        if (csvCrop.toLowerCase().includes(cropType.toLowerCase()) || cropType.toLowerCase().includes(csvCrop.toLowerCase())) {
          matchedCrop = csvCrop;
          console.log(`Found partial crop match: "${cropType}" -> "${matchedCrop}"`);
          break;
        }
      }

      if (matchedCrop && cropPrices[matchedCrop]) {
        console.log(`Available qualities for ${matchedCrop}:`, Object.keys(cropPrices[matchedCrop]));

        // Try exact quality match on the matched crop
        if (cropPrices[matchedCrop][quality]) {
          priceInfo = cropPrices[matchedCrop][quality];
          console.log(`Found price match on partial crop: ₹${priceInfo.price} at ${priceInfo.market}`);
        } else {
          // Use the first available quality as fallback
          const availableQualities = Object.keys(cropPrices[matchedCrop]);
          if (availableQualities.length > 0) {
            const fallbackQuality = availableQualities[0];
            priceInfo = cropPrices[matchedCrop][fallbackQuality];
            console.log(`Using fallback price for ${matchedCrop} (${fallbackQuality}): ₹${priceInfo.price} at ${priceInfo.market}`);
          }
        }
      } else {
        console.log(`No crop match found for "${cropType}". Trying quality-based fallback across all crops.`);

        // As a last resort, look for the quality across all crops
        for (const csvCrop of Object.keys(cropPrices)) {
          if (cropPrices[csvCrop][quality]) {
            priceInfo = cropPrices[csvCrop][quality];
            console.log(`Found quality match in ${csvCrop}: ₹${priceInfo.price} at ${priceInfo.market}`);
            break;
          }
        }
      }
    }

    if (!priceInfo) {
      console.log('No price information found. Available data:');
      Object.keys(cropPrices).forEach(crop => {
        console.log(`  ${crop}:`, Object.keys(cropPrices[crop]));
      });
    }

    const responseData = {
      crop: cropType,
      quality: quality,
      diseasePest: diseasePest,
      infectionLevel: infectionLevel,
      confidence: confidence,
      storageAdvice: storageAdvice,
      assessment: explanation,
      price: priceInfo,
      fullAssessment: assessment
    };

    console.log('API Response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error("Crop assessment error:", error);

    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }

    // Handle network and other errors
    if (error.message.includes("fetch")) {
      res.status(500).json({ error: "Network error. Please check your internet connection." });
    } else if (error.message.includes("CSV")) {
      res.status(500).json({ error: "Price database error. Please try again later." });
    } else {
      res.status(500).json({ error: "Failed to assess crop quality. Please try again." });
    }
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Crop Quality Assessor API is running" });
});

// Debug endpoint to check loaded crop prices
app.get("/api/debug/prices", async (req, res) => {
  try {
    const cropPrices = await getCropPrices();
    res.json({
      status: "OK",
      message: "Crop prices loaded successfully",
      data: cropPrices
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Failed to load crop prices",
      error: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 HarvestIQ Server running at http://localhost:${port}`);
  console.log(`🌾 API endpoint: http://localhost:${port}/api/assess-crop`);
  console.log(`❤️  Health check: http://localhost:${port}/api/health`);
  console.log(`🔍 Debug prices: http://localhost:${port}/api/debug/prices`);

  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️  Warning: GEMINI_API_KEY not set. Please add your API key to the .env file.");
  } else {
    console.log("✅ Gemini API key loaded successfully");
  }
});
