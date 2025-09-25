# HarvestIQ 🌾

A powerful web application that analyzes crop images using Google's Gemini AI to determine quality ratings (EXCELLENT, GOOD, or POOR) and predict market prices based on a comprehensive dataset. Get instant AI-powered assessments with price predictions!

## Features

- 🌾 AI-powered crop quality assessment using Google Gemini Vision AI
- 💰 Real-time price prediction based on crop type and quality from CSV dataset
- 📊 Comprehensive crop price database with 24+ crop varieties
- 📸 Image upload with preview functionality
- 🎨 Beautiful, responsive web interface
- ⚡ Real-time quality analysis with structured output
- 📱 Mobile-friendly design
- 🔧 Robust error handling with retry logic for API failures
- 🏥 Health check endpoint
- 🎯 Image validation and processing
- 📈 Price information display with market details
- 🔄 Quality normalization to handle AI variations and typos
- 🔍 Debug endpoint for troubleshooting price data
- 🛡️ Advanced disease detection using AI vision analysis with confidence scores for identifying crop diseases and pests
- ❄️ Storage Assistant with file downloading capabilities for personalized preservation guides and reports

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 3. Configure Environment

1. Open the `.env` file in your project root
2. Replace `your_gemini_api_key_here` with your actual API key:

```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 4. Run the Application

```bash
node script.js
```

The server will start and show:
- 🚀 Server running at http://localhost:3000
- 🌾 API endpoint: http://localhost:3000/api/assess-crop
- ❤️ Health check: http://localhost:3000/api/health
- 🔍 Debug prices: http://localhost:3000/api/debug/prices

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Click on the image upload area and select a crop image
3. Preview your uploaded image
4. Click "Assess Crop Quality & Price"
5. Receive instant AI-powered analysis including:
   - Crop type identification
   - Quality assessment (EXCELLENT, GOOD, or POOR)
   - Detailed assessment explanation
   - Price prediction based on quality and market data

## API Endpoints

### POST /api/assess-crop
Analyze a crop image and determine its quality.

**Request:**
- Content-Type: multipart/form-data
- Body: `cropImage` (image file)

**Response:**
```json
{
  "crop": "tomato",
  "quality": "EXCELLENT",
  "assessment": "This crop shows excellent quality with vibrant color, perfect shape, and no visible defects. The produce appears fresh and healthy with optimal ripeness.",
  "price": {
    "price": 50,
    "market": "Local Market"
  },
  "fullAssessment": "CROP: tomato\nQUALITY: EXCELLENT\nEXPLANATION: This crop shows excellent quality with vibrant color, perfect shape, and no visible defects. The produce appears fresh and healthy with optimal ripeness."
}
```

### GET /api/health
Check if the API is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Crop Quality Assessor API is running"
}
```

### GET /api/debug/prices
Debug endpoint to check loaded crop price data.

**Response:**
```json
{
  "status": "OK",
  "message": "Crop prices loaded successfully",
  "data": {
    "tomato": {
      "EXCELLENT": {
        "price": 50,
        "market": "Local Market"
      },
      "GOOD": {
        "price": 35,
        "market": "Local Market"
      },
      "POOR": {
        "price": 20,
        "market": "Local Market"
      }
    }
  }
}
```

## Error Handling

The application handles various error scenarios:

- **400 Bad Request**: Missing or invalid image file
- **401 Unauthorized**: Invalid or missing API key
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: General server errors

## Troubleshooting

### "Invalid API key" Error
- Verify your API key is correct in the `.env` file
- Make sure you have enabled the Gemini AI API in your Google Cloud Console
- Check if the API key has the correct permissions

### "Rate limit exceeded" Error
- Wait a few minutes before trying again
- Consider upgrading your Google Cloud plan for higher rate limits

### Server Won't Start
- Ensure all dependencies are installed: `npm install`
- Check if port 3000 is available
- Verify Node.js is installed

### Image Upload Issues
- Ensure the image file is under 10MB
- Supported formats: JPG, PNG, GIF, WebP
- Make sure the image clearly shows the crop for best results

### Price Information Not Available
- Check the debug endpoint at `/api/debug/prices` to verify CSV data is loaded
- The system normalizes quality ratings to handle AI variations (e.g., "execellent" → "EXCELLENT")
- Ensure the AI response format matches the expected structure
- Try with a clearer image for better crop identification

## Project Structure

```
├── script.js          # Main server file with image processing, price prediction, and quality normalization
├── public/
│   ├── index.html     # Frontend interface with image upload and results display
│   └── styles.css     # Modern styling for crop assessment and price display
├── crop_prices.csv    # Comprehensive crop price database
├── uploads/           # Temporary image storage (auto-created)
├── .env               # Environment variables (API key)
├── package.json       # Dependencies including multer and csv-parser
└── README.md          # This file
```

## Technologies Used

- **Backend**: Node.js, Express.js, Multer (file handling)
- **AI**: Google Gemini AI (gemini-1.5-flash) with Vision capabilities
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Environment**: dotenv for configuration
- **Data Processing**: Custom quality normalization for robust price matching

## License

This project is open source and available under the MIT License.
