// UI Builder with translations - Modern Orange Theme
function buildTitleUI(lang = 'en') {
  const _ = (key) => t(key, lang);
  
  return {
    buttonsBar: ``,
    
    settingsPanel: `
      <div class="yt-assistant-settings-panel">
        <!-- Header with Button -->
        <div style="position: relative; text-align: center; margin-bottom: 20px;">
          <button class="yt-assistant-btn yt-assistant-btn-primary" id="yt-generate-title-btn">
            <span class="yt-btn-icon">✦</span>
            <span>${_('generateTitle')}</span>
          </button>
          <span id="yt-title-status" class="yt-assistant-status" style="display: none; position: absolute; right: 0; top: 50%; transform: translateY(-50%);"></span>
        </div>
        
        <!-- Settings Grid -->
        <div class="yt-assistant-settings-grid">
          <div>
            <label class="yt-assistant-label">✏️ ${_('writingStyle')}</label>
            <select id="yt-title-style" class="yt-assistant-select">
              <option value="viral">${_('viral')}</option>
              <option value="clickbait">${_('clickbait') || 'Clickbait'}</option>
              <option value="seo">${_('seo')}</option>
              <option value="pro">${_('professional')}</option>
              <option value="casual">${_('casual')}</option>
            </select>
          </div>
          
          <div>
            <label class="yt-assistant-label">👥 ${_('audience')}</label>
            <select id="yt-title-audience" class="yt-assistant-select">
              <option value="general">${_('general')}</option>
              <option value="kids">${_('kids')}</option>
              <option value="teens">${_('teens')}</option>
              <option value="adults">${_('adults')}</option>
            </select>
          </div>
          
          <div>
            <label class="yt-assistant-label">🔤 ${_('length')}</label>
            <select id="yt-title-length" class="yt-assistant-select">
              <option value="auto">${_('auto')}</option>
              <option value="short">${_('short')}</option>
              <option value="medium">${_('medium')}</option>
              <option value="long">${_('long')}</option>
            </select>
          </div>
          
          <div>
            <label class="yt-assistant-label">🌍 ${_('titleLanguage') || 'Title Language'}</label>
            <select id="yt-title-language" class="yt-assistant-select">
              <option value="auto">${_('auto')} (${_('detectFromVideo') || 'Detect from video'})</option>
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="es">Español</option>
              <option value="pt">Português</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="zh">中文</option>
              <option value="ar">العربية</option>
              <option value="hi">हिन्दी</option>
              <option value="ru">Русский</option>
              <option value="th">ไทย</option>
              <option value="vi">Tiếng Việt</option>
              <option value="tr">Türkçe</option>
              <option value="pl">Polski</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>
          
          <div>
            <label class="yt-assistant-label">🔑 ${_('mainKeyword')}</label>
            <input type="text" id="yt-title-keyword" placeholder="${_('optional')}" class="yt-assistant-input" style="width: 100%; box-sizing: border-box;">
          </div>
          
          <div style="display: flex; align-items: flex-end; padding-bottom: 4px;">
            <label class="yt-assistant-checkbox" style="margin: 0;">
              <input type="checkbox" id="yt-title-emoji" checked>
              <span>🔥 ${_('emoji')}</span>
            </label>
          </div>
        </div>
      </div>
    `
  };
}

function buildDescriptionUI(lang = 'en') {
  const _ = (key) => t(key, lang);
  
  return {
    buttonsBar: ``,
    
    settingsPanel: `
      <div class="yt-assistant-settings-panel">
        <!-- Header with Button -->
        <div style="position: relative; text-align: center; margin-bottom: 20px;">
          <button class="yt-assistant-btn yt-assistant-btn-primary" id="yt-generate-desc-btn">
            <span class="yt-btn-icon">📝</span>
            <span>${_('generateDescription')}</span>
          </button>
          <span id="yt-desc-status" class="yt-assistant-status" style="display: none; position: absolute; right: 0; top: 50%; transform: translateY(-50%);"></span>
        </div>
        
        <!-- Settings Grid -->
        <div class="yt-assistant-settings-grid">
          <div>
            <label class="yt-assistant-label">✏️ ${_('writingStyle')}</label>
            <select id="yt-desc-style" class="yt-assistant-select">
              <option value="informative">${_('informative')}</option>
              <option value="engaging">${_('engaging')}</option>
              <option value="professional">${_('professional')}</option>
              <option value="casual">${_('casual')}</option>
            </select>
          </div>
          
          <div>
            <label class="yt-assistant-label">📏 ${_('descriptionLength')}</label>
            <select id="yt-desc-length" class="yt-assistant-select">
              <option value="short">${_('short')} (100)</option>
              <option value="medium" selected>${_('medium')} (200)</option>
              <option value="long">${_('long')} (400)</option>
            </select>
          </div>
        </div>
        
        <!-- Checkbox Row -->
        <div class="yt-assistant-settings-row">
          <label class="yt-assistant-checkbox">
            <input type="checkbox" id="yt-desc-emoji" checked>
            <span>🔥 ${_('emoji')}</span>
          </label>
          <label class="yt-assistant-checkbox">
            <input type="checkbox" id="yt-desc-hashtags" checked>
            <span>#️⃣ ${_('includeHashtags')}</span>
          </label>
          <label class="yt-assistant-checkbox">
            <input type="checkbox" id="yt-desc-cta" checked>
            <span>📢 ${_('includeCTA')}</span>
          </label>
        </div>
      </div>
    `
  };
}

function buildTagsUI(lang = 'en') {
  const _ = (key) => t(key, lang);
  
  return {
    buttonsBar: ``,
    
    settingsPanel: `
      <div class="yt-assistant-settings-panel">
        <!-- Header with Button -->
        <div style="position: relative; text-align: center; margin-bottom: 20px;">
          <button class="yt-assistant-btn yt-assistant-btn-primary" id="yt-generate-tags-btn">
            <span class="yt-btn-icon">🏷️</span>
            <span>${_('generateTags')}</span>
          </button>
          <span id="yt-tags-status" class="yt-assistant-status" style="display: none; position: absolute; right: 0; top: 50%; transform: translateY(-50%);"></span>
        </div>
        
        <!-- Settings Grid -->
        <div class="yt-assistant-settings-grid">
          <div>
            <label class="yt-assistant-label">🔢 ${_('numberOfTags')}</label>
            <select id="yt-tags-count" class="yt-assistant-select">
              <option value="10">10 ${_('tags')}</option>
              <option value="20" selected>20 ${_('tags')}</option>
              <option value="30">30 ${_('tags')}</option>
              <option value="50">50 ${_('tags')}</option>
            </select>
          </div>
          
          <div>
            <label class="yt-assistant-label">🌍 ${_('tagLanguage')}</label>
            <select id="yt-tags-language" class="yt-assistant-select">
              <option value="mixed">${_('mixed')}</option>
              <option value="english">${_('englishOnly')}</option>
              <option value="local">${_('localOnly')}</option>
            </select>
          </div>
        </div>
        
        <!-- Checkbox Row -->
        <div class="yt-assistant-settings-row">
          <label class="yt-assistant-checkbox">
            <input type="checkbox" id="yt-tags-longtail" checked>
            <span>📊 ${_('includeLongTail')}</span>
          </label>
        </div>
      </div>
    `
  };
}
