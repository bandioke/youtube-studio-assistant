// Theme System for YouTube Studio Assistant
// Supports multiple themes with easy switching

const THEMES = {
  // Light Theme (default)
  light: {
    name: 'Light',
    icon: '☀️',
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fb923c',
      secondary: '#fed7aa',
      background: '#fff7ed',
      backgroundDark: '#ffedd5',
      surface: '#ffffff',
      surfaceLight: '#f8fafc',
      text: '#1f2937',
      textLight: '#6b7280',
      textMuted: '#9ca3af',
      border: '#fdba74',
      borderLight: '#fed7aa',
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      header: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      button: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
      card: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)'
    },
    isDark: false
  },

  // Keep orange as alias for light
  orange: {
    name: 'Orange Sunset',
    icon: '🧡',
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fb923c',
      secondary: '#fed7aa',
      background: '#fff7ed',
      backgroundDark: '#ffedd5',
      surface: '#ffffff',
      text: '#1f2937',
      textLight: '#6b7280',
      border: '#fdba74',
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      header: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      button: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
    },
    isDark: false
  },

  // Dark Pro Theme (like the image)
  darkPro: {
    name: 'Dark Pro',
    icon: '🖤',
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fb923c',
      secondary: '#374151',
      background: '#0a0a0a',
      backgroundDark: '#000000',
      surface: '#1a1a1a',
      surfaceLight: '#2a2a2a',
      text: '#ffffff',
      textLight: '#9ca3af',
      textMuted: '#6b7280',
      border: '#333333',
      borderLight: '#444444',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      header: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
      button: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      card: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
    },
    isDark: true
  },

  // Ocean Blue Theme
  ocean: {
    name: 'Ocean Blue',
    icon: '🌊',
    colors: {
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      primaryLight: '#38bdf8',
      secondary: '#bae6fd',
      background: '#f0f9ff',
      backgroundDark: '#e0f2fe',
      surface: '#ffffff',
      text: '#1e3a5f',
      textLight: '#64748b',
      border: '#7dd3fc',
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      header: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      button: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
    },
    isDark: false
  },

  // Purple Galaxy Theme
  galaxy: {
    name: 'Purple Galaxy',
    icon: '🌌',
    colors: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      primaryLight: '#a78bfa',
      secondary: '#312e81',
      background: '#0f0a1a',
      backgroundDark: '#050208',
      surface: '#1a1025',
      surfaceLight: '#2a1a3a',
      text: '#ffffff',
      textLight: '#c4b5fd',
      textMuted: '#7c3aed',
      border: '#4c1d95',
      borderLight: '#6d28d9',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      header: 'linear-gradient(135deg, #1a1025 0%, #0f0a1a 100%)',
      button: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
      background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1025 100%)',
      card: 'linear-gradient(135deg, #1a1025 0%, #2a1a3a 100%)'
    },
    isDark: true
  },

  // Green Nature Theme
  nature: {
    name: 'Green Nature',
    icon: '🌿',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#34d399',
      secondary: '#a7f3d0',
      background: '#ecfdf5',
      backgroundDark: '#d1fae5',
      surface: '#ffffff',
      text: '#064e3b',
      textLight: '#6b7280',
      border: '#6ee7b7',
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      header: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      button: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
    },
    isDark: false
  },

  // YouTube Red Theme
  youtube: {
    name: 'YouTube Red',
    icon: '📺',
    colors: {
      primary: '#ff0000',
      primaryDark: '#cc0000',
      primaryLight: '#ff4444',
      secondary: '#282828',
      background: '#0f0f0f',
      backgroundDark: '#000000',
      surface: '#212121',
      surfaceLight: '#303030',
      text: '#ffffff',
      textLight: '#aaaaaa',
      textMuted: '#717171',
      border: '#383838',
      borderLight: '#484848',
      success: '#2ba640',
      error: '#ff0000',
      warning: '#ffcc00'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
      header: 'linear-gradient(135deg, #212121 0%, #0f0f0f 100%)',
      button: 'linear-gradient(135deg, #ff0000 0%, #ff4444 100%)',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #212121 100%)',
      card: 'linear-gradient(135deg, #212121 0%, #303030 100%)'
    },
    isDark: true
  }
};

// Current theme
let currentTheme = 'light';

// Get theme from storage
async function loadTheme() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appTheme'], (result) => {
      currentTheme = result.appTheme || 'light';
      resolve(currentTheme);
    });
  });
}

// Save theme to storage
async function saveTheme(themeName) {
  currentTheme = themeName;
  await chrome.storage.sync.set({ appTheme: themeName });
}

// Get current theme object
function getTheme(themeName = null) {
  return THEMES[themeName || currentTheme] || THEMES.orange;
}

// Get all available themes
function getAllThemes() {
  return Object.entries(THEMES).map(([key, theme]) => ({
    id: key,
    name: theme.name,
    icon: theme.icon,
    isDark: theme.isDark
  }));
}

// Apply theme to CSS variables
function applyTheme(themeName = null) {
  const theme = getTheme(themeName);
  const root = document.documentElement;
  
  // Set CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--yt-assist-${key}`, value);
  });
  
  Object.entries(theme.gradients).forEach(([key, value]) => {
    root.style.setProperty(`--yt-assist-gradient-${key}`, value);
  });
  
  root.style.setProperty('--yt-assist-is-dark', theme.isDark ? '1' : '0');
  
  // Add theme class to body
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(theme.isDark ? 'theme-dark' : 'theme-light');
  
  return theme;
}

// Generate CSS for theme
function generateThemeCSS(themeName = null) {
  const theme = getTheme(themeName);
  
  return `
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
    }
  `;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ThemeManager = {
    THEMES,
    loadTheme,
    saveTheme,
    getTheme,
    getAllThemes,
    applyTheme,
    generateThemeCSS,
    getCurrentTheme: () => currentTheme
  };
}

console.log('[Themes] Module loaded with', Object.keys(THEMES).length, 'themes');
