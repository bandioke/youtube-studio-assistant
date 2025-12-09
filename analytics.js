// Google Analytics 4 - Measurement Protocol for Chrome Extension
// Non-blocking, privacy-friendly analytics

const GA_CONFIG = {
  // GA4 Measurement Protocol Configuration
  MEASUREMENT_ID: 'G-7P7PKDYC84',
  API_SECRET: 'EkBcPhRjRT2O8NFCfbfo1A',
  
  // Endpoint
  ENDPOINT: 'https://www.google-analytics.com/mp/collect',
  
  // Debug endpoint (use for testing)
  DEBUG_ENDPOINT: 'https://www.google-analytics.com/debug/mp/collect',
  
  // Enable debug mode (set to false in production)
  DEBUG: false,
  
  // Enable/disable analytics (user can opt-out)
  ENABLED: true
};

// Client ID for user identification (anonymous)
let _clientId = null;

/**
 * Get or generate anonymous client ID
 */
async function getClientId() {
  if (_clientId) return _clientId;
  
  return new Promise((resolve) => {
    chrome.storage.local.get(['analyticsClientId'], (result) => {
      if (result.analyticsClientId) {
        _clientId = result.analyticsClientId;
        resolve(_clientId);
      } else {
        // Generate new anonymous client ID
        _clientId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        chrome.storage.local.set({ analyticsClientId: _clientId });
        resolve(_clientId);
      }
    });
  });
}

/**
 * Check if analytics is enabled
 */
async function isAnalyticsEnabled() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['analyticsOptOut'], (result) => {
      resolve(!result.analyticsOptOut && GA_CONFIG.ENABLED);
    });
  });
}

/**
 * Send event to Google Analytics 4
 * Non-blocking - uses sendBeacon or fetch with no await
 */
async function trackEvent(eventName, params = {}) {
  try {
    // Check if analytics is enabled
    if (!await isAnalyticsEnabled()) return;
    
    // Skip if not configured
    if (GA_CONFIG.MEASUREMENT_ID === 'G-XXXXXXXXXX') {
      console.log('[Analytics] Not configured - skipping event:', eventName);
      return;
    }
    
    const clientId = await getClientId();
    
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          ...params,
          engagement_time_msec: 100,
          session_id: getSessionId()
        }
      }]
    };
    
    const endpoint = GA_CONFIG.DEBUG 
      ? GA_CONFIG.DEBUG_ENDPOINT 
      : GA_CONFIG.ENDPOINT;
    
    const url = `${endpoint}?measurement_id=${GA_CONFIG.MEASUREMENT_ID}&api_secret=${GA_CONFIG.API_SECRET}`;
    
    // Use sendBeacon for non-blocking (preferred)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify(payload));
    } else {
      // Fallback to fetch (fire and forget)
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {}); // Ignore errors
    }
    
    if (GA_CONFIG.DEBUG) {
      console.log('[Analytics] Event sent:', eventName, params);
    }
  } catch (err) {
    // Silently fail - analytics should never break the app
    console.log('[Analytics] Error:', err.message);
  }
}

/**
 * Get session ID (resets every 30 minutes of inactivity)
 */
let _sessionId = null;
let _lastActivity = 0;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function getSessionId() {
  const now = Date.now();
  if (!_sessionId || (now - _lastActivity) > SESSION_TIMEOUT) {
    _sessionId = now.toString();
  }
  _lastActivity = now;
  return _sessionId;
}

// ========== PREDEFINED EVENTS ==========

/**
 * Track extension installed/updated
 */
function trackInstall(version, isUpdate = false) {
  trackEvent(isUpdate ? 'extension_updated' : 'extension_installed', {
    version: version
  });
}

/**
 * Track page view (when user opens YouTube Studio)
 */
function trackPageView(pageName) {
  trackEvent('page_view', {
    page_title: pageName,
    page_location: 'youtube_studio'
  });
}

/**
 * Track feature usage
 */
function trackFeatureUsed(featureName, details = {}) {
  trackEvent('feature_used', {
    feature_name: featureName,
    ...details
  });
}

/**
 * Track title generation
 */
function trackGenerateTitle(style, success = true) {
  trackEvent('generate_title', {
    style: style,
    success: success ? 'yes' : 'no'
  });
}

/**
 * Track description generation
 */
function trackGenerateDescription(style, success = true) {
  trackEvent('generate_description', {
    style: style,
    success: success ? 'yes' : 'no'
  });
}

/**
 * Track tags generation
 */
function trackGenerateTags(count, success = true) {
  trackEvent('generate_tags', {
    tag_count: count,
    success: success ? 'yes' : 'no'
  });
}

/**
 * Track multi-language translation
 */
function trackMultiLangTranslation(languageCount, successCount, failedCount) {
  trackEvent('multi_lang_translation', {
    language_count: languageCount,
    success_count: successCount,
    failed_count: failedCount
  });
}

/**
 * Track single language translation
 */
function trackSingleTranslation(targetLang, success = true) {
  trackEvent('single_translation', {
    target_language: targetLang,
    success: success ? 'yes' : 'no'
  });
}

/**
 * Track license activation
 */
function trackLicenseActivation(licenseType, success = true) {
  trackEvent('license_activation', {
    license_type: licenseType,
    success: success ? 'yes' : 'no'
  });
}

/**
 * Track license status (called on app load)
 */
function trackLicenseStatus(status, licenseType, daysRemaining = null) {
  const params = {
    license_status: status,
    license_type: licenseType
  };
  if (daysRemaining !== null) {
    params.days_remaining = daysRemaining;
  }
  trackEvent('license_status', params);
}

/**
 * Track trial started
 */
function trackTrialStarted(trialDays = 7) {
  trackEvent('trial_started', {
    trial_days: trialDays
  });
}

/**
 * Track trial expired
 */
function trackTrialExpired() {
  trackEvent('trial_expired', {});
}

/**
 * Track license deactivation
 */
function trackLicenseDeactivation(licenseType) {
  trackEvent('license_deactivated', {
    license_type: licenseType
  });
}

/**
 * Track error
 */
function trackError(errorType, errorMessage) {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage.slice(0, 100) // Limit length
  });
}

/**
 * Track UI language change
 */
function trackLanguageChange(newLanguage) {
  trackEvent('ui_language_changed', {
    language: newLanguage
  });
}

// ========== USER PROPERTIES ==========

/**
 * Set user properties (called once per session)
 */
async function setUserProperties(properties = {}) {
  try {
    if (!await isAnalyticsEnabled()) return;
    if (GA_CONFIG.MEASUREMENT_ID === 'G-XXXXXXXXXX') return;
    
    const clientId = await getClientId();
    
    const payload = {
      client_id: clientId,
      user_properties: {}
    };
    
    // Add properties
    for (const [key, value] of Object.entries(properties)) {
      payload.user_properties[key] = { value: value };
    }
    
    const url = `${GA_CONFIG.ENDPOINT}?measurement_id=${GA_CONFIG.MEASUREMENT_ID}&api_secret=${GA_CONFIG.API_SECRET}`;
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify(payload));
    } else {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
  } catch (err) {
    console.log('[Analytics] Error setting user properties:', err.message);
  }
}

// ========== OPT-OUT ==========

/**
 * Opt out of analytics
 */
async function optOutAnalytics() {
  await chrome.storage.sync.set({ analyticsOptOut: true });
  console.log('[Analytics] User opted out');
}

/**
 * Opt in to analytics
 */
async function optInAnalytics() {
  await chrome.storage.sync.set({ analyticsOptOut: false });
  console.log('[Analytics] User opted in');
}

// ========== EXPORT ==========

if (typeof window !== 'undefined') {
  window.Analytics = {
    // Core
    trackEvent,
    setUserProperties,
    
    // Predefined events
    trackInstall,
    trackPageView,
    trackFeatureUsed,
    trackGenerateTitle,
    trackGenerateDescription,
    trackGenerateTags,
    trackMultiLangTranslation,
    trackSingleTranslation,
    trackLicenseActivation,
    trackLicenseStatus,
    trackTrialStarted,
    trackTrialExpired,
    trackLicenseDeactivation,
    trackError,
    trackLanguageChange,
    
    // Opt-out
    optOut: optOutAnalytics,
    optIn: optInAnalytics,
    isEnabled: isAnalyticsEnabled
  };
}

console.log('[Analytics] Module loaded');
