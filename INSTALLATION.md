# Installation and Testing Guide

## Installing the Extension

### Developer Mode (Recommended for testing)

1. **Open Chrome Extensions page**:
   - Navigate to `chrome://extensions/`
   - Or click Chrome menu → More Tools → Extensions

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**:
   - Click "Load unpacked"
   - Navigate to and select the `src` folder of this project
   - The extension should now appear in your extensions list

4. **Verify Installation**:
   - You should see "SP Shortcuts" with version 1.1.0
   - The extension icon should appear in your toolbar

## Testing the Extension

### Basic Functionality Test

1. **Navigate to any SharePoint site** (e.g., your company's SharePoint)
2. **Right-click anywhere** on the page
3. **Look for "SP Shortcuts"** in the context menu
4. **Click on any shortcut** to test navigation

### List-Specific Features Test

1. **Navigate to a SharePoint list or library**:
   - Go to any document library (e.g., `/Documents/Forms/AllItems.aspx`)
   - Or any custom list (e.g., `/Lists/Tasks/AllItems.aspx`)

2. **Right-click on the list page**
3. **Verify list-specific shortcuts appear**:
   - Look for a section showing "📋 [List Name]"
   - Verify list-specific shortcuts are indented and available
   - Example shortcuts: "List Settings", "List Permissions", etc.

4. **Test list shortcuts**:
   - Click on "List Settings" to open list configuration
   - Try other list-specific shortcuts

### Troubleshooting

#### Context Menu Not Appearing
- Ensure you're on a SharePoint domain (*.sharepoint.com)
- Check that the extension is enabled in chrome://extensions/
- Refresh the SharePoint page and try again

#### List Shortcuts Not Showing
- Verify you're actually on a list page (not a site page)
- The extension detects lists by URL patterns and DOM elements
- Try navigating directly to `/Lists/[ListName]/AllItems.aspx`

#### API Errors
- List ID detection uses SharePoint REST API
- Some shortcuts work without list ID (using list name as fallback)
- Check browser console for any error messages

### Supported SharePoint Patterns

The extension detects lists using these URL patterns:
- `/Lists/[ListName]/`
- `/Forms/`
- `rootfolder=`
- `*items.aspx`
- `*form.aspx`

And DOM indicators:
- `[data-sp-listid]` attributes
- `.ms-listviewtable` elements
- `[role="grid"]` elements

## Development Notes

### Key Files Modified
- `manifest.json` - Added tabs permission, updated version to 1.1.0
- `content.js` - Added list detection and API integration
- `background.js` - Added list-specific context menus and handlers

### New Features
- List detection using multiple methods (URL, DOM, SharePoint API)
- Dynamic context menu updates based on current page
- SharePoint REST API integration for list metadata
- Fallback handling when API is not available

### API Usage

The extension uses this SharePoint REST API endpoint:

```http
GET https://[site-url]/_api/web/GetList('[list-url-path]')
```

Example:
```http
GET https://company.sharepoint.com/sites/mysite/_api/web/GetList('/sites/mysite/Lists/Tasks')
```

This provides the list ID needed for admin URLs like:

```
/_layouts/15/listedit.aspx?List={listId}
```
