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
    
    // Check various patterns that indicate we're on a list page
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
                      (urlLower.includes('/forms/') && urlLower.includes('.aspx') && !isAdminPage) ||
                      // DOM-based detection - check after a small delay to ensure elements are loaded
                      document.querySelector('[data-sp-listid]') ||
                      document.querySelector('.ms-listviewtable') ||
                      document.querySelector('[role="grid"][data-automationid*="list"]') ||
                      document.querySelector('[data-automation-id="listView"]') ||
                      document.querySelector('[data-automationid="listViewHeader"]') ||
                      document.querySelector('.ms-List') ||
                      // Additional SharePoint Modern UI selectors
                      document.querySelector('[data-automationid="DetailsList"]') ||
                      document.querySelector('[data-list-id]');
    
    if (!isListPage) {
      // Try waiting a bit longer for DOM elements to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check DOM again after delay
      const isDOMListPage = document.querySelector('[data-sp-listid]') ||
                           document.querySelector('.ms-listviewtable') ||
                           document.querySelector('[role="grid"][data-automationid*="list"]') ||
                           document.querySelector('[data-automation-id="listView"]') ||
                           document.querySelector('[data-automationid="listViewHeader"]') ||
                           document.querySelector('.ms-List') ||
                           document.querySelector('[data-automationid="DetailsList"]') ||
                           document.querySelector('[data-list-id]');
      
      if (!isDOMListPage) {
        return null;
      }
    }

    // Method 1: Try to get list info from SharePoint context
    if (typeof _spPageContextInfo !== 'undefined') {
      if (_spPageContextInfo.listId) {
        return {
          listId: _spPageContextInfo.listId,
          listTitle: _spPageContextInfo.listTitle || 'Unknown List',
          webAbsoluteUrl: _spPageContextInfo.webAbsoluteUrl
        };
      }
    }

    // Method 2: Try to extract from URL patterns
    let listName = null;
    let listUrlPath = null;
    
    // Pattern 1: /Lists/ListName/ or /Lists/ListName/Forms/
    const listMatch = currentUrl.match(/\/Lists\/([^\/\?]+)/i);
    if (listMatch) {
      listName = decodeURIComponent(listMatch[1]);
    } 
    // Pattern 2: Document libraries - /Shared%20Documents/ or /DocumentLibraryName/
    else {
      const docLibMatch = currentUrl.match(/\/([^\/\?]+)\/Forms\/AllItems\.aspx/i) ||
                         currentUrl.match(/\/([^\/\?]+)\/Forms\/[^\/]+\.aspx/i);
      if (docLibMatch) {
        listName = decodeURIComponent(docLibMatch[1]);
      }
    }
    
    // Pattern 3: Try to get from RootFolder parameter
    if (!listName) {
      const rootFolderMatch = currentUrl.match(/rootfolder=([^&]+)/i);
      if (rootFolderMatch) {
        const rootFolder = decodeURIComponent(rootFolderMatch[1]);
        const parts = rootFolder.split('/');
        if (parts.length > 0) {
          listName = parts[parts.length - 1];
        }
      }
    }

    // Method 3: Try to get from DOM elements
    if (!listName) {
      const titleElement = document.querySelector('h1[data-automation-id="pageTitle"]') ||
                          document.querySelector('.ms-core-pageTitle') ||
                          document.querySelector('[data-automation-id="listTitle"]');
      if (titleElement) {
        listName = titleElement.textContent.trim();
      }
    }

    if (listName) {
      const siteUrl = getSharePointSiteUrl();
      
      // Try to get list info via REST API using GetList endpoint
      try {
        // Construct the list URL path
        let constructedListUrlPath = '';
        
        // Method 1: Extract from current URL if it contains the full path
        const currentUrl = window.location.href;
        const listMatch = currentUrl.match(/\/Lists\/([^\/\?]+)/i);
        const docLibMatch = currentUrl.match(/\/([^\/\?]+)\/Forms\/[^\/]*\.aspx/i);
        
        if (listMatch) {
          // Regular list: /sites/sitename/Lists/ListName
          const sitePath = siteUrl.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain
          constructedListUrlPath = `${sitePath}/Lists/${listMatch[1]}`;
        } else if (docLibMatch) {
          // Document library: /sites/sitename/LibraryName
          const sitePath = siteUrl.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain
          constructedListUrlPath = `${sitePath}/${docLibMatch[1]}`;
        } else {
          // Fallback: try to construct from site URL and list name
          const sitePath = siteUrl.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain
          // Check if it might be a document library (common names)
          const docLibNames = ['Documents', 'Shared Documents', 'Site Assets', 'Style Library', 'Site Pages'];
          if (docLibNames.some(name => listName.toLowerCase().includes(name.toLowerCase()))) {
            constructedListUrlPath = `${sitePath}/${encodeURIComponent(listName)}`;
          } else {
            constructedListUrlPath = `${sitePath}/Lists/${encodeURIComponent(listName)}`;
          }
        }
        
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
            listName: listName,
            listUrlPath: constructedListUrlPath
          };
        } else {
          console.log('API response not OK:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.log('Could not fetch list info via REST API:', apiError);
      }

      // Fallback: return basic info without list ID
      return {
        listId: null,
        listTitle: listName,
        webAbsoluteUrl: getSharePointSiteUrl(),
        listName: listName,
        listUrlPath: null
      };
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
});

// Only add indicator if we're actually on a SharePoint site
if (window.location.hostname.includes('sharepoint.com')) {
  // Monitor for SharePoint SPA navigation changes
  let currentUrl = window.location.href;
  let lastListInfo = null;
  
  // Function to check for URL changes and list context changes
  async function checkForContextChange() {
    const newUrl = window.location.href;
    
    if (newUrl !== currentUrl) {
      const oldUrl = currentUrl;
      currentUrl = newUrl;
      console.log('SP Shortcuts: URL changed from', oldUrl, 'to', currentUrl);
      
      // Immediately notify background to clear list shortcuts
      chrome.runtime.sendMessage({ action: 'clearListShortcuts' });
      
      // Check if we're navigating from settings page back to list
      const wasOnSettingsPage = oldUrl && oldUrl.toLowerCase().includes('/_layouts/');
      const nowOnListPage = newUrl.toLowerCase().includes('/lists/') || 
                           newUrl.toLowerCase().includes('/forms/') ||
                           newUrl.toLowerCase().includes('allitems.aspx');
      
      if (wasOnSettingsPage && nowOnListPage) {
        console.log('SP Shortcuts: Detected navigation from settings to list page - forcing refresh');
        // Force a context menu refresh immediately after clearing
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'updateContextMenus' });
        }, 100);
      }
      
      // Wait for page content to load, then check multiple times to catch delayed content
      setTimeout(async () => {
        await checkAndUpdateListContext();
      }, 1000);
      
      // Check again after a longer delay in case content loads slowly
      setTimeout(async () => {
        await checkAndUpdateListContext();
      }, 3000);
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
        chrome.runtime.sendMessage({ action: 'updateContextMenus' });
      }
    } catch (error) {
      console.log('SP Shortcuts: Error checking list context', error);
      // Still notify to refresh menus in case of errors
      chrome.runtime.sendMessage({ action: 'updateContextMenus' });
    }
  }

  // Monitor URL changes more frequently since SharePoint is a SPA
  setInterval(checkForContextChange, 1000); // Reduced interval for faster detection
  
  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      checkForContextChange();
    }, 500);
  });
  
  // Listen for focus events (when returning to this tab)
  window.addEventListener('focus', () => {
    setTimeout(async () => {
      await checkAndUpdateListContext();
    }, 500);
  });
  
  // Listen for DOM changes that might indicate SharePoint SPA navigation
  const observer = new MutationObserver(() => {
    // Debounce the check to avoid too many calls
    clearTimeout(window.spShortcutsDebounce);
    window.spShortcutsDebounce = setTimeout(async () => {
      await checkAndUpdateListContext();
    }, 2000);
  });
  
  // Start observing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    });
  } else {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
  
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
