// License Management System for YouTube Studio Assistant
// Supports LemonSqueezy with 2 variants: Trial (7 days) and Lifetime

// ========== IN-MEMORY CACHE ==========
// Cache license status in memory to avoid reading storage on every check
let _licenseStatusCache = null;
let _licenseCacheTime = 0;
const LICENSE_MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const LICENSE_CONFIG = {
  // LemonSqueezy API Configuration
  // Replace these with your actual LemonSqueezy store details
  LEMONSQUEEZY_API_URL: 'https://api.lemonsqueezy.com/v1',
  STORE_ID: 'YOUR_STORE_ID', // Replace with your store ID
  PRODUCT_ID: 'YOUR_PRODUCT_ID', // Replace with your product ID
  
  // Variant names (must match exactly with LemonSqueezy variant names)
  VARIANT_TRIAL: 'Trial', // 7-day trial variant name
  VARIANT_LIFETIME: 'Lifetime', // Lifetime variant name
  
  // License check interval (24 hours)
  CHECK_INTERVAL: 24 * 60 * 60 * 1000,
  
  // Grace period after license expires (3 days)
  GRACE_PERIOD: 3 * 24 * 60 * 60 * 1000,
  
  // Trial duration (7 days)
  TRIAL_DURATION: 7 * 24 * 60 * 60 * 1000
};

// License status constants
const LICENSE_STATUS = {
  VALID: 'valid',           // Lifetime license active
  TRIAL: 'trial',           // Trial license active (from LemonSqueezy)
  TRIAL_LOCAL: 'trial_local', // Local trial (no license key yet)
  TRIAL_EXPIRED: 'trial_expired',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  NOT_ACTIVATED: 'not_activated'
};

// License type constants
const LICENSE_TYPE = {
  NONE: 'none',
  LOCAL_TRIAL: 'local_trial',  // Built-in trial without license key
  LEMON_TRIAL: 'lemon_trial',  // Trial from LemonSqueezy
  LIFETIME: 'lifetime'         // Lifetime license
};

/**
 * Initialize license system - check existing or start local trial
 */
async function initializeLicense() {
  const licenseData = await getLicenseData();
  
  // If no license data, this is first run - start local trial
  if (!licenseData || !licenseData.initialized) {
    return await startLocalTrial();
  }
  
  // Check current license status
  return await checkLicenseStatus();
}

/**
 * Start local 7-day trial (without license key)
 */
async function startLocalTrial() {
  const now = Date.now();
  const trialEnd = now + LICENSE_CONFIG.TRIAL_DURATION;
  
  const trialData = {
    initialized: true,
    licenseType: LICENSE_TYPE.LOCAL_TRIAL,
    status: LICENSE_STATUS.TRIAL_LOCAL,
    trialStartDate: now,
    trialEndDate: trialEnd,
    licenseKey: null,
    activatedAt: null,
    lastCheck: now,
    machineId: await getMachineId()
  };
  
  await saveLicenseData(trialData);
  
  // Track trial started (non-blocking)
  if (typeof window !== 'undefined' && window.Analytics) {
    window.Analytics.trackTrialStarted(7);
  }
  
  return {
    status: LICENSE_STATUS.TRIAL_LOCAL,
    daysRemaining: 7,
    message: 'Trial started! You have 7 days to try all features.'
  };
}

/**
 * Helper to cache and return license status
 */
function cacheAndReturn(status) {
  _licenseStatusCache = status;
  _licenseCacheTime = Date.now();
  return status;
}

/**
 * Clear license cache (call after license changes)
 */
function clearLicenseCache() {
  _licenseStatusCache = null;
  _licenseCacheTime = 0;
}

/**
 * Check current license status (with in-memory cache)
 */
async function checkLicenseStatus() {
  const now = Date.now();
  
  // Return from memory cache if still valid (5 minutes)
  if (_licenseStatusCache && (now - _licenseCacheTime) < LICENSE_MEMORY_CACHE_DURATION) {
    return _licenseStatusCache;
  }
  
  const licenseData = await getLicenseData();
  
  if (!licenseData) {
    return cacheAndReturn({ status: LICENSE_STATUS.NOT_ACTIVATED, message: 'License not initialized' });
  }
  
  // If has license key, validate it
  if (licenseData.licenseKey) {
    // Check if we need to revalidate (every 24 hours)
    if (now - licenseData.lastCheck > LICENSE_CONFIG.CHECK_INTERVAL) {
      const result = await validateLicenseKey(licenseData.licenseKey);
      return cacheAndReturn(result);
    }
    
    // Handle different license types
    if (licenseData.licenseType === LICENSE_TYPE.LIFETIME) {
      // Lifetime license - always valid (no expiry)
      return cacheAndReturn({
        status: LICENSE_STATUS.VALID,
        licenseType: LICENSE_TYPE.LIFETIME,
        message: 'Lifetime license active',
        isLifetime: true
      });
    }
    
    if (licenseData.licenseType === LICENSE_TYPE.LEMON_TRIAL) {
      // LemonSqueezy trial - check expiry
      if (licenseData.expiresAt && now < licenseData.expiresAt) {
        const daysRemaining = Math.ceil((licenseData.expiresAt - now) / (24 * 60 * 60 * 1000));
        return cacheAndReturn({
          status: LICENSE_STATUS.TRIAL,
          licenseType: LICENSE_TYPE.LEMON_TRIAL,
          daysRemaining: daysRemaining,
          expiresAt: licenseData.expiresAt,
          message: `Trial: ${daysRemaining} days remaining`
        });
      } else if (licenseData.expiresAt) {
        // Trial expired
        await saveLicenseData({ ...licenseData, status: LICENSE_STATUS.TRIAL_EXPIRED });
        // Track trial expired
        if (typeof window !== 'undefined' && window.Analytics) {
          window.Analytics.trackTrialExpired();
        }
        return cacheAndReturn({
          status: LICENSE_STATUS.TRIAL_EXPIRED,
          message: 'Trial expired. Please purchase a lifetime license.'
        });
      }
    }
    
    // Generic valid status
    if (licenseData.status === LICENSE_STATUS.VALID) {
      return cacheAndReturn({
        status: LICENSE_STATUS.VALID,
        message: 'License active',
        expiresAt: licenseData.expiresAt
      });
    }
  }
  
  // Check local trial status (no license key)
  if (licenseData.licenseType === LICENSE_TYPE.LOCAL_TRIAL) {
    if (now < licenseData.trialEndDate) {
      const daysRemaining = Math.ceil((licenseData.trialEndDate - now) / (24 * 60 * 60 * 1000));
      return cacheAndReturn({
        status: LICENSE_STATUS.TRIAL_LOCAL,
        licenseType: LICENSE_TYPE.LOCAL_TRIAL,
        daysRemaining: daysRemaining,
        trialEndDate: licenseData.trialEndDate,
        message: `Trial: ${daysRemaining} days remaining`
      });
    } else {
      // Local trial expired
      await saveLicenseData({ ...licenseData, status: LICENSE_STATUS.TRIAL_EXPIRED });
      // Track trial expired
      if (typeof window !== 'undefined' && window.Analytics) {
        window.Analytics.trackTrialExpired();
      }
      return cacheAndReturn({
        status: LICENSE_STATUS.TRIAL_EXPIRED,
        message: 'Trial expired. Please activate a license.'
      });
    }
  }
  
  return cacheAndReturn({ status: LICENSE_STATUS.NOT_ACTIVATED, message: 'Please activate a license' });
}

/**
 * Activate license key via LemonSqueezy API
 * Handles both Trial and Lifetime variants
 */
async function activateLicense(licenseKey) {
  if (!licenseKey || licenseKey.trim() === '') {
    return { success: false, error: 'Please enter a license key' };
  }
  
  licenseKey = licenseKey.trim();
  
  try {
    // Validate license with LemonSqueezy
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: await getMachineId()
      })
    });
    
    const result = await response.json();
    
    // Debug: Log full API response to see available data
    console.log('[License] API Response:', JSON.stringify(result, null, 2));
    
    if (result.activated || result.valid) {
      const licenseData = await getLicenseData() || {};
      const now = Date.now();
      
      // Detect variant type from response
      const variantName = result.meta?.variant_name || '';
      const expiresAt = result.license_key?.expires_at 
        ? new Date(result.license_key.expires_at).getTime() 
        : null;
      
      // Determine license type based on variant name or expiry
      let licenseType = LICENSE_TYPE.LIFETIME;
      let status = LICENSE_STATUS.VALID;
      
      // Check if it's a trial variant
      const isTrialVariant = variantName.toLowerCase().includes('trial') || 
                            variantName.toLowerCase().includes('uji coba') ||
                            (expiresAt && expiresAt - now <= 8 * 24 * 60 * 60 * 1000); // Less than 8 days = trial
      
      if (isTrialVariant && expiresAt) {
        licenseType = LICENSE_TYPE.LEMON_TRIAL;
        status = LICENSE_STATUS.TRIAL;
      }
      
      // Try to get customer info from multiple sources
      const customerEmail = result.meta?.customer_email || 
                           result.license_key?.user_email || 
                           result.customer?.email ||
                           null;
      const customerName = result.meta?.customer_name || 
                          result.license_key?.user_name || 
                          result.customer?.name ||
                          null;
      
      const updatedData = {
        ...licenseData,
        initialized: true,
        licenseType: licenseType,
        status: status,
        licenseKey: licenseKey,
        activatedAt: now,
        lastCheck: now,
        instanceId: result.instance?.id || null,
        customerEmail: customerEmail,
        customerName: customerName,
        productName: result.meta?.product_name || result.license_key?.product_name || null,
        variantName: variantName,
        variantId: result.meta?.variant_id || null,
        expiresAt: expiresAt,
        isLifetime: licenseType === LICENSE_TYPE.LIFETIME,
        // Activation count info
        activationUsage: result.license_key?.activation_usage || 1,
        activationLimit: result.license_key?.activation_limit || 2
      };
      
      await saveLicenseData(updatedData);
      
      // Clear cache after license change
      clearLicenseCache();
      
      // Return appropriate message based on license type
      const message = licenseType === LICENSE_TYPE.LIFETIME 
        ? 'Lifetime license activated!' 
        : `Trial license activated! ${Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))} days remaining`;
      
      // Track license activation success
      if (typeof window !== 'undefined' && window.Analytics) {
        window.Analytics.trackLicenseActivation(licenseType, true);
      }
      
      return {
        success: true,
        status: status,
        licenseType: licenseType,
        message: message,
        customerName: updatedData.customerName,
        productName: updatedData.productName,
        variantName: variantName,
        isLifetime: licenseType === LICENSE_TYPE.LIFETIME,
        expiresAt: expiresAt
      };
    } else {
      // License invalid or error
      const errorMsg = result.error || result.message || 'Invalid license key';
      // Track license activation failed
      if (typeof window !== 'undefined' && window.Analytics) {
        window.Analytics.trackLicenseActivation('unknown', false);
      }
      return { success: false, error: errorMsg };
    }
    
  } catch (error) {
    console.error('License activation error:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}


/**
 * Validate existing license key
 */
async function validateLicenseKey(licenseKey) {
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_id: (await getLicenseData())?.instanceId
      })
    });
    
    const result = await response.json();
    const licenseData = await getLicenseData();
    const now = Date.now();
    
    if (result.valid) {
      const expiresAt = result.license_key?.expires_at 
        ? new Date(result.license_key.expires_at).getTime() 
        : null;
      
      // Check if trial has expired
      if (licenseData.licenseType === LICENSE_TYPE.LEMON_TRIAL && expiresAt && now > expiresAt) {
        await saveLicenseData({
          ...licenseData,
          status: LICENSE_STATUS.TRIAL_EXPIRED,
          lastCheck: now
        });
        return {
          status: LICENSE_STATUS.TRIAL_EXPIRED,
          message: 'Trial expired. Please purchase a lifetime license.'
        };
      }
      
      // Update last check time
      await saveLicenseData({
        ...licenseData,
        status: licenseData.licenseType === LICENSE_TYPE.LIFETIME ? LICENSE_STATUS.VALID : LICENSE_STATUS.TRIAL,
        lastCheck: now,
        expiresAt: expiresAt
      });
      
      if (licenseData.licenseType === LICENSE_TYPE.LIFETIME) {
        return {
          status: LICENSE_STATUS.VALID,
          licenseType: LICENSE_TYPE.LIFETIME,
          message: 'Lifetime license valid',
          isLifetime: true
        };
      } else {
        const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)) : 0;
        return {
          status: LICENSE_STATUS.TRIAL,
          licenseType: LICENSE_TYPE.LEMON_TRIAL,
          daysRemaining: daysRemaining,
          message: `Trial: ${daysRemaining} days remaining`
        };
      }
    } else {
      // License no longer valid
      await saveLicenseData({
        ...licenseData,
        status: LICENSE_STATUS.EXPIRED,
        lastCheck: now
      });
      
      return {
        status: LICENSE_STATUS.EXPIRED,
        message: result.error || 'License expired or invalid'
      };
    }
    
  } catch (error) {
    console.error('License validation error:', error);
    // On network error, use cached status with grace period
    const licenseData = await getLicenseData();
    if (licenseData && (licenseData.status === LICENSE_STATUS.VALID || licenseData.status === LICENSE_STATUS.TRIAL)) {
      return {
        status: licenseData.status,
        licenseType: licenseData.licenseType,
        message: 'License valid (offline mode)',
        isLifetime: licenseData.isLifetime
      };
    }
    return { status: LICENSE_STATUS.INVALID, message: 'Could not validate license' };
  }
}

/**
 * Deactivate license (for switching devices)
 */
async function deactivateLicense() {
  const licenseData = await getLicenseData();
  
  if (!licenseData || !licenseData.licenseKey) {
    return { success: false, error: 'No active license found' };
  }
  
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseData.licenseKey,
        instance_id: licenseData.instanceId
      })
    });
    
    const result = await response.json();
    
    if (result.deactivated) {
      // Reset to local trial expired state (can't restart trial)
      await saveLicenseData({
        initialized: true,
        licenseType: LICENSE_TYPE.NONE,
        status: LICENSE_STATUS.NOT_ACTIVATED,
        licenseKey: null,
        instanceId: null,
        lastCheck: Date.now(),
        // Keep trial dates to prevent restart
        trialStartDate: licenseData.trialStartDate,
        trialEndDate: licenseData.trialEndDate
      });
      
      // Clear cache after license change
      clearLicenseCache();
      
      return { success: true, message: 'License deactivated. You can now use it on another device.' };
    } else {
      return { success: false, error: result.error || 'Failed to deactivate' };
    }
    
  } catch (error) {
    console.error('License deactivation error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get license data from storage
 */
async function getLicenseData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['licenseData'], (result) => {
      resolve(result.licenseData || null);
    });
  });
}

/**
 * Save license data to storage
 */
async function saveLicenseData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ licenseData: data }, resolve);
  });
}

/**
 * Generate unique machine ID for license binding
 */
async function getMachineId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['machineId'], async (result) => {
      if (result.machineId) {
        resolve(result.machineId);
      } else {
        // Generate new machine ID
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const machineId = 'yt-assist-' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        await chrome.storage.local.set({ machineId });
        resolve(machineId);
      }
    });
  });
}

/**
 * Check if feature is available based on license
 */
async function isFeatureAvailable(featureName = 'all') {
  const status = await checkLicenseStatus();
  
  // All features available during any valid trial or license
  const validStatuses = [
    LICENSE_STATUS.VALID, 
    LICENSE_STATUS.TRIAL, 
    LICENSE_STATUS.TRIAL_LOCAL
  ];
  
  if (validStatuses.includes(status.status)) {
    return { available: true, status: status };
  }
  
  // No features available if expired
  return { 
    available: false, 
    status: status,
    message: status.status === LICENSE_STATUS.TRIAL_EXPIRED 
      ? 'Trial expired. Please purchase a lifetime license to continue.'
      : 'Please activate a license to use this feature.'
  };
}

/**
 * Get formatted license info for display
 */
async function getLicenseInfo() {
  const licenseData = await getLicenseData();
  const status = await checkLicenseStatus();
  
  return {
    ...status,
    licenseType: licenseData?.licenseType || LICENSE_TYPE.NONE,
    customerName: licenseData?.customerName || null,
    customerEmail: licenseData?.customerEmail || null,
    productName: licenseData?.productName || null,
    variantName: licenseData?.variantName || null,
    activatedAt: licenseData?.activatedAt || null,
    expiresAt: licenseData?.expiresAt || null,
    trialEndDate: licenseData?.trialEndDate || null,
    isLifetime: licenseData?.isLifetime || false,
    activationUsage: licenseData?.activationUsage || null,
    activationLimit: licenseData?.activationLimit || null,
    activationCount: licenseData?.activationUsage && licenseData?.activationLimit 
      ? `${licenseData.activationUsage} / ${licenseData.activationLimit}`
      : null
  };
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.LicenseManager = {
    initialize: initializeLicense,
    checkStatus: checkLicenseStatus,
    activate: activateLicense,
    deactivate: deactivateLicense,
    isFeatureAvailable: isFeatureAvailable,
    getInfo: getLicenseInfo,
    clearCache: clearLicenseCache,
    STATUS: LICENSE_STATUS,
    TYPE: LICENSE_TYPE
  };
}
