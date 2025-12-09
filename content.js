// YouTube Studio Assistant - Content Script (Gemini AI)
(function () {
  'use strict';

  let isInitialized = false;
  let currentLang = 'en'; // Default language

  // Get current language from storage
  async function getCurrentLanguage() {
    const settings = await chrome.storage.sync.get(['language']);
    currentLang = settings.language || 'en';
    return currentLang;
  }
  
  // Current theme
  let currentThemeName = 'light';
  
  // Load and apply theme from storage
  async function loadAndApplyTheme() {
    const settings = await chrome.storage.sync.get(['appTheme']);
    currentThemeName = settings.appTheme || 'light';
    
    if (window.ThemeManager) {
      const theme = window.ThemeManager.getTheme(currentThemeName);
      injectThemeCSS(theme);
      // Apply theme class to body
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(theme.isDark ? 'theme-dark' : 'theme-light');
    }
    return currentThemeName;
  }
  
  // Inject theme CSS variables into page
  function injectThemeCSS(theme) {
    // Remove existing theme style
    const existingStyle = document.getElementById('yt-assistant-theme-css');
    if (existingStyle) existingStyle.remove();
    
    const style = document.createElement('style');
    style.id = 'yt-assistant-theme-css';
    style.textContent = `
      :root {
        --yt-assist-primary: ${theme.colors.primary};
        --yt-assist-primary-dark: ${theme.colors.primaryDark};
        --yt-assist-primary-light: ${theme.colors.primaryLight};
        --yt-assist-secondary: ${theme.colors.secondary};
        --yt-assist-background: ${theme.colors.background};
        --yt-assist-background-dark: ${theme.colors.backgroundDark};
        --yt-assist-surface: ${theme.colors.surface};
        --yt-assist-surface-light: ${theme.colors.surfaceLight || theme.colors.surface};
        --yt-assist-text: ${theme.colors.text};
        --yt-assist-text-light: ${theme.colors.textLight};
        --yt-assist-text-muted: ${theme.colors.textMuted || theme.colors.textLight};
        --yt-assist-border: ${theme.colors.border};
        --yt-assist-border-light: ${theme.colors.borderLight || theme.colors.border};
        --yt-assist-success: ${theme.colors.success};
        --yt-assist-error: ${theme.colors.error};
        --yt-assist-warning: ${theme.colors.warning};
        
        --yt-assist-gradient-primary: ${theme.gradients.primary};
        --yt-assist-gradient-header: ${theme.gradients.header};
        --yt-assist-gradient-button: ${theme.gradients.button};
        --yt-assist-gradient-background: ${theme.gradients.background};
        --yt-assist-gradient-card: ${theme.gradients.card || theme.gradients.background};
        --yt-assist-is-dark: ${theme.isDark ? '1' : '0'};
      }
    `;
    document.head.appendChild(style);
  }
  
  // Listen for theme change messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'themeChanged') {
      currentThemeName = request.theme;
      if (window.ThemeManager) {
        const theme = window.ThemeManager.getTheme(request.theme);
        injectThemeCSS(theme);
        // Apply theme class to body
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(theme.isDark ? 'theme-dark' : 'theme-light');
        // Re-inject UI to apply new theme
        reinjectUIWithTheme();
      }
      sendResponse({ success: true });
    }
  });
  
  // Re-inject UI components with new theme
  function reinjectUIWithTheme() {
    // Remove and re-inject panels to apply new theme
    const existingPanels = document.querySelectorAll('.yt-assistant-panel, .yt-multi-lang-panel');
    existingPanels.forEach(panel => panel.remove());
    
    // Re-inject
    setTimeout(() => {
      injectVideoDetailsButtons();
      injectMultiLanguageSection();
    }, 100);
  }
  
  // License check helper - returns true if feature is available
  async function checkLicenseForFeature(featureName = 'all', inlineElement = null) {
    try {
      if (window.LicenseManager) {
        const result = await window.LicenseManager.isFeatureAvailable(featureName);
        if (!result.available) {
          const STATUS = window.LicenseManager.STATUS;
          let message = '';
          if (result.status.status === STATUS.TRIAL_EXPIRED) {
            message = '⚠️ ' + (t('trialExpiredMsg', currentLang) || 'Trial expired! Please purchase a license.');
          } else if (result.status.status === STATUS.EXPIRED) {
            message = '⚠️ ' + (t('licenseExpiredMsg', currentLang) || 'License expired! Please renew.');
          } else {
            message = '🔒 ' + (t('pleaseActivateLicense', currentLang) || 'Please activate a license to use this feature.');
          }
          
          // Show inline if element provided, otherwise toast
          if (inlineElement) {
            showInlineLicenseError(inlineElement, message);
          } else {
            showToast(message, true);
          }
          return false;
        }
        return true;
      }
      // If LicenseManager not loaded, allow (fallback)
      return true;
    } catch (err) {
      console.error('[YT Assistant] License check error:', err);
      return true; // Allow on error to not block users
    }
  }
  
  // Show inline license error in panel
  function showInlineLicenseError(container, message) {
    // Remove existing error if any
    const existingError = container.querySelector('.license-inline-error');
    if (existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'license-inline-error';
    errorDiv.style.cssText = `
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 10px 0;
      text-align: center;
      font-size: 13px;
      color: #991b1b;
    `;
    errorDiv.innerHTML = `
      <div style="margin-bottom: 8px;">${message}</div>
      <a href="https://www.aicreativs.com/buy/50e498d3-1c17-44d6-af78-30302204d551" target="_blank" 
         style="display: inline-block; background: #f97316; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px;">
        🛒 Buy License
      </a>
    `;
    
    // Insert at the top of container
    if (container.firstChild) {
      container.insertBefore(errorDiv, container.firstChild);
    } else {
      container.appendChild(errorDiv);
    }
  }
  
  // Update generate buttons based on license status
  async function updateGenerateButtonsLicenseStatus() {
    try {
      if (!window.LicenseManager) return;
      
      const result = await window.LicenseManager.isFeatureAvailable('all');
      const isLicensed = result.available;
      
      // Find all generate buttons
      const generateBtns = document.querySelectorAll('#yt-generate-title-btn, #yt-generate-desc-btn, #yt-generate-tags-btn');
      
      generateBtns.forEach(btn => {
        if (!isLicensed) {
          // Disable button and change text
          btn.disabled = true;
          btn.style.opacity = '0.6';
          btn.style.cursor = 'not-allowed';
          const textSpan = btn.querySelector('span:last-child');
          if (textSpan) {
            textSpan.textContent = t('pleaseActivateLicense', currentLang) || 'Please Activate License';
          }
          // Add click handler to show buy link
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open('https://www.aicreativs.com/buy/50e498d3-1c17-44d6-af78-30302204d551', '_blank');
          };
        }
      });
    } catch (err) {
      console.error('[YT Assistant] License button update error:', err);
    }
  }

  // Translation helper
  function __(key) {
    return t(key, currentLang);
  }

  // Toast with translation
  function showToastT(key, isError = false) {
    showToast(__(key), isError);
  }

  // Language detection from text content
  function detectLanguage(text) {
    if (!text || text.trim() === '') return 'en';
    
    // Normalize text for detection
    const lowerText = text.toLowerCase();
    
    // Chinese characters
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
    // Japanese (Hiragana + Katakana)
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    // Korean
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    // Russian/Cyrillic
    if (/[а-яА-Я]/.test(text)) return 'ru';
    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    // Thai
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    // Vietnamese (with diacritics)
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) return 'vi';
    
    // Indonesian - expanded word list for better detection
    // Common words + YouTube title words + verbs + adjectives
    const indonesianWords = [
      // Common words
      'dan', 'yang', 'untuk', 'dengan', 'ini', 'itu', 'adalah', 'akan', 'bisa', 'tidak', 
      'ada', 'saya', 'kamu', 'sudah', 'belum', 'juga', 'atau', 'karena', 'sangat', 'lebih',
      'banyak', 'dari', 'ke', 'di', 'pada', 'oleh', 'apa', 'siapa', 'bagaimana', 'mengapa',
      // YouTube title words
      'cara', 'tutorial', 'review', 'unboxing', 'terbaru', 'terbaik', 'termurah', 'gratis',
      'rahasia', 'tips', 'trik', 'mudah', 'cepat', 'gampang', 'simpel', 'lengkap',
      'wajib', 'harus', 'jangan', 'sampai', 'ketinggalan', 'banget', 'parah', 'gila',
      'kejutan', 'heboh', 'viral', 'trending', 'populer', 'hits', 'keren', 'mantap',
      // Verbs
      'buat', 'bikin', 'dapat', 'dapatkan', 'lihat', 'tonton', 'coba', 'cobain',
      'beli', 'jual', 'harga', 'murah', 'mahal', 'diskon', 'promo', 'sale',
      'jatuh', 'naik', 'turun', 'drastis', 'melonjak', 'anjlok',
      // Adjectives
      'baru', 'lama', 'bagus', 'jelek', 'cantik', 'ganteng', 'lucu', 'sedih',
      'senang', 'marah', 'takut', 'berani', 'pintar', 'bodoh', 'kaya', 'miskin',
      // Question words
      'kenapa', 'gimana', 'kapan', 'dimana', 'kemana', 'berapa',
      // Pronouns
      'aku', 'kita', 'kami', 'mereka', 'dia', 'kalian', 'gue', 'gw', 'lo', 'lu',
      // Time words
      'hari', 'minggu', 'bulan', 'tahun', 'sekarang', 'nanti', 'kemarin', 'besok',
      // Numbers in Indonesian context
      'ribu', 'juta', 'miliar', 'rupiah', 'rp'
    ];
    const idPattern = new RegExp('\\b(' + indonesianWords.join('|') + ')\\b', 'i');
    if (idPattern.test(lowerText)) return 'id';
    
    // Malay - similar to Indonesian but with distinct words
    const malayWords = ['saya', 'awak', 'kamu', 'anda', 'mereka', 'kami', 'kita', 'hendak', 'mahu', 'boleh', 'perlu', 'harus', 'sedang', 'telah', 'akan', 'sudah', 'belum', 'masih', 'sahaja', 'pun', 'lagi', 'juga', 'tetapi', 'namun', 'walau', 'kerana', 'sebab', 'oleh', 'untuk', 'kepada', 'daripada', 'dengan', 'tanpa', 'dalam', 'luar', 'atas', 'bawah', 'sini', 'sana', 'mana', 'bila', 'bagaimana', 'mengapa', 'siapa', 'apa'];
    const msPattern = new RegExp('\\b(' + malayWords.join('|') + ')\\b', 'i');
    if (msPattern.test(lowerText)) return 'ms';
    
    // Spanish common words
    if (/\b(el|la|los|las|un|una|de|en|que|y|es|por|con|para|como|más|pero|su|todo|esta|esto|ese|esa|muy|bien|mal|ahora|siempre|nunca|también|porque|cuando|donde|quien|cual|sin|sobre|entre|hasta|desde|durante|mediante|según|hacia|contra|tras)\b/i.test(lowerText)) return 'es';
    // German common words
    if (/\b(der|die|das|und|ist|von|zu|den|mit|sich|des|auf|für|nicht|ein|eine|dem|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|einem|eines|noch|wie|einem|sein|über|so|zum|kann|nur|ihr|seine|oder|diese|dieser|dieses|wenn|mehr|am|durch|schon|vor|immer|sehr|hier|doch|vom|haben|andere|anderen|anderem|anderer|anderes|machen|macht|gemacht|gehen|geht|gegangen|kommen|kommt|gekommen|sehen|sieht|gesehen|wissen|weiß|gewusst|müssen|muss|gemusst|können|konnte|gekonnt|wollen|will|gewollt|sollen|soll|gesollt|dürfen|darf|gedurft|mögen|mag|gemocht)\b/i.test(lowerText)) return 'de';
    // French common words
    if (/\b(le|la|les|de|du|des|un|une|et|est|en|que|qui|dans|ce|il|elle|ne|pas|plus|pour|sur|avec|tout|tous|toute|toutes|son|sa|ses|leur|leurs|mon|ma|mes|ton|ta|tes|notre|nos|votre|vos|je|tu|nous|vous|ils|elles|on|se|lui|eux|moi|toi|soi|y|dont|où|quand|comment|pourquoi|quel|quelle|quels|quelles|si|mais|ou|donc|car|ni|parce|comme|très|bien|mal|peu|beaucoup|trop|assez|aussi|encore|déjà|toujours|jamais|souvent|parfois|maintenant|hier|demain|aujourd|ici|là|voici|voilà|être|avoir|faire|dire|aller|voir|savoir|pouvoir|vouloir|devoir|falloir|venir|prendre|mettre|partir|sortir|entrer|rester|passer|donner|trouver|parler|aimer|manger|boire|dormir|vivre|mourir|naître|croire|connaître|paraître|plaire|lire|écrire|ouvrir|offrir|recevoir|tenir|suivre|servir|sentir|courir|fuir|cueillir|acquérir|mourir)\b/i.test(lowerText)) return 'fr';
    // Portuguese common words
    if (/\b(o|a|os|as|um|uma|de|em|que|e|é|por|com|para|como|mais|mas|seu|sua|todo|esta|esse|essa|isso|isto|aquele|aquela|aquilo|muito|bem|mal|agora|sempre|nunca|também|porque|quando|onde|quem|qual|sem|sobre|entre|até|desde|durante|mediante|segundo|conforme|perante|após|contra|através|além|aquém|dentro|fora|acima|abaixo|antes|depois|junto|perto|longe|diante|atrás|frente|lado|meio|redor|volta|cima|baixo|dentro|fora|aqui|ali|aí|lá|cá|onde|aonde|donde|quando|como|porque|porquê|quanto|quanta|quantos|quantas|qual|quais|quem|cujo|cuja|cujos|cujas)\b/i.test(lowerText)) return 'pt';
    
    // Default to English
    return 'en';
  }

  // ========== CUSTOM LANGUAGE MANAGEMENT ==========
  
  // Complete YouTube supported languages database
  // Complete YouTube supported languages (80+ languages)
  const ALL_LANGUAGES = {
    // English variants
    'en': { name: 'English (US)', flag: '🇺🇸' },
    'en-GB': { name: 'English (UK)', flag: '🇬🇧' },
    'en-AU': { name: 'English (Australia)', flag: '🇦🇺' },
    'en-CA': { name: 'English (Canada)', flag: '🇨🇦' },
    'en-IE': { name: 'English (Ireland)', flag: '🇮🇪' },
    'en-IN': { name: 'English (India)', flag: '🇮🇳' },
    'en-NZ': { name: 'English (New Zealand)', flag: '🇳🇿' },
    'en-SG': { name: 'English (Singapore)', flag: '🇸🇬' },
    'en-ZA': { name: 'English (South Africa)', flag: '🇿🇦' },
    // Southeast Asian
    'id': { name: 'Indonesian', flag: '🇮🇩' },
    'ms': { name: 'Malay', flag: '🇲🇾' },
    'tl': { name: 'Filipino/Tagalog', flag: '🇵🇭' },
    'vi': { name: 'Vietnamese', flag: '🇻🇳' },
    'th': { name: 'Thai', flag: '🇹🇭' },
    'my': { name: 'Burmese/Myanmar', flag: '🇲🇲' },
    'km': { name: 'Khmer', flag: '🇰🇭' },
    'lo': { name: 'Lao', flag: '🇱🇦' },
    'jv': { name: 'Javanese', flag: '🇮🇩' },
    'su': { name: 'Sundanese', flag: '🇮🇩' },
    // East Asian
    'ja': { name: 'Japanese', flag: '🇯🇵' },
    'ko': { name: 'Korean', flag: '🇰🇷' },
    'zh-Hans': { name: 'Chinese (Simplified)', flag: '🇨🇳' },
    'zh-Hant': { name: 'Chinese (Traditional)', flag: '🇹🇼' },
    'zh-HK': { name: 'Chinese (Hong Kong)', flag: '🇭🇰' },
    'mn': { name: 'Mongolian', flag: '🇲🇳' },
    // South Asian
    'hi': { name: 'Hindi', flag: '🇮🇳' },
    'bn': { name: 'Bengali', flag: '🇧🇩' },
    'pa': { name: 'Punjabi', flag: '🇮🇳' },
    'gu': { name: 'Gujarati', flag: '🇮🇳' },
    'ta': { name: 'Tamil', flag: '🇮🇳' },
    'te': { name: 'Telugu', flag: '🇮🇳' },
    'kn': { name: 'Kannada', flag: '🇮🇳' },
    'ml': { name: 'Malayalam', flag: '🇮🇳' },
    'mr': { name: 'Marathi', flag: '🇮🇳' },
    'or': { name: 'Odia', flag: '🇮🇳' },
    'as': { name: 'Assamese', flag: '🇮🇳' },
    'ne': { name: 'Nepali', flag: '🇳🇵' },
    'si': { name: 'Sinhala', flag: '🇱🇰' },
    'ur': { name: 'Urdu', flag: '🇵🇰' },
    // Middle Eastern
    'ar': { name: 'Arabic', flag: '🇸🇦' },
    'fa': { name: 'Persian/Farsi', flag: '🇮🇷' },
    'he': { name: 'Hebrew', flag: '🇮🇱' },
    'tr': { name: 'Turkish', flag: '🇹🇷' },
    'ku': { name: 'Kurdish', flag: '🇮🇶' },
    // European - Western
    'fr': { name: 'French', flag: '🇫🇷' },
    'fr-CA': { name: 'French (Canada)', flag: '🇨🇦' },
    'de': { name: 'German', flag: '🇩🇪' },
    'de-AT': { name: 'German (Austria)', flag: '🇦🇹' },
    'de-CH': { name: 'German (Switzerland)', flag: '🇨🇭' },
    'nl': { name: 'Dutch', flag: '🇳🇱' },
    'nl-BE': { name: 'Dutch (Belgium)', flag: '🇧🇪' },
    // European - Southern
    'es': { name: 'Spanish (Spain)', flag: '🇪🇸' },
    'es-419': { name: 'Spanish (Latin America)', flag: '🇲🇽' },
    'es-US': { name: 'Spanish (US)', flag: '🇺🇸' },
    'pt': { name: 'Portuguese (Portugal)', flag: '🇵🇹' },
    'pt-BR': { name: 'Portuguese (Brazil)', flag: '🇧🇷' },
    'it': { name: 'Italian', flag: '🇮🇹' },
    'ca': { name: 'Catalan', flag: '🇪🇸' },
    'gl': { name: 'Galician', flag: '🇪🇸' },
    'eu': { name: 'Basque', flag: '🇪🇸' },
    'el': { name: 'Greek', flag: '🇬🇷' },
    'mt': { name: 'Maltese', flag: '🇲🇹' },
    // European - Northern
    'sv': { name: 'Swedish', flag: '🇸🇪' },
    'no': { name: 'Norwegian', flag: '🇳🇴' },
    'da': { name: 'Danish', flag: '🇩🇰' },
    'fi': { name: 'Finnish', flag: '🇫🇮' },
    'is': { name: 'Icelandic', flag: '🇮🇸' },
    // European - Eastern
    'pl': { name: 'Polish', flag: '🇵🇱' },
    'cs': { name: 'Czech', flag: '🇨🇿' },
    'sk': { name: 'Slovak', flag: '🇸🇰' },
    'hu': { name: 'Hungarian', flag: '🇭🇺' },
    'ro': { name: 'Romanian', flag: '🇷🇴' },
    'bg': { name: 'Bulgarian', flag: '🇧🇬' },
    'uk': { name: 'Ukrainian', flag: '🇺🇦' },
    'ru': { name: 'Russian', flag: '🇷🇺' },
    'be': { name: 'Belarusian', flag: '🇧🇾' },
    'sr': { name: 'Serbian', flag: '🇷🇸' },
    'hr': { name: 'Croatian', flag: '🇭🇷' },
    'bs': { name: 'Bosnian', flag: '🇧🇦' },
    'sl': { name: 'Slovenian', flag: '🇸🇮' },
    'mk': { name: 'Macedonian', flag: '🇲🇰' },
    'sq': { name: 'Albanian', flag: '🇦🇱' },
    // Baltic
    'lt': { name: 'Lithuanian', flag: '🇱🇹' },
    'lv': { name: 'Latvian', flag: '🇱🇻' },
    'et': { name: 'Estonian', flag: '🇪🇪' },
    // Caucasus & Central Asia
    'ka': { name: 'Georgian', flag: '🇬🇪' },
    'hy': { name: 'Armenian', flag: '🇦🇲' },
    'az': { name: 'Azerbaijani', flag: '🇦🇿' },
    'kk': { name: 'Kazakh', flag: '🇰🇿' },
    'uz': { name: 'Uzbek', flag: '🇺🇿' },
    'ky': { name: 'Kyrgyz', flag: '🇰🇬' },
    'tg': { name: 'Tajik', flag: '🇹🇯' },
    'tk': { name: 'Turkmen', flag: '🇹🇲' },
    // African
    'sw': { name: 'Swahili', flag: '🇰🇪' },
    'af': { name: 'Afrikaans', flag: '🇿🇦' },
    'zu': { name: 'Zulu', flag: '🇿🇦' },
    'xh': { name: 'Xhosa', flag: '🇿🇦' },
    'am': { name: 'Amharic', flag: '🇪🇹' },
    'ha': { name: 'Hausa', flag: '🇳🇬' },
    'ig': { name: 'Igbo', flag: '🇳🇬' },
    'yo': { name: 'Yoruba', flag: '🇳🇬' },
    'rw': { name: 'Kinyarwanda', flag: '🇷🇼' },
    'so': { name: 'Somali', flag: '🇸🇴' },
    // Celtic
    'ga': { name: 'Irish', flag: '🇮🇪' },
    'cy': { name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
    'gd': { name: 'Scottish Gaelic', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    // Others
    'eo': { name: 'Esperanto', flag: '🌍' },
    'la': { name: 'Latin', flag: '🏛️' },
    'haw': { name: 'Hawaiian', flag: '🇺🇸' },
    'mi': { name: 'Maori', flag: '🇳🇿' },
    'sm': { name: 'Samoan', flag: '🇼🇸' },
    'fil': { name: 'Filipino', flag: '🇵🇭' }
  };
  
  // Protected languages (cannot be removed) - always at top
  const PROTECTED_LANGUAGES = ['id', 'en'];
  
  // Default languages for new users - High CPM countries sorted A-Z
  // Protected: Indonesian, English US
  // High CPM: Norway($40+), Germany($25-35), Australia($25-35), UK($20-30), Netherlands($20-30), 
  //           Sweden($20-30), Denmark($20-30), Finland($18-25), Japan($15-25), Korea($12-20),
  //           France($12-18), Spain($10-15), Italy($10-15), Arabic($8-15), Brazil($3-8), Russia($3-6)
  const DEFAULT_LANGUAGES = [
    'id',      // Indonesian (protected)
    'en',      // English US (protected)
    // Sorted A-Z by language name
    'ar',      // Arabic - $8-15 CPM
    'da',      // Danish - $20-30 CPM
    'nl',      // Dutch - $20-30 CPM
    'en-AU',   // English (Australia) - $25-35 CPM
    'en-GB',   // English (UK) - $20-30 CPM
    'fi',      // Finnish - $18-25 CPM
    'fr',      // French - $12-18 CPM
    'de',      // German - $25-35 CPM
    'it',      // Italian - $10-15 CPM
    'ja',      // Japanese - $15-25 CPM
    'ko',      // Korean - $12-20 CPM
    'no',      // Norwegian - $40+ CPM
    'pt-BR',   // Portuguese (Brazil) - $3-8 CPM
    'ru',      // Russian - $3-6 CPM
    'es',      // Spanish - $10-15 CPM
    'sv',      // Swedish - $20-30 CPM
  ];
  
  // User's custom language list
  let userLanguages = [...DEFAULT_LANGUAGES];
  
  // Load user languages from storage
  async function loadUserLanguages() {
    try {
      const data = await chrome.storage.sync.get(['customLanguages']);
      if (data.customLanguages && Array.isArray(data.customLanguages)) {
        userLanguages = data.customLanguages;
      }
      // Always sort: protected at top, rest A-Z
      sortAndEnsureProtectedAtTop();
    } catch (e) {
      console.log('[YT Assistant] Using default languages');
      sortAndEnsureProtectedAtTop();
    }
    return userLanguages;
  }
  
  // Sort languages A-Z with protected at top
  function sortAndEnsureProtectedAtTop() {
    // Separate protected and non-protected
    const protectedLangs = userLanguages.filter(code => PROTECTED_LANGUAGES.includes(code));
    const otherLangs = userLanguages.filter(code => !PROTECTED_LANGUAGES.includes(code));
    
    // Sort non-protected A-Z by name
    otherLangs.sort((a, b) => {
      const nameA = (ALL_LANGUAGES[a]?.name || a).toLowerCase();
      const nameB = (ALL_LANGUAGES[b]?.name || b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Combine: protected first (in order), then sorted others
    userLanguages = [...PROTECTED_LANGUAGES.filter(c => protectedLangs.includes(c)), ...otherLangs];
  }
  
  // Save user languages to storage
  async function saveUserLanguages() {
    try {
      await chrome.storage.sync.set({ customLanguages: userLanguages });
      console.log('[YT Assistant] Languages saved:', userLanguages);
    } catch (e) {
      console.error('[YT Assistant] Failed to save languages:', e);
    }
  }
  
  // Add a language (from predefined list)
  function addLanguage(code) {
    if (!userLanguages.includes(code) && ALL_LANGUAGES[code]) {
      userLanguages.push(code);
      saveUserLanguages();
      return true;
    }
    return false;
  }
  
  // Add custom language (user-defined)
  function addCustomLanguage(code, name) {
    code = code.trim().toLowerCase();
    name = name.trim();
    
    if (!code || !name) return { success: false, error: 'emptyFields' };
    if (code.length > 10) return { success: false, error: 'codeTooLong' };
    if (userLanguages.includes(code)) return { success: false, error: 'alreadyExists' };
    
    // Add to ALL_LANGUAGES if not exists
    if (!ALL_LANGUAGES[code]) {
      ALL_LANGUAGES[code] = { name: name, flag: '🏳️' };
    }
    
    userLanguages.push(code);
    saveUserLanguages();
    
    // Also save custom languages separately
    saveCustomLanguageDefinitions();
    
    return { success: true };
  }
  
  // Save custom language definitions
  async function saveCustomLanguageDefinitions() {
    try {
      const customDefs = {};
      userLanguages.forEach(code => {
        // Only save if it's a custom language (flag is 🏳️)
        if (ALL_LANGUAGES[code] && ALL_LANGUAGES[code].flag === '🏳️') {
          customDefs[code] = ALL_LANGUAGES[code];
        }
      });
      await chrome.storage.sync.set({ customLanguageDefs: customDefs });
    } catch (e) {
      console.error('[YT Assistant] Failed to save custom language definitions:', e);
    }
  }
  
  // Load custom language definitions
  async function loadCustomLanguageDefinitions() {
    try {
      const data = await chrome.storage.sync.get(['customLanguageDefs']);
      if (data.customLanguageDefs) {
        Object.assign(ALL_LANGUAGES, data.customLanguageDefs);
      }
    } catch (e) {
      console.log('[YT Assistant] No custom language definitions found');
    }
  }
  
  // Reset languages to default
  function resetLanguagesToDefault() {
    userLanguages = [...DEFAULT_LANGUAGES];
    saveUserLanguages();
    return true;
  }
  
  // Sort languages alphabetically (protected languages stay at top)
  function sortLanguagesAlphabetically() {
    // Separate protected and non-protected
    const protectedLangs = userLanguages.filter(code => PROTECTED_LANGUAGES.includes(code));
    const otherLangs = userLanguages.filter(code => !PROTECTED_LANGUAGES.includes(code));
    
    // Sort non-protected by name
    otherLangs.sort((a, b) => {
      const nameA = getLangInfo(a).name.toLowerCase();
      const nameB = getLangInfo(b).name.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Combine: protected first, then sorted others
    userLanguages = [...protectedLangs, ...otherLangs];
    saveUserLanguages();
    return true;
  }
  
  // Remove a language (except protected)
  function removeLanguage(code) {
    if (PROTECTED_LANGUAGES.includes(code)) return false;
    const index = userLanguages.indexOf(code);
    if (index > -1) {
      userLanguages.splice(index, 1);
      saveUserLanguages();
      return true;
    }
    return false;
  }
  
  // Reorder languages (protected languages cannot be moved)
  function reorderLanguages(fromIndex, toIndex) {
    const item = userLanguages[fromIndex];
    // Don't allow moving protected languages
    if (PROTECTED_LANGUAGES.includes(item)) return;
    // Don't allow moving to protected area (first N positions)
    if (toIndex < PROTECTED_LANGUAGES.length) toIndex = PROTECTED_LANGUAGES.length;
    
    userLanguages.splice(fromIndex, 1);
    userLanguages.splice(toIndex, 0, item);
    saveUserLanguages();
  }
  
  // Get available languages (not yet added)
  function getAvailableLanguages() {
    return Object.keys(ALL_LANGUAGES).filter(code => !userLanguages.includes(code));
  }
  
  // Get language info
  function getLangInfo(code) {
    return ALL_LANGUAGES[code] || { name: code, flag: '🏳️' };
  }

  async function init() {
    if (isInitialized) return;
    isInitialized = true;

    // Load language setting
    await getCurrentLanguage();
    console.log('[YT Assistant] Initializing with language:', currentLang);
    
    // Load and apply theme
    await loadAndApplyTheme();
    console.log('[YT Assistant] Theme applied');
    
    // Track page view and license status (non-blocking)
    if (window.Analytics) {
      window.Analytics.trackPageView('youtube_studio');
      window.Analytics.setUserProperties({ ui_language: currentLang });
      
      // Track license status
      if (window.LicenseManager) {
        try {
          const licenseInfo = await window.LicenseManager.getInfo();
          if (licenseInfo) {
            window.Analytics.trackLicenseStatus(
              licenseInfo.status,
              licenseInfo.licenseType || 'unknown',
              licenseInfo.daysRemaining || null
            );
            // Set user property for license type
            window.Analytics.setUserProperties({ 
              license_type: licenseInfo.licenseType || 'none',
              license_status: licenseInfo.status
            });
          }
        } catch (e) {
          console.log('[YT Assistant] Could not track license status');
        }
      }
    }
    
    // Load custom language definitions first
    await loadCustomLanguageDefinitions();
    
    // Load user's custom language list
    await loadUserLanguages();
    console.log('[YT Assistant] Loaded user languages:', userLanguages.length, 'languages');

    // Initial injection with delay
    setTimeout(injectVideoDetailsButtons, 2000);
    setTimeout(injectSubtitleButton, 3000);
    setTimeout(injectMultiLanguageSection, 2000);
    
    // Update button license status after injection
    setTimeout(updateGenerateButtonsLicenseStatus, 2500);
    
    // Periodic check with longer interval to prevent performance issues
    setInterval(injectVideoDetailsButtons, 5000);
    setInterval(injectSubtitleButton, 5000);
    setInterval(injectMultiLanguageSection, 3000);
    
    // Periodic license status check for buttons
    setInterval(updateGenerateButtonsLicenseStatus, 10000);
  }

  function createTitleButtons() {
    const container = document.createElement('div');
    container.style.cssText = 'margin: 12px 0;';

    // Get UI templates with current language
    const ui = buildTitleUI(currentLang);

    // Settings panel (always visible now, contains button)
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'yt-title-settings-panel';
    settingsPanel.innerHTML = ui.settingsPanel;

    container.appendChild(settingsPanel);

    // Event listeners
    setTimeout(() => {
      // Generate button
      const generateBtn = container.querySelector('#yt-generate-title-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          generateTitleWithCurrentSettings();
        });
      }
    }, 100);

    return container;
  }

  function generateTitleWithCurrentSettings() {
    const styleEl = document.querySelector('#yt-title-style');
    const audienceEl = document.querySelector('#yt-title-audience');
    const lengthEl = document.querySelector('#yt-title-length');
    const languageEl = document.querySelector('#yt-title-language');
    const keywordEl = document.querySelector('#yt-title-keyword');
    const emojiEl = document.querySelector('#yt-title-emoji');

    if (!styleEl) {
      showToast('❌ ' + __('error'));
      return;
    }

    const settings = {
      style: styleEl.value,
      audience: audienceEl.value,
      length: lengthEl.value,
      language: languageEl ? languageEl.value : 'auto',
      keyword: keywordEl.value.trim(),
      emoji: emojiEl.checked
    };

    generateTitleWithSettings(settings);
  }

  async function generateTitleWithSettings(settings) {
    // Check license before generating
    if (!await checkLicenseForFeature('generateTitle')) return;
    
    const { title, description, titleEl } = getVideoContext();
    if (!titleEl) { 
      showToast('❌ ' + __('titleInputNotFound')); 
      return; 
    }

    window.ytAssistantLastTitleSettings = settings;

    // Determine target language
    const selectedLang = settings.language || 'auto';
    let targetLangName = '';
    let languageInstruction = '';
    
    if (selectedLang === 'auto') {
      // Detect language from existing title/description content
      const contentToDetect = title || description || '';
      const detectedLang = detectLanguage(contentToDetect);
      targetLangName = getLangName(detectedLang);
      languageInstruction = `
CRITICAL LANGUAGE RULE: 
- First, detect the language of the ORIGINAL CONTENT above
- You MUST generate ALL titles in the SAME LANGUAGE as the original content
- If original is Indonesian, output Indonesian titles
- If original is English, output English titles
- DO NOT translate or change the language
- DO NOT mix languages`;
      console.log('[YT Assistant] Generate title - auto detected language:', detectedLang, targetLangName);
    } else {
      // Use selected language
      const langNames = {
        'en': 'English', 'id': 'Bahasa Indonesia', 'es': 'Español', 'pt': 'Português',
        'fr': 'Français', 'de': 'Deutsch', 'it': 'Italiano', 'ja': '日本語 (Japanese)',
        'ko': '한국어 (Korean)', 'zh': '中文 (Chinese)', 'ar': 'العربية (Arabic)',
        'hi': 'हिन्दी (Hindi)', 'ru': 'Русский (Russian)', 'th': 'ไทย (Thai)',
        'vi': 'Tiếng Việt (Vietnamese)', 'tr': 'Türkçe (Turkish)', 'pl': 'Polski (Polish)',
        'nl': 'Nederlands (Dutch)'
      };
      targetLangName = langNames[selectedLang] || selectedLang;
      languageInstruction = `
CRITICAL LANGUAGE RULE:
- You MUST generate ALL titles in ${targetLangName}
- The output language is ${targetLangName}, regardless of the original content language
- DO NOT output in any other language
- Make sure the titles sound natural in ${targetLangName}`;
      console.log('[YT Assistant] Generate title - selected language:', selectedLang, targetLangName);
    }

    const styles = {
      viral: 'viral, catchy, emotional, attention-grabbing with power words',
      clickbait: 'clickbait style, extremely curiosity-inducing, shocking, use cliffhangers, create urgency, make viewers NEED to click',
      seo: 'SEO optimized with keywords at the beginning, searchable',
      pro: 'professional, clear, trustworthy, informative',
      casual: 'casual, friendly, conversational, relatable'
    };

    const lengthGuide = {
      auto: '50-80',
      short: '30-50',
      medium: '50-70',
      long: '70-100'
    };

    const prompt = `Generate exactly 5 different YouTube video title suggestions.

ORIGINAL CONTENT: "${title || description || 'General video'}"
${languageInstruction}

Style: ${styles[settings.style || 'viral']}
Target Audience: ${settings.audience || 'general'}
Length: ${lengthGuide[settings.length || 'auto']} characters
${settings.keyword ? `Main Keyword (must include): ${settings.keyword}` : ''}
${settings.emoji ? 'Include relevant emoji' : 'No emoji'}

Rules:
- Make them compelling and clickable
- Vary the approach for each suggestion
- Each title should be unique and creative
- Follow the language rule strictly

Output format (number each title 1-5):
1. [first title]
2. [second title]
3. [third title]
4. [fourth title]
5. [fifth title]`;

    updateTitleStatus('⏳ ' + __('generatingTitles'));
    try {
      const result = await callGemini(prompt, 1500);
      const titles = parseTitleSuggestions(result);
      if (titles.length > 0) {
        showTitlesInPanel(titles, titleEl);
        updateTitleStatus('✅ ' + __('titlesGenerated'));
        // Track analytics
        if (window.Analytics) window.Analytics.trackGenerateTitle(settings.style || 'viral', true);
      } else {
        showToast('❌ ' + __('error'), true);
        if (window.Analytics) window.Analytics.trackGenerateTitle(settings.style || 'viral', false);
      }
    } catch (err) {
      handleApiError(err);
      if (window.Analytics) window.Analytics.trackGenerateTitle(settings.style || 'viral', false);
    }
  }

  function showTitlesInPanel(titles, titleEl) {
    // Remove existing titles display
    const existing = document.querySelector('#yt-titles-display');
    if (existing) existing.remove();

    const settingsPanel = document.querySelector('#yt-title-settings-panel');
    if (!settingsPanel) return;

    const titlesDisplay = document.createElement('div');
    titlesDisplay.id = 'yt-titles-display';
    titlesDisplay.style.cssText = `
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #fed7aa;
    `;

    titles.forEach((title, index) => {
      const item = document.createElement('div');
      item.className = 'yt-assistant-title-item';
      item.innerHTML = `
        <span class="yt-assistant-title-number">${index + 1}</span>
        <span class="yt-assistant-title-text">${escapeHtml(title)}</span>
      `;

      item.addEventListener('click', () => {
        setInputValue(titleEl, title);
        updateTitleStatus('✅ ' + __('titleApplied'));
        // Highlight selected
        document.querySelectorAll('.yt-assistant-title-item').forEach(el => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
      });

      titlesDisplay.appendChild(item);
    });

    settingsPanel.appendChild(titlesDisplay);

    // Auto-open settings panel if closed
    if (settingsPanel.style.display === 'none') {
      settingsPanel.style.display = 'block';
    }
  }

  // Dropdown removed - titles now show directly in panel

  function createDescriptionButtons() {
    const container = document.createElement('div');
    container.style.cssText = 'margin: 12px 0;';

    const ui = buildDescriptionUI(currentLang);

    // Settings panel (always visible now, contains button)
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'yt-desc-settings-panel';
    settingsPanel.innerHTML = ui.settingsPanel;

    container.appendChild(settingsPanel);

    // Event listeners
    setTimeout(() => {
      // Generate button
      const generateBtn = container.querySelector('#yt-generate-desc-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          generateDescriptionWithSettings();
        });
      }
    }, 100);

    return container;
  }

  function generateDescriptionWithSettings() {
    const styleEl = document.querySelector('#yt-desc-style');
    const lengthEl = document.querySelector('#yt-desc-length');
    const emojiEl = document.querySelector('#yt-desc-emoji');
    const hashtagsEl = document.querySelector('#yt-desc-hashtags');
    const ctaEl = document.querySelector('#yt-desc-cta');

    if (!lengthEl) {
      generateDescription('medium');
      return;
    }

    const settings = {
      style: styleEl?.value || 'informative',
      length: lengthEl.value,
      emoji: emojiEl?.checked || false,
      includeHashtags: hashtagsEl?.checked || false,
      includeCTA: ctaEl?.checked || true
    };

    generateDescriptionAdvanced(settings);
  }

  async function generateDescriptionAdvanced(settings) {
    // Check license before generating
    if (!await checkLicenseForFeature('generateDescription')) return;
    
    const { title, description, descEl } = getVideoContext();
    if (!descEl) { showToast('❌ ' + __('descInputNotFound'), true); return; }

    // Detect language from existing content (title or description)
    const contentToDetect = title || description || '';
    const detectedLang = detectLanguage(contentToDetect);
    const targetLangName = getLangName(detectedLang);
    
    console.log('[YT Assistant] Generate description - detected language:', detectedLang, targetLangName);
    
    const lengths = { short: 100, medium: 200, long: 400 };

    const styles = {
      informative: 'informative, educational, clear and structured',
      engaging: 'engaging, conversational, storytelling approach',
      professional: 'professional, formal, business-like',
      casual: 'casual, friendly, relatable'
    };

    const prompt = `Generate a YouTube video description.

ORIGINAL TITLE: "${title || 'Untitled video'}"

CRITICAL LANGUAGE RULE:
- First, detect the language of the ORIGINAL TITLE above
- You MUST generate the description in the SAME LANGUAGE as the title
- If title is Indonesian, write Indonesian description
- If title is English, write English description
- DO NOT translate or change the language

Style: ${styles[settings.style]}
Length: approximately ${lengths[settings.length]} words

Rules:
- Start with compelling hook
- Include relevant keywords naturally
${settings.emoji ? '- Include relevant emoji throughout the description' : '- Do NOT include emoji'}
${settings.includeCTA ? '- Add call to action (like, subscribe, comment) in the same language' : ''}
${settings.includeHashtags ? '- Include 5-8 relevant hashtags at the end in the same language' : '- Do NOT include hashtags'}
- Use line breaks for readability
- MUST be in the same language as the original title

Output ONLY the description text.`;

    updateDescStatus('⏳ ' + __('generatingDesc'));
    try {
      const result = await callGemini(prompt);
      setInputValue(descEl, result.trim());
      updateDescStatus('✅ ' + __('descGenerated'));
      // Track analytics
      if (window.Analytics) window.Analytics.trackGenerateDescription(settings.style, true);
    } catch (err) {
      handleApiError(err);
      updateDescStatus('❌ ' + __('error'));
      if (window.Analytics) window.Analytics.trackGenerateDescription(settings.style, false);
    }
  }

  function createTagsButtons() {
    const container = document.createElement('div');
    container.style.cssText = 'margin: 12px 0;';

    const ui = buildTagsUI(currentLang);

    // Settings panel (always visible now, contains button)
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'yt-tags-settings-panel';
    settingsPanel.innerHTML = ui.settingsPanel;

    container.appendChild(settingsPanel);

    // Event listeners
    setTimeout(() => {
      // Generate button
      const generateBtn = container.querySelector('#yt-generate-tags-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          generateTagsWithSettings();
        });
      }
    }, 100);

    return container;
  }

  function generateTagsWithSettings() {
    const countEl = document.querySelector('#yt-tags-count');
    const languageEl = document.querySelector('#yt-tags-language');
    const longtailEl = document.querySelector('#yt-tags-longtail');

    const count = countEl ? parseInt(countEl.value) : 20;
    const language = languageEl ? languageEl.value : 'mixed';
    const includeLongtail = longtailEl ? longtailEl.checked : true;

    generateTagsAdvanced(count, language, includeLongtail);
  }

  async function generateTagsAdvanced(count, language, includeLongtail) {
    // Check license before generating
    if (!await checkLicenseForFeature('generateTags')) return;
    
    const { title, description } = getVideoContext();
    
    // Detect language from existing content (title or description)
    const contentToDetect = title || description || '';
    const detectedLang = detectLanguage(contentToDetect);
    const detectedLangName = getLangName(detectedLang);
    
    console.log('[YT Assistant] Generate tags - detected language:', detectedLang, detectedLangName);

    const langInstructions = {
      mixed: `Mix of ${detectedLangName} and English tags`,
      english: 'All tags in English only',
      local: `All tags in ${detectedLangName} only`
    };

    const prompt = `Generate exactly ${count} YouTube video tags.

ORIGINAL CONTENT:
Title: "${title}"
Description: "${description}"

CRITICAL LANGUAGE RULE:
- First, detect the language of the ORIGINAL CONTENT above
- Generate tags based on the detected language
${language === 'mixed' ? '- Mix tags in the detected language AND English' : ''}
${language === 'english' ? '- Generate ALL tags in English only' : ''}
${language === 'local' ? '- Generate ALL tags in the SAME language as the original content (NO English)' : ''}

${includeLongtail ? 'Include both short and long-tail keywords' : 'Focus on short keywords'}

Output as comma-separated list ONLY, nothing else.`;

    updateTagsStatus('⏳ ' + __('generatingTags'));
    try {
      const result = await callGemini(prompt);
      insertTags(result.trim());
      updateTagsStatus('✅ ' + __('tagsGenerated'));
      // Track analytics
      if (window.Analytics) window.Analytics.trackGenerateTags(count, true);
    } catch (err) {
      handleApiError(err);
      updateTagsStatus('❌ ' + __('error'));
      if (window.Analytics) window.Analytics.trackGenerateTags(count, false);
    }
  }

  function updateTitleStatus(message) {
    const statusEl = document.querySelector('#yt-title-status');
    if (statusEl) {
      statusEl.style.display = 'inline-flex';
      const isSuccess = message.includes('✅');
      const isError = message.includes('❌');
      const isLoading = message.includes('⏳');
      statusEl.className = 'yt-assistant-status ' + (isSuccess ? 'success' : isError ? 'error' : isLoading ? 'loading' : '');
      statusEl.textContent = message;
    }
  }

  function updateDescStatus(message) {
    const statusEl = document.querySelector('#yt-desc-status');
    if (statusEl) {
      statusEl.style.display = 'inline-flex';
      const isSuccess = message.includes('✅');
      const isError = message.includes('❌');
      const isLoading = message.includes('⏳');
      statusEl.className = 'yt-assistant-status ' + (isSuccess ? 'success' : isError ? 'error' : isLoading ? 'loading' : '');
      statusEl.textContent = message;
    }
  }
  
  function updateTagsStatus(message) {
    const statusEl = document.querySelector('#yt-tags-status');
    if (statusEl) {
      statusEl.style.display = 'inline-flex';
      const isSuccess = message.includes('✅');
      const isError = message.includes('❌');
      const isLoading = message.includes('⏳');
      statusEl.className = 'yt-assistant-status ' + (isSuccess ? 'success' : isError ? 'error' : isLoading ? 'loading' : '');
      statusEl.textContent = message;
    }
  }


  // ========== GENERATE FUNCTIONS ==========
  function getVideoContext() {
    const titleEl = document.querySelector('#textbox[aria-label*="title" i], ytcp-social-suggestions-textbox[label="Title"] #textbox, #title-wrapper #textbox');
    const descEl = document.querySelector('#textbox[aria-label*="description" i], ytcp-social-suggestions-textbox[label="Description"] #textbox, #description-wrapper #textbox');
    return {
      title: titleEl?.innerText?.trim() || titleEl?.textContent?.trim() || '',
      description: descEl?.innerText?.trim() || descEl?.textContent?.trim() || '',
      titleEl,
      descEl
    };
  }

  // Old generateTitle function removed - now using generateTitleWithSettings

  function parseTitleSuggestions(result) {
    const lines = result.split('\n').filter(line => line.trim());
    const titles = [];

    for (const line of lines) {
      // Match patterns like "1. Title" or "1) Title" or just numbered lines
      const match = line.match(/^\d+[\.\)]\s*(.+)/);
      if (match) {
        titles.push(match[1].trim());
      }
    }

    return titles.slice(0, 5);
  }

  // Old showTitleSuggestions function removed - now using showTitlesInPanel

  async function generateDescription(length) {
    const { title, description, descEl } = getVideoContext();
    if (!descEl) { 
      showToast('❌ ' + __('descInputNotFound')); 
      return; 
    }

    const settings = await chrome.storage.sync.get(['language']);
    const lang = settings.language || 'id';
    const lengths = { short: 100, medium: 200, long: 400 };

    const prompt = `Generate a YouTube video description.
Title: ${title || 'Untitled video'}
Length: approximately ${lengths[length]} words
Language: ${getLangName(lang)}
Rules:
- Start with compelling hook
- Include relevant keywords
- Add call to action (like, subscribe, comment)
- Use line breaks for readability
- Do NOT include hashtags
Output ONLY the description text.`;

    updateDescStatus('⏳ ' + __('generatingDesc'));
    try {
      const result = await callGemini(prompt);
      setInputValue(descEl, result.trim());
      updateDescStatus('✅ ' + __('descGenerated'));
    } catch (err) {
      updateDescStatus('❌ ' + err.message);
    }
  }

  async function generateHashtags() {
    const { title, description, descEl } = getVideoContext();
    if (!descEl) { 
      showToast('❌ ' + __('descInputNotFound')); 
      return; 
    }

    // Detect language from existing content
    const contentToDetect = title || description || '';
    const detectedLang = detectLanguage(contentToDetect);
    const detectedLangName = getLangName(detectedLang);
    
    console.log('[YT Assistant] Generate hashtags - detected language:', detectedLang, detectedLangName);

    const prompt = `Generate 5-8 YouTube hashtags for this video.

ORIGINAL CONTENT:
Title: "${title}"
Description: "${description}"

CRITICAL LANGUAGE RULE:
- First, detect the language of the ORIGINAL CONTENT above
- Generate hashtags in the SAME LANGUAGE as the original content
- If content is Indonesian, use Indonesian hashtags
- If content is English, use English hashtags
- DO NOT mix languages

Format: #Tag1 #Tag2 #Tag3
Output ONLY the hashtags.`;

    updateDescStatus('⏳ ' + __('generatingHashtags'));
    try {
      const result = await callGemini(prompt);
      const current = descEl.innerText || descEl.textContent || '';
      setInputValue(descEl, current + '\n\n' + result.trim());
      updateDescStatus('✅ ' + __('hashtagsAdded'));
    } catch (err) {
      updateDescStatus('❌ ' + err.message);
    }
  }

  function insertTags(tagsStr) {
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
    const tagsInput = document.querySelector('#text-input[aria-label="Tags"], #tags-container input, input[placeholder*="tag" i]');

    if (!tagsInput) {
      updateTagsStatus('❌ ' + __('tagsInputNotFound'));
      return;
    }
    
    // Try to paste all tags at once
    const tagsText = tags.join(', ');
    
    // Focus the input
    tagsInput.focus();
    
    // Set value directly
    tagsInput.value = tagsText;
    
    // Trigger events to make YouTube recognize the input
    tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
    tagsInput.dispatchEvent(new Event('change', { bubbles: true }));
    tagsInput.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // Also copy to clipboard as backup
    navigator.clipboard.writeText(tagsText).catch(err => {
      console.error('Failed to copy tags:', err);
    });
    
    updateTagsStatus(`✅ ${tags.length} ${__('tagsInserted')}`);
  }
  
  function insertTagsOneByOne(tags) {
    const tagsInput = document.querySelector('#text-input[aria-label="Tags"], #tags-container input, input[placeholder*="tag" i]');

    if (!tagsInput) {
      updateTagsStatus('❌ ' + __('tagsInputNotFound'));
      return;
    }

    let i = 0;
    const addTag = () => {
      if (i >= tags.length) return;
      tagsInput.focus();
      tagsInput.value = tags[i];
      tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        tagsInput.dispatchEvent(new KeyboardEvent('keydown', { key: ',', keyCode: 188, bubbles: true }));
        tagsInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        i++;
        setTimeout(addTag, 100);
      }, 50);
    };
    addTag();
  }

  function openTranslateModal() {
    // Try to get original content from the page
    let srcTitle = '';
    let srcDesc = '';

    // Look for original content in various possible locations
    const allTextboxes = document.querySelectorAll('#textbox, textarea, [contenteditable="true"]');
    const textContents = Array.from(allTextboxes).map(el => (el.innerText || el.textContent || el.value || '').trim()).filter(t => t);

    if (textContents.length >= 2) {
      srcTitle = textContents[0];
      srcDesc = textContents[1];
    } else if (textContents.length === 1) {
      srcTitle = textContents[0];
    }

    // Also try specific selectors
    const titleEl = document.querySelector('.original-title, [class*="source"] [class*="title"], .video-title');
    const descEl = document.querySelector('.original-description, [class*="source"] [class*="description"]');
    if (titleEl) srcTitle = titleEl.innerText || titleEl.textContent || srcTitle;
    if (descEl) srcDesc = descEl.innerText || descEl.textContent || srcDesc;

    // Create modal
    const overlay = document.createElement('div');
    overlay.className = 'yt-assistant-overlay';
    overlay.id = 'yt-translate-modal';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const panel = document.createElement('div');
    panel.className = 'yt-assistant-panel';
    panel.style.maxWidth = '650px';
    panel.style.maxHeight = '90vh';
    panel.style.overflow = 'auto';

    panel.innerHTML = `
      < div class="yt-assistant-panel-header" >
        <span class="yt-assistant-panel-title">🌐 Auto Translate Title & Description</span>
        <span class="yt-assistant-panel-close" style="cursor:pointer;font-size:24px;">&times;</span>
      </div >
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div>
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:13px;">Source Language</label>
          <select id="modal-src-lang" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
            <option value="en">English</option>
            <option value="id">Indonesian</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
          </select>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:13px;">Target Language</label>
          <select id="modal-target-lang" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
            <option value="id">Indonesian</option>
            <option value="en">English</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label style="display:block;margin-bottom:6px;font-weight:500;font-size:13px;">📝 Original Title</label>
        <input type="text" id="modal-src-title" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;" placeholder="Paste original title here" value="${escapeHtml(srcTitle)}">
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display:block;margin-bottom:6px;font-weight:500;font-size:13px;">📄 Original Description</label>
        <textarea id="modal-src-desc" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;resize:vertical;" rows="5" placeholder="Paste original description here">${escapeHtml(srcDesc)}</textarea>
      </div>

      <button id="modal-translate-btn" class="yt-assistant-btn" style="width:100%;padding:12px;font-size:15px;">
        ✨ Translate with Gemini
      </button>

      <div id="modal-result" style="display:none;margin-top:20px;padding-top:16px;border-top:1px solid #e0e0e0;">
        <div style="margin-bottom:14px;">
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:13px;">✅ Translated Title</label>
          <input type="text" id="modal-result-title" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;background:#e8f5e9;box-sizing:border-box;" readonly>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:13px;">✅ Translated Description</label>
          <textarea id="modal-result-desc" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;background:#e8f5e9;box-sizing:border-box;resize:vertical;" rows="5" readonly></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button id="modal-apply-btn" class="yt-assistant-btn" style="background:#34a853;">✅ Apply to Page</button>
          <button id="modal-copy-btn" class="yt-assistant-btn" style="background:#5f6368;">📋 Copy All</button>
        </div>
      </div>
    `;

    panel.querySelector('.yt-assistant-panel-close').onclick = () => overlay.remove();

    panel.querySelector('#modal-translate-btn').onclick = async () => {
      const srcLang = panel.querySelector('#modal-src-lang').value;
      const targetLang = panel.querySelector('#modal-target-lang').value;
      const title = panel.querySelector('#modal-src-title').value.trim();
      const desc = panel.querySelector('#modal-src-desc').value.trim();

      if (!title && !desc) {
        showToast(__('noInputsFound'));
        return;
      }

      const btn = panel.querySelector('#modal-translate-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Translating...';

      try {
        const prompt = `Translate this YouTube content from ${getLangName(srcLang)} to ${getLangName(targetLang)}.

${title ? `TITLE: ${title}` : ''}
${desc ? `DESCRIPTION:\n${desc}` : ''}

Rules:
- Keep same tone and style
- Preserve all emojis
- Translate hashtag words but keep # symbol
- Keep line breaks and formatting
- Natural fluent translation
- ⚠️ TITLE MUST BE 100 CHARACTERS OR LESS (YouTube limit)!

Output format:
TRANSLATED_TITLE: [title here - MAX 100 chars]
TRANSLATED_DESC: [description here]`;

        const result = await callGemini(prompt, 2000);

        let transTitle = '';
        let transDesc = '';

        const titleMatch = result.match(/TRANSLATED_TITLE:\s*(.+?)(?=TRANSLATED_DESC:|$)/s);
        const descMatch = result.match(/TRANSLATED_DESC:\s*([\s\S]+)/);

        if (titleMatch) transTitle = titleMatch[1].trim();
        if (descMatch) transDesc = descMatch[1].trim();
        
        // Enforce 100 character limit for title
        if (transTitle.length > 100) {
          const truncated = transTitle.substring(0, 97);
          const lastSpace = truncated.lastIndexOf(' ');
          transTitle = lastSpace > 70 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
        }

        panel.querySelector('#modal-result-title').value = transTitle;
        panel.querySelector('#modal-result-desc').value = transDesc;
        panel.querySelector('#modal-result').style.display = 'block';
      } catch (err) {
        // Error will be shown in modal
        console.error('Translation error:', err);
      }

      btn.disabled = false;
      btn.textContent = '✨ Translate with Gemini';
    };

    panel.querySelector('#modal-apply-btn').onclick = () => {
      const transTitle = panel.querySelector('#modal-result-title').value;
      const transDesc = panel.querySelector('#modal-result-desc').value;
      applyTranslationToPage(transTitle, transDesc);
      showToast('✅ ' + __('applied'));
    };

    panel.querySelector('#modal-copy-btn').onclick = () => {
      const transTitle = panel.querySelector('#modal-result-title').value;
      const transDesc = panel.querySelector('#modal-result-desc').value;
      navigator.clipboard.writeText(`${transTitle} \n\n${transDesc} `);
      showToast('📋 ' + __('copied'));
    };

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function applyTranslationToPage(title, desc) {
    // Find translation/target inputs on the page
    const allInputs = document.querySelectorAll('#textbox, textarea, [contenteditable="true"], input[type="text"]');
    const inputs = Array.from(allInputs).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Usually right side inputs are for translation
    // Try to find by position or class
    const rightSideInputs = inputs.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.left > window.innerWidth / 2;
    });

    if (rightSideInputs.length >= 2) {
      setInputValue(rightSideInputs[0], title);
      setInputValue(rightSideInputs[1], desc);
    } else if (rightSideInputs.length === 1) {
      setInputValue(rightSideInputs[0], title);
    }

    // Also try specific selectors
    const targetTitle = document.querySelector('[class*="translation"] [class*="title"] #textbox, [class*="target"] #textbox');
    const targetDesc = document.querySelector('[class*="translation"] [class*="description"] #textbox');
    if (targetTitle) setInputValue(targetTitle, title);
    if (targetDesc) setInputValue(targetDesc, desc);
  }


  // ========== UTILITIES ==========
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getLangName(code) {
    const langs = {
      // Common languages
      'en': 'English', 'id': 'Indonesian', 'es': 'Spanish', 'pt': 'Portuguese',
      'fr': 'French', 'de': 'German', 'it': 'Italian', 'nl': 'Dutch',
      'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
      'ar': 'Arabic', 'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese',
      'tr': 'Turkish', 'pl': 'Polish', 'ms': 'Malay', 'tl': 'Filipino',
      // Additional languages
      'af': 'Afrikaans', 'sq': 'Albanian', 'am': 'Amharic', 'hy': 'Armenian',
      'az': 'Azerbaijani', 'eu': 'Basque', 'be': 'Belarusian', 'bn': 'Bengali',
      'bs': 'Bosnian', 'bg': 'Bulgarian', 'ca': 'Catalan', 'ceb': 'Cebuano',
      'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish', 'eo': 'Esperanto',
      'et': 'Estonian', 'fi': 'Finnish', 'gl': 'Galician', 'ka': 'Georgian',
      'el': 'Greek', 'gu': 'Gujarati', 'ht': 'Haitian Creole', 'ha': 'Hausa',
      'he': 'Hebrew', 'hmn': 'Hmong', 'hu': 'Hungarian', 'is': 'Icelandic',
      'ig': 'Igbo', 'ga': 'Irish', 'jv': 'Javanese', 'kn': 'Kannada',
      'kk': 'Kazakh', 'km': 'Khmer', 'ku': 'Kurdish', 'ky': 'Kyrgyz',
      'lo': 'Lao', 'la': 'Latin', 'lv': 'Latvian', 'lt': 'Lithuanian',
      'lb': 'Luxembourgish', 'mk': 'Macedonian', 'mg': 'Malagasy', 'ml': 'Malayalam',
      'mt': 'Maltese', 'mi': 'Maori', 'mr': 'Marathi', 'mn': 'Mongolian',
      'my': 'Myanmar', 'ne': 'Nepali', 'no': 'Norwegian', 'ps': 'Pashto',
      'fa': 'Persian', 'pa': 'Punjabi', 'ro': 'Romanian', 'sm': 'Samoan',
      'gd': 'Scots Gaelic', 'sr': 'Serbian', 'st': 'Sesotho', 'sn': 'Shona',
      'sd': 'Sindhi', 'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian',
      'so': 'Somali', 'su': 'Sundanese', 'sw': 'Swahili', 'sv': 'Swedish',
      'tg': 'Tajik', 'ta': 'Tamil', 'te': 'Telugu', 'uk': 'Ukrainian',
      'ur': 'Urdu', 'uz': 'Uzbek', 'cy': 'Welsh', 'xh': 'Xhosa',
      'yi': 'Yiddish', 'yo': 'Yoruba', 'zu': 'Zulu'
    };
    // If code not found, try to capitalize it nicely
    if (langs[code]) return langs[code];
    
    // If code is already a full name (e.g., "tagalog", "swahili"), capitalize it
    if (code.length > 2) {
      return code.charAt(0).toUpperCase() + code.slice(1);
    }
    
    // Otherwise return uppercase code
    return code.toUpperCase();
  }

  function setInputValue(el, value) {
    if (!el) return;

    el.focus();

    // For contenteditable elements
    if (el.getAttribute('contenteditable') === 'true' || el.id === 'textbox') {
      el.innerHTML = '';
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // For input/textarea
    else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Fallback: try execCommand
    else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, value);
    }
  }

  async function callGemini(prompt, maxTokens = 1000) {
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      const error = new Error(__('extensionReload') || 'Extension was reloaded. Please refresh the page.');
      error.type = 'EXTENSION_INVALID';
      error.shouldStop = true;
      throw error;
    }
    
    let result;
    try {
      result = await chrome.runtime.sendMessage({
        action: 'callGemini',
        data: { prompt, maxTokens }
      });
    } catch (e) {
      // Extension context invalidated
      const error = new Error(__('extensionReload') || 'Extension was reloaded. Please refresh the page.');
      error.type = 'EXTENSION_INVALID';
      error.shouldStop = true;
      throw error;
    }

    if (result && result.error) {
      // Parse error type from message (format: "ERROR_TYPE:message")
      const errorMsg = result.error;
      const errorType = errorMsg.split(':')[0];
      const errorDetail = errorMsg.includes(':') ? errorMsg.substring(errorMsg.indexOf(':') + 1) : errorMsg;
      
      // Create user-friendly error with type
      const error = new Error(errorDetail);
      error.type = errorType;
      error.isRateLimit = errorType === 'RATE_LIMIT';
      error.isAuthError = errorType === 'AUTH_ERROR';
      error.isBillingError = errorType === 'BILLING_ERROR';
      error.isServerError = errorType === 'SERVER_ERROR';
      error.shouldStop = error.isRateLimit || error.isAuthError || error.isBillingError;
      
      throw error;
    }

    return result || '';
  }
  
  // Helper to show appropriate error message
  function handleApiError(err) {
    let message = err.message;
    let icon = '❌';
    
    if (err.isRateLimit) {
      icon = '⏳';
      message = __('rateLimitError') || 'API limit reached. Please wait a few minutes.';
    } else if (err.isAuthError) {
      icon = '🔑';
      message = __('authError') || 'Invalid API key. Check settings.';
    } else if (err.isBillingError) {
      icon = '💳';
      message = __('billingError') || 'Insufficient credits. Top up your account.';
    } else if (err.isServerError) {
      icon = '🔧';
      message = __('serverError') || 'Server error. Try again later.';
    } else if (err.type === 'EXTENSION_INVALID') {
      icon = '🔄';
      message = __('extensionReload') || 'Extension was reloaded. Please refresh the page.';
    }
    
    showToast(icon + ' ' + message, true);
    console.error('[YT Assistant] API Error:', err.type, err.message);
    
    return err.shouldStop; // Return true if should stop multi-language translation
  }

  // ========== SUBTITLE TRANSLATOR (IMPROVED) ==========

  async function autoTranslateSubtitle(manualTargetLang = 'auto') {
    // Check license before translating
    if (!await checkLicenseForFeature('autoTranslate')) return;
    
    try {
      // Get all visible input fields (textarea, input, contenteditable)
      const allInputs = Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], #textbox')).filter(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 100 && rect.height > 20;
        const notHidden = window.getComputedStyle(el).display !== 'none';
        return isVisible && notHidden;
      });

      console.log('[YT Assistant] Found input fields:', allInputs.length);

      if (allInputs.length < 2) {
        showToast('❌ Not enough text fields found', true);
        return;
      }

      // Sort by position (left to right, top to bottom)
      allInputs.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        if (Math.abs(rectA.left - rectB.left) > 100) {
          return rectA.left - rectB.left;
        }
        return rectA.top - rectB.top;
      });

      let srcTitle = '';
      let srcDesc = '';
      let targetTitleEl = null;
      let targetDescEl = null;

      // If we have 4 inputs, assume 2 left (source) and 2 right (target)
      if (allInputs.length >= 4) {
        srcTitle = (allInputs[0]?.value || allInputs[0]?.innerText || allInputs[0]?.textContent || '').trim();
        srcDesc = (allInputs[1]?.value || allInputs[1]?.innerText || allInputs[1]?.textContent || '').trim();
        targetTitleEl = allInputs[2];
        targetDescEl = allInputs[3];
      } else {
        // If < 4 inputs, likely source is read-only. Try to scrape from DOM.
        console.log('[YT Assistant] Less than 4 inputs found, trying to scrape source text...');

        // Assume the inputs we found are the TARGET fields (right column)
        targetTitleEl = allInputs[0];
        targetDescEl = allInputs[1];

        // Try to find source text in the left column
        // We look for elements to the LEFT of the target fields
        const dialog = document.querySelector('ytcp-dialog');
        if (dialog) {
          const screenCenter = window.innerWidth / 2;
          const potentialSources = Array.from(dialog.querySelectorAll('div, span, p')).filter(el => {
            const rect = el.getBoundingClientRect();
            // Must be on left side, visible, and have substantial text
            return rect.right < screenCenter &&
              rect.width > 100 &&
              rect.height > 20 &&
              el.textContent.trim().length > 5 &&
              window.getComputedStyle(el).display !== 'none';
          });

          // Heuristic: The two largest text blocks on the left are likely Title and Description
          // Or the ones aligned with the target fields
          if (potentialSources.length >= 2) {
            // Sort by top position
            potentialSources.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

            // Filter out labels like "Original Language", "Title", "Description"
            const cleanSources = potentialSources.filter(el => {
              const text = el.textContent.trim().toLowerCase();
              return text !== 'title' && text !== 'description' && !text.includes('language') && !text.includes('bahasa');
            });

            if (cleanSources.length >= 2) {
              srcTitle = cleanSources[0].textContent.trim();
              srcDesc = cleanSources[1].textContent.trim();
            }
          }
        }
      }

      console.log('[YT Assistant] Source title:', srcTitle.substring(0, 50));
      console.log('[YT Assistant] Source desc:', srcDesc.substring(0, 50));

      if (!srcTitle && !srcDesc) {
        showToast('❌ No source content found', true);
        return;
      }

      if (!targetTitleEl && !targetDescEl) {
        showToast('❌ Target fields not found', true);
        return;
      }

      // Detect languages
      const srcLang = detectLanguageFromText(srcTitle + ' ' + srcDesc);
      
      // Use manual selection if provided, otherwise auto-detect
      let targetLang;
      if (manualTargetLang && manualTargetLang !== 'auto') {
        targetLang = manualTargetLang;
        console.log('[YT Assistant] Using manually selected target language:', targetLang);
      } else {
        targetLang = detectTargetLanguage();
        console.log('[YT Assistant] Auto-detected target language:', targetLang);
      }
      
      // Get the English name for the target language (for AI prompt)
      const targetLangEnglishName = getLangName(targetLang);
      console.log('[YT Assistant] Translating from', srcLang, 'to', targetLang, '(' + targetLangEnglishName + ')');

      // Translate using Gemini
      const result = await translateContent(srcTitle, srcDesc, srcLang, targetLang);

      console.log('[YT Assistant] Translation result:', result);

      // Set translated text
      if (targetTitleEl && result.title) {
        setInputValue(targetTitleEl, result.title);
        console.log('[YT Assistant] Set title');
      }

      if (targetDescEl && result.description) {
        setInputValue(targetDescEl, result.description);
        console.log('[YT Assistant] Set description');
      }

    } catch (err) {
      console.error('[YT Assistant] Translate error:', err);
      throw err; // Re-throw to be caught by button click handler
    }
  }
  function findLanguageInDialog(side = 'right') {
    // Find visible dialog (same logic as injectSubtitleButton)
    const allDialogs = document.querySelectorAll('tp-yt-paper-dialog');
    console.log('[YT Assistant] Total dialogs found:', allDialogs.length);
    
    let dialog = null;
    
    for (const d of allDialogs) {
      const rect = d.getBoundingClientRect();
      console.log('[YT Assistant] Dialog rect:', rect.width, 'x', rect.height);
      if (rect.width > 500 && rect.height > 300) {
        dialog = d;
        console.log('[YT Assistant] Selected visible dialog');
        break;
      }
    }
    
    if (!dialog) {
      console.log('[YT Assistant] No visible dialog found for language detection');
      return null;
    }
    
    const dialogRect = dialog.getBoundingClientRect();
    const dialogCenter = dialogRect.left + (dialogRect.width / 2);
    
    console.log('[YT Assistant] Dialog rect:', {
      width: dialogRect.width,
      height: dialogRect.height,
      left: dialogRect.left,
      center: dialogCenter
    });
    console.log('[YT Assistant] Looking for:', side, 'side language');
    
    // Collect all potential language texts - directly from UI without mapping
    const candidates = [];
    
    // Look for language labels in the dialog
    const allElements = dialog.querySelectorAll('div, span, label, h2, h3, h4, yt-formatted-string, [class*="language"], [class*="title"], [class*="header"]');
    
    // Skip these UI texts
    const skipTexts = ['translating', 'translate', 'completed', 'dismiss', 'publish', 'cancel', 'save', 
                       'terjemahkan', 'publikasikan', 'tutup', 'simpan', 'batal', 'original', 'translation',
                       'title', 'description', 'judul', 'deskripsi', 'bahasa asli', 'terjemahan'];
    
    for (const el of allElements) {
      const text = el.textContent.trim();
      const textLower = text.toLowerCase();
      const rect = el.getBoundingClientRect();
      
      // Skip if not visible, too small, or too large
      if (rect.width === 0 || rect.height === 0) continue;
      if (text.length < 3 || text.length > 50) continue;
      
      // Check position based on side (relative to dialog center)
      const elementCenter = rect.left + (rect.width / 2);
      const isRightSide = elementCenter > dialogCenter;
      const isLeftSide = elementCenter < dialogCenter;
      
      // Skip button text, status messages, etc.
      if (skipTexts.some(skip => textLower.includes(skip))) continue;
      
      // Skip if element is a button or has button-like classes
      if (el.tagName === 'BUTTON' || el.className.includes('btn') || el.className.includes('button')) continue;
      
      // Skip if contains numbers or special characters (likely not a language name)
      if (/[0-9<>{}[\]@#$%^&*+=]/.test(text)) continue;
      
      // Check if on correct side
      if ((side === 'right' && !isRightSide) || (side === 'left' && !isLeftSide)) continue;
      
      // If text looks like a language name (starts with capital, reasonable length, single word or with parentheses)
      if (/^[A-Z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(text) && 
          text.length >= 3 && text.length <= 40) {
        candidates.push({
          text: text,
          isRight: isRightSide,
          isLeft: isLeftSide,
          top: rect.top
        });
      }
    }
    
    console.log('[YT Assistant] Language candidates found:', candidates.length);
    candidates.forEach(c => console.log(`  - "${c.text}" (left:${c.isLeft}, right:${c.isRight})`));
    
    // Filter by side and return the first match (topmost)
    const filtered = candidates.filter(c => (side === 'right' && c.isRight) || (side === 'left' && c.isLeft));
    filtered.sort((a, b) => a.top - b.top);
    
    if (filtered.length > 0) {
      const langName = filtered[0].text;
      console.log(`[YT Assistant] Selected ${side} language (raw from UI):`, langName);
      // Return the raw language name from UI - AI will understand it
      return langName;
    }
    
    console.log(`[YT Assistant] No ${side} language found in dialog`);
    return null;
  }

  function detectTargetLanguage() {
    // Try to find language label on right side of dialog
    const rightLang = findLanguageInDialog('right');
    if (rightLang) {
      console.log('[YT Assistant] Target language detected:', rightLang);
      return rightLang;
    }
    
    // Fallback: Look for "Translation" header and find language near it
    const allDialogs = document.querySelectorAll('tp-yt-paper-dialog');
    let dialog = null;
    
    for (const d of allDialogs) {
      const rect = d.getBoundingClientRect();
      if (rect.width > 500 && rect.height > 300) {
        dialog = d;
        break;
      }
    }
    
    if (dialog) {
      // Look for "Translation" or "Terjemahan" header and find language near it
      const translationHeaders = Array.from(dialog.querySelectorAll('div, span')).filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('translation') || text.includes('terjemahan');
      });
      
      if (translationHeaders.length > 0) {
        console.log('[YT Assistant] Found translation header, searching nearby...');
        const header = translationHeaders[0];
        const headerRect = header.getBoundingClientRect();
        
        // Skip these UI texts
        const skipTexts = ['translation', 'terjemahan', 'original', 'bahasa asli', 'title', 'judul', 
                          'description', 'deskripsi', 'publish', 'publikasikan', 'dismiss', 'tutup'];
        
        const nearbyElements = Array.from(dialog.querySelectorAll('div, span')).filter(el => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top - headerRect.top) < 200 && rect.left > headerRect.left;
        });
        
        for (const el of nearbyElements) {
          const text = el.textContent.trim();
          const textLower = text.toLowerCase();
          
          // Skip UI texts
          if (skipTexts.some(skip => textLower.includes(skip))) continue;
          if (text.length < 3 || text.length > 40) continue;
          
          // If looks like a language name (starts with capital letter)
          if (/^[A-Z\u00C0-\u024F]/.test(text)) {
            console.log('[YT Assistant] Found target language near translation header:', text);
            return text;
          }
        }
      }
    }
    
    // Last resort: check URL for language hints
    const url = window.location.href;
    const langMatch = url.match(/[?&]lang=([a-z]{2})/i);
    if (langMatch) {
      console.log('[YT Assistant] Found language in URL:', langMatch[1]);
      return langMatch[1];
    }
    
    // Fallback to English (safer than Indonesian for international content)
    console.log('[YT Assistant] No target language detected, defaulting to English');
    return 'en';
  }

  function detectSourceLanguage() {
    // Try to find language label on left side of dialog
    const leftLang = findLanguageInDialog('left');
    if (leftLang) return leftLang;
    
    // Will use text detection as fallback
    return null;
  }

  function detectLanguageFromText(text) {
    // First try to detect from dialog labels
    const srcFromDialog = detectSourceLanguage();
    if (srcFromDialog) return srcFromDialog;
    
    // Fallback to text analysis
    // Chinese characters
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
    // Japanese (Hiragana + Katakana)
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    // Korean
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    // Russian/Cyrillic
    if (/[а-яА-Я]/.test(text)) return 'ru';
    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    // Thai
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    // Vietnamese (with diacritics)
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) return 'vi';
    // Indonesian common words
    if (/\b(dan|yang|untuk|dengan|ini|itu|adalah|akan|bisa|tidak|ada|saya|kamu|sudah|belum|juga|atau|karena|sangat|lebih|banyak)\b/i.test(text)) return 'id';
    // Spanish common words
    if (/\b(el|la|los|las|un|una|de|en|que|y|es|por|con|para|como|más|pero|su|todo|esta)\b/i.test(text)) return 'es';
    // German common words
    if (/\b(der|die|das|und|ist|von|zu|den|mit|sich|des|auf|für|nicht|ein|eine|dem|als|auch)\b/i.test(text)) return 'de';
    // French common words
    if (/\b(le|la|les|de|du|des|un|une|et|est|en|que|qui|dans|ce|il|elle|ne|pas|plus|pour)\b/i.test(text)) return 'fr';
    // Default to English
    return 'en';
  }

  async function translateContent(title, desc, srcLang, targetLang) {
    // srcLang and targetLang can be either language codes (e.g., 'es') or raw names from UI (e.g., 'Spanyol', 'Spanish')
    // If it's a code, convert to name. If it's already a name, use it directly.
    const srcLangName = srcLang.length <= 5 ? getLangName(srcLang) : srcLang;
    const targetLangName = targetLang.length <= 5 ? getLangName(targetLang) : targetLang;
    
    console.log('[YT Assistant] Translating from', srcLangName, 'to', targetLangName);
    
    // If source and target are the same, don't translate
    if (srcLangName.toLowerCase() === targetLangName.toLowerCase()) {
      console.log('[YT Assistant] Source and target language are the same, skipping translation');
      return { title: title, description: desc };
    }
    
    // Get example phrases for the target language to help AI understand
    // Support both language codes and language names (in various languages)
    const examplePhrases = {
      // By code
      'es': 'Spanish examples: "Hola", "¿Cómo estás?", "Bienvenido"',
      'pt': 'Portuguese examples: "Olá", "Como você está?", "Bem-vindo"',
      'fr': 'French examples: "Bonjour", "Comment allez-vous?", "Bienvenue"',
      'de': 'German examples: "Hallo", "Wie geht es Ihnen?", "Willkommen"',
      'it': 'Italian examples: "Ciao", "Come stai?", "Benvenuto"',
      'ja': 'Japanese examples: "こんにちは", "お元気ですか?", "ようこそ"',
      'ko': 'Korean examples: "안녕하세요", "어떻게 지내세요?", "환영합니다"',
      'zh': 'Chinese examples: "你好", "你好吗?", "欢迎"',
      'ru': 'Russian examples: "Привет", "Как дела?", "Добро пожаловать"',
      'ar': 'Arabic examples: "مرحبا", "كيف حالك؟", "أهلا وسهلا"',
      'id': 'Indonesian examples: "Halo", "Apa kabar?", "Selamat datang"',
      'jv': 'Javanese examples: "Sugeng", "Piye kabare?", "Sugeng rawuh"',
      // By name (English)
      'spanish': 'Spanish examples: "Hola", "¿Cómo estás?", "Bienvenido"',
      'portuguese': 'Portuguese examples: "Olá", "Como você está?", "Bem-vindo"',
      'french': 'French examples: "Bonjour", "Comment allez-vous?", "Bienvenue"',
      'german': 'German examples: "Hallo", "Wie geht es Ihnen?", "Willkommen"',
      'italian': 'Italian examples: "Ciao", "Come stai?", "Benvenuto"',
      'japanese': 'Japanese examples: "こんにちは", "お元気ですか?", "ようこそ"',
      'korean': 'Korean examples: "안녕하세요", "어떻게 지내세요?", "환영합니다"',
      'chinese': 'Chinese examples: "你好", "你好吗?", "欢迎"',
      'russian': 'Russian examples: "Привет", "Как дела?", "Добро пожаловать"',
      'arabic': 'Arabic examples: "مرحبا", "كيف حالك؟", "أهلا وسهلا"',
      'indonesian': 'Indonesian examples: "Halo", "Apa kabar?", "Selamat datang"',
      'javanese': 'Javanese examples: "Sugeng", "Piye kabare?", "Sugeng rawuh"',
      // By name (Indonesian UI)
      'spanyol': 'Spanish examples: "Hola", "¿Cómo estás?", "Bienvenido"',
      'portugis': 'Portuguese examples: "Olá", "Como você está?", "Bem-vindo"',
      'prancis': 'French examples: "Bonjour", "Comment allez-vous?", "Bienvenue"',
      'jerman': 'German examples: "Hallo", "Wie geht es Ihnen?", "Willkommen"',
      'italia': 'Italian examples: "Ciao", "Come stai?", "Benvenuto"',
      'jepang': 'Japanese examples: "こんにちは", "お元気ですか?", "ようこそ"',
      'korea': 'Korean examples: "안녕하세요", "어떻게 지내세요?", "환영합니다"',
      'mandarin': 'Chinese examples: "你好", "你好吗?", "欢迎"',
      'rusia': 'Russian examples: "Привет", "Как дела?", "Добро пожаловать"',
      'arab': 'Arabic examples: "مرحبا", "كيف حالك؟", "أهلا وسهلا"',
      'indonesia': 'Indonesian examples: "Halo", "Apa kabar?", "Selamat datang"',
      'jawa': 'Javanese examples: "Sugeng", "Piye kabare?", "Sugeng rawuh"'
    };
    
    const example = examplePhrases[targetLang.toLowerCase()] || examplePhrases[targetLangName.toLowerCase()] || '';
    
    const prompt = `You are a professional translator. Translate this YouTube content from ${srcLangName} to ${targetLangName}.

⚠️ CRITICAL: Output MUST be in ${targetLangName} language! NOT Javanese, NOT any other language!
${example}

SOURCE (${srcLangName}):
${title ? `TITLE: ${title}` : ''}
${desc ? `\nDESCRIPTION:\n${desc}` : ''}

RULES:
1. Translate to ${targetLangName} ONLY
2. Keep emojis exactly as they are
3. Translate hashtag words but keep # symbol
4. Natural fluent translation, not word-by-word
5. Keep line breaks and formatting
6. ⚠️ TITLE MUST BE 100 CHARACTERS OR LESS (YouTube limit)! If translation is longer, shorten it while keeping the meaning.

OUTPUT FORMAT:
TRANSLATED_TITLE: [${targetLangName} translation - MAX 100 chars!]
TRANSLATED_DESCRIPTION: [${targetLangName} translation]`;

    const result = await callGemini(prompt, 2000);

    // Parse result
    let translatedTitle = '';
    let translatedDesc = '';

    const titleMatch = result.match(/TRANSLATED_TITLE:\s*(.+?)(?=TRANSLATED_DESCRIPTION:|$)/s);
    const descMatch = result.match(/TRANSLATED_DESCRIPTION:\s*([\s\S]+)/);

    if (titleMatch) translatedTitle = titleMatch[1].trim();
    if (descMatch) translatedDesc = descMatch[1].trim();
    
    // Enforce 100 character limit for title (YouTube requirement)
    if (translatedTitle.length > 100) {
      console.log('[YT Assistant] Title too long (' + translatedTitle.length + ' chars), truncating to 100');
      // Try to cut at last space before 100 chars to avoid cutting words
      const truncated = translatedTitle.substring(0, 97);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 70) {
        translatedTitle = truncated.substring(0, lastSpace) + '...';
      } else {
        translatedTitle = truncated + '...';
      }
    }
    
    console.log('[YT Assistant] Parsed title (' + translatedTitle.length + ' chars):', translatedTitle.substring(0, 50));
    console.log('[YT Assistant] Parsed desc:', translatedDesc.substring(0, 50));

    return { title: translatedTitle, description: translatedDesc };
  }

  function updateTranslateStatus(message) {
    const statusEl = document.querySelector('#yt-translate-status');
    if (statusEl) statusEl.textContent = message;
  }

  function showToast(message, isError = false) {
    const existing = document.querySelector('.yt-assistant-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'yt-assistant-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? '#d93025' : '#323232'};
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  let isInjectingSubtitle = false; // Guard to prevent re-entry
  
  function injectSubtitleButton() {
    // Prevent re-entry
    if (isInjectingSubtitle) return;
    isInjectingSubtitle = true;
    
    try {
      // Check if on subtitles/translations page
      const isTranslationPage = window.location.href.includes('translations') || window.location.href.includes('subtitles');
      
      if (!isTranslationPage) {
        const existingBtn = document.getElementById('yt-assist-translate-btn');
        if (existingBtn) existingBtn.remove();
        const existingFallback = document.getElementById('yt-assist-translate-btn-fallback');
        if (existingFallback) existingFallback.remove();
        const existingContainer = document.getElementById('yt-assist-translate-container');
        if (existingContainer) existingContainer.remove();
        return;
      }
      
      // Check if button already exists IN THE RIGHT PLACE (inside dialog)
      const existingBtn = document.getElementById('yt-assist-translate-btn');
      if (existingBtn) {
        // Check if button is inside a dialog
        const isInDialog = existingBtn.closest('tp-yt-paper-dialog, ytcp-dialog');
        const rect = existingBtn.getBoundingClientRect();
        
        if (isInDialog && rect.width > 0 && rect.height > 0) {
          // Button already in correct position
          return;
        }
        
        // Button exists but NOT in dialog (fallback position) - remove it
        existingBtn.remove();
      }
      
      // Also remove container and fallback
      const existingContainer = document.getElementById('yt-assist-translate-container');
      if (existingContainer) existingContainer.remove();
      
      const existingFallback = document.getElementById('yt-assist-translate-btn-fallback');
      if (existingFallback) existingFallback.remove();
    
    // Find visible dialog - try multiple approaches
    let dialog = null;
    
    // Approach 1: Find tp-yt-paper-dialog with visible size
    const paperDialogs = document.querySelectorAll('tp-yt-paper-dialog');
    for (const d of paperDialogs) {
      const rect = d.getBoundingClientRect();
      console.log('[YT Assistant] Checking tp-yt-paper-dialog:', rect.width + 'x' + rect.height);
      if (rect.width > 400 && rect.height > 200) {
        dialog = d;
        break;
      }
    }
    
    // Approach 2: If no paper dialog, try ytcp-dialog
    if (!dialog) {
      const ytcpDialogs = document.querySelectorAll('ytcp-dialog');
      for (const d of ytcpDialogs) {
        const rect = d.getBoundingClientRect();
        console.log('[YT Assistant] Checking ytcp-dialog:', rect.width + 'x' + rect.height);
        // For ytcp-dialog, check if it has visible content inside
        if (rect.width > 400) {
          // Check for inner content
          const innerContent = d.querySelector('tp-yt-paper-dialog, [class*="dialog"], [class*="content"]');
          if (innerContent) {
            const innerRect = innerContent.getBoundingClientRect();
            console.log('[YT Assistant] Inner content:', innerRect.width + 'x' + innerRect.height);
            if (innerRect.height > 200) {
              dialog = innerContent.tagName === 'TP-YT-PAPER-DIALOG' ? innerContent : d;
              break;
            }
          }
        }
      }
    }
    
    // Approach 3: Find any large visible element that looks like a dialog
    if (!dialog) {
      const allElements = document.querySelectorAll('[class*="dialog"], [class*="modal"], [role="dialog"]');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 500 && rect.height > 300) {
          console.log('[YT Assistant] Found dialog-like element:', el.tagName, el.className.substring(0, 50));
          dialog = el;
          break;
        }
      }
    }
    
      if (dialog) {
        const rect = dialog.getBoundingClientRect();
        console.log('[YT Assistant] ✅ Using dialog:', dialog.tagName, rect.width + 'x' + rect.height);
        injectButtonToDialog(dialog);
        return;
      }
      
      console.log('[YT Assistant] No visible dialog found, button will not be injected');
    } finally {
      // Reset guard after a short delay
      setTimeout(() => {
        isInjectingSubtitle = false;
      }, 100);
    }
  }
  
  function injectButtonToDialog(dialog) {
    console.log('[YT Assistant] Injecting button to dialog...');
    
    // First, remove fallback button if it exists
    const fallbackBtn = document.getElementById('yt-assist-translate-btn-fallback');
    if (fallbackBtn) {
      console.log('[YT Assistant] Removing fallback button');
      fallbackBtn.remove();
    }
    
    // Multi-language detection for translation header
    const allElements = dialog.querySelectorAll('div, span');
    let translationHeader = null;
    
    // Translation keywords in multiple languages (including Southeast Asian)
    const translationKeywords = [
      'translation',      // English
      'traducción',       // Spanish
      'traduction',       // French
      'tradução',         // Portuguese
      'übersetzung',      // German
      'traduzione',       // Italian
      'terjemahan',       // Indonesian
      '翻訳',             // Japanese
      '번역',             // Korean
      '翻译',             // Chinese Simplified
      '翻譯',             // Chinese Traditional
      'перевод',          // Russian
      'çeviri',           // Turkish
      'tłumaczenie',      // Polish
      'vertaling',        // Dutch
      'översättning',     // Swedish
      'käännös',          // Finnish
      'μετάφραση',        // Greek
      'תרגום',            // Hebrew
      'ترجمة',            // Arabic
      'fordítás',         // Hungarian
      'překlad',          // Czech
      'preklad',          // Slovak
      'превод',           // Bulgarian
      'prijevod',         // Croatian
      'traducere',        // Romanian
      'oversættelse',     // Danish
      'oversettelse',     // Norwegian
      // Southeast Asian languages
      'penterjemahan',    // Malay
      'การแปล',          // Thai
      'dịch',             // Vietnamese
      'pagsasalin',       // Filipino/Tagalog
      'ဘာသာပြန်',        // Burmese
      'ការបកប្រែ',        // Khmer
      'ການແປ'            // Lao
    ];
    
    for (const el of allElements) {
      const text = el.textContent.trim().toLowerCase();
      
      // Check if text starts with any translation keyword
      const isTranslationHeader = translationKeywords.some(keyword => 
        text.startsWith(keyword)
      );
      
      if (isTranslationHeader) {
        translationHeader = el;
        console.log('[YT Assistant] Found translation header:', el.textContent.substring(0, 50));
        break;
      }
    }
    
    if (!translationHeader) {
      console.log('[YT Assistant] Translation header not found, using fallback position');
      // Fallback: inject at top right of dialog
      dialog.style.position = 'relative';
      const container = createTranslateButton();
      container.style.cssText = 'position: absolute; top: 12px; right: 12px; z-index: 9999;';
      dialog.appendChild(container);
      console.log('[YT Assistant] ✅ Button injected to dialog (fallback position)');
      return;
    }
    
    // Simple approach: inject button in a wrapper with centering
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      justify-content: center;
      margin-top: 12px;
      margin-bottom: 12px;
      background: transparent;
    `;
    
    const container = createTranslateButton();
    wrapper.appendChild(container);
    
    // Insert after translation header's parent element
    const headerParent = translationHeader.parentElement;
    if (headerParent.nextSibling) {
      headerParent.parentElement.insertBefore(wrapper, headerParent.nextSibling);
    } else {
      headerParent.parentElement.appendChild(wrapper);
    }
    
    console.log('[YT Assistant] ✅ Button injected below translation header (centered)');
  }
  
  function createTranslateButton() {
    const container = document.createElement('div');
    container.id = 'yt-assist-translate-container';
    container.style.cssText = 'position: relative; display: inline-block; background: transparent;';
    
    const button = document.createElement('button');
    button.id = 'yt-assist-translate-btn';
    button.className = 'yt-assistant-btn yt-assistant-btn-primary';
    button.style.cssText = 'margin: 0;';
    
    // Use translation based on current language
    const translateText = __('autoTranslate');
    const translatingText = __('translating');
    const completedText = '✅ ' + __('translationComplete');
    const errorText = '❌ ' + __('error');
    
    button.innerHTML = `<span class="yt-btn-icon">🌐</span> ${translateText}`;
    
    const status = document.createElement('span');
    status.id = 'yt-translate-status';
    status.style.cssText = 'position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%); font-size: 12px; color: #606060; background: transparent; white-space: nowrap;';
    
    button.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      button.disabled = true;
      button.innerHTML = `<span class="yt-btn-icon">⏳</span> ${translatingText}`;
      status.textContent = '';
      
      try {
        await autoTranslateSubtitle('auto');
        status.textContent = completedText;
        status.style.color = '#34a853';
      } catch (err) {
        console.error('[YT Assistant] Error:', err);
        status.textContent = `${errorText}: ${err.message}`;
        status.style.color = '#d93025';
      }
      
      button.disabled = false;
      button.innerHTML = `<span class="yt-btn-icon">🌐</span> ${translateText}`;
    };
    
    container.appendChild(button);
    container.appendChild(status);
    return container;
  }

  function injectFallbackButton() {
    const existingFallback = document.getElementById('yt-assist-translate-btn-fallback');
    if (existingFallback) return;
    
    const container = document.createElement('div');
    container.id = 'yt-assist-translate-btn-fallback';
    container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    
    const button = document.createElement('button');
    button.id = 'yt-assist-translate-btn';
    button.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      background: #3ea6ff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    button.textContent = '✨ Translate';
    
    const status = document.createElement('span');
    status.id = 'yt-translate-status';
    status.style.cssText = `
      font-size: 12px;
      color: #606060;
      background: white;
      padding: 6px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      text-align: center;
    `;
    
    button.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      button.disabled = true;
      button.textContent = '⏳ Translating...';
      status.textContent = '';
      
      try {
        await autoTranslateSubtitle('auto');
        status.textContent = '✅ Done';
        status.style.color = '#34a853';
      } catch (err) {
        console.error('[YT Assistant] Error:', err);
        status.textContent = '❌ ' + err.message;
        status.style.color = '#d93025';
      }
      
      button.disabled = false;
      button.textContent = '✨ Translate';
    };
    
    container.appendChild(button);
    container.appendChild(status);
    document.body.appendChild(container);
    
    console.log('[YT Assistant] ✅ Fallback button injected');
  }

  function injectVideoDetailsButtons() {
    // Find all ytcp-social-suggestions-textbox elements
    const allTextboxContainers = document.querySelectorAll('ytcp-social-suggestions-textbox');
    
    // Multi-language keywords (including Southeast Asian languages)
    const titleKeywords = [
      'title', 'título', 'titre', 'titel', 'titolo', 'judul',  // Western + Indonesian
      'タイトル', '제목', '标题', '標題', 'заголовок', 'başlık',  // East Asian + Russian + Turkish
      'tytuł', 'tittel', 'otsikko', 'τίτλος', 'כותרת', 'عنوان',  // European + Hebrew + Arabic
      // Southeast Asian languages
      'tajuk',           // Malay
      'ชื่อ',            // Thai
      'tiêu đề',         // Vietnamese
      'pamagat',         // Filipino/Tagalog
      'ခေါင်းစဉ်',      // Burmese
      'ចំណងជើង',        // Khmer
      'ຫົວຂໍ້'           // Lao
    ];
    
    const descKeywords = [
      'description', 'descripción', 'descrição', 'beschreibung',  // Western
      'descrizione', 'deskripsi', '説明', '설명', '描述', 'описание',  // + Indonesian + East Asian + Russian
      'açıklama', 'opis', 'beskrivelse', 'kuvaus', 'περιγραφή', 'תיאור', 'وصف',  // Turkish + European + Hebrew + Arabic
      // Southeast Asian languages
      'penerangan', 'keterangan',  // Malay
      'คำอธิบาย',                   // Thai
      'mô tả',                      // Vietnamese
      'paglalarawan',               // Filipino/Tagalog
      'ဖော်ပြချက်',                // Burmese
      'ការពិពណ៌នា',                 // Khmer
      'ລາຍລະອຽດ'                   // Lao
    ];
    
    // Track which containers we've processed
    let titleInjected = false;
    let descInjected = false;
    
    allTextboxContainers.forEach((container, index) => {
      // Skip if already has buttons
      if (container.querySelector('#yt-assist-title-btns') || container.querySelector('#yt-assist-desc-btns')) {
        return;
      }
      
      const label = (container.getAttribute('label') || '').toLowerCase();
      const ariaLabel = (container.querySelector('#textbox')?.getAttribute('aria-label') || '').toLowerCase();
      const combinedText = label + ' ' + ariaLabel;
      
      // Check if it's a title field
      const isTitle = titleKeywords.some(keyword => combinedText.includes(keyword));
      
      // Check if it's a description field
      const isDesc = descKeywords.some(keyword => combinedText.includes(keyword));
      
      // Fallback: Use position-based detection if keywords don't match
      // First textbox is usually title, second is usually description
      const isTitleByPosition = !titleInjected && !isDesc && index === 0;
      const isDescByPosition = !descInjected && !isTitle && index === 1;
      
      // Title buttons
      if ((isTitle || isTitleByPosition) && !titleInjected) {
        const btns = createTitleButtons();
        btns.id = 'yt-assist-title-btns';
        container.appendChild(btns);
        titleInjected = true;
        console.log('[YT Assistant] Title buttons injected', isTitle ? '(keyword match)' : '(position-based)');
      }
      
      // Description buttons
      if ((isDesc || isDescByPosition) && !descInjected) {
        const btns = createDescriptionButtons();
        btns.id = 'yt-assist-desc-btns';
        container.appendChild(btns);
        descInjected = true;
        console.log('[YT Assistant] Description buttons injected', isDesc ? '(keyword match)' : '(position-based)');
      }
    });

    // Find tags area
    const tagsContainer = document.querySelector('#tags-container, ytcp-video-metadata-editor-sidepanel #tags, #tags-container-free-text-chip-bar');
    if (tagsContainer && !document.querySelector('#yt-assist-tags-btns')) {
      const btns = createTagsButtons();
      btns.id = 'yt-assist-tags-btns';
      tagsContainer.appendChild(btns);
      console.log('[YT Assistant] Tags buttons injected');
    }
  }

  // ========== POLLING FALLBACK ==========
  setInterval(() => {
    injectSubtitleButton();
    injectVideoDetailsButtons();
  }, 2000);



  // ========== DEBUG HELPERS ==========
  window.ytAssistantDebug = {
    findDialogs: () => {
      const selectors = [
        'tp-yt-paper-dialog', 
        'ytcp-dialog', 
        '[role="dialog"]', 
        '.ytcp-dialog', 
        'dialog',
        'ytcp-video-translations-dialog',
        '[class*="dialog"]'
      ];
      console.log('=== YT Assistant Dialog Finder ===');
      selectors.forEach(sel => {
        const found = document.querySelectorAll(sel);
        console.log(`${sel}: ${found.length} found`);
        found.forEach((d, i) => {
          const rect = d.getBoundingClientRect();
          const style = window.getComputedStyle(d);
          console.log(`  [${i}] ${rect.width}x${rect.height}, display: ${style.display}, visibility: ${style.visibility}, position: ${style.position}`);
          console.log(`      classes: ${d.className}`);
          console.log(`      id: ${d.id}`);
        });
      });
      
      // Also check for existing button
      const btn = document.getElementById('yt-assist-translate-btn');
      const fallback = document.getElementById('yt-assist-translate-btn-fallback');
      console.log('Button in dialog:', btn ? 'YES' : 'NO');
      console.log('Fallback button:', fallback ? 'YES' : 'NO');
      if (btn) {
        const btnRect = btn.getBoundingClientRect();
        console.log(`Button position: ${btnRect.left}, ${btnRect.top}`);
      }
    },
    injectNow: () => {
      console.log('=== Forcing inject ===');
      injectSubtitleButton();
    },
    checkPage: () => {
      console.log('=== Page Check ===');
      console.log('URL:', window.location.href);
      console.log('Is translation page:', window.location.href.includes('translations') || window.location.href.includes('subtitles'));
      console.log('Button exists:', !!document.getElementById('yt-assist-translate-btn'));
    }
  };
  
  console.log('[YT Assistant] Debug helpers available: window.ytAssistantDebug');

  // ========== INITIALIZE ==========
  function handleMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.tagName === 'YTCP-DIALOG' || node.querySelector('ytcp-dialog')) {
              setTimeout(injectSubtitleButton, 500);
            }
            if (node.id === 'main-container' || node.tagName === 'YTCP-APP') {
              setTimeout(injectVideoDetailsButtons, 1000);
            }
          }
        }
      }
    }

    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectVideoDetailsButtons, 1000);
      setTimeout(injectSubtitleButton, 1000);
    }
  }

  // ========== MULTI-LANGUAGE AUTO TRANSLATION ==========
  
  // Get localized language names based on UI language
  function getLanguageName(code) {
    // Use ALL_LANGUAGES database
    const lang = ALL_LANGUAGES[code];
    return lang ? lang.name : code;
  }
  
  // Build language checkbox HTML
  function buildLanguageCheckbox(code) {
    const lang = getLangInfo(code);
    const isProtected = PROTECTED_LANGUAGES.includes(code);
    const canDrag = !isProtected; // Protected languages cannot be dragged
    
    return `
      <div class="yt-lang-item" data-code="${code}" draggable="${canDrag}" style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: ${canDrag ? 'grab' : 'default'};
        transition: all 0.15s;
        border: 1px solid ${isProtected ? '#fde68a' : 'transparent'};
        background: ${isProtected ? '#fefce8' : 'white'};
        position: relative;
      ">
        <input type="checkbox" class="yt-multi-lang-check" value="${code}" style="
          width: 14px;
          height: 14px;
          accent-color: #f97316;
        ">
        <span style="font-size: 14px;">${lang.flag}</span>
        <span style="color: #374151; font-size: 12px; flex: 1;">${lang.name}</span>
        ${isProtected ? `<span style="font-size: 10px; color: #ca8a04;" title="Default language">⭐</span>` : `
          <button class="yt-lang-remove" data-code="${code}" style="
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 2px;
            font-size: 12px;
            line-height: 1;
            border-radius: 4px;
            opacity: 0;
            transition: all 0.15s;
          " title="Remove">✕</button>
        `}
      </div>
    `;
  }
  
  // Build add language dropdown
  function buildAddLanguageDropdown() {
    const available = getAvailableLanguages();
    // Sort available languages alphabetically by name
    const sortedAvailable = available.sort((a, b) => {
      const nameA = getLangInfo(a).name.toLowerCase();
      const nameB = getLangInfo(b).name.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    const options = sortedAvailable.map(code => {
      const lang = getLangInfo(code);
      return `<option value="${code}">${lang.flag} ${lang.name}</option>`;
    }).join('');
    
    return `
      <div id="yt-add-lang-section" style="
        margin-bottom: 12px;
      ">
        <!-- Dropdown for known languages -->
        <div style="
          display: flex;
          gap: 6px;
          padding: 8px;
          background: #fef7ed;
          border-radius: 8px 8px 0 0;
          border: 1px dashed #f97316;
          border-bottom: none;
        ">
          <select id="yt-add-lang-select" style="
            flex: 1;
            padding: 6px 8px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 12px;
            background: white;
          ">
            <option value="">➕ ${__('addLanguage') || 'Add Language...'}</option>
            ${options}
          </select>
          <button id="yt-add-lang-btn" style="
            padding: 6px 12px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          ">➕</button>
        </div>
        
        <!-- Custom language input -->
        <div style="
          display: flex;
          gap: 6px;
          padding: 8px;
          background: #f3f4f6;
          border-radius: 0 0 8px 8px;
          border: 1px dashed #9ca3af;
          border-top: none;
        ">
          <input type="text" id="yt-custom-lang-input" placeholder="${__('customLangCode') || 'Custom code (e.g. sw, fil)'}" style="
            flex: 1;
            padding: 6px 8px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 11px;
            background: white;
          ">
          <input type="text" id="yt-custom-lang-name" placeholder="${__('languageName') || 'Language name'}" style="
            flex: 1;
            padding: 6px 8px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 11px;
            background: white;
          ">
          <button id="yt-add-custom-lang-btn" style="
            padding: 6px 10px;
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          " title="${__('addCustomLanguage') || 'Add custom language'}">+</button>
        </div>
        
        <!-- Reset & Sort buttons -->
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <button id="yt-reset-langs-btn" style="
            flex: 1;
            padding: 6px 10px;
            background: transparent;
            color: #6b7280;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.15s;
          ">🔄 ${__('resetToDefault') || 'Reset to Default'}</button>
          <button id="yt-sort-langs-btn" style="
            flex: 1;
            padding: 6px 10px;
            background: transparent;
            color: #6b7280;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.15s;
          ">🔤 ${__('sortAlphabetically') || 'Sort A-Z'}</button>
        </div>
        
        <!-- Inline status message -->
        <div id="yt-lang-status" style="
          display: none;
          padding: 6px 10px;
          margin-top: 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          text-align: center;
          transition: all 0.2s;
        "></div>
      </div>
    `;
  }
  
  // Show inline language status
  function showLangStatus(message, type = 'success') {
    const statusDiv = document.getElementById('yt-lang-status');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
      statusDiv.style.background = '#ecfdf5';
      statusDiv.style.color = '#059669';
      statusDiv.style.border = '1px solid #a7f3d0';
    } else if (type === 'error') {
      statusDiv.style.background = '#fef2f2';
      statusDiv.style.color = '#dc2626';
      statusDiv.style.border = '1px solid #fecaca';
    } else {
      statusDiv.style.background = '#fef7ed';
      statusDiv.style.color = '#d97706';
      statusDiv.style.border = '1px solid #fed7aa';
    }
    
    // Auto hide after delay (longer for errors)
    const hideDelay = type === 'error' ? 4000 : 2000;
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, hideDelay);
  }
  
  // Rebuild language grid
  function rebuildLanguageGrid() {
    const gridContainer = document.getElementById('yt-lang-grid');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = userLanguages.map(code => buildLanguageCheckbox(code)).join('');
    
    // Re-attach event listeners
    attachLanguageGridEvents();
    
    // Update add dropdown
    const addSection = document.getElementById('yt-add-lang-section');
    if (addSection) {
      const available = getAvailableLanguages();
      const select = document.getElementById('yt-add-lang-select');
      if (select) {
        select.innerHTML = `
          <option value="">➕ ${__('addLanguage') || 'Add Language...'}</option>
          ${available.map(code => {
            const lang = getLangInfo(code);
            return `<option value="${code}">${lang.flag} ${lang.name}</option>`;
          }).join('')}
        `;
      }
    }
  }
  
  // Attach drag & drop and remove events
  function attachLanguageGridEvents() {
    const gridContainer = document.getElementById('yt-lang-grid');
    if (!gridContainer) return;
    
    let draggedItem = null;
    let draggedIndex = -1;
    
    // Remove button events
    gridContainer.querySelectorAll('.yt-lang-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.dataset.code;
        const langName = getLangInfo(code).name;
        if (removeLanguage(code)) {
          rebuildLanguageGrid();
          const msg = Lf('languageRemoved', currentLang, { name: langName }) || `${langName} removed`;
          showLangStatus(`🗑️ ${msg}`, 'error');
        }
      });
    });
    
    // Show remove button on hover
    gridContainer.querySelectorAll('.yt-lang-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const removeBtn = item.querySelector('.yt-lang-remove');
        if (removeBtn) removeBtn.style.opacity = '1';
        item.style.background = '#fef7ed';
      });
      item.addEventListener('mouseleave', () => {
        const removeBtn = item.querySelector('.yt-lang-remove');
        if (removeBtn) removeBtn.style.opacity = '0';
        item.style.background = 'white';
      });
      
      // Drag events
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        draggedIndex = Array.from(gridContainer.children).indexOf(item);
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });
      
      item.addEventListener('dragend', () => {
        if (draggedItem) {
          draggedItem.style.opacity = '1';
          draggedItem = null;
        }
        gridContainer.querySelectorAll('.yt-lang-item').forEach(i => {
          i.style.borderTop = '1px solid transparent';
          i.style.borderBottom = '1px solid transparent';
        });
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          item.style.borderTop = '2px solid #f97316';
          item.style.borderBottom = '1px solid transparent';
        } else {
          item.style.borderTop = '1px solid transparent';
          item.style.borderBottom = '2px solid #f97316';
        }
      });
      
      item.addEventListener('dragleave', () => {
        item.style.borderTop = '1px solid transparent';
        item.style.borderBottom = '1px solid transparent';
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === item) return;
        
        const toIndex = Array.from(gridContainer.children).indexOf(item);
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertAfter = e.clientY > midY;
        
        const finalIndex = insertAfter ? toIndex : toIndex;
        
        if (draggedIndex !== finalIndex) {
          reorderLanguages(draggedIndex, finalIndex);
          rebuildLanguageGrid();
        }
        
        item.style.borderTop = '1px solid transparent';
        item.style.borderBottom = '1px solid transparent';
      });
    });
  }
  
  async function injectMultiLanguageSection() {
    // Only show on translations page
    const isTranslationsPage = window.location.href.includes('/translations');
    
    // Remove panel if not on translations page
    const existingPanel = document.getElementById('yt-multi-lang-panel');
    if (!isTranslationsPage) {
      if (existingPanel) {
        console.log('[YT Assistant] Removing multi-lang panel (not on translations page)');
        existingPanel.remove();
      }
      return;
    }
    
    // Check if already injected
    if (existingPanel) return;
    
    // Find a good place to inject (top of page)
    const mainContainer = document.querySelector('#main-container, ytcp-app');
    if (!mainContainer) return;
    
    // Create panel with modern design - responsive
    const panel = document.createElement('div');
    panel.id = 'yt-multi-lang-panel';
    panel.className = 'yt-multi-lang-panel';
    
    // Responsive sizing based on screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate responsive dimensions
    let panelWidth, panelRight, panelTop, maxHeight, langGridHeight, logHeight;
    
    if (screenWidth <= 1024) {
      // Small screens (tablets, small laptops)
      panelWidth = 'min(320px, 90vw)';
      panelRight = '10px';
      panelTop = '60px';
      maxHeight = '85vh';
      langGridHeight = '150px';
      logHeight = '100px';
    } else if (screenWidth <= 1440) {
      // Medium screens (standard laptops)
      panelWidth = '340px';
      panelRight = '15px';
      panelTop = '65px';
      maxHeight = '88vh';
      langGridHeight = '180px';
      logHeight = '120px';
    } else if (screenWidth <= 1920) {
      // Large screens (full HD)
      panelWidth = '360px';
      panelRight = '20px';
      panelTop = '70px';
      maxHeight = '90vh';
      langGridHeight = '200px';
      logHeight = '150px';
    } else {
      // Extra large screens (2K, 4K)
      panelWidth = '400px';
      panelRight = '25px';
      panelTop = '80px';
      maxHeight = '92vh';
      langGridHeight = '250px';
      logHeight = '180px';
    }
    
    // Store responsive values for child elements
    panel.dataset.langGridHeight = langGridHeight;
    panel.dataset.logHeight = logHeight;
    
    panel.style.cssText = `
      position: fixed;
      top: ${panelTop};
      right: ${panelRight};
      z-index: 9999;
      background: linear-gradient(135deg, #ffffff 0%, #fef7ed 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(217, 119, 6, 0.15), 0 2px 8px rgba(0,0,0,0.08);
      padding: 0;
      width: ${panelWidth};
      max-width: 95vw;
      max-height: ${maxHeight};
      overflow-y: auto;
      border: 1px solid rgba(217, 119, 6, 0.2);
      transition: all 0.3s ease;
    `;
    
    // Add resize listener for dynamic responsiveness
    const resizeHandler = () => {
      const newWidth = window.innerWidth;
      const langGridContainer = document.getElementById('yt-lang-grid-container');
      const logDiv = document.getElementById('yt-multi-lang-log');
      
      let newLangGridHeight, newLogHeight;
      
      if (newWidth <= 1024) {
        panel.style.width = 'min(320px, 90vw)';
        panel.style.right = '10px';
        panel.style.top = '60px';
        panel.style.maxHeight = '85vh';
        newLangGridHeight = '150px';
        newLogHeight = '100px';
      } else if (newWidth <= 1440) {
        panel.style.width = '340px';
        panel.style.right = '15px';
        panel.style.top = '65px';
        panel.style.maxHeight = '88vh';
        newLangGridHeight = '180px';
        newLogHeight = '120px';
      } else if (newWidth <= 1920) {
        panel.style.width = '360px';
        panel.style.right = '20px';
        panel.style.top = '70px';
        panel.style.maxHeight = '90vh';
        newLangGridHeight = '200px';
        newLogHeight = '150px';
      } else {
        panel.style.width = '400px';
        panel.style.right = '25px';
        panel.style.top = '80px';
        panel.style.maxHeight = '92vh';
        newLangGridHeight = '250px';
        newLogHeight = '180px';
      }
      
      // Update child elements
      if (langGridContainer) langGridContainer.style.maxHeight = newLangGridHeight;
      if (logDiv) logDiv.style.maxHeight = newLogHeight;
    };
    
    window.addEventListener('resize', resizeHandler);
    
    panel.innerHTML = `
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        padding: 14px 18px;
        border-radius: 12px 12px 0 0;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: white; display: flex; align-items: center; gap: 8px;">
            🌍 ${__('multiLangTitle')}
          </h3>
          <div style="display: flex; gap: 6px;">
            <button id="yt-multi-lang-layout" style="
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="Toggle Layout (Portrait/Landscape)">📐</button>
            <button id="yt-multi-lang-minimize" style="
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="Minimize">−</button>
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <div id="yt-multi-lang-content" style="padding: 10px;">
        <!-- Select Languages Label -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <p style="margin: 0; font-size: 13px; color: #374151; font-weight: 600;">
            📋 ${__('selectLanguages')}
          </p>
          <span style="font-size: 11px; color: #6b7280; font-weight: 500;">🔀 ${__('dragToReorder') || 'Drag to reorder'}</span>
        </div>
        
        <!-- Add Language Section -->
        ${buildAddLanguageDropdown()}
        
        <!-- Language Grid (Dynamic) -->
        <div id="yt-lang-grid-container" style="
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px;
          background: white;
          margin-bottom: 8px;
          max-height: ${langGridHeight};
          overflow-y: auto;
        ">
          <div id="yt-lang-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
            ${userLanguages.map(code => buildLanguageCheckbox(code)).join('')}
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
          <button id="yt-multi-lang-select-all" style="
            flex: 1;
            padding: 6px 10px;
            background: white;
            color: #6b7280;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          ">${__('selectAll')}</button>
          <button id="yt-multi-lang-clear-all" style="
            flex: 1;
            padding: 6px 10px;
            background: white;
            color: #6b7280;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          ">${__('clearAll')}</button>
        </div>
        
        <!-- Start Button -->
        <button id="yt-multi-lang-start-btn" style="
          width: 100%;
          padding: 10px 14px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          <span>▶️</span>
          <span>${__('startAutoTranslation')}</span>
        </button>
        
        <!-- Control Buttons (hidden by default, shown during translation) -->
        <div id="yt-multi-lang-controls" style="display: none; margin-top: 8px;">
          <div style="display: flex; gap: 8px;">
            <button id="yt-multi-lang-pause-btn" style="
              flex: 1;
              padding: 8px 12px;
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            ">
              <span>⏸️</span>
              <span>${__('pause')}</span>
            </button>
            <button id="yt-multi-lang-stop-btn" style="
              flex: 1;
              padding: 8px 12px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            ">
              <span>⏹️</span>
              <span>${__('stop')}</span>
            </button>
          </div>
        </div>
        
        <!-- Progress Section (hidden by default) -->
        <div id="yt-multi-lang-progress-section" style="display: none; margin-top: 16px;">
          <!-- Progress Bar -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span id="yt-progress-text" style="font-size: 12px; color: #6b7280;">Processing...</span>
              <span id="yt-progress-percent" style="font-size: 12px; font-weight: 600; color: #f97316;">0%</span>
            </div>
            <div id="yt-progress-bar-container" style="
              height: 8px;
              background: #e5e7eb;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div id="yt-progress-bar" style="
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
                border-radius: 4px;
                transition: width 0.3s ease;
              "></div>
            </div>
          </div>
          
          <!-- Stats -->
          <div style="
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
          ">
            <div id="yt-stat-success" style="
              flex: 1;
              padding: 10px;
              background: #ecfdf5;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #a7f3d0;
            ">
              <div style="font-size: 20px; font-weight: 700; color: #059669;">0</div>
              <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Success</div>
            </div>
            <div id="yt-stat-failed" style="
              flex: 1;
              padding: 10px;
              background: #fef2f2;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #fecaca;
            ">
              <div style="font-size: 20px; font-weight: 700; color: #dc2626;">0</div>
              <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Failed</div>
            </div>
            <div id="yt-stat-pending" style="
              flex: 1;
              padding: 10px;
              background: #fefce8;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #fde047;
            ">
              <div style="font-size: 20px; font-weight: 700; color: #ca8a04;">0</div>
              <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Pending</div>
            </div>
          </div>
          
          <!-- Time Stats -->
          <div id="yt-time-stats" style="
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            padding: 10px;
            background: #f3f4f6;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          ">
            <div style="flex: 1; text-align: center;">
              <div id="yt-time-current" style="font-size: 14px; font-weight: 700; color: #6b7280;">--</div>
              <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">Current</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div id="yt-time-avg" style="font-size: 14px; font-weight: 700; color: #3b82f6;">--</div>
              <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">Avg/Lang</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div id="yt-time-total" style="font-size: 14px; font-weight: 700; color: #059669;">00:00</div>
              <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">Total</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div id="yt-time-eta" style="font-size: 14px; font-weight: 700; color: #f97316;">--</div>
              <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">ETA</div>
            </div>
          </div>
          
          <!-- Failed Languages (for retry) -->
          <div id="yt-failed-section" style="display: none; margin-bottom: 12px;">
            <div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-bottom: 6px;">
              ❌ Failed Languages:
            </div>
            <div id="yt-failed-list" style="
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
            "></div>
            <button id="yt-retry-failed-btn" style="
              width: 100%;
              margin-top: 8px;
              padding: 8px 12px;
              background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            ">
              🔄 Retry Failed
            </button>
          </div>
        </div>
        
        <!-- Log Section -->
        <div id="yt-multi-lang-log" style="
          margin-top: 12px;
          font-size: 11px;
          max-height: ${logHeight};
          min-height: 60px;
          overflow-y: auto;
          display: none;
          background: #1f2937;
          border-radius: 8px;
          padding: 10px;
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
          line-height: 1.4;
        "></div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Attach language grid events (drag & drop, remove)
    attachLanguageGridEvents();
    
    // Add Language button event
    const addLangBtn = document.getElementById('yt-add-lang-btn');
    const addLangSelect = document.getElementById('yt-add-lang-select');
    
    addLangBtn.addEventListener('click', () => {
      const code = addLangSelect.value;
      if (code && addLanguage(code)) {
        rebuildLanguageGrid();
        const msg = Lf('languageAdded', currentLang, { name: getLangInfo(code).name }) || `${getLangInfo(code).name} added`;
        showLangStatus(`✅ ${msg}`, 'success');
        addLangSelect.value = '';
      }
    });
    
    addLangSelect.addEventListener('change', () => {
      const code = addLangSelect.value;
      if (code && addLanguage(code)) {
        rebuildLanguageGrid();
        const msg = Lf('languageAdded', currentLang, { name: getLangInfo(code).name }) || `${getLangInfo(code).name} added`;
        showLangStatus(`✅ ${msg}`, 'success');
        addLangSelect.value = '';
      }
    });
    
    // Watch for YouTube "Create" button dropdown and shift panel down
    const setupYouTubeDropdownWatcher = () => {
      // Create button labels in various languages
      const createLabels = [
        'create', 'buat', 'crear', 'créer', 'erstellen', 'crea', 'criar', 
        '作成', '만들기', '创建', '創建', 'создать', 'إنشاء', 'oluştur',
        'tạo', 'สร้าง', 'membuat', 'lumikha', 'बनाएं', 'upload'
      ];
      
      let panelShifted = false;
      const originalTop = parseInt(panel.style.top) || 70;
      
      // Check if element is Create button
      const isCreateButton = (el) => {
        if (!el) return false;
        
        // Check by ID
        if (el.id === 'create-icon' || el.closest('#create-icon')) return true;
        
        // Check by aria-label (case insensitive)
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        if (createLabels.some(label => ariaLabel.includes(label))) return true;
        
        // Check parent's aria-label
        const parent = el.closest('[aria-label]');
        if (parent) {
          const parentLabel = (parent.getAttribute('aria-label') || '').toLowerCase();
          if (createLabels.some(label => parentLabel.includes(label))) return true;
        }
        
        // Check by ytcp-button with create icon
        if (el.closest('ytcp-button#create-icon, ytcp-icon-button#create-icon')) return true;
        
        return false;
      };
      
      // Listen for clicks on the page
      document.addEventListener('click', (e) => {
        if (isCreateButton(e.target)) {
          // Shift panel down
          panel.style.transition = 'top 0.3s ease';
          panel.style.top = `${originalTop + 200}px`;
          panelShifted = true;
        } else if (panelShifted) {
          // Click elsewhere - reset panel
          panel.style.top = `${originalTop}px`;
          panelShifted = false;
        }
      });
    };
    
    setupYouTubeDropdownWatcher();
    
    // Enable drag and drop for panel (drag by header)
    const setupPanelDrag = () => {
      const header = panel.querySelector('div[style*="background: linear-gradient"]');
      if (!header) return;
      
      let isDragging = false;
      let startX, startY, startLeft, startTop;
      
      // Change cursor on header
      header.style.cursor = 'move';
      
      header.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on minimize button
        if (e.target.closest('button')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        // Prevent text selection while dragging
        e.preventDefault();
        panel.style.transition = 'none';
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;
        
        // Keep panel within viewport
        const panelRect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - panelRect.width;
        const maxTop = window.innerHeight - 100; // Leave some space at bottom
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        // Reset all positioning styles to avoid conflicts
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transform = 'none';
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          panel.style.transition = 'top 0.3s ease';
        }
      });
    };
    
    setupPanelDrag();
    
    // Custom language input event
    const customLangInput = document.getElementById('yt-custom-lang-input');
    const customLangName = document.getElementById('yt-custom-lang-name');
    const addCustomLangBtn = document.getElementById('yt-add-custom-lang-btn');
    
    addCustomLangBtn.addEventListener('click', () => {
      const code = customLangInput.value;
      const name = customLangName.value;
      
      const result = addCustomLanguage(code, name);
      if (result.success) {
        rebuildLanguageGrid();
        showLangStatus(`✅ ${name} (${code}) added`, 'success');
        customLangInput.value = '';
        customLangName.value = '';
      } else {
        let errorMsg = __('errorAddingLanguage') || 'Error adding language';
        if (result.error === 'emptyFields') errorMsg = __('fillBothFields') || 'Please fill both code and name';
        if (result.error === 'codeTooLong') errorMsg = __('codeTooLong') || 'Code too long (max 10 chars)';
        if (result.error === 'alreadyExists') errorMsg = __('languageExists') || 'Language already exists';
        showLangStatus(`❌ ${errorMsg}`, 'error');
      }
    });
    
    // Reset to default button
    const resetLangsBtn = document.getElementById('yt-reset-langs-btn');
    resetLangsBtn.addEventListener('click', () => {
      if (confirm(__('confirmReset') || 'Reset all languages to default?')) {
        resetLanguagesToDefault();
        rebuildLanguageGrid();
        showLangStatus(`🔄 ${__('resetComplete') || 'Reset complete'}`, 'success');
      }
    });
    
    // Sort alphabetically button
    const sortLangsBtn = document.getElementById('yt-sort-langs-btn');
    sortLangsBtn.addEventListener('click', () => {
      sortLanguagesAlphabetically();
      rebuildLanguageGrid();
      showLangStatus(`🔤 ${__('sortComplete') || 'Sorted A-Z'}`, 'success');
    });
    
    // Track translation results and control state
    let translationResults = { success: [], failed: [], pending: [] };
    let isPaused = false;
    let isStopped = false;
    
    // Add event listeners
    const startBtn = document.getElementById('yt-multi-lang-start-btn');
    const selectAllBtn = document.getElementById('yt-multi-lang-select-all');
    const clearAllBtn = document.getElementById('yt-multi-lang-clear-all');
    const minimizeBtn = document.getElementById('yt-multi-lang-minimize');
    const layoutBtn = document.getElementById('yt-multi-lang-layout');
    const controlsDiv = document.getElementById('yt-multi-lang-controls');
    const pauseBtn = document.getElementById('yt-multi-lang-pause-btn');
    const stopBtn = document.getElementById('yt-multi-lang-stop-btn');
    const contentDiv = document.getElementById('yt-multi-lang-content');
    const progressSection = document.getElementById('yt-multi-lang-progress-section');
    const logDiv = document.getElementById('yt-multi-lang-log');
    const retryBtn = document.getElementById('yt-retry-failed-btn');
    const langGridContainer = document.getElementById('yt-lang-grid-container');
    const langGrid = document.getElementById('yt-lang-grid');
    
    // Layout toggle (Portrait/Landscape)
    let isLandscape = false;
    
    // Load saved layout preference
    chrome.storage.sync.get(['panelLayout'], (data) => {
      if (data.panelLayout === 'landscape') {
        isLandscape = true;
        applyLandscapeLayout();
      }
    });
    
    function applyLandscapeLayout() {
      panel.style.width = '700px';
      panel.style.maxWidth = '90vw';
      panel.style.left = '50%';
      panel.style.right = 'auto';
      panel.style.transform = 'translateX(-50%)';
      panel.style.top = 'auto';
      panel.style.bottom = '20px';
      if (langGrid) langGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
      if (langGridContainer) langGridContainer.style.maxHeight = '120px';
      if (logDiv) logDiv.style.maxHeight = '80px';
      layoutBtn.textContent = '📱';
      layoutBtn.title = 'Switch to Portrait';
    }
    
    function applyPortraitLayout() {
      // Get responsive values based on screen width
      const screenWidth = window.innerWidth;
      let pWidth, pRight, pTop;
      
      if (screenWidth <= 1024) {
        pWidth = 'min(320px, 90vw)';
        pRight = '10px';
        pTop = '60px';
      } else if (screenWidth <= 1440) {
        pWidth = '340px';
        pRight = '15px';
        pTop = '65px';
      } else if (screenWidth <= 1920) {
        pWidth = '360px';
        pRight = '20px';
        pTop = '70px';
      } else {
        pWidth = '400px';
        pRight = '25px';
        pTop = '80px';
      }
      
      panel.style.width = pWidth;
      panel.style.maxWidth = '95vw';
      panel.style.left = 'auto';
      panel.style.right = pRight;
      panel.style.transform = 'none';
      panel.style.top = pTop;
      panel.style.bottom = 'auto';
      if (langGrid) langGrid.style.gridTemplateColumns = '1fr 1fr';
      if (langGridContainer) langGridContainer.style.maxHeight = '200px';
      if (logDiv) logDiv.style.maxHeight = '150px';
      layoutBtn.textContent = '📐';
      layoutBtn.title = 'Switch to Landscape';
    }
    
    layoutBtn.addEventListener('click', () => {
      isLandscape = !isLandscape;
      if (isLandscape) {
        applyLandscapeLayout();
      } else {
        applyPortraitLayout();
      }
      // Save preference
      chrome.storage.sync.set({ panelLayout: isLandscape ? 'landscape' : 'portrait' });
    });
    
    // Pause/Resume toggle
    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      if (isPaused) {
        pauseBtn.innerHTML = '<span>▶️</span><span>' + __('resume') + '</span>';
        pauseBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        addLog(logDiv, '⏸️ ' + __('paused'), 'info');
      } else {
        pauseBtn.innerHTML = '<span>⏸️</span><span>' + __('pause') + '</span>';
        pauseBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        addLog(logDiv, '▶️ ' + __('resume') + '...', 'info');
      }
    });
    
    // Stop button
    stopBtn.addEventListener('click', () => {
      isStopped = true;
      controlsDiv.style.display = 'none';
      addLog(logDiv, '⏹️ ' + __('stopped'), 'error');
    });
    
    // Minimize toggle
    let isMinimized = false;
    minimizeBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      contentDiv.style.display = isMinimized ? 'none' : 'block';
      minimizeBtn.textContent = isMinimized ? '+' : '−';
    });
    
    // Update start button with selected count
    function updateStartButtonCount() {
      const selectedCount = document.querySelectorAll('.yt-multi-lang-check:checked').length;
      const btnText = startBtn.querySelector('span:last-child');
      if (btnText) {
        if (selectedCount > 0) {
          btnText.textContent = `${__('startAutoTranslation')} (${selectedCount})`;
        } else {
          btnText.textContent = __('startAutoTranslation');
        }
      }
    }
    
    // Select all with visual feedback
    selectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.yt-multi-lang-check').forEach(cb => {
        cb.checked = true;
        cb.closest('.yt-lang-item').style.background = '#fef3c7';
        cb.closest('.yt-lang-item').style.borderColor = '#f97316';
      });
      updateStartButtonCount();
    });
    
    // Clear all with visual feedback
    clearAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.yt-multi-lang-check').forEach(cb => {
        cb.checked = false;
        cb.closest('.yt-lang-item').style.background = 'transparent';
        cb.closest('.yt-lang-item').style.borderColor = 'transparent';
      });
      updateStartButtonCount();
    });
    
    // Checkbox change visual feedback
    function updateCheckboxVisual(cb) {
      const item = cb.closest('.yt-lang-item');
      if (cb.checked) {
        item.style.background = '#fef3c7';
        item.style.borderColor = '#f97316';
      } else {
        item.style.background = 'transparent';
        item.style.borderColor = 'transparent';
      }
      updateStartButtonCount();
    }
    
    document.querySelectorAll('.yt-multi-lang-check').forEach(cb => {
      cb.addEventListener('change', () => updateCheckboxVisual(cb));
    });
    
    // Click on language item toggles checkbox
    document.querySelectorAll('.yt-lang-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't toggle if clicking on checkbox itself or remove button
        if (e.target.classList.contains('yt-multi-lang-check') || 
            e.target.classList.contains('yt-lang-remove')) return;
        
        const cb = item.querySelector('.yt-multi-lang-check');
        if (cb) {
          cb.checked = !cb.checked;
          updateCheckboxVisual(cb);
        }
      });
    });
    
    // Helper to update stats
    function updateStats() {
      document.querySelector('#yt-stat-success div:first-child').textContent = translationResults.success.length;
      document.querySelector('#yt-stat-failed div:first-child').textContent = translationResults.failed.length;
      document.querySelector('#yt-stat-pending div:first-child').textContent = translationResults.pending.length;
      
      // Show failed section if there are failures
      const failedSection = document.getElementById('yt-failed-section');
      const failedList = document.getElementById('yt-failed-list');
      if (translationResults.failed.length > 0) {
        failedSection.style.display = 'block';
        failedList.innerHTML = translationResults.failed.map(f => `
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            font-size: 11px;
            color: #dc2626;
          ">${f.flag} ${f.name}</span>
        `).join('');
      } else {
        failedSection.style.display = 'none';
      }
    }
    
    // Helper to update progress bar
    function updateProgress(current, total, text) {
      const percent = Math.round((current / total) * 100);
      document.getElementById('yt-progress-bar').style.width = percent + '%';
      document.getElementById('yt-progress-percent').textContent = percent + '%';
      document.getElementById('yt-progress-text').textContent = text;
    }
    
    // Start translation
    startBtn.addEventListener('click', async () => {
      const targets = Array.from(document.querySelectorAll('.yt-multi-lang-check:checked'))
        .map(cb => cb.value);
      
      if (targets.length === 0) {
        showLangStatus('⚠️ ' + __('selectAtLeastOne'), 'error');
        return;
      }
      
      // Reset control state
      isPaused = false;
      isStopped = false;
      pauseBtn.innerHTML = '<span>⏸️</span><span>' + __('pause') + '</span>';
      pauseBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      
      // Reset results
      translationResults = { success: [], failed: [], pending: targets.map(t => ({ code: t, name: getLanguageName(t) })) };
      
      // Show progress section and controls
      progressSection.style.display = 'block';
      controlsDiv.style.display = 'block';
      logDiv.style.display = 'block';
      logDiv.innerHTML = '';
      updateStats();
      updateProgress(0, targets.length, 'Starting...');
      
      // Update button
      startBtn.disabled = true;
      startBtn.innerHTML = '<span>⏳</span><span>' + __('generating') + '</span>';
      startBtn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
      startBtn.style.boxShadow = 'none';
      
      try {
        await runMultiLanguageTranslationWithProgress(targets, logDiv, updateProgress, updateStats, translationResults, () => isPaused, () => isStopped);
        
        // Hide controls after completion
        controlsDiv.style.display = 'none';
        
        if (isStopped) {
          startBtn.innerHTML = '<span>⏹️</span><span>' + __('stopped') + '</span>';
          startBtn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        } else if (translationResults.failed.length === 0) {
          startBtn.innerHTML = '<span>✅</span><span>' + __('allTranslationsDone') + '</span>';
          startBtn.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
        } else {
          startBtn.innerHTML = '<span>⚠️</span><span>' + __('completedWithErrors') + '</span>';
          startBtn.style.background = 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)';
        }
      } catch (err) {
        console.error('[YT Assistant] Multi-lang error:', err);
        controlsDiv.style.display = 'none';
        startBtn.innerHTML = '<span>❌</span><span>' + __('error') + '</span>';
        startBtn.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
        addLog(logDiv, '❌ Error: ' + err.message, 'error');
      }
      
      setTimeout(() => {
        startBtn.disabled = false;
        startBtn.innerHTML = '<span>▶️</span><span>' + __('startAutoTranslation') + '</span>';
        startBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
        startBtn.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
      }, 5000);
    });
    
    // Retry failed
    retryBtn.addEventListener('click', async () => {
      if (translationResults.failed.length === 0) return;
      
      const targets = translationResults.failed.map(f => f.code);
      translationResults.failed = [];
      translationResults.pending = targets.map(t => ({ code: t, name: getLanguageName(t) }));
      updateStats();
      
      retryBtn.disabled = true;
      retryBtn.innerHTML = '⏳ Retrying...';
      
      try {
        await runMultiLanguageTranslationWithProgress(targets, logDiv, updateProgress, updateStats, translationResults);
      } catch (err) {
        addLog(logDiv, '❌ Retry error: ' + err.message, 'error');
      }
      
      retryBtn.disabled = false;
      retryBtn.innerHTML = '🔄 Retry Failed';
    });
  }
  
  function addLog(logDiv, message, type = 'info') {
    const entry = document.createElement('div');
    const colors = {
      error: { bg: 'transparent', color: '#f87171' },
      success: { bg: 'transparent', color: '#4ade80' },
      info: { bg: 'transparent', color: '#9ca3af' }
    };
    const c = colors[type] || colors.info;
    entry.style.cssText = `
      padding: 2px 0;
      color: ${c.color};
      font-size: 11px;
      line-height: 1.4;
    `;
    entry.textContent = message;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  
  // Language flags mapping
  const langFlags = {
    'es': '🇪🇸', 'pt': '🇵🇹', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'ja': '🇯🇵', 'ko': '🇰🇷', 'zh-Hans': '🇨🇳', 'zh-Hant': '🇹🇼', 'ru': '🇷🇺',
    'ar': '🇸🇦', 'hi': '🇮🇳', 'th': '🇹🇭', 'vi': '🇻🇳', 'tr': '🇹🇷', 'pl': '🇵🇱'
  };
  
  async function runMultiLanguageTranslationWithProgress(targets, logDiv, updateProgress, updateStats, results, checkPaused = () => false, checkStopped = () => false) {
    // Check license before multi-language translation - show inline in log div's parent (panel)
    const panel = logDiv?.closest('.yt-multi-lang-panel') || logDiv?.parentElement;
    if (!await checkLicenseForFeature('multiLangTranslate', panel)) return;
    
    addLog(logDiv, '🚀 Starting translation for ' + targets.length + ' languages...', 'info');
    
    // Time tracking
    const totalStartTime = Date.now();
    const langTimes = [];
    let totalElapsedInterval = null;
    
    // Update total time display every second
    totalElapsedInterval = setInterval(() => {
      const elapsed = Date.now() - totalStartTime;
      updateTimeDisplay('yt-time-total', elapsed);
    }, 1000);
    
    // Helper to format time
    function formatTime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (minutes > 0) {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
      return `${secs}s`;
    }
    
    // Update time display element
    function updateTimeDisplay(id, ms) {
      const el = document.getElementById(id);
      if (el) el.textContent = formatTime(ms);
    }
    
    // Update ETA
    function updateETA(completed, total, avgTime) {
      const remaining = total - completed;
      const eta = remaining * avgTime;
      updateTimeDisplay('yt-time-eta', eta);
    }
    
    for (let i = 0; i < targets.length; i++) {
      const langStartTime = Date.now();
      // Check if stopped
      if (checkStopped()) {
        addLog(logDiv, '\n⏹️ Translation stopped by user', 'error');
        break;
      }
      
      // Check if paused - wait until resumed
      while (checkPaused() && !checkStopped()) {
        await wait(500);
      }
      
      // Check again after pause
      if (checkStopped()) {
        addLog(logDiv, '\n⏹️ Translation stopped by user', 'error');
        break;
      }
      
      const langCode = targets[i];
      const langName = getLanguageName(langCode);
      const flag = langFlags[langCode] || '🌐';
      
      // Update progress
      updateProgress(i, targets.length, `Processing ${langName}...`);
      
      // Remove from pending
      results.pending = results.pending.filter(p => p.code !== langCode);
      updateStats();
      
      addLog(logDiv, `\n📍 [${i + 1}/${targets.length}] ${flag} ${langName}`, 'info');
      
      try {
        // Step 1: Click "Add language" button
        addLog(logDiv, '  → Clicking "Add language"...', 'info');
        const addLangBtn = await findAndClickAddLanguageButton();
        if (!addLangBtn) {
          addLog(logDiv, '  ⚠️ Button not found, trying existing...', 'info');
          await wait(1000);
          const existingLang = await findExistingLanguage(langCode);
          if (!existingLang) {
            throw new Error('Language not found');
          }
        } else {
          await wait(1500);
          addLog(logDiv, '  → Selecting language...', 'info');
          const selected = await selectLanguageFromDropdown(langCode, langName);
          if (!selected) {
            throw new Error('Failed to select language');
          }
          await wait(3000);
        }
        
        addLog(logDiv, '  → Opening editor...', 'info');
        await wait(1000);
        const editClicked = await clickTitleDescriptionEdit(langCode);
        if (!editClicked) {
          throw new Error('Failed to open editor');
        }
        await wait(2000);
        
        addLog(logDiv, '  → Translating content...', 'info');
        const translated = await clickTranslateInDialog();
        if (!translated) {
          throw new Error('Failed to translate');
        }
        
        addLog(logDiv, '  → Waiting for completion...', 'info');
        const completed = await waitForTranslationComplete();
        if (!completed) {
          addLog(logDiv, '  ⚠️ Status not confirmed', 'info');
        }
        await wait(1000);
        
        addLog(logDiv, '  → Publishing...', 'info');
        await clickPublishButton();
        await wait(1500);
        
        // Success!
        results.success.push({ code: langCode, name: langName, flag });
        addLog(logDiv, `  ✅ ${langName} completed!`, 'success');
        
      } catch (err) {
        // Failed
        results.failed.push({ code: langCode, name: langName, flag, error: err.message });
        addLog(logDiv, `  ❌ Failed: ${err.message}`, 'error');
        
        // Check if should stop
        if (err.shouldStop || err.isRateLimit || err.isAuthError || err.isBillingError) {
          addLog(logDiv, '\n⛔ Stopping due to API error', 'error');
          updateStats();
          if (totalElapsedInterval) clearInterval(totalElapsedInterval);
          throw err;
        }
      }
      
      // Record time for this language
      const langTime = Date.now() - langStartTime;
      langTimes.push(langTime);
      
      // Update current language time
      updateTimeDisplay('yt-time-current', langTime);
      
      // Calculate and update average
      const avgTime = langTimes.reduce((a, b) => a + b, 0) / langTimes.length;
      updateTimeDisplay('yt-time-avg', avgTime);
      
      // Update ETA
      updateETA(i + 1, targets.length, avgTime);
      
      updateStats();
      
      if (i < targets.length - 1) {
        await wait(2000);
      }
    }
    
    // Stop the timer
    if (totalElapsedInterval) clearInterval(totalElapsedInterval);
    
    // Final time update
    const totalTime = Date.now() - totalStartTime;
    updateTimeDisplay('yt-time-total', totalTime);
    updateTimeDisplay('yt-time-eta', 0);
    
    // Final progress
    updateProgress(targets.length, targets.length, 'Completed!');
    addLog(logDiv, `\n🎉 Done! Success: ${results.success.length}, Failed: ${results.failed.length}`, 'success');
    addLog(logDiv, `⏱️ Total time: ${formatTime(totalTime)}`, 'info');
    
    // Track analytics
    if (window.Analytics) {
      window.Analytics.trackMultiLangTranslation(targets.length, results.success.length, results.failed.length);
    }
  }
  
  async function runMultiLanguageTranslation(targets, progressDiv, logDiv) {
    // Use L() from locales.js for translations
    addLog(logDiv, '🚀 ' + Lf('startingTranslation', currentLang, { count: targets.length }));
    
    for (let i = 0; i < targets.length; i++) {
      const langCode = targets[i];
      const langName = getLanguageName(langCode);
      
      progressDiv.textContent = Lf('progressText', currentLang, { current: i + 1, total: targets.length, name: langName });
      addLog(logDiv, '\n📍 ' + Lf('processing', currentLang, { name: langName, code: langCode }));
      
      try {
        // Step 1: Click "Add language" button
        addLog(logDiv, '  ⏳ ' + L('clickingAddLang', currentLang));
        const addLangBtn = await findAndClickAddLanguageButton();
        if (!addLangBtn) {
          addLog(logDiv, '  ⚠️ ' + L('addLangNotFound', currentLang), 'error');
          await wait(1000);
          const existingLang = await findExistingLanguage(langCode);
          if (!existingLang) {
            addLog(logDiv, '  ❌ ' + L('langNotFound', currentLang), 'error');
            continue;
          }
        } else {
          await wait(1500);
          addLog(logDiv, '  ⏳ ' + Lf('selectingLang', currentLang, { name: langName }));
          const selected = await selectLanguageFromDropdown(langCode, langName);
          if (!selected) {
            addLog(logDiv, '  ❌ ' + L('selectLangFailed', currentLang), 'error');
            continue;
          }
          await wait(3000);
        }
        
        addLog(logDiv, '  ⏳ ' + L('openingEditor', currentLang));
        await wait(1000);
        const editClicked = await clickTitleDescriptionEdit(langCode);
        if (!editClicked) {
          addLog(logDiv, '  ❌ ' + L('editorFailed', currentLang), 'error');
          continue;
        }
        await wait(2000);
        
        addLog(logDiv, '  ⏳ ' + L('translatingContent', currentLang));
        const translated = await clickTranslateInDialog();
        if (!translated) {
          addLog(logDiv, '  ❌ ' + L('translateFailed', currentLang), 'error');
          continue;
        }
        
        addLog(logDiv, '  ⏳ ' + L('waitingComplete', currentLang));
        const completed = await waitForTranslationComplete();
        if (!completed) {
          addLog(logDiv, '  ⚠️ ' + L('statusNotConfirmed', currentLang));
        } else {
          addLog(logDiv, '  ✅ ' + L('translationDone', currentLang));
        }
        await wait(1000);
        
        addLog(logDiv, '  ⏳ ' + L('publishing', currentLang));
        const published = await clickPublishButton();
        if (!published) {
          addLog(logDiv, '  ⚠️ ' + L('publishNotFound', currentLang));
        }
        await wait(1500);
        
        addLog(logDiv, '  ✅ ' + Lf('langCompleted', currentLang, { name: langName }), 'success');
        
      } catch (err) {
        addLog(logDiv, '  ❌ ' + Lf('errorOccurred', currentLang, { message: err.message }), 'error');
        console.error(`[YT Assistant] Error processing ${langName}:`, err);
        
        // Check if should stop (rate limit, auth error, billing error)
        if (err.shouldStop || err.isRateLimit || err.isAuthError || err.isBillingError) {
          addLog(logDiv, '\n⛔ ' + L('translationStopped', currentLang), 'error');
          progressDiv.textContent = '⛔ ' + L('translationStopped', currentLang);
          return; // Stop the entire translation process
        }
      }
      
      if (i < targets.length - 1) {
        await wait(2000);
      }
    }
    
    progressDiv.textContent = '✅ ' + Lf('allCompleted', currentLang, { count: targets.length });
    addLog(logDiv, '\n🎉 ' + L('allTranslationsDone', currentLang), 'success');
  }
  
  async function findAndClickAddLanguageButton() {
    console.log('[YT Assistant] Looking for "Add language" button...');
    
    // Method 1: Specific selector from data
    const addBtn = document.querySelector('#add-translations-button button, ytcp-button button');
    if (addBtn) {
      const rect = addBtn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log('[YT Assistant] ✅ Found via specific selector');
        addBtn.click();
        return true;
      }
    }
    
    // Method 2: Generic search with multi-language support
    const addLanguagePatterns = [
      'add language',
      'add a language',
      'add translation',
      'tambahkan bahasa',      // Indonesian
      'tambah bahasa',         // Indonesian (short)
      'adicionar idioma',      // Portuguese
      'agregar idioma',        // Spanish
      'ajouter une langue',    // French
      'sprache hinzufügen',    // German
      'aggiungi lingua',       // Italian
      '言語を追加',            // Japanese
      '언어 추가',             // Korean
      '添加语言',              // Chinese (Simplified)
      '添加語言',              // Chinese (Traditional)
      'добавить язык',         // Russian
      'dil ekle'               // Turkish
    ];
    
    const buttons = document.querySelectorAll('button, ytcp-button, tp-yt-paper-button');
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      
      for (const pattern of addLanguagePatterns) {
        if (text.includes(pattern.toLowerCase())) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('[YT Assistant] ✅ Found via text match:', pattern);
            btn.click();
            return true;
          }
        }
      }
    }
    
    console.log('[YT Assistant] ❌ Add language button not found');
    return false;
  }
  
  async function selectLanguageFromDropdown(langCode, langName) {
    // Wait for dropdown to appear
    await wait(1000);
    
    console.log(`[YT Assistant] Looking for language: ${langName} (${langCode})`);
    
    // Language name variations for better matching
    const nameVariations = getLanguageVariations(langCode, langName);
    console.log('[YT Assistant] Trying variations:', nameVariations);
    
    // Method 0: Specific selector from data (ytcp-text-menu items)
    const menuItems = document.querySelectorAll('ytcp-text-menu tp-yt-paper-item, tp-yt-paper-listbox tp-yt-paper-item');
    console.log(`[YT Assistant] Found ${menuItems.length} menu items`);
    
    for (const item of menuItems) {
      const text = item.textContent.trim();
      const rect = item.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) continue;
      
      for (const variation of nameVariations) {
        if (text.includes(variation) || text.toLowerCase().includes(variation.toLowerCase())) {
          console.log('[YT Assistant] ✅ Found via menu item:', text);
          item.click();
          return true;
        }
      }
    }
    
    // Method 1: XPath text matching (most reliable)
    for (const variation of nameVariations) {
      // Try exact match
      let xpath = `//tp-yt-paper-item[contains(text(), '${variation}')] | //ytcp-ve[contains(text(), '${variation}')] | //*[@role='option'][contains(text(), '${variation}')] | //*[@role='menuitem'][contains(text(), '${variation}')]`;
      let result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      let item = result.singleNodeValue;
      
      if (item) {
        console.log('[YT Assistant] Found via XPath:', variation);
        const rect = item.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          item.click();
          return true;
        }
      }
    }
    
    // Method 2: Query selector with text matching
    const selectors = [
      '[role="option"]',
      '[role="menuitem"]', 
      'tp-yt-paper-item',
      'ytcp-ve',
      'ytcp-text-dropdown-item',
      '.ytcp-text-dropdown-item',
      '[class*="menu-item"]',
      '[class*="dropdown-item"]'
    ];
    
    for (const selector of selectors) {
      const items = document.querySelectorAll(selector);
      console.log(`[YT Assistant] Checking ${items.length} items with selector: ${selector}`);
      
      for (const item of items) {
        const text = item.textContent.trim();
        const rect = item.getBoundingClientRect();
        
        // Skip invisible items
        if (rect.width === 0 || rect.height === 0) continue;
        
        // Check if text matches any variation
        for (const variation of nameVariations) {
          if (text.includes(variation) || text.toLowerCase().includes(variation.toLowerCase())) {
            console.log('[YT Assistant] Found via selector:', text);
            item.click();
            return true;
          }
        }
      }
    }
    
    // Method 3: Find all visible elements and check text
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.width > 500 || rect.height > 100) continue; // Skip large containers
      
      const text = el.textContent.trim();
      if (text.length > 100) continue; // Skip long text
      
      for (const variation of nameVariations) {
        if (text === variation || text.toLowerCase() === variation.toLowerCase()) {
          console.log('[YT Assistant] Found via text match:', text);
          el.click();
          return true;
        }
      }
    }
    
    console.log('[YT Assistant] ❌ Language not found in dropdown');
    return false;
  }
  
  function getLanguageVariations(langCode, langName) {
    // Return multiple variations of language name for better matching
    const variations = [langName];
    
    // Add common variations (English, native, and Indonesian names)
    const commonNames = {
      // Southeast Asian
      'id': ['Indonesian', 'Bahasa Indonesia', 'Indonesia', 'bahasa Indonesia', 'Indonesian (Indonesia)', 'Bahasa indonesia', 'INDONESIA', 'indonesia'],
      'ms': ['Malay', 'Bahasa Melayu', 'Melayu', 'Malaysia', 'Malay (Malaysia)'],
      'tl': ['Filipino', 'Tagalog', 'Pilipino', 'Filipino (Philippines)'],
      'vi': ['Vietnamese', 'Tiếng Việt', 'tiếng việt', 'Vietnam', 'Vietnamese (Vietnam)'],
      'th': ['Thai', 'ไทย', 'Thailand', 'Thai (Thailand)'],
      // European
      'es': ['Spanish', 'Español', 'español', 'Spanyol', 'Spanish (Spain)', 'Spanish (Latin America)'],
      'pt': ['Portuguese', 'Português', 'português', 'Portugis', 'Portuguese (Brazil)', 'Portuguese (Portugal)'],
      'pt-BR': ['Portuguese (Brazil)', 'Português (Brasil)', 'Portugis (Brasil)', 'Brazilian Portuguese'],
      'fr': ['French', 'Français', 'français', 'Prancis', 'French (France)'],
      'de': ['German', 'Deutsch', 'deutsch', 'Jerman', 'German (Germany)'],
      'it': ['Italian', 'Italiano', 'italiano', 'Italia', 'Italian (Italy)'],
      'nl': ['Dutch', 'Nederlands', 'Belanda', 'Dutch (Netherlands)'],
      'pl': ['Polish', 'Polski', 'polski', 'Polandia', 'Polish (Poland)'],
      'sv': ['Swedish', 'Svenska', 'Swedia', 'Swedish (Sweden)'],
      'no': ['Norwegian', 'Norsk', 'Norwegia', 'Norwegian (Norway)'],
      'da': ['Danish', 'Dansk', 'Denmark', 'Danish (Denmark)'],
      'fi': ['Finnish', 'Suomi', 'Finlandia', 'Finnish (Finland)'],
      // East Asian
      'ja': ['Japanese', '日本語', 'にほんご', 'Jepang', 'Japanese (Japan)'],
      'ko': ['Korean', '한국어', '韓國語', 'Korea', 'Korean (Korea)'],
      'zh-Hans': ['Chinese (Simplified)', '中文（简体）', '简体中文', 'Mandarin (S)', 'Chinese', '中文'],
      'zh-Hant': ['Chinese (Traditional)', '中文（繁體）', '繁體中文', 'Mandarin (T)', 'Chinese', '中文'],
      // Others
      'ru': ['Russian', 'Русский', 'русский', 'Rusia', 'Russian (Russia)'],
      'ar': ['Arabic', 'العربية', 'عربي', 'Arab', 'Arabic (Saudi Arabia)'],
      'hi': ['Hindi', 'हिन्दी', 'हिंदी', 'Hindi (India)'],
      'tr': ['Turkish', 'Türkçe', 'türkçe', 'Turki', 'Turkish (Turkey)'],
      // English variants
      'en': ['English', 'English (US)', 'Inggris', 'English (United States)'],
      'en-GB': ['English (UK)', 'English (United Kingdom)', 'British English', 'Inggris (UK)'],
      'en-AU': ['English (Australia)', 'Australian English', 'Inggris (Australia)']
    };
    
    if (commonNames[langCode]) {
      variations.push(...commonNames[langCode]);
    }
    
    // Remove duplicates
    return [...new Set(variations)];
  }
  
  async function findExistingLanguage(langCode) {
    // Try to find language row that already exists
    const rows = document.querySelectorAll('tr, [class*="row"]');
    for (const row of rows) {
      const text = row.textContent;
      if (text.includes(langCode)) {
        return row;
      }
    }
    return null;
  }
  
  async function clickTitleDescriptionEdit(langCode) {
    // Wait for row to appear
    await wait(3000);
    
    console.log(`[YT Assistant] Looking for ADD icon for language: ${langCode}...`);
    
    // Get language name variations to match
    const targetLanguage = getLanguageName(langCode);
    const variations = getLanguageVariations(langCode, targetLanguage);
    console.log(`[YT Assistant] Target language: ${targetLanguage}, variations:`, variations);
    
    // Method 1: Find all ytgn-video-translation-row elements
    const rows = document.querySelectorAll('ytgn-video-translation-row');
    console.log(`[YT Assistant] Found ${rows.length} translation rows`);
    
    // Find the row that matches our target language
    let targetRow = null;
    
    for (const row of rows) {
      // Get the first cell (language column)
      const languageCell = row.querySelector('td.tablecell-language, td:first-child');
      if (languageCell) {
        const cellText = languageCell.textContent.trim();
        console.log(`[YT Assistant] Checking row with language: "${cellText}"`);
        
        // Check if this row matches any of our language variations
        for (const variation of variations) {
          if (cellText.includes(variation) || cellText.toLowerCase().includes(variation.toLowerCase())) {
            console.log(`[YT Assistant] ✅ Found matching row for ${variation}`);
            targetRow = row;
            break;
          }
        }
        if (targetRow) break;
      }
    }
    
    if (!targetRow) {
      console.log(`[YT Assistant] ❌ Could not find row for ${targetLanguage} with variations`);
      
      // Fallback 1: Try partial match with langCode
      for (const row of rows) {
        const cellText = row.textContent.toLowerCase();
        if (cellText.includes(langCode.toLowerCase())) {
          console.log(`[YT Assistant] Found row via langCode match: ${langCode}`);
          targetRow = row;
          break;
        }
      }
      
      // Fallback 2: Use the most recently added row (usually last one with ADD icon visible)
      if (!targetRow && rows.length > 0) {
        // Find row that has the ADD icon (not yet translated)
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          const addIcon = row.querySelector('#metadata-add, [id*="add"], button[aria-label*="Add"], button[aria-label*="add"]');
          if (addIcon) {
            targetRow = row;
            console.log('[YT Assistant] Using row with ADD icon as fallback');
            break;
          }
        }
        
        // Last resort: use last row
        if (!targetRow) {
          targetRow = rows[rows.length - 1];
          console.log('[YT Assistant] Using last row as final fallback');
        }
      }
      
      if (!targetRow) {
        return false;
      }
    }
    
    console.log('[YT Assistant] Looking for ADD icon in Title & description column...');
    
    // IMPORTANT: Hover over the row first to make the icon appear
    console.log('[YT Assistant] Hovering over target row to reveal ADD icon...');
    
    // Trigger multiple hover events to ensure icon appears
    const hoverEvents = ['mouseover', 'mouseenter', 'mousemove'];
    
    for (const eventType of hoverEvents) {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0
      });
      targetRow.dispatchEvent(event);
    }
    
    // Hover over the 3rd column (Title & description column) - kolom ke-3
    const cells = targetRow.querySelectorAll('td');
    console.log(`[YT Assistant] Found ${cells.length} cells in row`);
    
    if (cells.length >= 3) {
      const thirdCell = cells[2]; // Index 2 = kolom ke-3
      console.log('[YT Assistant] Hovering over 3rd column (Title & description)...');
      
      for (const eventType of hoverEvents) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true
        });
        thirdCell.dispatchEvent(event);
      }
    }
    
    // Also hover over the metadata cell specifically
    const metadataCellElement = targetRow.querySelector('ytgn-video-translation-cell-metadata, td[class*="metadata"]');
    if (metadataCellElement) {
      console.log('[YT Assistant] Hovering over metadata cell...');
      
      for (const eventType of hoverEvents) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true
        });
        metadataCellElement.dispatchEvent(event);
      }
      
      // Hover over hover-cell container
      const hoverCellElement = metadataCellElement.querySelector('ytgn-video-translation-hover-cell');
      if (hoverCellElement) {
        console.log('[YT Assistant] Hovering over hover-cell container...');
        
        for (const eventType of hoverEvents) {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true
          });
          hoverCellElement.dispatchEvent(event);
        }
      }
    }
    
    // Wait for hover effect to trigger and icon to appear
    await wait(1000);
    
    // Method 0: Direct selector for metadata-add icon (from click data)
    console.log('[YT Assistant] Method 0: Looking for #metadata-add icon...');
    const metadataAddIcon = targetRow.querySelector('#metadata-add, ytcp-icon-button[id="metadata-add"]');
    
    if (metadataAddIcon) {
      const rect = metadataAddIcon.getBoundingClientRect();
      console.log(`[YT Assistant] Found #metadata-add: ${rect.width}x${rect.height}`);
      
      if (rect.width > 0 && rect.height > 0) {
        console.log('[YT Assistant] ✅ Clicking #metadata-add icon');
        metadataAddIcon.click();
        return true;
      }
      
      // Try clicking the button inside
      const button = metadataAddIcon.querySelector('button');
      if (button) {
        const btnRect = button.getBoundingClientRect();
        if (btnRect.width > 0 && btnRect.height > 0) {
          console.log('[YT Assistant] ✅ Clicking button inside #metadata-add');
          button.click();
          return true;
        }
      }
    }
    
    // Method 0.5: Look for ytcp-icon-button with id containing "add" or "metadata"
    console.log('[YT Assistant] Method 0.5: Looking for icon button with add/metadata id...');
    const iconButtons = targetRow.querySelectorAll('ytcp-icon-button');
    console.log(`[YT Assistant] Found ${iconButtons.length} ytcp-icon-button elements`);
    
    for (const iconBtn of iconButtons) {
      const id = iconBtn.getAttribute('id') || '';
      const ariaLabel = iconBtn.getAttribute('aria-label') || '';
      console.log(`[YT Assistant] Icon button: id="${id}", aria="${ariaLabel}"`);
      
      if (id.includes('add') || id.includes('metadata') || ariaLabel.toLowerCase().includes('add')) {
        const rect = iconBtn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log('[YT Assistant] ✅ Clicking icon button with add/metadata');
          iconBtn.click();
          return true;
        }
      }
    }
      
      // Find all cells in the row
      const rowCells = targetRow.querySelectorAll('td');
      console.log(`[YT Assistant] Found ${rowCells.length} cells in target row`);
      
      // The "Title & description" column is the 3rd column (index 2)
      // Look for ytgn-video-translation-cell-metadata
      const metadataCell = targetRow.querySelector('ytgn-video-translation-cell-metadata');
      
      if (metadataCell) {
        console.log('[YT Assistant] Found metadata cell');
        
        // Find the hover cell container
        const hoverCell = metadataCell.querySelector('ytgn-video-translation-hover-cell');
        if (hoverCell) {
          console.log('[YT Assistant] Found hover cell');
          
          // Find ytcp-icon-button inside
          const iconButton = hoverCell.querySelector('ytcp-icon-button');
          if (iconButton) {
            console.log('[YT Assistant] Found ytcp-icon-button');
            
            // Check aria-label for "Add" keyword
            const ariaLabel = iconButton.getAttribute('aria-label') || '';
            const id = iconButton.getAttribute('id') || '';
            console.log(`[YT Assistant] Icon button aria-label: "${ariaLabel}", id: "${id}"`);
            
            // Look for "Add" in aria-label (in any language)
            if (ariaLabel.toLowerCase().includes('add') || 
                ariaLabel.toLowerCase().includes('tambah') ||
                ariaLabel.toLowerCase().includes('adicionar') ||
                id.includes('add') || id.includes('metadata-add')) {
              
              // Try to click the button element inside
              const button = iconButton.querySelector('button');
              if (button) {
                const rect = button.getBoundingClientRect();
                console.log(`[YT Assistant] Button rect: ${rect.width}x${rect.height} at (${rect.left}, ${rect.top})`);
                
                if (rect.width > 0 && rect.height > 0) {
                  console.log('[YT Assistant] ✅ Clicking ADD button in metadata cell');
                  button.click();
                  return true;
                }
              }
              
              // Fallback: click the ytcp-icon-button itself
              const rect = iconButton.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                console.log('[YT Assistant] ✅ Clicking ADD ytcp-icon-button');
                iconButton.click();
                return true;
              }
            }
          }
        }
        
        // Fallback: click any button with "add" in aria-label or id
        const allButtons = metadataCell.querySelectorAll('button, ytcp-icon-button, [role="button"]');
        console.log(`[YT Assistant] Found ${allButtons.length} buttons in metadata cell`);
        
        for (const btn of allButtons) {
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const id = (btn.getAttribute('id') || '').toLowerCase();
          
          // Look for "add" keyword
          if (ariaLabel.includes('add') || id.includes('add')) {
            console.log('[YT Assistant] ✅ Clicking ADD button (found via aria-label/id)');
            btn.click();
            return true;
          }
        }
        
        // Last resort: click first visible button
        for (const btn of allButtons) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('[YT Assistant] ✅ Clicking first visible button in metadata cell');
            btn.click();
            return true;
          }
        }
      }
      
      // Fallback 2: Find any clickable element in the target row's 3rd column
      if (rowCells.length >= 3) {
        const thirdCell = rowCells[2];
        console.log('[YT Assistant] Checking 3rd cell (Title & description column)...');
        
        const clickables = thirdCell.querySelectorAll('button, ytcp-icon-button, [role="button"], a');
        console.log(`[YT Assistant] Found ${clickables.length} clickable elements in 3rd cell`);
        
        for (const el of clickables) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('[YT Assistant] ✅ Clicking element in 3rd cell');
            el.click();
            return true;
          }
        }
      }
    
    // Method 2: Search all icon buttons on page and find the one in the correct row
    console.log('[YT Assistant] Method 2: Searching all icon buttons...');
    const allIconButtons = document.querySelectorAll('ytcp-icon-button');
    console.log(`[YT Assistant] Found ${allIconButtons.length} icon buttons on page`);
    
    for (const iconBtn of allIconButtons) {
      const ariaLabel = (iconBtn.getAttribute('aria-label') || '').toLowerCase();
      const id = (iconBtn.getAttribute('id') || '').toLowerCase();
      
      // Check if it's an ADD button
      if (ariaLabel.includes('add') || id.includes('add') || id.includes('metadata-add')) {
        // Check if this button is in our target row
        const parentRow = iconBtn.closest('ytgn-video-translation-row');
        if (parentRow === targetRow) {
          const rect = iconBtn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('[YT Assistant] ✅ Found ADD icon via all-buttons search');
            iconBtn.click();
            return true;
          }
        }
      }
    }
    
    // Method 3: Use XPath to find any icon in the target row
    console.log('[YT Assistant] Method 3: Using XPath...');
    const rowIndex = Array.from(rows).indexOf(targetRow) + 1;
    const xpath = `//ytgn-video-translation-row[${rowIndex}]//ytcp-icon-button | //ytgn-video-translation-row[${rowIndex}]//button`;
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    
    console.log(`[YT Assistant] XPath found ${result.snapshotLength} buttons`);
    for (let i = 0; i < result.snapshotLength; i++) {
      const btn = result.snapshotItem(i);
      const rect = btn.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        // Check if it's in the 3rd column (Title & description)
        const cell = btn.closest('td');
        if (cell) {
          const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);
          console.log(`[YT Assistant] Button in cell index: ${cellIndex}`);
          
          if (cellIndex === 2) { // 3rd column (index 2)
            console.log('[YT Assistant] ✅ Found button in 3rd column via XPath');
            btn.click();
            return true;
          }
        }
      }
    }
    
    // Method 4: Look for icon on the right side of the row (based on screenshot)
    console.log('[YT Assistant] Method 4: Looking for icon on right side of row...');
    const allElements = targetRow.querySelectorAll('*');
    
    // Find elements on the right side (x position > 800)
    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.left > 800) {
        // Check if it's a clickable element
        if (el.tagName === 'BUTTON' || el.tagName === 'YTCP-ICON-BUTTON' || el.getAttribute('role') === 'button') {
          console.log(`[YT Assistant] Found element on right: ${el.tagName} at x=${rect.left}`);
          
          // Check if it's small (icon size)
          if (rect.width < 100 && rect.height < 100) {
            console.log('[YT Assistant] ✅ Clicking icon on right side');
            el.click();
            return true;
          }
        }
        
        // Check children for clickable elements
        const clickable = el.querySelector('button, ytcp-icon-button, [role="button"]');
        if (clickable) {
          const clickRect = clickable.getBoundingClientRect();
          if (clickRect.width > 0 && clickRect.height > 0) {
            console.log('[YT Assistant] ✅ Clicking child button on right side');
            clickable.click();
            return true;
          }
        }
      }
    }
    
    // Method 5: Click any visible button in target row (last resort)
    console.log('[YT Assistant] Method 5: Last resort - clicking any visible button in row...');
    const allButtons = targetRow.querySelectorAll('button, ytcp-icon-button, [role="button"]');
    console.log(`[YT Assistant] Found ${allButtons.length} buttons in target row`);
    
    for (const btn of allButtons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.width < 50 && rect.height < 50) {
        // Small button, likely an icon
        console.log('[YT Assistant] ✅ Clicking small icon button (last resort)');
        btn.click();
        return true;
      }
    }
    
    // Method 6: Try to find by looking for "Ineligible" text nearby (from screenshot)
    console.log('[YT Assistant] Method 6: Looking near "Ineligible" text...');
    const textElements = targetRow.querySelectorAll('*');
    for (const el of textElements) {
      if (el.textContent.includes('Ineligible') || el.textContent.includes('ineligible')) {
        console.log('[YT Assistant] Found "Ineligible" text');
        
        // Look for icon button near this text
        const parent = el.parentElement;
        if (parent) {
          const nearbyButtons = parent.querySelectorAll('button, ytcp-icon-button');
          for (const btn of nearbyButtons) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              console.log('[YT Assistant] ✅ Clicking button near Ineligible text');
              btn.click();
              return true;
            }
          }
        }
      }
    }
    
    console.log('[YT Assistant] ❌ Could not find ADD icon after all methods');
    return false;
  }
  
  async function clickTranslateInDialog() {
    // Wait for dialog to open
    await wait(2000);
    
    console.log('[YT Assistant] Looking for Translate button in dialog...');
    
    // Method 0: Look for our injected button with ID
    const ourButton = document.querySelector('#yt-assist-translate-btn');
    if (ourButton) {
      const rect = ourButton.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log('[YT Assistant] ✅ Found our translate button');
        ourButton.click();
        return true;
      }
    }
    
    // Method 1: XPath with multiple language variations
    const translatePatterns = [
      'Translate',
      'translate',
      'TRANSLATE',
      'Terjemahkan',       // Indonesian
      'Traducir',          // Spanish
      'Traduzir',          // Portuguese
      'Traduire',          // French
      'Übersetzen',        // German
      'Tradurre',          // Italian
      '翻訳',              // Japanese
      '번역',              // Korean
      '翻译',              // Chinese (Simplified)
      '翻譯',              // Chinese (Traditional)
      'Перевести',         // Russian
      'ترجمة',             // Arabic
      'Çevir'              // Turkish
    ];
    
    for (const pattern of translatePatterns) {
      const xpath = `//button[contains(text(), '${pattern}')] | //button[contains(@aria-label, '${pattern}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const btn = result.singleNodeValue;
      
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log('[YT Assistant] Found Translate button via XPath:', pattern);
          btn.click();
          return true;
        }
      }
    }
    
    // Method 2: Find button with specific ID or class
    const translateBtn = document.querySelector('#yt-assist-translate-btn, button[id*="translate"]');
    if (translateBtn) {
      const rect = translateBtn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log('[YT Assistant] Found Translate button by ID');
        translateBtn.click();
        return true;
      }
    }
    
    // Method 3: Check all visible buttons in dialog
    const dialogs = document.querySelectorAll('tp-yt-paper-dialog, ytcp-dialog, [role="dialog"]');
    for (const dialog of dialogs) {
      const rect = dialog.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      
      const buttons = dialog.querySelectorAll('button');
      console.log(`[YT Assistant] Checking ${buttons.length} buttons in dialog...`);
      
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        const btnRect = btn.getBoundingClientRect();
        
        if (btnRect.width === 0 || btnRect.height === 0) continue;
        
        // Check for translate keywords
        for (const pattern of translatePatterns) {
          if (text.includes(pattern)) {
            console.log('[YT Assistant] Found Translate button:', text);
            btn.click();
            return true;
          }
        }
        
        // Check for emoji or special characters
        if (text.includes('✨') || text.includes('🤖')) {
          console.log('[YT Assistant] Found AI button:', text);
          btn.click();
          return true;
        }
      }
    }
    
    console.log('[YT Assistant] ❌ Translate button not found');
    return false;
  }
  
  async function clickPublishButton() {
    // Wait for publish button
    await wait(2000);
    
    console.log('[YT Assistant] Looking for Publish button...');
    
    // Method 0: Specific selector from data
    const publishBtn = document.querySelector('#publish-button button, ytcp-button[id*="publish"] button');
    if (publishBtn) {
      const rect = publishBtn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log('[YT Assistant] ✅ Found via specific selector');
        publishBtn.click();
        return true;
      }
    }
    
    // Method 0.5: Look in ytgn-metadata-editor dialog
    const metadataEditor = document.querySelector('ytgn-metadata-editor');
    if (metadataEditor) {
      const buttons = metadataEditor.querySelectorAll('button, ytcp-button button');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        const rect = btn.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          if (text === 'publish' || text.includes('publish')) {
            console.log('[YT Assistant] ✅ Found Publish in metadata editor');
            btn.click();
            return true;
          }
        }
      }
    }
    
    // Method 1: XPath with multiple language variations
    const publishPatterns = [
      'Publish',
      'publish',
      'Publikasikan',      // Indonesian
      'Terbitkan',         // Indonesian (alternative)
      'Publicar',          // Spanish/Portuguese
      'Publier',           // French
      'Veröffentlichen',   // German
      'Pubblica',          // Italian
      '公開',              // Japanese
      '게시',              // Korean
      '发布',              // Chinese (Simplified)
      '發布',              // Chinese (Traditional)
      'Опубликовать',      // Russian
      'نشر',               // Arabic
      'Yayınla',           // Turkish
      'Save',
      'save',
      'Simpan'             // Indonesian for Save
    ];
    
    for (const pattern of publishPatterns) {
      const xpath = `//button[contains(text(), '${pattern}')] | //button[contains(@aria-label, '${pattern}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const btn = result.singleNodeValue;
      
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log('[YT Assistant] Found Publish button via XPath:', pattern);
          btn.click();
          return true;
        }
      }
    }
    
    // Method 2: Find primary/action buttons (usually blue)
    const buttons = document.querySelectorAll('button, ytcp-button, tp-yt-paper-button');
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      const rect = btn.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) continue;
      
      // Check for publish/save keywords
      for (const pattern of publishPatterns) {
        if (text === pattern.toLowerCase() || text.includes(pattern.toLowerCase())) {
          console.log('[YT Assistant] Found Publish button:', text);
          btn.click();
          return true;
        }
      }
    }
    
    console.log('[YT Assistant] ⚠️ Publish button not found (might be auto-saved)');
    return false;
  }
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ========== SMART WAITING HELPERS ==========
  
  // Poll kondisi sampai true atau timeout
  function waitForCondition(conditionFn, timeout = 5000, interval = 100) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          if (conditionFn()) {
            resolve(true);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`Timeout after ${timeout}ms`));
          } else {
            setTimeout(check, interval);
          }
        } catch (err) {
          reject(err);
        }
      };
      check();
    });
  }
  
  // Wait for element to appear
  function waitForElement(selector, timeout = 5000) {
    return waitForCondition(() => document.querySelector(selector), timeout);
  }
  
  // Wait for element to disappear
  function waitForElementGone(selector, timeout = 5000) {
    return waitForCondition(() => !document.querySelector(selector), timeout);
  }
  
  // Smart wait dengan fallback - lebih cepat jika kondisi terpenuhi
  async function smartWait(conditionFn, fallbackMs, maxWaitMs = 5000) {
    try {
      await waitForCondition(conditionFn, maxWaitMs);
      await wait(300); // Buffer setelah kondisi terpenuhi (increased from 150)
      return true;
    } catch (err) {
      console.log('[YT Assistant] Smart wait timeout, using fallback:', fallbackMs + 'ms');
      await wait(fallbackMs);
      return false;
    }
  }
  
  async function waitForTranslationComplete(maxWaitTime = 30000) {
    // Wait for "Translation completed successfully" message to appear
    console.log('[YT Assistant] Waiting for translation completion message...');
    
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms
    
    while (Date.now() - startTime < maxWaitTime) {
      // Look for success message in various places
      const successPatterns = [
        'translation completed successfully',
        'translation complete',
        'successfully translated',
        'translation success',
        'completed successfully',
        'terjemahan selesai',           // Indonesian
        'berhasil diterjemahkan',       // Indonesian
        'traducción completada',        // Spanish
        'traducción exitosa',           // Spanish
        'tradução concluída',           // Portuguese
        'tradução bem-sucedida',        // Portuguese
        'traduction terminée',          // French
        'traduction réussie',           // French
        'übersetzung abgeschlossen',    // German
        'übersetzung erfolgreich',      // German
        'traduzione completata',        // Italian
        'traduzione riuscita',          // Italian
        '翻訳が完了しました',           // Japanese
        '翻訳に成功しました',           // Japanese
        '번역이 완료되었습니다',        // Korean
        '번역 성공',                    // Korean
        '翻译完成',                     // Chinese (Simplified)
        '翻译成功',                     // Chinese (Simplified)
        'перевод завершен',             // Russian
        'çeviri tamamlandı'             // Turkish
      ];
      
      // Check all text elements on page
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent.toLowerCase();
        
        for (const pattern of successPatterns) {
          if (text.includes(pattern)) {
            console.log('[YT Assistant] ✅ Found translation completion message:', text.substring(0, 100));
            return true;
          }
        }
      }
      
      // Check for specific success indicators
      const successIndicators = document.querySelectorAll('[class*="success"], [class*="complete"], [role="alert"]');
      for (const indicator of successIndicators) {
        const text = indicator.textContent.toLowerCase();
        if (text.includes('translation') && (text.includes('complete') || text.includes('success'))) {
          console.log('[YT Assistant] ✅ Found success indicator');
          return true;
        }
      }
      
      await wait(checkInterval);
    }
    
    console.log('[YT Assistant] ⚠️ Translation completion message not found within timeout');
    return false;
  }
  
  // Debug helper for multi-language
  window.ytMultiLangDebug = {
    testDropdown: async () => {
      console.log('=== Testing Language Dropdown ===');
      const items = document.querySelectorAll('[role="option"], [role="menuitem"], tp-yt-paper-item, ytcp-ve');
      console.log(`Found ${items.length} dropdown items:`);
      items.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        console.log(`[${i}] "${item.textContent.trim()}" - Visible: ${rect.width > 0 && rect.height > 0}`);
      });
    },
    testEditButton: () => {
      console.log('=== Testing Edit Buttons ===');
      const buttons = document.querySelectorAll('button, ytcp-icon-button');
      console.log(`Found ${buttons.length} buttons:`);
      buttons.forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const title = btn.getAttribute('title') || '';
        const text = btn.textContent.trim();
        if (rect.width > 0 && rect.height > 0) {
          console.log(`[${i}] Text: "${text}" | Aria: "${ariaLabel}" | Title: "${title}" | Size: ${rect.width}x${rect.height}`);
        }
      });
    },
    testRows: () => {
      console.log('=== Testing Table Rows ===');
      const rows = document.querySelectorAll('tr, [class*="row"]');
      console.log(`Found ${rows.length} rows:`);
      rows.forEach((row, i) => {
        const buttons = row.querySelectorAll('button, ytcp-icon-button');
        const text = row.textContent.substring(0, 100);
        console.log(`[${i}] "${text}..." - Buttons: ${buttons.length}`);
        buttons.forEach((btn, j) => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const ariaLabel = btn.getAttribute('aria-label') || '';
            console.log(`  [${j}] Aria: "${ariaLabel}" Size: ${rect.width}x${rect.height}`);
          }
        });
      });
    },
    testTranslateButton: () => {
      console.log('=== Testing Translate Button ===');
      const dialogs = document.querySelectorAll('tp-yt-paper-dialog, ytcp-dialog, [role="dialog"]');
      console.log(`Found ${dialogs.length} dialogs`);
      dialogs.forEach((dialog, i) => {
        const rect = dialog.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log(`Dialog ${i} is visible`);
          const buttons = dialog.querySelectorAll('button');
          console.log(`  Found ${buttons.length} buttons in dialog:`);
          buttons.forEach((btn, j) => {
            const btnRect = btn.getBoundingClientRect();
            if (btnRect.width > 0 && btnRect.height > 0) {
              console.log(`  [${j}] "${btn.textContent.trim()}"`);
            }
          });
        }
      });
    },
    listLanguages: () => {
      console.log('=== Available Languages ===');
      const langMap = {
        'es': 'Spanish', 'pt': 'Portuguese', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'zh-Hans': 'Chinese (Simplified)',
        'zh-Hant': 'Chinese (Traditional)', 'ru': 'Russian', 'ar': 'Arabic',
        'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese', 'tr': 'Turkish', 'pl': 'Polish'
      };
      Object.entries(langMap).forEach(([code, name]) => {
        console.log(`${code}: ${name}`);
      });
    }
  };
  
  console.log('[YT Assistant] Multi-language debug helper available: window.ytMultiLangDebug');

  // ========== INITIALIZE ==========
  
  function handleMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.tagName === 'YTCP-DIALOG' || node.querySelector('ytcp-dialog')) {
              setTimeout(injectSubtitleButton, 500);
            }
            if (node.id === 'main-container' || node.tagName === 'YTCP-APP') {
              setTimeout(injectVideoDetailsButtons, 1000);
              setTimeout(injectMultiLanguageSection, 1000);
            }
          }
        }
      }
    }

    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectVideoDetailsButtons, 1000);
      setTimeout(injectSubtitleButton, 1000);
      setTimeout(injectMultiLanguageSection, 1000);
    }
  }

  let lastUrl = location.href;
  const observer = new MutationObserver(handleMutations);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      observer.observe(document.body, { subtree: true, childList: true });
    });
  } else {
    init();
    observer.observe(document.body, { subtree: true, childList: true });
  }
})();
