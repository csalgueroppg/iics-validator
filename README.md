# 🎯 IICS Field Validator

A Chrome extension for validating field naming standards in **Informatica Intelligent Cloud Services (IICS)** Cloud Application Integration (CAI) Process Designer.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![Webpack](https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack&logoColor=white)](https://webpack.js.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)](package.json)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](.)
[![Code Style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/yourusername/iics-field-validator/graphs/commit-activity)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-blue.svg)](https://developer.chrome.com/docs/extensions/)


---

## ✨ Features

- 🔍 **Real-time field validation** - Validates naming standards as you type
- ⚡ **Instant feedback** - Visual highlights (green for valid, red for invalid)
- 📊 **Validation statistics** - Track valid/invalid fields with a beautiful dashboard
- 📥 **Export reports** - Download validation results as CSV
- ⌨️ **Keyboard shortcuts** - Quick validation with `Ctrl+Shift+V`
- 🎨 **Non-intrusive UI** - Floating button and slide-in stats panel
- 🚀 **Performance optimized** - Efficient polling and debouncing
- 🧩 **Extensible rules** - Easy to customize validation rules

---

## 📋 Validation Rules

Fields are validated against these naming standards:

| Rule                           | Description                      | Example                        |
| ------------------------------ | -------------------------------- | ------------------------------ |
| **Not Empty**                  | Field cannot be empty            | ✅ `CustomerName`              |
| **Starts with Capital**        | Must start with uppercase letter | ✅ `ProcessID`                 |
| **No Spaces**                  | No whitespace allowed            | ❌ `Customer Name`             |
| **Alphanumeric + Underscore**  | Only letters, numbers, and `_`   | ✅ `Account_ID_123`            |
| **Min Length**                 | At least 3 characters            | ❌ `ID`                        |
| **Max Length**                 | Maximum 50 characters            | ✅ `CustomerAccountIdentifier` |
| **No Trailing Underscore**     | Cannot end with `_`              | ❌ `Field_Name_`               |
| **No Consecutive Underscores** | No `__` patterns                 | ❌ `Field__Name`               |
| **No Leading Number**          | Cannot start with digit          | ❌ `123Field`                  |

---

## 🚀 Installation

### From Source (Development)

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/iics-field-validator.git
cd iics-field-validator.git
```

2. Install dependencies

```bash
npm install
# or
bun install
```

3. Build the extension

```bash
npm run build
```

4. Load in Chrome

- Open `chrome://extensions/
- Enable **developer mode** (toggle in top-right)
- Click **load unpacked**
- Select the `dist/` folder

## 🎮 Usage

1. Navigate to any IICS CAI Process Designer page
2. The extension automatically detects Process Designer (when 5+ fields are present)
3. Fields are validated as you type (if auto-validate is enabled)
4. Visual feedback appears instantly

### Manual Validation

#### Method 1: Click the Button

- Look for the purple **Validate** button in the bottom right-corner
- Click to validate all fields at once

#### Method 2: Keyboard Shortcut

- Press `Ctrl+Shift+V` to trigger validation

#### Method 3: Developer console

```javascript
window.iicsValidator.triggerValidation()
```

### Viewing Results

After validation:

- **Green outline** is a validated field
- **Red outline** is an invalid field
- **Stats panel** slides in from top-right showing
  - Total field count
  - Valid field counts
  - Invalid field counts

### Exporting Reports

1. Click **Export** button in the stats panel
2. CSV file downloads with format:

```bash
Field ID, Field Value, Status, Errors, Last Validated
```

## ⚙️ Configuration

### Settings Panel

Open the extension popup to configure

| Setting           | Description                       | Default    |
| ----------------- | --------------------------------- | ---------- |
| Auto-validate     | Validate as you type              | ✅ Enabled |
| Poll interval     | How often to scan for fields (ms) | 2000ms     |
| Keyboard Shortcut | Enable `Ctrl+Shift+V`             | ✅ Enabled |

### Programmatic Configuration

```javascript
# Access the validator
const validator = window.iicsValidator

# Get current stats
const stats = validator.getStats()
console.log(stats)
// { totalField: 15, validFields: 12, invalidFields: 3, lastValidated: Date }

// Get performance metrics
const metrics = validator.getPerformanceMetrics()
console.log(metrics)

// Manually trigger validation
validator.triggerValidation()
```

### Scripts

```bash
# Development build with source maps
npm run dev

# Production build (minified)
npm run build

# Type checking only
npm run type-check

# Clean build artifacts
npm run clean

# Watch mode (rebuild on changes)
npm run watch
```

## 🐛 Debugging

### Enable Debug Mode

```bash
logger.setLevel(0) // Enable DEBUG level logging
```

### Run Diagnostics

```bash
// Check extension status
window.iicsValidator.runTests()

// Output:
// === Running Extension Tests ===
// 1. Checking container detection...
//    Container found: true
// 2. Checking field detection...
//    Fields registered: 15
// 3. Checking if in Process Designer...
//    Process Designer: true
// ...
```

### Common Issues

#### Extension doesn't load

- Check `chrome://extensions/` for errors
- Verify `manifest.json` is valid
- Ensure you're loading the `dist/` folder, not project root
- Check browser console for errors

#### No fields detected

```javascript
// Check if fields exist
document.querySelectorAll('input[id^="ae_sf_"]').length

// Check container
document.querySelector("body > section")

// Force scan
window.iicsValidator.fieldManager.scanAndRegister(
  document.querySelector("body > section")
)
```

#### Validation button not visible

```bash
// Check if button exists
document.querySelector('.iics-validator-btn')

// Check if styles loaded
document.getElementById('iics-validator-styles')

// Reinitialize UI
window.iicsValidator.uiManager.initialize()
```

## 🎨 Customization

### Adding Custom Validation Rules

```typescript
// In validation-rules.ts
const customRule: ValidationRule = {
  name: "custom-prefix",
  check: (value: string) => value.startsWith("CUSTOM_"),
  message: "Field must start with CUSTOM_",
  priority: 10,
}

// Add to engine
validatorEngine.addRule(customRule)
```

### Modifying Field Selector

```typescript
// In src/shared/types/types.ts
export const FIELD_SELECTOR =
  'input[id^="your_prefix_"], textarea[id^="your_prefix_"]' as const
```

#### Customizing UI Styles

```typescript
// In src/core/validation/managers/ui-manager.ts
// Modify UI_STYLES constant
const UI_STYLES = `...`
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

| Field       | Value                                         |
| ----------- | --------------------------------------------- |
| Name        | Carlos Salguero                               |
| Employee ID | PPGNA/X522644                                 |
| Email       | [CSalguero@ppg.com](mailto:csalguero@ppg.com) |

---

<div align="center">
  Made with ❤️ for IICS Developers
</div>
