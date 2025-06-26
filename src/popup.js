// SharePoint Shortcuts Popup Script

document.addEventListener('DOMContentLoaded', function() {
    loadShortcuts();
    setupEventListeners();
});

// Load shortcuts from storage and display them
function loadShortcuts() {
    chrome.storage.sync.get(['shortcuts'], (result) => {
        const shortcuts = result.shortcuts || [];
        displayShortcuts(shortcuts);
    });
}

// Display shortcuts in the list
function displayShortcuts(shortcuts) {
    const shortcutsList = document.getElementById('shortcuts-list');
    
    if (shortcuts.length === 0) {
        shortcutsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No shortcuts configured</div>';
        return;
    }
    
    shortcutsList.innerHTML = shortcuts.map((shortcut, index) => `
        <div class="shortcut-item" data-index="${index}">
            <div class="shortcut-info">
                <div class="shortcut-title">${escapeHtml(shortcut.title)}</div>
                <div class="shortcut-path">${escapeHtml(shortcut.path)}</div>
            </div>
            <div class="shortcut-actions">
                <button class="btn-small btn-delete" onclick="deleteShortcut(${index})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Add shortcut form
    document.getElementById('add-shortcut-form').addEventListener('submit', addShortcut);
    
    // Reset to defaults
    document.getElementById('reset-defaults').addEventListener('click', resetToDefaults);
    
    // Export shortcuts
    document.getElementById('export-shortcuts').addEventListener('click', exportShortcuts);
    
    // Import shortcuts
    document.getElementById('import-shortcuts').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', importShortcuts);
}

// Add new shortcut
function addShortcut(event) {
    event.preventDefault();
    
    const title = document.getElementById('shortcut-title').value.trim();
    const path = document.getElementById('shortcut-path').value.trim();
    
    if (!title || !path) {
        showStatus('Please fill in both title and path', 'error');
        return;
    }
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    
    chrome.storage.sync.get(['shortcuts'], (result) => {
        const shortcuts = result.shortcuts || [];
        
        // Check for duplicate titles
        if (shortcuts.some(s => s.title.toLowerCase() === title.toLowerCase())) {
            showStatus('A shortcut with this title already exists', 'error');
            return;
        }
        
        // Generate unique ID
        const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const newShortcut = {
            id: id,
            title: title,
            path: normalizedPath
        };
        
        shortcuts.push(newShortcut);
        
        chrome.storage.sync.set({ shortcuts: shortcuts }, () => {
            // Clear form
            document.getElementById('shortcut-title').value = '';
            document.getElementById('shortcut-path').value = '';
            
            // Reload shortcuts display
            loadShortcuts();
            
            // Update context menus
            chrome.runtime.sendMessage({ action: 'updateContextMenus' });
            
            showStatus('Shortcut added successfully!', 'success');
        });
    });
}

// Delete shortcut
function deleteShortcut(index) {
    if (!confirm('Are you sure you want to delete this shortcut?')) {
        return;
    }
    
    chrome.storage.sync.get(['shortcuts'], (result) => {
        const shortcuts = result.shortcuts || [];
        shortcuts.splice(index, 1);
        
        chrome.storage.sync.set({ shortcuts: shortcuts }, () => {
            loadShortcuts();
            chrome.runtime.sendMessage({ action: 'updateContextMenus' });
            showStatus('Shortcut deleted successfully!', 'success');
        });
    });
}

// Reset to default shortcuts
function resetToDefaults() {
    if (!confirm('This will remove all custom shortcuts and reset to defaults. Continue?')) {
        return;
    }
    
    const defaultShortcuts = [
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
            id: 'sp-app-catalog',
            title: 'App Catalog',
            path: '/_catalogs/apps/Forms/AllItems.aspx'
        },
        {
            id: 'sp-site-permissions',
            title: 'Site Permissions',
            path: '/_layouts/15/user.aspx'
        },
        {
            id: 'sp-web-parts',
            title: 'Web Part Gallery',
            path: '/_catalogs/wp/Forms/AllItems.aspx'
        },
        {
            id: 'sp-master-pages',
            title: 'Master Page Gallery',
            path: '/_catalogs/masterpage/Forms/AllItems.aspx'
        },
        {
            id: 'sp-workflows',
            title: 'Workflow Settings',
            path: '/_layouts/15/workflow.aspx'
        },
        {
            id: 'sp-site-usage',
            title: 'Site Usage',
            path: '/_layouts/15/usage.aspx'
        },
        {
            id: 'sp-term-store',
            title: 'Term Store Management',
            path: '/_layouts/15/termstoremanager.aspx'
        }
    ];
    
    chrome.storage.sync.set({ shortcuts: defaultShortcuts }, () => {
        loadShortcuts();
        chrome.runtime.sendMessage({ action: 'updateContextMenus' });
        showStatus('Reset to default shortcuts successfully!', 'success');
    });
}

// Export shortcuts to JSON file
function exportShortcuts() {
    chrome.storage.sync.get(['shortcuts'], (result) => {
        const shortcuts = result.shortcuts || [];
        const dataStr = JSON.stringify(shortcuts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sharepoint-shortcuts.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatus('Shortcuts exported successfully!', 'success');
    });
}

// Import shortcuts from JSON file
function importShortcuts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const shortcuts = JSON.parse(e.target.result);
            
            // Validate shortcuts format
            if (!Array.isArray(shortcuts)) {
                throw new Error('Invalid format: expected array of shortcuts');
            }
            
            for (const shortcut of shortcuts) {
                if (!shortcut.id || !shortcut.title || !shortcut.path) {
                    throw new Error('Invalid shortcut format: missing required fields');
                }
            }
            
            chrome.storage.sync.set({ shortcuts: shortcuts }, () => {
                loadShortcuts();
                chrome.runtime.sendMessage({ action: 'updateContextMenus' });
                showStatus('Shortcuts imported successfully!', 'success');
            });
            
        } catch (error) {
            showStatus('Error importing shortcuts: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

// Show status message
function showStatus(message, type = 'success') {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    
    // Clear status after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'status';
    }, 3000);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
