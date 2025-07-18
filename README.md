# SP Shortcuts Extension

A Chrome extension that provides quick access to SharePoint admin pages and commonly used features through right-click context menus.

## ✨ Features

- **Quick Access**: Right-click on any SharePoint page to access admin shortcuts
- **Customizable**: Add, edit, and remove shortcuts through the options page
- **Smart Detection**: Automatically detects your SharePoint site and constructs the correct URLs
- **Privacy-Focused**: Minimal permissions, no data collection, works entirely offline
- **Import/Export**: Backup and share your shortcuts configuration

## 🚀 Default Shortcuts

The extension comes with these built-in SharePoint shortcuts:

- **Site Contents** - View all lists and libraries
- **Site Settings** - Access site administration settings
- **Recycle Bin** - View deleted items
- **Site Permissions** - Manage site access and permissions
- **Site Columns** - Manage site column definitions
- **Term Store Management** - Manage metadata terms
- **Search Schema** - Configure search managed properties

## 🔧 How to Use

### Basic Usage

1. **Navigate to any SharePoint site** (e.g., `https://yourcompany.sharepoint.com/sites/teamsite`)
2. **Right-click anywhere** on the page
3. **Select a shortcut** from the "SP Shortcuts" menu
4. **The admin page opens** in a new tab with the correct site URL

### Managing Shortcuts

1. **Open Extension Options**:
   - Go to `chrome://extensions/`
   - Find "SP Shortcuts" and click "Details"
   - Click "Extension options"

2. **Add New Shortcuts**:
   - Click "Add New Shortcut"
   - Enter title, path, and description
   - Click "Save"

3. **Edit Existing Shortcuts**:
   - Click the edit icon next to any shortcut
   - Modify the details and save

4. **Import/Export**:
   - Use "Export Shortcuts" to backup your configuration
   - Use "Import Shortcuts" to restore or share configurations

## 🌐 Compatibility

### Supported Platforms

- **Chrome Browser**: Version 88+ (Manifest V3 support)
- **Microsoft Edge**: Version 88+ (Chromium-based)
- **Other Chromium browsers**: Should work with Manifest V3 support

### Supported SharePoint Versions

- **SharePoint Online** (Microsoft 365)
- **SharePoint Server** (on-premises with SharePoint Online URLs)

### Supported Domains

- `*.sharepoint.com` (Global)

## 🔒 Privacy & Security

### Minimal Permissions

- **Site Access**: Only SharePoint domains (`*.sharepoint.com`)
- **Context Menus**: To add right-click shortcuts
- **Storage**: To save your custom shortcuts locally
- **Active Tab**: To detect current SharePoint site (only when you use the extension)

### Privacy Features

- ✅ **No data collection** - Extension works entirely offline
- ✅ **No external connections** - No analytics or tracking
- ✅ **Local storage only** - All data stays in your browser
- ✅ **Minimal permissions** - Only accesses SharePoint domains
- ✅ **Open source** - Code is available for review

## 📋 Installation

### From Chrome Web Store

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Confirm permissions when prompted
4. Extension is ready to use!

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the `src` folder
5. Extension is installed and ready to use!

## 🛠️ For Developers

### Project Structure

```text
sp-shortcuts-extension/
├── src/
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Service worker (context menus)
│   ├── content.js         # Site URL detection
│   ├── options.html       # Settings page
│   ├── options.css        # Settings page styles
│   ├── options.js         # Settings page logic
│   └── icons/             # Extension icons
├── README.md              # This file
└── PRIVACY.md             # Privacy policy
```

### Key Features

- **Manifest V3**: Uses latest Chrome extension security model
- **Service Worker**: Background script for context menu handling
- **Content Script**: Injected into SharePoint pages for URL detection
- **CSP Compliant**: No inline scripts, follows security best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on SharePoint sites
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Context menu doesn't appear**:

- Make sure you're on a SharePoint site (`*.sharepoint.com`)
- Check that the extension is enabled in `chrome://extensions/`

**Shortcuts don't work**:

- Verify you have the correct permissions for the SharePoint site
- Some admin pages require site owner or admin permissions

**Extension not detecting site**:

- Refresh the SharePoint page
- Check browser console for any errors

### Getting Help

- **Issues**: Report bugs or feature requests on GitHub
- **Questions**: Check the FAQ in the wiki
- **Security**: Report security issues privately

## 🔄 Changelog

### v1.0.0

- Initial release
- Default SharePoint shortcuts
- Custom shortcut management
- Import/export functionality
- Privacy-focused design