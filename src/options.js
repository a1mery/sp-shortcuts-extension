// SharePoint Shortcuts Options Page Script

let currentEditingIndex = -1;
let shortcuts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadShortcuts();
    setupEventListeners();
    setupTemplates();
});

// Load shortcuts from storage and display them
function loadShortcuts() {
    chrome.storage.sync.get(['shortcuts'], (result) => {
        shortcuts = result.shortcuts || [];
        displayShortcuts();
        updateShortcutsCount();
    });
}

// Display shortcuts in the list
function displayShortcuts() {
    const shortcutsList = document.getElementById('shortcuts-list');
    
    if (shortcuts.length === 0) {
        shortcutsList.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>No shortcuts configured</h3>
                <p>Add your first SharePoint shortcut using the form on the right.</p>
            </div>
        `;
        return;
    }
    
    shortcutsList.innerHTML = shortcuts.map((shortcut, index) => `
        <div class="shortcut-item ${currentEditingIndex === index ? 'editing' : ''}" data-index="${index}">
            <div class="shortcut-info">
                <div class="shortcut-title">${escapeHtml(shortcut.title)}</div>
                <div class="shortcut-path">${escapeHtml(shortcut.path)}</div>
                ${shortcut.description ? `<div class="shortcut-description">${escapeHtml(shortcut.description)}</div>` : ''}
            </div>
            <div class="shortcut-actions">
                <button class="btn-small btn-edit" data-action="edit" data-index="${index}" title="Edit shortcut">
                    <span>✏️</span>
                </button>
                <button class="btn-small btn-delete" data-action="delete" data-index="${index}" title="Delete shortcut">
                    <span>🗑️</span>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for the shortcut action buttons
    setupShortcutActionListeners();
}

// Setup event listeners for shortcut action buttons
function setupShortcutActionListeners() {
    // Remove existing listeners to prevent duplicates
    document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => {
        btn.removeEventListener('click', handleShortcutAction);
    });
    
    // Add new listeners
    document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => {
        btn.addEventListener('click', handleShortcutAction);
    });
}

// Handle shortcut action button clicks
function handleShortcutAction(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const index = parseInt(button.getAttribute('data-index'), 10);
    
    if (action === 'edit') {
        editShortcut(index);
    } else if (action === 'delete') {
        deleteShortcut(index);
    }
}

// Update shortcuts count badge
function updateShortcutsCount() {
    const countBadge = document.getElementById('shortcuts-count');
    const count = shortcuts.length;
    countBadge.textContent = `${count} shortcut${count !== 1 ? 's' : ''}`;
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('shortcut-form').addEventListener('submit', handleFormSubmit);
    
    // Cancel edit
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
    
    // Reset to defaults
    document.getElementById('reset-defaults').addEventListener('click', () => {
        showConfirmModal(
            'Reset to Defaults',
            'This will remove all custom shortcuts and reset to the default SharePoint shortcuts. This action cannot be undone.',
            resetToDefaults
        );
    });
    
    // Export shortcuts
    document.getElementById('export-shortcuts').addEventListener('click', exportShortcuts);
    
    // Import shortcuts
    document.getElementById('import-shortcuts').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', importShortcuts);
    
    // Modal event listeners
    document.getElementById('confirm-yes').addEventListener('click', handleConfirmYes);
    document.getElementById('confirm-no').addEventListener('click', hideConfirmModal);
    
    // Close modal on backdrop click
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target.id === 'confirm-modal') {
            hideConfirmModal();
        }
    });
    
    // Auto-resize textarea
    const textarea = document.getElementById('shortcut-description');
    textarea.addEventListener('input', autoResizeTextarea);
    
    // Character count for inputs
    setupCharacterCount('shortcut-title', 50);
    setupCharacterCount('shortcut-description', 200);
}

// Setup template buttons
function setupTemplates() {
    const templateButtons = document.querySelectorAll('.template-btn');
    templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.getAttribute('data-title');
            const path = btn.getAttribute('data-path');
            
            document.getElementById('shortcut-title').value = title;
            document.getElementById('shortcut-path').value = path;
            document.getElementById('shortcut-description').value = '';
            
            // Focus on title field for quick editing
            document.getElementById('shortcut-title').focus();
            document.getElementById('shortcut-title').select();
            
            showToast('Template loaded! You can modify the details and save.', 'success');
        });
    });
}

// Handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    const title = document.getElementById('shortcut-title').value.trim();
    const path = document.getElementById('shortcut-path').value.trim();
    const description = document.getElementById('shortcut-description').value.trim();
    
    if (!title || !path) {
        showToast('Please fill in both title and path fields.', 'error');
        return;
    }
    
    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    
    // Check for duplicate titles (excluding current edit)
    const duplicateIndex = shortcuts.findIndex((s, index) => 
        s.title.toLowerCase() === title.toLowerCase() && index !== currentEditingIndex
    );
    
    if (duplicateIndex !== -1) {
        showToast('A shortcut with this title already exists.', 'error');
        return;
    }
    
    const shortcutData = {
        id: currentEditingIndex >= 0 ? shortcuts[currentEditingIndex].id : generateId(),
        title: title,
        path: normalizedPath,
        description: description || undefined
    };
    
    if (currentEditingIndex >= 0) {
        // Update existing shortcut
        shortcuts[currentEditingIndex] = shortcutData;
        showToast('Shortcut updated successfully!', 'success');
    } else {
        // Add new shortcut
        shortcuts.push(shortcutData);
        showToast('Shortcut added successfully!', 'success');
    }
    
    saveShortcuts();
    resetForm();
}

// Edit shortcut
function editShortcut(index) {
    const shortcut = shortcuts[index];
    
    currentEditingIndex = index;
    
    document.getElementById('shortcut-title').value = shortcut.title;
    document.getElementById('shortcut-path').value = shortcut.path;
    document.getElementById('shortcut-description').value = shortcut.description || '';
    
    // Update UI
    document.getElementById('editor-title').textContent = 'Edit Shortcut';
    document.getElementById('save-text').textContent = 'Update Shortcut';
    document.getElementById('cancel-edit').style.display = 'inline-flex';
    
    // Highlight the editing item
    displayShortcuts();
    
    // Scroll to form and focus
    document.querySelector('.editor-panel').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('shortcut-title').focus();
}

// Cancel edit
function cancelEdit() {
    resetForm();
    showToast('Edit cancelled.', 'warning');
}

// Delete shortcut
function deleteShortcut(index) {
    const shortcut = shortcuts[index];
    showConfirmModal(
        'Delete Shortcut',
        `Are you sure you want to delete "${shortcut.title}"? This action cannot be undone.`,
        () => {
            shortcuts.splice(index, 1);
            saveShortcuts();
            
            // If we're editing this shortcut, cancel the edit
            if (currentEditingIndex === index) {
                resetForm();
            } else if (currentEditingIndex > index) {
                currentEditingIndex--;
            }
            
            showToast('Shortcut deleted successfully!', 'success');
        }
    );
}

// Reset form
function resetForm() {
    currentEditingIndex = -1;
    
    document.getElementById('shortcut-form').reset();
    document.getElementById('editor-title').textContent = 'Add New Shortcut';
    document.getElementById('save-text').textContent = 'Add Shortcut';
    document.getElementById('cancel-edit').style.display = 'none';
    
    displayShortcuts();
}

// Save shortcuts to storage
function saveShortcuts() {
    chrome.storage.sync.set({ shortcuts: shortcuts }, () => {
        displayShortcuts();
        updateShortcutsCount();
        
        // Update context menus
        chrome.runtime.sendMessage({ action: 'updateContextMenus' });
    });
}

// Reset to default shortcuts
function resetToDefaults() {
    const defaultShortcuts = [
        {
            id: 'sp-site-contents',
            title: 'Site Contents',
            path: '/_layouts/15/viewlsts.aspx',
            description: 'View all lists and libraries in this site'
        },
        {
            id: 'sp-site-settings',
            title: 'Site Settings',
            path: '/_layouts/15/settings.aspx',
            description: 'Configure site settings and permissions'
        },
        {
            id: 'sp-recycle-bin',
            title: 'Recycle Bin',
            path: '/_layouts/15/RecycleBin.aspx',
            description: 'View and restore deleted items'
        },
        {
            id: 'sp-site-permissions',
            title: 'Site Permissions',
            path: '/_layouts/15/user.aspx',
            description: 'Manage site permissions and users'
        },
        {
            id: 'sp-site-columns',
            title: 'Site Columns',
            path: '/_layouts/15/mngfield.aspx',
            description: 'Manage site columns'
        },
        {
            id: 'sp-term-store',
            title: 'Term Store Management',
            path: '/_layouts/15/termstoremanager.aspx',
            description: 'Manage taxonomy and metadata'
        },
        {
            id: 'sp-search-schema',
            title: 'Search Schema',
            path: '/_layouts/15/listmanagedproperties.aspx?level=sitecol',
            description: 'Configure search managed properties'
        }
    ];
    
    shortcuts = defaultShortcuts;
    saveShortcuts();
    resetForm();
    showToast('Reset to default shortcuts successfully!', 'success');
}

// Export shortcuts to JSON file
function exportShortcuts() {
    if (shortcuts.length === 0) {
        showToast('No shortcuts to export.', 'warning');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        shortcuts: shortcuts
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sharepoint-shortcuts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Shortcuts exported successfully!', 'success');
}

// Import shortcuts from JSON file
function importShortcuts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Handle both old and new format
            let importedShortcuts;
            if (Array.isArray(data)) {
                // Old format - direct array
                importedShortcuts = data;
            } else if (data.shortcuts && Array.isArray(data.shortcuts)) {
                // New format - object with shortcuts property
                importedShortcuts = data.shortcuts;
            } else {
                throw new Error('Invalid file format');
            }
            
            // Validate shortcuts format
            for (const shortcut of importedShortcuts) {
                if (!shortcut.id || !shortcut.title || !shortcut.path) {
                    throw new Error('Invalid shortcut format: missing required fields');
                }
            }
            
            showConfirmModal(
                'Import Shortcuts',
                `This will replace all current shortcuts with ${importedShortcuts.length} imported shortcuts. Continue?`,
                () => {
                    shortcuts = importedShortcuts;
                    saveShortcuts();
                    resetForm();
                    showToast('Shortcuts imported successfully!', 'success');
                }
            );
            
        } catch (error) {
            showToast('Error importing shortcuts: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

// Show confirmation modal
let confirmCallback = null;

function showConfirmModal(title, message, callback) {
    confirmCallback = callback;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.add('show');
}

function hideConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('show');
    confirmCallback = null;
}

function handleConfirmYes() {
    if (confirmCallback) {
        confirmCallback();
    }
    hideConfirmModal();
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('status-toast');
    const icon = document.getElementById('status-icon');
    const messageEl = document.getElementById('status-message');
    
    // Set icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    icon.textContent = icons[type] || icons.info;
    messageEl.textContent = message;
    
    // Remove existing type classes and add new one
    toast.className = `status-toast ${type}`;
    toast.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Generate unique ID
function generateId() {
    return 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Auto-resize textarea
function autoResizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// Setup character count
function setupCharacterCount(inputId, maxLength) {
    const input = document.getElementById(inputId);
    const helpText = input.nextElementSibling;
    
    function updateCount() {
        const remaining = maxLength - input.value.length;
        const originalText = helpText.textContent.split('(')[0].trim();
        helpText.textContent = `${originalText} (${remaining} characters remaining)`;
        
        if (remaining < 10) {
            helpText.style.color = 'var(--danger-color)';
        } else if (remaining < 25) {
            helpText.style.color = 'var(--warning-color)';
        } else {
            helpText.style.color = 'var(--text-muted)';
        }
    }
    
    input.addEventListener('input', updateCount);
    input.addEventListener('focus', updateCount);
    input.addEventListener('blur', () => {
        const originalText = helpText.textContent.split('(')[0].trim();
        helpText.textContent = originalText;
        helpText.style.color = 'var(--text-muted)';
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save form
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('shortcut-form').requestSubmit();
    }
    
    // Escape to cancel edit
    if (e.key === 'Escape') {
        if (currentEditingIndex >= 0) {
            cancelEdit();
        } else if (document.getElementById('confirm-modal').classList.contains('show')) {
            hideConfirmModal();
        }
    }
});

// Handle extension errors gracefully
window.addEventListener('error', (e) => {
    console.error('Extension error:', e.error);
    showToast('An error occurred. Please try again.', 'error');
});

// Initialize tooltips and accessibility
document.addEventListener('DOMContentLoaded', () => {
    // Add ARIA labels for better accessibility
    document.querySelectorAll('.btn-small').forEach(btn => {
        const title = btn.getAttribute('title');
        if (title) {
            btn.setAttribute('aria-label', title);
        }
    });
});
