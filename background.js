// Background service worker - Multi-Provider AI (Gemini, OpenAI & DeepSeek)

// ========== ANALYTICS TRACKING ==========
// Track extension install/update events
chrome.runtime.onInstalled.addListener((details) => {
  const version = chrome.runtime.getManifest().version;
  
  if (details.reason === 'install') {
    console.log('[YT Assistant] Extension installed, version:', version);
    // Send install event to content script for analytics
    trackBackgroundEvent('extension_installed', { version });
  } else if (details.reason === 'update') {
    console.log('[YT Assistant] Extension updated to version:', version);
    trackBackgroundEvent('extension_updated', { 
      version,
      previous_version: details.previousVersion 
    });
  }
});

// Helper to track events from background (sends to GA via fetch)
async function trackBackgroundEvent(eventName, params = {}) {
  try {
    // GA4 config - same as analytics.js
    const GA_MEASUREMENT_ID = 'G-7P7PKDYC84';
    const GA_API_SECRET = 'EkBcPhRjRT2O8NFCfbfo1A';
    
    if (GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return; // Not configured
    
    // Get or create client ID
    const storage = await chrome.storage.local.get(['analyticsClientId']);
    let clientId = storage.analyticsClientId;
    if (!clientId) {
      clientId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await chrome.storage.local.set({ analyticsClientId: clientId });
    }
    
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          ...params,
          engagement_time_msec: 100
        }
      }]
    };
    
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
    
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    }).catch(() => {}); // Ignore errors
    
  } catch (err) {
    console.log('[Analytics] Background tracking error:', err.message);
  }
}

// ========== MESSAGE HANDLERS ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGemini') {
    callAI(request.data).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  // Handle analytics tracking from popup
  if (request.action === 'trackEvent') {
    trackBackgroundEvent(request.eventName, request.params || {});
    sendResponse({ success: true });
    return false;
  }
});

async function callAI(data) {
  const settings = await chrome.storage.sync.get(['provider', 'apiKey', 'model', 'openaiApiKey', 'deepseekApiKey']);
  const provider = settings.provider || 'gemini';

  if (provider === 'gemini') {
    return await callGemini(data, settings);
  } else if (provider === 'openai') {
    return await callOpenAI(data, settings);
  } else if (provider === 'deepseek') {
    return await callDeepSeek(data, settings);
  } else {
    throw new Error('Invalid provider selected');
  }
}

async function callGemini(data, settings) {
  if (!settings.apiKey) throw new Error('API_KEY_MISSING:Gemini API key not configured. Please set your API key in the extension popup.');

  const model = settings.model || 'gemini-2.0-flash-exp';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: data.prompt }]
      }],
      generationConfig: {
        temperature: data.temperature || 0.8,
        maxOutputTokens: data.maxTokens || 800,
        topK: 40,
        topP: 0.95
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error?.message || 'Gemini API request failed';
    const statusCode = response.status;
    
    // Handle specific error codes
    if (statusCode === 429 || errorMsg.includes('quota') || errorMsg.includes('rate limit') || errorMsg.includes('RATE_LIMIT')) {
      throw new Error('RATE_LIMIT:API quota exceeded. Please wait a few minutes or upgrade your API plan.');
    }
    if (statusCode === 401 || statusCode === 403 || errorMsg.includes('API key')) {
      throw new Error('AUTH_ERROR:Invalid API key. Please check your Gemini API key in settings.');
    }
    if (statusCode === 500 || statusCode === 503) {
      throw new Error('SERVER_ERROR:Gemini server is temporarily unavailable. Please try again later.');
    }
    
    throw new Error('API_ERROR:' + errorMsg);
  }

  const result = await response.json();
  
  if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
    // Check for safety block
    if (result.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error('SAFETY_BLOCK:Content was blocked by safety filters. Try rephrasing your content.');
    }
    throw new Error('NO_RESPONSE:No response from Gemini. Please try again.');
  }

  return result.candidates[0].content.parts[0].text;
}

async function callOpenAI(data, settings) {
  if (!settings.openaiApiKey) throw new Error('API_KEY_MISSING:OpenAI API key not configured. Please set your API key in the extension popup.');

  const model = settings.model || 'gpt-4o';
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: data.prompt
        }
      ],
      temperature: data.temperature || 0.8,
      max_tokens: data.maxTokens || 800
    })
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error?.message || 'OpenAI API request failed';
    const statusCode = response.status;
    
    // Handle specific error codes
    if (statusCode === 429 || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      throw new Error('RATE_LIMIT:API quota exceeded. Please wait or check your OpenAI billing.');
    }
    if (statusCode === 401 || errorMsg.includes('API key') || errorMsg.includes('Incorrect')) {
      throw new Error('AUTH_ERROR:Invalid API key. Please check your OpenAI API key in settings.');
    }
    if (statusCode === 402 || errorMsg.includes('billing') || errorMsg.includes('insufficient')) {
      throw new Error('BILLING_ERROR:Insufficient credits. Please add credits to your OpenAI account.');
    }
    if (statusCode === 500 || statusCode === 503) {
      throw new Error('SERVER_ERROR:OpenAI server is temporarily unavailable. Please try again later.');
    }
    
    throw new Error('API_ERROR:' + errorMsg);
  }

  const result = await response.json();
  
  if (!result.choices || !result.choices[0]?.message?.content) {
    throw new Error('NO_RESPONSE:No response from OpenAI. Please try again.');
  }

  return result.choices[0].message.content;
}

async function callDeepSeek(data, settings) {
  if (!settings.deepseekApiKey) throw new Error('API_KEY_MISSING:DeepSeek API key not configured. Please set your API key in the extension popup.');

  const model = settings.model || 'deepseek-chat';
  const apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.deepseekApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: data.prompt
        }
      ],
      temperature: data.temperature || 0.8,
      max_tokens: data.maxTokens || 800
    })
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error?.message || 'DeepSeek API request failed';
    const statusCode = response.status;
    
    // Handle specific error codes
    if (statusCode === 429 || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      throw new Error('RATE_LIMIT:API quota exceeded. Please wait or check your DeepSeek balance.');
    }
    if (statusCode === 401 || errorMsg.includes('API key') || errorMsg.includes('authentication')) {
      throw new Error('AUTH_ERROR:Invalid API key. Please check your DeepSeek API key in settings.');
    }
    if (statusCode === 402 || errorMsg.includes('balance') || errorMsg.includes('insufficient')) {
      throw new Error('BILLING_ERROR:Insufficient balance. Please top up your DeepSeek account.');
    }
    if (statusCode === 500 || statusCode === 503) {
      throw new Error('SERVER_ERROR:DeepSeek server is temporarily unavailable. Please try again later.');
    }
    
    throw new Error('API_ERROR:' + errorMsg);
  }

  const result = await response.json();
  
  if (!result.choices || !result.choices[0]?.message?.content) {
    throw new Error('NO_RESPONSE:No response from DeepSeek. Please try again.');
  }

  return result.choices[0].message.content;
}
