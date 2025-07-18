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
function createContextMenus() {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create parent menu
    chrome.contextMenus.create({
      id: 'sp-shortcuts',
      title: 'SP Shortcuts',
      contexts: ['page'],
      documentUrlPatterns: [
        '*://*.sharepoint.com/*',
        '*://*/*.sharepoint.com/*'
      ]
    });

    // Get shortcuts from storage and create menu items
    chrome.storage.sync.get(['shortcuts'], (result) => {
      const shortcuts = result.shortcuts || DEFAULT_SHORTCUTS;
      
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
        });
      });

      // Add separator and settings
      chrome.contextMenus.create({
        id: 'separator',
        parentId: 'sp-shortcuts',
        type: 'separator',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'open-settings',
        parentId: 'sp-shortcuts',
        title: 'Settings',
        contexts: ['page']
      });
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-settings') {
    chrome.runtime.openOptionsPage();
    return;
  }

  // Get shortcuts and find the clicked one
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
    createContextMenus();
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenus') {
    createContextMenus();
    sendResponse({ success: true });
  }
});
