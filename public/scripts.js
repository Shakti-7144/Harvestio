// DOM Elements
const landingPage = document.getElementById('landing-page');
const analysisPage = document.getElementById('analysis-page');
const getStartedBtn = document.getElementById('get-started');
const backToHomeBtn = document.getElementById('back-to-home');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const langEnBtn = document.getElementById('lang-en');
const langHiBtn = document.getElementById('lang-hi');
const imageInput = document.getElementById('cropImage');
const imagePreview = document.getElementById('imagePreview');
const uploadArea = document.getElementById('upload-area');
const assessButton = document.getElementById('assess');
const downloadReportBtn = document.getElementById('download-report');
const resultDiv = document.getElementById('result');

// Enhanced UI Elements
const clearRecentBtn = document.getElementById('clear-recent');
const toggleRecentBtn = document.getElementById('toggle-recent');
const recentCount = document.getElementById('recent-count');
const progressContainer = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const uploadSpeed = document.getElementById('uploadSpeed');



// Language Data
const languageData = JSON.parse(document.getElementById('language-data').textContent);
let currentLanguage = localStorage.getItem('language') || 'en';

// Page Navigation
getStartedBtn.addEventListener('click', () => {
  landingPage.style.display = 'none';
  analysisPage.style.display = 'block';
  // Add slide animation
  analysisPage.style.animation = 'fadeInUp 0.5s ease';
});

backToHomeBtn.addEventListener('click', () => {
  analysisPage.style.display = 'none';
  landingPage.style.display = 'block';
  // Reset analysis page
  resetAnalysisPage();
});

// Dark Mode Toggle
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDark);
});

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = '☀️';
}

// Language Switching
function updateLanguage(lang) {
  currentLanguage = lang;
  currentLanguage = lang;
  localStorage.setItem('language', lang);

  const data = languageData[lang];

  // Update page content
  document.querySelector('.hero-title').textContent = data.heroTitle;
  document.querySelector('.hero-subtitle').textContent = data.heroSubtitle;
  document.querySelector('.hero-description').textContent = data.heroDescription;
  getStartedBtn.textContent = data.getStarted;
  document.querySelector('.nav a[href="#about"]').textContent = data.about;
  document.querySelector('.nav a[href="#contact"]').textContent = data.contact;
  document.querySelector('.footer p').textContent = data.copyright;

  // Update features section
  document.querySelector('.section-title').textContent = data.whyChoose;
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards[0].querySelector('h3').textContent = data.features.quality;
  featureCards[0].querySelector('p').textContent = data.features.qualityDesc;
  featureCards[1].querySelector('h3').textContent = data.features.disease;
  featureCards[1].querySelector('p').textContent = data.features.diseaseDesc;
  featureCards[2].querySelector('h3').textContent = data.features.storage;
  featureCards[2].querySelector('p').textContent = data.features.storageDesc;
  featureCards[3].querySelector('h3').textContent = data.features.price;
  featureCards[3].querySelector('p').textContent = data.features.priceDesc;

  // Update analysis page
  document.querySelector('.upload-content h3').textContent = data.uploadTitle;
  document.querySelector('.upload-content p').textContent = data.uploadDesc;
  assessButton.innerHTML = `<span class="button-icon">🔍</span> ${data.assessBtn}`;
  backToHomeBtn.innerHTML = `<span class="button-icon">🏠</span> ${data.backHome}`;
  downloadReportBtn.innerHTML = `<span class="button-icon">📄</span> ${data.downloadReport}`;

  // Update language buttons
  langEnBtn.classList.toggle('active', lang === 'en');
  langHiBtn.classList.toggle('active', lang === 'hi');
}

langEnBtn.addEventListener('click', () => updateLanguage('en'));
langHiBtn.addEventListener('click', () => updateLanguage('hi'));

// Initialize language
updateLanguage(currentLanguage);


// Drag and Drop Functionality
uploadArea.addEventListener('click', () => imageInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    imageInput.files = files;
    handleImageUpload(files[0]);
  }
});

// Image Upload with Progress
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageUpload(file);
  } else {
    assessButton.disabled = true; // Disable if no file
  }
});

// Handle Image Upload Function
function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    assessButton.disabled = true;
    imagePreview.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">📷</span><p>Invalid file. Please select an image.</p></div>';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    imagePreview.innerHTML = `
      <div class="preview-container">
        <img src="${e.target.result}" alt="Crop Image Preview" class="preview-image">
        <div class="preview-info">
          <span class="preview-tip">Image uploaded successfully. Ready for analysis.</span>
        </div>
      </div>
    `;
    assessButton.disabled = false;
  };
  reader.onerror = function() {
    assessButton.disabled = true;
    imagePreview.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">❌</span><p>Error loading image. Please try again.</p></div>';
  };
  reader.readAsDataURL(file);
}



// Initialize assess button as disabled
assessButton.disabled = true;





// Assessment Functionality
assessButton.addEventListener('click', async () => {
  const file = imageInput.files[0];
  const loadingDiv = document.getElementById('loading');
  const cropInfoDiv = document.getElementById('crop-info');

  if (!file) {
    showNotification(languageData[currentLanguage].selectImage, 'error');
    return;
  }

  // Show loading state with animation
  loadingDiv.style.display = 'block';
  cropInfoDiv.style.display = 'none';
  assessButton.disabled = true;
  assessButton.innerHTML = `<span class="button-icon">🔍</span> ${languageData[currentLanguage].loading}`;

  try {
    const formData = new FormData();
    formData.append('cropImage', file);

    const response = await fetch('/api/assess-crop', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    // Hide loading
    loadingDiv.style.display = 'none';
    assessButton.disabled = false;
    assessButton.innerHTML = `<span class="button-icon">🔍</span> ${languageData[currentLanguage].assessBtn}`;

    if (response.ok) {
      displayResults(data);
      downloadReportBtn.style.display = 'flex';

      // Add confetti animation for excellent quality
      if (data.quality === 'EXCELLENT') {
        createConfetti();
      }
    } else {
      handleError(response, data);
    }
  } catch (err) {
    loadingDiv.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner" style="border-color: #dc3545; border-top-color: #dc3545;"></div>
        <p>❌ ${languageData[currentLanguage].networkError}: ${err.message}</p>
        <p>${languageData[currentLanguage].serverError}</p>
      </div>
    `;
    loadingDiv.style.display = 'block';
    assessButton.disabled = false;
    assessButton.innerHTML = `<span class="button-icon">🔍</span> ${languageData[currentLanguage].assessBtn}`;
  }
});

// Display Results with Animations
function displayResults(data) {
  const cropDetails = document.getElementById('crop-details');
  const qualityBadge = document.getElementById('quality-badge');
  const diseaseInfo = document.getElementById('disease-info');
  const storageInfo = document.getElementById('storage-info');
  const priceInfo = document.getElementById('price-info');
  const cropInfoDiv = document.getElementById('crop-info');

  let qualityEmoji = "❓";
  if (data.quality === "EXCELLENT") qualityEmoji = "🌟";
  else if (data.quality === "GOOD") qualityEmoji = "✅";
  else if (data.quality === "POOR") qualityEmoji = "⚠️";

  cropDetails.innerHTML = `
    <p><strong>Crop Type:</strong> ${data.crop.charAt(0).toUpperCase() + data.crop.slice(1)}</p>
    <p><strong>Quality:</strong> ${data.quality}</p>
    <p><strong>Assessment:</strong> ${data.assessment}</p>
  `;

  qualityBadge.innerHTML = `
    <div class="quality-badge ${data.quality.toLowerCase()}">
      ${qualityEmoji} ${data.quality} Quality
    </div>
  `;

  // Disease/Pest Information
  let infectionEmoji = "✅";
  if (data.infectionLevel === "MILDLY INFECTED") infectionEmoji = "⚠️";
  else if (data.infectionLevel === "SEVERELY INFECTED") infectionEmoji = "❌";

  diseaseInfo.innerHTML = `
    <p><strong>Disease/Pest:</strong> ${data.diseasePest}</p>
    <p><strong>Infection Level:</strong> ${infectionEmoji} ${data.infectionLevel}</p>
    <p><strong>Confidence:</strong> ${data.confidence}%</p>
  `;

  // Storage Advice
  storageInfo.innerHTML = `<p>${data.storageAdvice}</p>`;

  // Price Information
  if (data.price) {
    priceInfo.innerHTML = `
      <p><strong>Price per kg:</strong> ₹${data.price.price}</p>
      <p><strong>Market:</strong> ${data.price.market}</p>
      <p class="price-note">${languageData[currentLanguage].priceNote}</p>
    `;
  } else {
    priceInfo.innerHTML = `
      <p>💰 ${languageData[currentLanguage].priceUnavailable} for "${data.crop}" with "${data.quality}" quality.</p>
      <p class="price-note">${languageData[currentLanguage].priceUnavailableDesc}</p>
    `;
  }

  cropInfoDiv.style.display = 'grid';

  // Add to recent assessments
  addToRecentAssessments({
    crop: data.crop.charAt(0).toUpperCase() + data.crop.slice(1),
    quality: data.quality,
    diseasePest: data.diseasePest,
    infectionLevel: data.infectionLevel,
    confidence: data.confidence,
    storageAdvice: data.storageAdvice,
    price: data.price ? data.price.price : 'N/A'
  });

  // Animate result cards
  const cards = document.querySelectorAll('.result-card');
  cards.forEach((card, index) => {
    card.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s both`;
  });
}

// Error Handling
function handleError(response, data) {
  const loadingDiv = document.getElementById('loading');
  let errorMessage = `❌ Error: ${data.error}`;

  if (response.status === 401) {
    errorMessage = `❌ ${languageData[currentLanguage].apiKeyError}: ${data.error}\n\nPlease check your Gemini API key in the .env file.`;
  } else if (response.status === 429) {
    errorMessage = `⏱️ ${languageData[currentLanguage].rateLimit}: ${data.error}\n\n${languageData[currentLanguage].waitMessage}`;
  } else if (response.status === 503) {
    errorMessage = `🔄 ${languageData[currentLanguage].serviceOverload}: ${data.error}\n\n${languageData[currentLanguage].tryAgain}`;
  }

  loadingDiv.innerHTML = `<div class="loading-content"><p>${errorMessage}</p></div>`;
  loadingDiv.style.display = 'block';
}

// Download Report
downloadReportBtn.addEventListener('click', () => {
  const cropInfo = document.getElementById('crop-info');
  const reportData = {
    timestamp: new Date().toLocaleString(),
    crop: document.querySelector('#crop-details p').textContent.split(': ')[1],
    quality: document.querySelector('.quality-badge').textContent,
    diseasePest: document.querySelector('#disease-info p').textContent.split(': ')[1],
    infectionLevel: document.querySelector('#disease-info p:nth-child(2)').textContent.split(': ')[1],
    confidence: document.querySelector('#disease-info p:nth-child(3)').textContent.split(': ')[1],
    storageAdvice: document.querySelector('#storage-info p').textContent,
    priceInfo: document.querySelector('#price-info').textContent
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crop-analysis-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(languageData[currentLanguage].reportDownloaded, 'success');
});

// Reset Analysis Page
function resetAnalysisPage() {
  imagePreview.innerHTML = '';
  imageInput.value = '';
  resultDiv.innerHTML = `
    <div id="loading" class="loading-card" style="display: none;">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>🔍 Analyzing your crop... 🌱</p>
      </div>
    </div>
    <div id="crop-info" class="results-grid" style="display: none;"></div>
  `;
  downloadReportBtn.style.display = 'none';

  // Reset upload progress
  progressContainer.style.display = 'none';
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  uploadSpeed.textContent = '0 KB/s';

  // Reset assess button
  assessButton.disabled = true;
}

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 2rem;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    ${type === 'success' ? 'background: linear-gradient(135deg, #28a745, #20c997);' : ''}
    ${type === 'error' ? 'background: linear-gradient(135deg, #dc3545, #c82333);' : ''}
    ${type === 'info' ? 'background: linear-gradient(135deg, #17a2b8, #20c997);' : ''}
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Confetti Animation
function createConfetti() {
  const confettiContainer = document.createElement('div');
  confettiContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999;
  `;

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: absolute;
      width: 10px;
      height: 10px;
      background: ${['#ffd700', '#ffed4e', '#28a745', '#20c997'][Math.floor(Math.random() * 4)]};
      left: ${Math.random() * 100}%;
      animation: confetti 3s ease-in-out;
      animation-delay: ${Math.random() * 2}s;
    `;
    confettiContainer.appendChild(confetti);
  }

  document.body.appendChild(confettiContainer);

  setTimeout(() => {
    document.body.removeChild(confettiContainer);
  }, 5000);
}

// Recent Assessments Functionality
function addToRecentAssessments(assessment) {
  let recent = JSON.parse(localStorage.getItem('recentAssessments') || '[]');
  recent.unshift(assessment);
  if (recent.length > 10) recent = recent.slice(0, 10); // Keep only last 10
  localStorage.setItem('recentAssessments', JSON.stringify(recent));
  updateRecentCount();
  displayRecentAssessments();
}

function updateRecentCount() {
  const recent = JSON.parse(localStorage.getItem('recentAssessments') || '[]');
  if (recentCount) recentCount.textContent = recent.length;
}

function displayRecentAssessments() {
  const recent = JSON.parse(localStorage.getItem('recentAssessments') || '[]');
  const recentList = document.getElementById('recent-list');
  if (!recentList) return;

  if (recent.length === 0) {
    recentList.innerHTML = `
      <div class="no-recent">
        <span class="no-recent-icon">📋</span>
        <p>No recent assessments yet.</p>
        <span class="no-recent-tip">Upload and analyze crops to see history here</span>
      </div>
    `;
  } else {
    recentList.innerHTML = recent.map((assessment, index) => `
      <div class="recent-item" data-index="${index}">
        <div class="recent-item-header">
          <span class="recent-crop">${assessment.crop}</span>
          <span class="recent-quality ${assessment.quality.toLowerCase()}">${assessment.quality}</span>
        </div>
        <div class="recent-item-details">
          <span>Disease: ${assessment.diseasePest}</span>
          <span>Price: ₹${assessment.price || 'N/A'}</span>
        </div>
      </div>
    `).join('');
  }
}

// Event listeners for recent assessments
if (clearRecentBtn) {
  clearRecentBtn.addEventListener('click', () => {
    localStorage.removeItem('recentAssessments');
    updateRecentCount();
    displayRecentAssessments();
  });
}

if (toggleRecentBtn) {
  toggleRecentBtn.addEventListener('click', () => {
    const recentList = document.getElementById('recent-list');
    if (recentList) {
      const isHidden = recentList.style.display === 'none';
      recentList.style.display = isHidden ? 'block' : 'none';
      toggleRecentBtn.querySelector('span').textContent = isHidden ? '▼' : '▲';
    }
  });
}

// Initialize recent count and display
updateRecentCount();
displayRecentAssessments();

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  @keyframes confetti {
    0% { transform: translateY(-100vh) rotate(0deg); }
    100% { transform: translateY(100vh) rotate(720deg); }
  }

  .notification {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
`;
document.head.appendChild(style);

