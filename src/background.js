// SharePoint Shortcuts Background Script

// Default SharePoint shortcuts
const DEFAULT_SHORTCUTS = [
  {
    id: 'sp-site-contents',
    title: 'Site Contents',
    path: '/_layouts/15/viewlsts.aspx'
  },
  {
    id: 'sp-site-settings',
    title: 'Site Settings',
    path: '/_layouts/15/settings.aspx'
  },
  {
    id: 'sp-recycle-bin',
    title: 'Recycle Bin',
    path: '/_layouts/15/RecycleBin.aspx'
  },
  {
    id: 'sp-site-permissions',
    title: 'Site Permissions',
    path: '/_layouts/15/user.aspx'
  },
  {
    id: 'sp-site-columns',
    title: 'Site columns',
    path: '/_layouts/15/mngfield.aspx'
  },
  {
    id: 'sp-term-store',
    title: 'Term Store Management',
    path: '/_layouts/15/termstoremanager.aspx'
  },
  {
    id: 'sp-search-schema',
    title: 'Search Schema',
    path: '/_layouts/15/listmanagedproperties.aspx?level=sitecol'
  }
];

// List-specific shortcuts
const LIST_SHORTCUTS = [
  {
    id: 'list-settings',
    title: 'List Settings',
    pathTemplate: '/_layouts/15/listedit.aspx?List={listId}'
  }
];

// Store current list info globally for context menu creation
let currentListInfo = null;
let contextMenuUpdateTimeout = null;
let isCreatingMenus = false; // Flag to prevent concurrent menu creation

// Debounced context menu creation function
function createContextMenusDebounced(tabId = null, delay = 50) { // Reduced from 300ms to 50ms
  // Clear any existing timeout
  if (contextMenuUpdateTimeout) {
    clearTimeout(contextMenuUpdateTimeout);
  }
  
  // Set a new timeout
  contextMenuUpdateTimeout = setTimeout(() => {
    createContextMenus(tabId);
  }, delay);
}

// Quick function to create basic menu without list shortcuts (for immediate navigation feedback)
function createContextMenusWithoutList() {
  return new Promise((resolve) => {
    if (isCreatingMenus) {
      resolve();
      return;
    }
    
    isCreatingMenus = true;
    chrome.contextMenus.removeAll(() => {
      setTimeout(() => {
        // Create parent menu
        chrome.contextMenus.create({
          id: 'sp-shortcuts',
          title: 'SP Shortcuts',
          contexts: ['page'],
          documentUrlPatterns: [
            '*://*.sharepoint.com/*',
            '*://*/*.sharepoint.com/*'
          ]
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('Error creating parent menu:', chrome.runtime.lastError.message);
          }
          
          // Only add site-level shortcuts (no list shortcuts)
          createMenuItems(null);
          isCreatingMenus = false;
          resolve();
        });
      }, 10); // Reduced from 50ms to 10ms for even faster response
    });
  });
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('SP Shortcuts extension installed');
  
  // Store default shortcuts if not already saved
  chrome.storage.sync.get(['shortcuts'], (result) => {
    if (!result.shortcuts) {
      chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS });
    }
  });
  
  createContextMenus();
});

// Create context menus
async function createContextMenus(tabId = null) {
  // Remove existing menus first and wait for completion
  return new Promise((resolve) => {
    if (isCreatingMenus) {
      resolve();
      return;
    }
    
    isCreatingMenus = true;
    chrome.contextMenus.removeAll(() => {
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        // Create parent menu
        chrome.contextMenus.create({
          id: 'sp-shortcuts',
          title: 'SP Shortcuts',
          contexts: ['page'],
          documentUrlPatterns: [
            '*://*.sharepoint.com/*',
            '*://*/*.sharepoint.com/*'
          ]
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('Error creating parent menu:', chrome.runtime.lastError.message);
            isCreatingMenus = false;
            resolve();
            return;
          }

          // If we have a specific tab, get list info first
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: 'getListInfo' }, (response) => {
              if (chrome.runtime.lastError) {
                // Handle case where content script isn't ready or page doesn't support it
                console.log('Could not get list info:', chrome.runtime.lastError.message);
                currentListInfo = null;
                createMenuItems(null);
                isCreatingMenus = false;
                resolve();
              } else if (response && response.listInfo) {
                currentListInfo = response.listInfo;
                createMenuItems(response.listInfo);
                isCreatingMenus = false;
                resolve();
              } else {
                currentListInfo = null;
                createMenuItems(null);
                isCreatingMenus = false;
                resolve();
              }
            });
          } else {
            createMenuItems(null);
            isCreatingMenus = false;
            resolve();
          }
        });
      }, 10); // Reduced from 100ms to 10ms
    });
  });
}

// Create menu items based on context
function createMenuItems(listInfo) {
  console.log('SP Shortcuts: Creating menu items with listInfo:', listInfo);
  
  // Get shortcuts from storage and create menu items
  chrome.storage.sync.get(['shortcuts'], (result) => {
    const shortcuts = result.shortcuts || DEFAULT_SHORTCUTS;
    
    try {
      // Add list-specific shortcuts if we're on a list page
      if (listInfo && listInfo.listTitle) {
        console.log('SP Shortcuts: Adding list-specific shortcuts for:', listInfo.listTitle);

        LIST_SHORTCUTS.forEach((shortcut) => {
          // Only add shortcuts that work without listId, or when we have listId
          if (!shortcut.pathTemplate.includes('{listId}') || listInfo.listId) {
            chrome.contextMenus.create({
              id: shortcut.id,
              parentId: 'sp-shortcuts',
              title: `${shortcut.title}`,
              contexts: ['page'],
              documentUrlPatterns: [
                '*://*.sharepoint.com/*',
                '*://*/*.sharepoint.com/*'
              ]
            }, () => {
              if (chrome.runtime.lastError) {
                console.log(`Error creating ${shortcut.id}:`, chrome.runtime.lastError.message);
              }
            });
          }
        });
      }
      
      // Add regular site shortcuts
      shortcuts.forEach((shortcut) => {
        chrome.contextMenus.create({
          id: shortcut.id,
          parentId: 'sp-shortcuts',
          title: shortcut.title,
          contexts: ['page'],
          documentUrlPatterns: [
            '*://*.sharepoint.com/*',
            '*://*/*.sharepoint.com/*'
          ]
        }, () => {
          if (chrome.runtime.lastError) {
            console.log(`Error creating ${shortcut.id}:`, chrome.runtime.lastError.message);
          }
        });
      });

      // Add separator and settings
      chrome.contextMenus.create({
        id: 'separator',
        parentId: 'sp-shortcuts',
        type: 'separator',
        contexts: ['page']
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('Error creating separator:', chrome.runtime.lastError.message);
        }
      });

      chrome.contextMenus.create({
        id: 'open-settings',
        parentId: 'sp-shortcuts',
        title: 'Settings',
        contexts: ['page']
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('Error creating open-settings:', chrome.runtime.lastError.message);
        }
      });
      
    } catch (error) {
      console.error('Error in createMenuItems:', error);
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-settings') {
    chrome.runtime.openOptionsPage();
    return;
  }

  // Check if it's a list-specific shortcut
  const listShortcut = LIST_SHORTCUTS.find(s => s.id === info.menuItemId);
  
  if (listShortcut) {
    // Handle list-specific shortcuts
    chrome.tabs.sendMessage(tab.id, { action: 'getListInfo' }, (response) => {
      if (response && response.listInfo && response.listInfo.listId) {
        const listInfo = response.listInfo;
        const targetPath = listShortcut.pathTemplate.replace('{listId}', listInfo.listId);
        const targetUrl = listInfo.webAbsoluteUrl + targetPath;
        chrome.tabs.create({ url: targetUrl });
      } else {
        console.error('Could not determine list information or missing listId');
      }
    });
    return;
  }

  // Handle regular site shortcuts
  chrome.storage.sync.get(['shortcuts'], (result) => {
    const shortcuts = result.shortcuts || DEFAULT_SHORTCUTS;
    const clickedShortcut = shortcuts.find(s => s.id === info.menuItemId);
    
    if (clickedShortcut) {
      // Get the SharePoint site URL from current tab
      chrome.tabs.sendMessage(tab.id, {
        action: 'getSiteUrl'
      }, (response) => {
        if (response && response.siteUrl) {
          const targetUrl = response.siteUrl + clickedShortcut.path;
          chrome.tabs.create({ url: targetUrl });
        } else {
          console.error('Could not determine SharePoint site URL');
        }
      });
    }
  });
});

// Listen for storage changes to update context menus
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.shortcuts) {
    createContextMenusDebounced();
  }
});

// Listen for tab updates to refresh context menus based on page content
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('.sharepoint.com')) {
    
    // Immediately clear list shortcuts on navigation start
    if (changeInfo.status === 'loading') {
      console.log('SP Shortcuts: Navigation starting, immediately clearing list shortcuts for tab', tabId);
      currentListInfo = null;
      // Create basic menu without list shortcuts immediately
      createContextMenusWithoutList();
    }
    
    // Full refresh when page is complete
    if (changeInfo.status === 'complete') {
      console.log('SP Shortcuts: Page complete, full refresh for tab', tabId);
      currentListInfo = null;
      
      // Use faster debounced update
      createContextMenusDebounced(tabId, 100); // Reduced from 1500ms to 100ms
    }
  }
});

// Listen for tab activation to refresh context menus
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.includes('.sharepoint.com')) {
      // Immediately clear list shortcuts when switching tabs
      console.log('SP Shortcuts: Tab activated, immediately clearing list shortcuts for tab', activeInfo.tabId);
      currentListInfo = null;
      createContextMenusWithoutList();
      
      // Then do full refresh after shorter delay
      createContextMenusDebounced(activeInfo.tabId, 100); // Reduced from 500ms to 100ms
    }
  });
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenus') {
    console.log('SP Shortcuts: Received updateContextMenus request from tab', sender.tab?.id);
    // Clear cached list info when explicitly requested to update
    currentListInfo = null;
    createContextMenusDebounced(sender.tab?.id, 10); // Reduced from 100ms to 10ms for explicit requests
    sendResponse({ success: true });
  } else if (request.action === 'clearListShortcuts') {
    console.log('SP Shortcuts: Received clearListShortcuts request from tab', sender.tab?.id);
    // Immediately clear list info and create basic menu
    currentListInfo = null;
    createContextMenusWithoutList();
    sendResponse({ success: true });
  }
});
