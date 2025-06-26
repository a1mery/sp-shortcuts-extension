// SharePoint Shortcuts Content Script

// Function to extract SharePoint site URL
function getSharePointSiteUrl() {
  try {
    // Method 1: Try to get from _spPageContextInfo (SharePoint global object)
    if (typeof _spPageContextInfo !== 'undefined' && _spPageContextInfo.webAbsoluteUrl) {
      return _spPageContextInfo.webAbsoluteUrl;
    }

    // Method 2: Try to get from window location and construct site URL
    const currentUrl = window.location.href;
    const urlParts = currentUrl.split('/');
    
    // SharePoint URLs typically have the pattern: https://tenant.sharepoint.com/sites/sitename
    // or https://tenant.sharepoint.com (for root site)
    if (currentUrl.includes('.sharepoint.com')) {
      const protocol = urlParts[0];
      const domain = urlParts[2];
      
      // Check if it's a site collection (contains /sites/)
      const sitesIndex = urlParts.indexOf('sites');
      if (sitesIndex > -1 && urlParts[sitesIndex + 1]) {
        // Site collection URL
        return `${protocol}//${domain}/sites/${urlParts[sitesIndex + 1]}`;
      } else {
        // Root site collection
        return `${protocol}//${domain}`;
      }
    }

    // Method 3: Try to extract from meta tags
    const metaTags = document.querySelectorAll('meta[name="msapplication-starturl"], meta[property="og:url"]');
    for (const meta of metaTags) {
      const content = meta.getAttribute('content');
      if (content && content.includes('.sharepoint.com')) {
        const url = new URL(content);
        return `${url.protocol}//${url.host}${url.pathname.split('/').slice(0, 4).join('/')}`;
      }
    }

    // Fallback: use current origin
    return window.location.origin;
    
  } catch (error) {
    console.error('Error extracting SharePoint site URL:', error);
    return window.location.origin;
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSiteUrl') {
    const siteUrl = getSharePointSiteUrl();
    sendResponse({ siteUrl: siteUrl });
  }
});

// Optional: Add visual indicator when extension is active
function addExtensionIndicator() {
  if (document.querySelector('#sp-shortcuts-indicator')) return;
  
  const indicator = document.createElement('div');
  indicator.id = 'sp-shortcuts-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #0078d4;
    color: white;
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 12px;
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    opacity: 0.8;
    pointer-events: none;
  `;
  indicator.textContent = 'SP Shortcuts Active';
  document.body.appendChild(indicator);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 3000);
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
  addExtensionIndicator();
}
