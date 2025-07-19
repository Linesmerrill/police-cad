# Department Background Image System

This system provides consistent background image styling for all department dashboards in the Police CAD application. Each department can have its own unique background image that appears both behind the main content and in the sidebar user profile section.

## Features

- **Prominent Background Images**: Background images are displayed with high opacity (60% for main content, 85-90% for sidebar) for maximum visibility
- **Department-Specific Images**: Each department type has its own background image
- **Custom Department Images**: Departments can use their own custom background images if available
- **Fallback System**: Automatically falls back to default department images if no custom image is set
- **Responsive Design**: Works on both desktop and mobile devices
- **HeroUI Pro Theme Integration**: Designed to work seamlessly with the modern HeroUI Pro theme
- **Automatic Detection**: Automatically detects the current department based on URL or user role

## Supported Departments

| Department | Background Image | File Path |
|------------|------------------|-----------|
| Civilian | Civilian Background | `/static/images/civ-bkground.jpg` |
| Police | Police Corner Background | `/static/images/police-corner-bg.jpg` |
| Dispatch | Dispatch Corner Background | `/static/images/dispatch-corner-bg2.jpg` |
| EMS | EMS Background | `/static/images/ems-bkground.jpg` |
| Fire | Fire/EMS Corner Background | `/static/images/fire-ems-corner-bg.jpg` |

## Implementation

### 1. Include CSS and JavaScript Files

Add these lines to your dashboard HTML file:

```html
<!-- In the <head> section -->
<link rel="stylesheet" href="/static/css/department-backgrounds.css">

<!-- Before closing </body> tag -->
<script src="/static/js/department-backgrounds.js"></script>
```

### 2. Automatic Detection

The system automatically detects the current department based on:

1. **URL Path**: Checks if the current URL contains department-specific keywords
   - `police-dashboard` → Police
   - `dispatch-dashboard` → Dispatch  
   - `ems-dashboard` → EMS
   - `civ-dashboard` → Civilian

2. **User Role**: Falls back to user role detection if URL detection fails
   - `Police Officer` → Police
   - `Dispatch` → Dispatch
   - `EMS` or `Fire` → EMS
   - `Civilian` → Civilian

3. **Custom Image Priority**: If a department has a custom image set, it will be used instead of the default

### 3. Manual Override

You can manually set the department background using JavaScript:

```javascript
// Set specific department background with default image
setDepartmentBackgroundManually('police');
setDepartmentBackgroundManually('dispatch');
setDepartmentBackgroundManually('ems');
setDepartmentBackgroundManually('civilian');

// Set specific department background with custom image
setDepartmentBackgroundManually('police', 'https://example.com/custom-police-bg.jpg');
setDepartmentBackgroundManually('dispatch', 'https://example.com/custom-dispatch-bg.jpg');
```

## Styling Details

### Main Content Background
- **Position**: Fixed, covers entire main content area
- **Opacity**: 60% (very visible background)
- **Responsive**: Adjusts for sidebar collapse/expand
- **Z-index**: -1 (behind all content)

### Sidebar User Profile Background
- **Position**: Absolute, covers user profile section
- **Opacity**: 85-90% (very prominent background)
- **Overlay**: Dark gradient overlay for better text readability
- **Border Radius**: 12px for modern appearance

### CSS Custom Properties

The system uses CSS custom properties for dynamic background images:

```css
:root {
  --department-bg-image: url('/static/images/civ-bkground.jpg'); /* Default */
}
```

## Adding New Departments

To add a new department:

1. **Add Background Image**: Place the image in `/public/images/`
2. **Update CSS**: Add department class in `department-backgrounds.css`:

```css
.department-newdept {
  --department-bg-image: url('/static/images/newdept-bg.jpg');
}
```

3. **Update JavaScript**: Add mapping in `department-backgrounds.js`:

```javascript
const departmentBackgrounds = {
  // ... existing mappings
  'newdept': '/static/images/newdept-bg.jpg'
};
```

4. **Update Detection**: Add URL and role detection logic in the detection functions

## Troubleshooting

### Common Issues

1. **Images Not Loading**: Ensure images are in `/public/images/` and accessed via `/static/images/`
2. **Background Not Visible**: Check that opacity values are set correctly in CSS
3. **Custom Images Not Working**: Verify the API endpoint and department data structure
4. **Sidebar Background Missing**: Ensure the user profile element has the correct CSS classes

### Debug Functions

The system includes debug functions for testing:

```javascript
// Test custom backgrounds
demoCustomBackgrounds();

// Manually set backgrounds
setDepartmentBackgroundManually('police', 'https://example.com/custom.jpg');

// Re-initialize the system
initializeDepartmentBackground();
```

### Console Logging

The system provides detailed console logging for debugging:
- 🎨 Custom background usage
- 🏢 Default background usage
- 🔄 Department detection
- ✅ Success messages
- ❌ Error messages

## File Structure

```
public/
├── css/
│   └── department-backgrounds.css    # Main CSS file
├── js/
│   └── department-backgrounds.js     # Main JavaScript file
└── images/
    ├── civ-bkground.jpg              # Civilian background
    ├── police-corner-bg.jpg          # Police background
    ├── dispatch-corner-bg2.jpg       # Dispatch background
    ├── ems-bkground.jpg              # EMS background
    └── fire-ems-corner-bg.jpg        # Fire background
```

## Browser Support

- **Modern Browsers**: Full support for CSS custom properties and modern JavaScript
- **Fallbacks**: Graceful degradation for older browsers
- **Mobile**: Responsive design with mobile-specific adjustments

## Performance Considerations

- **Image Optimization**: Background images should be optimized for web use
- **Caching**: Images are cached by the browser for better performance
- **Loading**: Background images load asynchronously to avoid blocking page rendering 