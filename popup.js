document.addEventListener('DOMContentLoaded', async () => {
  // Screen elements
  const licenseScreen = document.getElementById('licenseScreen');
  const settingsScreen = document.getElementById('settingsScreen');
  
  // License screen elements
  const licenseScreenTitle = document.getElementById('licenseScreenTitle');
  const licenseScreenSubtitle = document.getElementById('licenseScreenSubtitle');
  const trialBanner = document.getElementById('trialBanner');
  const trialDays = document.getElementById('trialDays');
  const trialText = document.getElementById('trialText');
  const licenseKeyInputMain = document.getElementById('licenseKeyInputMain');
  const activateLicenseBtnMain = document.getElementById('activateLicenseBtnMain');
  const continueTrialBtn = document.getElementById('continueTrialBtn');
  const licenseScreenStatus = document.getElementById('licenseScreenStatus');
  const noLicenseText = document.getElementById('noLicenseText');
  const buyLicenseLinkMain = document.getElementById('buyLicenseLinkMain');
  
  // Settings screen elements
  const providerSelect = document.getElementById('provider');
  const apiKeyInput = document.getElementById('apiKey');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
  const geminiModelSelect = document.getElementById('geminiModel');
  const openaiModelSelect = document.getElementById('openaiModel');
  const deepseekModelSelect = document.getElementById('deepseekModel');
  const languageSelect = document.getElementById('language');
  const saveBtn = document.getElementById('saveBtn');
  const testGeminiBtn = document.getElementById('testGeminiBtn');
  const testOpenaiBtn = document.getElementById('testOpenaiBtn');
  const testDeepseekBtn = document.getElementById('testDeepseekBtn');
  const statusDiv = document.getElementById('status');
  const licenseStatusBadge = document.getElementById('licenseStatusBadge');
  const licenseStatusText = document.getElementById('licenseStatusText');
  const licenseInfoBox = document.getElementById('licenseInfoBox');
  const licenseInfoText = document.getElementById('licenseInfoText');
  const deactivateLicenseBtn = document.getElementById('deactivateLicenseBtn');

  // Provider sections
  const geminiSettings = document.getElementById('gemini-settings');
  const openaiSettings = document.getElementById('openai-settings');
  const deepseekSettings = document.getElementById('deepseek-settings');

  let currentLang = 'en';

  // Load language setting first
  const langSettings = await chrome.storage.sync.get(['language']);
  if (langSettings.language) {
    currentLang = langSettings.language;
  }

  // ========== SCREEN MANAGEMENT ==========
  
  function showLicenseScreen() {
    licenseScreen.style.display = 'flex';
    settingsScreen.style.display = 'none';
  }
  
  function showSettingsScreen() {
    licenseScreen.style.display = 'none';
    settingsScreen.style.display = 'block';
  }
  
  // ========== LICENSE SCREEN LOGIC ==========
  
  async function initializeLicenseCheck() {
    try {
      // Initialize license system
      await window.LicenseManager.initialize();
      const info = await window.LicenseManager.getInfo();
      const STATUS = window.LicenseManager.STATUS;
      
      // Update license screen based on status
      updateLicenseScreenUI(info, STATUS);
      
      // Decide which screen to show
      const isTrialActive = info.status === STATUS.TRIAL || info.status === 'trial_local';
      
      if (info.status === STATUS.VALID || isTrialActive) {
        // License active (lifetime or trial) - go directly to settings
        showSettingsScreen();
        updateSettingsLicenseUI(info, STATUS);
        loadSettings();
      } else if (info.status === STATUS.TRIAL_EXPIRED || info.status === STATUS.EXPIRED) {
        // Expired - must activate license
        showLicenseScreen();
      } else {
        // Not activated - show license screen
        showLicenseScreen();
      }
      
    } catch (err) {
      console.error('License init error:', err);
      showLicenseScreen();
    }
  }
  
  function updateLicenseScreenUI(info, STATUS) {
    // Update texts based on language
    licenseScreenTitle.textContent = L('activateApp', currentLang) || 'Aktivasi YouTube Studio Assistant';
    licenseScreenSubtitle.textContent = L('enterLicenseToStart', currentLang) || 'Masukkan license key untuk memulai';
    activateLicenseBtnMain.textContent = L('activateLicense', currentLang) || 'Aktivasi License';
    noLicenseText.textContent = L('noLicense', currentLang) || 'Belum punya license?';
    buyLicenseLinkMain.textContent = (L('buyLicenseKey', currentLang) || 'Beli License Key') + ' →';
    continueTrialBtn.textContent = (L('continueWithTrial', currentLang) || 'Lanjutkan dengan Trial') + ' →';
    
    // Show/hide trial banner based on status
    const isTrialActive = info.status === STATUS.TRIAL || info.status === 'trial_local';
    
    if (isTrialActive) {
      trialBanner.style.display = 'block';
      trialBanner.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
      trialBanner.style.borderColor = '#fcd34d';
      trialDays.textContent = info.daysRemaining || 7;
      trialDays.style.color = '#d97706';
      trialText.textContent = L('daysLeftInTrial', currentLang) || 'hari tersisa dalam masa uji coba';
      trialText.style.color = '#92400e';
      continueTrialBtn.style.display = 'block';
    } else if (info.status === STATUS.TRIAL_EXPIRED) {
      trialBanner.style.display = 'block';
      trialBanner.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
      trialBanner.style.borderColor = '#fca5a5';
      trialDays.textContent = '0';
      trialDays.style.color = '#dc2626';
      trialText.textContent = L('trialExpiredText', currentLang) || 'Masa uji coba telah berakhir';
      trialText.style.color = '#991b1b';
      continueTrialBtn.style.display = 'none';
    } else {
      trialBanner.style.display = 'none';
      continueTrialBtn.style.display = 'none';
    }
  }
  
  function updateSettingsLicenseUI(info, STATUS) {
    const isTrialActive = info.status === STATUS.TRIAL || info.status === 'trial_local';
    
    // Get license detail elements
    const licenseStatusIcon = document.getElementById('licenseStatusIcon');
    const licenseStatusLabel = document.getElementById('licenseStatusLabel');
    const licenseCustomerName = document.getElementById('licenseCustomerName');
    const licenseCustomerEmail = document.getElementById('licenseCustomerEmail');
    const licenseType = document.getElementById('licenseType');
    const licenseExpiry = document.getElementById('licenseExpiry');
    const licenseActivations = document.getElementById('licenseActivations');
    
    // Update license info box based on status
    if (info.status === STATUS.VALID) {
      // Lifetime license - update license info box
      licenseInfoBox.style.background = '#dcfce7';
      licenseInfoBox.style.borderColor = '#86efac';
      if (licenseStatusIcon) licenseStatusIcon.textContent = '✅';
      if (licenseStatusLabel) {
        licenseStatusLabel.textContent = info.isLifetime 
          ? (L('lifetimeLicense', currentLang) || 'Lifetime License Active')
          : (L('licenseActive', currentLang) || 'License Active');
        licenseStatusLabel.style.color = '#16a34a';
      }
      
      // Fill license details
      if (licenseCustomerName) licenseCustomerName.textContent = info.customerName || '-';
      if (licenseCustomerEmail) licenseCustomerEmail.textContent = info.customerEmail || '-';
      if (licenseType) licenseType.textContent = info.isLifetime ? 'Lifetime' : (info.variantName || 'Standard');
      if (licenseExpiry) {
        licenseExpiry.textContent = info.isLifetime ? 'Never' : (info.expiresAt ? new Date(info.expiresAt).toLocaleDateString() : '-');
      }
      if (licenseActivations) licenseActivations.textContent = info.activationCount || '1 / 2';
      
      deactivateLicenseBtn.style.display = 'block';
      
    } else if (isTrialActive) {
      // Trial (local or LemonSqueezy) - update license info box
      licenseInfoBox.style.background = '#fef3c7';
      licenseInfoBox.style.borderColor = '#fcd34d';
      if (licenseStatusIcon) licenseStatusIcon.textContent = '⏳';
      if (licenseStatusLabel) {
        licenseStatusLabel.textContent = `${L('trialMode', currentLang) || 'Trial Mode'} - ${info.daysRemaining || 7} ${L('daysRemaining', currentLang) || 'days remaining'}`;
        licenseStatusLabel.style.color = '#d97706';
      }
      
      // Fill trial details
      if (licenseCustomerName) licenseCustomerName.textContent = '-';
      if (licenseCustomerEmail) licenseCustomerEmail.textContent = '-';
      if (licenseType) licenseType.textContent = 'Trial (7 days)';
      if (licenseExpiry) {
        const expiryDate = info.trialEndDate ? new Date(info.trialEndDate).toLocaleDateString() : '-';
        licenseExpiry.textContent = expiryDate;
      }
      if (licenseActivations) licenseActivations.textContent = '-';
      
      // Show deactivate only if it's a LemonSqueezy trial (has license key)
      deactivateLicenseBtn.style.display = info.licenseType === 'lemon_trial' ? 'block' : 'none';
    }
  }
  
  function showLicenseScreenStatus(message, type) {
    licenseScreenStatus.textContent = message;
    licenseScreenStatus.className = 'license-status ' + type;
    licenseScreenStatus.style.display = 'block';
  }
  
  // Activate license button (main screen)
  activateLicenseBtnMain.addEventListener('click', async () => {
    const key = licenseKeyInputMain.value.trim();
    if (!key) {
      showLicenseScreenStatus(L('pleaseEnterLicenseKey', currentLang) || 'Masukkan license key', 'error');
      return;
    }
    
    activateLicenseBtnMain.disabled = true;
    activateLicenseBtnMain.textContent = L('activating', currentLang) || 'Mengaktifkan...';
    
    try {
      const result = await window.LicenseManager.activate(key);
      
      if (result.success) {
        showLicenseScreenStatus('✅ ' + (L('licenseActivated', currentLang) || 'License berhasil diaktifkan!'), 'success');
        
        // Wait a moment then switch to settings
        setTimeout(async () => {
          const info = await window.LicenseManager.getInfo();
          const STATUS = window.LicenseManager.STATUS;
          showSettingsScreen();
          updateSettingsLicenseUI(info, STATUS);
          loadSettings();
        }, 1500);
      } else {
        showLicenseScreenStatus('❌ ' + (result.error || 'Aktivasi gagal'), 'error');
      }
    } catch (err) {
      showLicenseScreenStatus('❌ ' + err.message, 'error');
    }
    
    activateLicenseBtnMain.disabled = false;
    activateLicenseBtnMain.textContent = L('activateLicense', currentLang) || 'Aktivasi License';
  });
  
  // Continue with trial button
  continueTrialBtn.addEventListener('click', async () => {
    const info = await window.LicenseManager.getInfo();
    const STATUS = window.LicenseManager.STATUS;
    showSettingsScreen();
    updateSettingsLicenseUI(info, STATUS);
    loadSettings();
  });
  
  // Deactivate license button (settings screen)
  deactivateLicenseBtn.addEventListener('click', async () => {
    const confirmMsg = L('confirmDeactivate', currentLang) || 'Nonaktifkan license? Anda dapat mengaktifkan kembali di perangkat lain.';
    if (!confirm(confirmMsg)) return;
    
    deactivateLicenseBtn.disabled = true;
    
    try {
      const result = await window.LicenseManager.deactivate();
      
      if (result.success) {
        showStatus('✅ ' + (L('licenseDeactivated', currentLang) || 'License dinonaktifkan'), 'success');
        setTimeout(() => {
          showLicenseScreen();
          initializeLicenseCheck();
        }, 1500);
      } else {
        showStatus('❌ ' + (result.error || 'Gagal menonaktifkan'), 'error');
      }
    } catch (err) {
      showStatus('❌ ' + err.message, 'error');
    }
    
    deactivateLicenseBtn.disabled = false;
  });


  // ========== SETTINGS SCREEN LOGIC ==========
  
  async function loadSettings() {
    const settings = await chrome.storage.sync.get([
      'provider', 'apiKey', 'model', 'language', 'openaiApiKey', 'deepseekApiKey'
    ]);
    
    if (settings.provider) providerSelect.value = settings.provider;
    if (settings.apiKey) apiKeyInput.value = settings.apiKey;
    if (settings.openaiApiKey) openaiApiKeyInput.value = settings.openaiApiKey;
    if (settings.deepseekApiKey) deepseekApiKeyInput.value = settings.deepseekApiKey;
    if (settings.language) {
      languageSelect.value = settings.language;
      currentLang = settings.language;
    }
    
    if (settings.model) {
      geminiModelSelect.value = settings.model;
      openaiModelSelect.value = settings.model;
      deepseekModelSelect.value = settings.model;
    }
    
    showProviderSettings(settings.provider || 'gemini');
    updateUI();
  }

  function showProviderSettings(provider) {
    geminiSettings.style.display = 'none';
    openaiSettings.style.display = 'none';
    deepseekSettings.style.display = 'none';

    if (provider === 'gemini') {
      geminiSettings.style.display = 'block';
    } else if (provider === 'openai') {
      openaiSettings.style.display = 'block';
    } else if (provider === 'deepseek') {
      deepseekSettings.style.display = 'block';
    }
  }

  function updateUI() {
    const appTitle = document.getElementById('appTitle');
    const appSubtitle = document.getElementById('appSubtitle');
    if (appTitle) {
      const textSpan = appTitle.querySelector('span');
      if (textSpan) textSpan.textContent = L('appName', currentLang);
    }
    if (appSubtitle) appSubtitle.textContent = L('appSubtitle', currentLang);
    
    if (saveBtn) saveBtn.textContent = L('saveSettings', currentLang);
    
    const providerSectionTitle = document.getElementById('providerSectionTitle');
    const langSectionTitle = document.getElementById('langSectionTitle');
    if (providerSectionTitle) providerSectionTitle.textContent = L('aiProvider', currentLang);
    if (langSectionTitle) langSectionTitle.textContent = L('defaultLanguage', currentLang);
    
    // Gemini section
    const geminiSectionTitle = document.getElementById('geminiSectionTitle');
    const geminiApiKeyLabel = document.getElementById('geminiApiKeyLabel');
    const geminiModelLabel = document.getElementById('geminiModelLabel');
    if (geminiSectionTitle) geminiSectionTitle.textContent = 'Gemini ' + L('apiKey', currentLang);
    if (geminiApiKeyLabel) geminiApiKeyLabel.textContent = L('apiKey', currentLang);
    if (geminiModelLabel) geminiModelLabel.textContent = L('model', currentLang);
    
    // OpenAI section
    const openaiSectionTitle = document.getElementById('openaiSectionTitle');
    const openaiApiKeyLabel = document.getElementById('openaiApiKeyLabel');
    const openaiModelLabel = document.getElementById('openaiModelLabel');
    if (openaiSectionTitle) openaiSectionTitle.textContent = 'OpenAI ' + L('apiKey', currentLang);
    if (openaiApiKeyLabel) openaiApiKeyLabel.textContent = L('apiKey', currentLang);
    if (openaiModelLabel) openaiModelLabel.textContent = L('model', currentLang);
    
    // DeepSeek section
    const deepseekSectionTitle = document.getElementById('deepseekSectionTitle');
    const deepseekApiKeyLabel = document.getElementById('deepseekApiKeyLabel');
    const deepseekModelLabel = document.getElementById('deepseekModelLabel');
    if (deepseekSectionTitle) deepseekSectionTitle.textContent = 'DeepSeek ' + L('apiKey', currentLang);
    if (deepseekApiKeyLabel) deepseekApiKeyLabel.textContent = L('apiKey', currentLang);
    if (deepseekModelLabel) deepseekModelLabel.textContent = L('model', currentLang);
    
    // Test buttons
    if (testGeminiBtn) testGeminiBtn.innerHTML = '🔗 ' + L('testConnection', currentLang);
    if (testOpenaiBtn) testOpenaiBtn.innerHTML = '🔗 ' + L('testConnection', currentLang);
    if (testDeepseekBtn) testDeepseekBtn.innerHTML = '🔗 ' + L('testConnection', currentLang);
    
    // Get API Key links
    const geminiGetKeyLink = document.querySelector('#gemini-settings a[href*="aistudio"]');
    const openaiGetKeyLink = document.querySelector('#openai-settings a[href*="openai"]');
    const deepseekGetKeyLink = document.querySelector('#deepseek-settings a[href*="deepseek"]');
    if (geminiGetKeyLink) geminiGetKeyLink.innerHTML = '🔑 ' + L('getApiKey', currentLang);
    if (openaiGetKeyLink) openaiGetKeyLink.innerHTML = '🔑 ' + L('getApiKey', currentLang);
    if (deepseekGetKeyLink) deepseekGetKeyLink.innerHTML = '🔑 ' + L('getApiKey', currentLang);
    
    // Backup section
    const backupSectionTitle = document.getElementById('backupSectionTitle');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    if (backupSectionTitle) backupSectionTitle.innerHTML = '⚙️ ' + L('backupRestore', currentLang);
    if (exportBtn) exportBtn.innerHTML = '📤 ' + L('export', currentLang);
    if (importBtn) importBtn.innerHTML = '📥 ' + L('import', currentLang);
    
    // License section
    const licenseSectionTitle = document.getElementById('licenseSectionTitle');
    if (licenseSectionTitle) licenseSectionTitle.innerHTML = '🔐 ' + L('license', currentLang);
  }

  providerSelect.addEventListener('change', () => {
    showProviderSettings(providerSelect.value);
  });

  languageSelect.addEventListener('change', () => {
    currentLang = languageSelect.value;
    updateUI();
  });

  function showStatus(message, type = '', provider = null) {
    let targetDiv = statusDiv;
    if (provider === 'gemini') targetDiv = document.getElementById('gemini-status');
    else if (provider === 'openai') targetDiv = document.getElementById('openai-status');
    else if (provider === 'deepseek') targetDiv = document.getElementById('deepseek-status');
    
    if (!targetDiv) targetDiv = statusDiv;
    if (!targetDiv) return;
    
    targetDiv.textContent = message;
    targetDiv.className = 'status ' + type;
    targetDiv.style.display = 'block';
    setTimeout(() => targetDiv.style.display = 'none', 4000);
  }

  saveBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const language = languageSelect.value;
    
    const apiKey = apiKeyInput.value.trim();
    const openaiApiKey = openaiApiKeyInput.value.trim();
    const deepseekApiKey = deepseekApiKeyInput.value.trim();
    
    let model = '';
    if (provider === 'gemini') {
      model = geminiModelSelect.value;
      if (!apiKey) {
        showStatus(L('pleaseEnterApiKey', currentLang) + ' (Gemini)', 'error');
        return;
      }
    } else if (provider === 'openai') {
      model = openaiModelSelect.value;
      if (!openaiApiKey) {
        showStatus(L('pleaseEnterApiKey', currentLang) + ' (OpenAI)', 'error');
        return;
      }
    } else if (provider === 'deepseek') {
      model = deepseekModelSelect.value;
      if (!deepseekApiKey) {
        showStatus(L('pleaseEnterApiKey', currentLang) + ' (DeepSeek)', 'error');
        return;
      }
    }

    await chrome.storage.sync.set({ provider, apiKey, openaiApiKey, deepseekApiKey, model, language });
    
    currentLang = language;
    updateUI();
    showStatus('✅ ' + L('settingsSaved', currentLang), 'success', null);
  });


  // Test buttons
  testGeminiBtn.addEventListener('click', async () => {
    testGeminiBtn.disabled = true;
    testGeminiBtn.innerHTML = '⏳ ' + L('testing', currentLang);
    try {
      await testGemini();
    } catch (err) {
      showStatus(L('error', currentLang) + ': ' + err.message, 'error', 'gemini');
    }
    testGeminiBtn.disabled = false;
    testGeminiBtn.innerHTML = '🔗 ' + L('testConnection', currentLang);
  });

  testOpenaiBtn.addEventListener('click', async () => {
    testOpenaiBtn.disabled = true;
    testOpenaiBtn.innerHTML = '⏳ ' + L('testing', currentLang);
    try {
      await testOpenAI();
    } catch (err) {
      showStatus(L('error', currentLang) + ': ' + err.message, 'error', 'openai');
    }
    testOpenaiBtn.disabled = false;
    testOpenaiBtn.innerHTML = '🔗 ' + L('testConnection', currentLang);
  });

  testDeepseekBtn.addEventListener('click', async () => {
    testDeepseekBtn.disabled = true;
    testDeepseekBtn.innerHTML = '⏳ ' + L('testing', currentLang);
    try {
      await testDeepSeek();
    } catch (err) {
      showStatus(L('error', currentLang) + ': ' + err.message, 'error', 'deepseek');
    }
    testDeepseekBtn.disabled = false;
    testDeepseekBtn.innerHTML = '🔗 ' + L('testConnection', currentLang);
  });

  async function testGemini() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus(L('pleaseEnterApiKey', currentLang), 'error', 'gemini');
      return;
    }
    const model = geminiModelSelect.value;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "OK"' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (response.ok) {
      showStatus('✅ ' + L('connectionSuccess', currentLang), 'success', 'gemini');
    } else {
      const error = await response.json();
      showStatus('❌ ' + (error.error?.message || L('connectionFailed', currentLang)), 'error', 'gemini');
    }
  }

  async function testOpenAI() {
    const apiKey = openaiApiKeyInput.value.trim();
    if (!apiKey) {
      showStatus(L('pleaseEnterApiKey', currentLang), 'error', 'openai');
      return;
    }
    const model = openaiModelSelect.value;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 10
      })
    });

    if (response.ok) {
      showStatus('✅ ' + L('connectionSuccess', currentLang), 'success', 'openai');
    } else {
      const error = await response.json();
      showStatus('❌ ' + (error.error?.message || L('connectionFailed', currentLang)), 'error', 'openai');
    }
  }

  async function testDeepSeek() {
    const apiKey = deepseekApiKeyInput.value.trim();
    if (!apiKey) {
      showStatus(L('pleaseEnterApiKey', currentLang), 'error', 'deepseek');
      return;
    }
    const model = deepseekModelSelect.value;
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 10
      })
    });

    if (response.ok) {
      showStatus('✅ ' + L('connectionSuccess', currentLang), 'success', 'deepseek');
    } else {
      const error = await response.json();
      showStatus('❌ ' + (error.error?.message || L('connectionFailed', currentLang)), 'error', 'deepseek');
    }
  }

  // ========== EXPORT/IMPORT ==========
  
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  
  exportBtn.addEventListener('click', async () => {
    try {
      const allSettings = await chrome.storage.sync.get(null);
      const exportData = {
        _meta: {
          app: 'YouTube Studio Assistant',
          version: '1.0.0',
          exportDate: new Date().toISOString()
        },
        settings: allSettings
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yt-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus('📤 ' + (L('exportSuccess', currentLang) || 'Settings exported!'), 'success');
    } catch (err) {
      showStatus('❌ Export failed: ' + err.message, 'error');
    }
  });
  
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.settings) {
        throw new Error('Invalid backup file format');
      }
      
      const confirmMsg = L('confirmImport', currentLang) || 'Import settings? This will overwrite current settings.';
      if (!confirm(confirmMsg)) {
        importFile.value = '';
        return;
      }
      
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(importData.settings);
      
      showStatus('📥 ' + (L('importSuccess', currentLang) || 'Settings imported! Reloading...'), 'success');
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showStatus('❌ Import failed: ' + err.message, 'error');
    }
    
    importFile.value = '';
  });

  // ========== INITIALIZE ==========
  initializeLicenseCheck();
});


  // ========== THEME HANDLING ==========
  
  const themeSelect = document.getElementById('themeSelect');
  
  // Load and apply current theme
  async function loadAndApplyTheme() {
    const settings = await chrome.storage.sync.get(['appTheme']);
    const currentTheme = settings.appTheme || 'light';
    
    // Apply dark/light class to body
    const isDark = currentTheme === 'darkPro';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    
    // Update dropdown
    if (themeSelect) {
      themeSelect.value = currentTheme;
    }
  }
  
  // Theme dropdown change handler
  if (themeSelect) {
    themeSelect.addEventListener('change', async () => {
      const themeName = themeSelect.value;
      
      // Save theme
      await chrome.storage.sync.set({ appTheme: themeName });
      
      // Apply dark/light class to body
      const isDark = themeName === 'darkPro';
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
      
      // Notify content script to update theme
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'themeChanged', theme: themeName });
        }
      });
    });
  }
  
  // Load theme on popup open
  loadAndApplyTheme();
