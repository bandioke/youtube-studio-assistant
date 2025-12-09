// Translations for YouTube Studio Assistant
// This file now uses LOCALES from locales.js for all translations

// Get translation function - uses LOCALES from locales.js
function t(key, lang = 'en') {
  // Use LOCALES if available (from locales.js)
  if (typeof LOCALES !== 'undefined') {
    if (LOCALES[lang] && LOCALES[lang][key]) {
      return LOCALES[lang][key];
    }
    // Fallback to English
    if (LOCALES.en && LOCALES.en[key]) {
      return LOCALES.en[key];
    }
  }
  // Return key if not found
  return key;
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t };
}
