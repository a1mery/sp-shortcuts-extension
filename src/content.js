// SharePoint Shortcuts Content Script

// Function to detect if we're on a SharePoint list page and get list info
async function getListInfo() {
  try {
    // Check if we're on a list page by looking for common list page indicators
    const currentUrl = window.location.href;
    const urlLower = currentUrl.toLowerCase();
    
    // Exclude admin/settings pages - these are not list pages even if they have list parameters
    const isAdminPage = urlLower.includes('/_layouts/') || 
                       urlLower.includes('/settings.aspx') ||
                       urlLower.includes('/listedit.aspx') ||
                       urlLower.includes('/user.aspx') ||
                       urlLower.includes('/viewedit.aspx') ||
                       urlLower.includes('/workflow.aspx') ||
                       urlLower.includes('/mngfield.aspx');
    
    if (isAdminPage) {
      return null; // Don't show list shortcuts on admin pages
    }
    
    // Check URL patterns only that indicate we're on a list page
    const isListPage = urlLower.includes('/lists/') || 
                      urlLower.includes('/forms/allitems.aspx') ||
                      urlLower.includes('/forms/editform.aspx') ||
                      urlLower.includes('/forms/dispform.aspx') ||
                      urlLower.includes('/forms/newform.aspx') ||
                      urlLower.includes('rootfolder=') ||
                      urlLower.includes('allitems.aspx') ||
                      urlLower.includes('dispform.aspx') ||
                      urlLower.includes('editform.aspx') ||
                      urlLower.includes('newform.aspx') ||
                      urlLower.includes('/shared%20documents/') ||
                      urlLower.includes('/documents/') ||
                      (urlLower.includes('/forms/') && urlLower.includes('.aspx') && !isAdminPage);
    
    if (!isListPage) {
      return null;
    }

    // Method 1: Try to get list info from SharePoint context (fastest)
    if (typeof _spPageContextInfo !== 'undefined') {
      if (_spPageContextInfo.listId) {
        return {
          listId: _spPageContextInfo.listId,
          listTitle: _spPageContextInfo.listTitle || 'Unknown List',
          webAbsoluteUrl: _spPageContextInfo.webAbsoluteUrl
        };
      }
    }

    // Method 2: Only use REST API as fallback when _spPageContextInfo is not available
    const siteUrl = getSharePointSiteUrl();
    let constructedListUrlPath = '';
    
    // Pattern 1: Regular lists - /Lists/ListName/
    const listMatch = currentUrl.match(/\/Lists\/([^\/\?]+)/i);
    if (listMatch) {
      const sitePath = siteUrl.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain
      constructedListUrlPath = `${sitePath}/Lists/${listMatch[1]}`;
    } 
    // Pattern 2: Document libraries - /LibraryName/Forms/
    else {
      const docLibMatch = currentUrl.match(/\/([^\/\?]+)\/Forms\/[^\/]*\.aspx/i);
      if (docLibMatch) {
        const sitePath = siteUrl.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain
        constructedListUrlPath = `${sitePath}/${docLibMatch[1]}`;
      }
    }

    // If we have a constructed path, try the REST API
    if (constructedListUrlPath) {
      try {
        const listInfoUrl = `${siteUrl}/_api/web/GetList('${encodeURIComponent(constructedListUrlPath)}')`;
        console.log('Attempting to fetch list info from:', listInfoUrl);
        
        const response = await fetch(listInfoUrl, {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'X-RequestDigest': document.getElementById('__REQUESTDIGEST')?.value || ''
          }
        });

        if (response.ok) {
          const listData = await response.json();
          return {
            listId: listData.Id,
            listTitle: listData.Title,
            webAbsoluteUrl: siteUrl,
            listUrlPath: constructedListUrlPath
          };
        } else {
          console.log('API response not OK:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.log('Could not fetch list info via REST API:', apiError);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting list info:', error);
    return null;
  }
}

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

    // Method 3: Try to extract from meta tags (only check if we're on a SharePoint domain)
    if (window.location.hostname.includes('sharepoint.com')) {
      const metaTags = document.querySelectorAll('meta[name="msapplication-starturl"], meta[property="og:url"]');
      for (const meta of metaTags) {
        const content = meta.getAttribute('content');
        if (content && (content.includes('.sharepoint.com') || content.includes('.sharepoint-df.com'))) {
          const url = new URL(content);
          return `${url.protocol}//${url.host}${url.pathname.split('/').slice(0, 4).join('/')}`;
        }
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
  try {
    if (request.action === 'getSiteUrl') {
      const siteUrl = getSharePointSiteUrl();
      sendResponse({ siteUrl: siteUrl });
    } else if (request.action === 'getListInfo') {
      // Handle async function with promise
      getListInfo().then(listInfo => {
        sendResponse({ listInfo: listInfo });
      }).catch(error => {
        console.error('Error in getListInfo:', error);
        sendResponse({ listInfo: null });
      });
      return true; // Keep the message channel open for async response
    }
  } catch (error) {
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('SP Shortcuts: Extension context invalidated in message listener');
      return;
    }
    console.error('SP Shortcuts: Error in message listener:', error);
    sendResponse({ error: error.message });
  }
});

// Only add indicator if we're actually on a SharePoint site
if (window.location.hostname.includes('sharepoint.com')) {
  // Safe message sending function to handle extension context invalidation
  function safeRuntimeMessage(message, callback = null) {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage(message, callback);
      }
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('SP Shortcuts: Extension context invalidated, stopping operations');
        // Stop all intervals and listeners to prevent further errors
        clearInterval(urlCheckInterval);
        return;
      }
      console.log('SP Shortcuts: Error sending runtime message:', error);
    }
  }
  
  // Monitor for SharePoint SPA navigation changes
  let currentUrl = window.location.href;
  let lastListInfo = null;
  let urlCheckInterval = null;
  
  // Function to check for URL changes and list context changes
  async function checkForContextChange() {
    const newUrl = window.location.href;
    
    if (newUrl !== currentUrl) {
      const oldUrl = currentUrl;
      currentUrl = newUrl;
      console.log('SP Shortcuts: URL changed from', oldUrl, 'to', currentUrl);
      
      // Immediately notify background to clear list shortcuts
      safeRuntimeMessage({ action: 'clearListShortcuts' });
      
      // Check if we're navigating from settings page back to list
      const wasOnSettingsPage = oldUrl && oldUrl.toLowerCase().includes('/_layouts/');
      const nowOnListPage = newUrl.toLowerCase().includes('/lists/') || 
                           newUrl.toLowerCase().includes('/forms/') ||
                           newUrl.toLowerCase().includes('allitems.aspx');
      
      if (wasOnSettingsPage && nowOnListPage) {
        console.log('SP Shortcuts: Detected navigation from settings to list page - forcing refresh');
        // Force a context menu refresh immediately after clearing
        safeRuntimeMessage({ action: 'updateContextMenus' });
      }
      
      // Check for list context changes
      await checkAndUpdateListContext();
    }
  }
  
  // Separate function to check and update list context
  async function checkAndUpdateListContext() {
    try {
      const newListInfo = await getListInfo();
      const listInfoChanged = JSON.stringify(newListInfo) !== JSON.stringify(lastListInfo);
      
      if (listInfoChanged) {
        console.log('SP Shortcuts: List context changed from', lastListInfo, 'to', newListInfo);
        lastListInfo = newListInfo;
        // Notify background script to refresh context menus
        safeRuntimeMessage({ action: 'updateContextMenus' });
      }
    } catch (error) {
      console.log('SP Shortcuts: Error checking list context', error);
      // Still notify to refresh menus in case of errors
      safeRuntimeMessage({ action: 'updateContextMenus' });
    }
  }

  // Monitor URL changes more frequently since SharePoint is a SPA
  urlCheckInterval = setInterval(checkForContextChange, 1000);
  
  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', checkForContextChange);
  
  // Listen for focus events (when returning to this tab)
  window.addEventListener('focus', checkAndUpdateListContext);
  
  // Optional: Add visual indicator when extension is active (only in dev mode)
  function addExtensionIndicator() {
    // Only show in development or if explicitly enabled
    if (chrome.runtime.getManifest().name.includes('Dev') || localStorage.getItem('sp-shortcuts-debug') === 'true') {
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
  }

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExtensionIndicator);
  } else {
    addExtensionIndicator();
  }
}
