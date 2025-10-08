import fs from "fs"
import { execSync } from "child_process";

// Create icons directory
if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

// Modern minimalist with properly rendered checkmark
function createMinimalistSVG(size) {
  const strokeWidth = size * 0.12;
  const center = size * 0.5;
  const radius = size * 0.32;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Rounded square background -->
  <rect width="${size}" height="${size}" rx="${size * 0.225}" fill="url(#grad)"/>
  
  <!-- White circle -->
  <circle cx="${center}" cy="${center}" r="${radius}" 
          fill="white" opacity="0.95"/>
  
  <!-- Gradient checkmark -->
  <polyline points="${size * 0.32},${size * 0.5} ${size * 0.45},${size * 0.63} ${size * 0.68},${size * 0.37}" 
        stroke="url(#grad)" 
        stroke-width="${strokeWidth}" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
</svg>`;
}

// Shield with bold checkmark
function createSVG(size) {
  const strokeWidth = size * 0.12;
  const padding = size * 0.25;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.225}" fill="url(#grad)"/>
  
  <!-- Shield background -->
  <path d="M ${size * 0.5} ${padding} 
           L ${size - padding} ${size * 0.35} 
           L ${size - padding} ${size * 0.65} 
           L ${size * 0.5} ${size - padding} 
           L ${padding} ${size * 0.65} 
           L ${padding} ${size * 0.35} Z" 
        fill="rgba(255,255,255,0.2)"/>
  
  <!-- Bold checkmark -->
  <polyline points="${size * 0.35},${size * 0.5} ${size * 0.46},${size * 0.62} ${size * 0.68},${size * 0.38}" 
        stroke="white" 
        stroke-width="${strokeWidth}" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
</svg>`;
}

// Modern geometric V
function createModernVSVG(size) {
  const padding = size * 0.22;
  const thickness = size * 0.12;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.225}" fill="url(#grad)"/>
  
  <!-- Left stroke of V -->
  <polygon points="${padding},${padding} 
                    ${padding + thickness},${padding}
                    ${size * 0.5 + thickness / 2},${size - padding}
                    ${size * 0.5 - thickness / 2},${size - padding}" 
           fill="white" opacity="0.95"/>
  
  <!-- Right stroke of V -->
  <polygon points="${size - padding - thickness},${padding}
                    ${size - padding},${padding}
                    ${size * 0.5 + thickness / 2},${size - padding}
                    ${size * 0.5 - thickness / 2},${size - padding}" 
           fill="white" opacity="0.95"/>
</svg>`;
}

// Document with checkmark
function createDocumentSVG(size) {
  const strokeWidth = size * 0.1;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.225}" fill="url(#grad)"/>
  
  <!-- Document -->
  <rect x="${size * 0.25}" y="${size * 0.2}" 
        width="${size * 0.5}" height="${size * 0.6}" 
        rx="${size * 0.05}" 
        fill="white" opacity="0.95"/>
  
  <!-- Lines -->
  <line x1="${size * 0.32}" y1="${size * 0.35}" 
        x2="${size * 0.68}" y2="${size * 0.35}" 
        stroke="url(#grad)" stroke-width="${size * 0.025}" 
        stroke-linecap="round" opacity="0.5"/>
  <line x1="${size * 0.32}" y1="${size * 0.45}" 
        x2="${size * 0.68}" y2="${size * 0.45}" 
        stroke="url(#grad)" stroke-width="${size * 0.025}" 
        stroke-linecap="round" opacity="0.5"/>
  
  <!-- Big bold checkmark -->
  <polyline points="${size * 0.33},${size * 0.6} ${size * 0.45},${size * 0.7} ${size * 0.68},${size * 0.48}" 
        stroke="url(#grad)" 
        stroke-width="${strokeWidth}" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
</svg>`;
}

const styles = {
  shield: createSVG,
  minimalist: createMinimalistSVG,
  modernV: createModernVSVG,
  document: createDocumentSVG
};

// Change this to try different styles
const selectedStyle = 'minimalist';

// Create SVG files
fs.writeFileSync('icons/icon.svg', styles[selectedStyle](128));
console.log(`✓ Created icons/icon.svg (${selectedStyle} style)`);

// Convert SVG to PNG with better settings
console.log('\nConverting to PNG...');

try {
  // ✅ FIXED: Better ImageMagick settings for gradients and transparency
  execSync('convert icons/icon.svg -background none -density 300 -resize 16x16 icons/icon16.png', { stdio: 'inherit' });
  execSync('convert icons/icon.svg -background none -density 300 -resize 48x48 icons/icon48.png', { stdio: 'inherit' });
  execSync('convert icons/icon.svg -background none -density 300 -resize 128x128 icons/icon128.png', { stdio: 'inherit' });
  console.log('✓ Converted using ImageMagick');
} catch (e) {
  console.log('ImageMagick not found, trying other methods...');

  try {
    // ✅ FIXED: Better rsvg-convert settings
    execSync('rsvg-convert -w 16 -h 16 -b none icons/icon.svg -o icons/icon16.png', { stdio: 'inherit' });
    execSync('rsvg-convert -w 48 -h 48 -b none icons/icon.svg -o icons/icon48.png', { stdio: 'inherit' });
    execSync('rsvg-convert -w 128 -h 128 -b none icons/icon.svg -o icons/icon128.png', { stdio: 'inherit' });
    console.log('✓ Converted using rsvg-convert');
  } catch (e2) {
    console.log('\n⚠️  No converter found.');
    console.log('\n🎯 SOLUTION: Just use the SVG directly!');
    console.log('Chrome extensions support SVG icons perfectly.\n');
    console.log('Update your manifest.json to use SVG:');
    console.log(`
"action": {
  "default_icon": {
    "16": "icons/icon.svg",
    "48": "icons/icon.svg", 
    "128": "icons/icon.svg"
  }
},
"icons": {
  "16": "icons/icon.svg",
  "48": "icons/icon.svg",
  "128": "icons/icon.svg"
}
    `);

    // Create copies for different sizes (they'll all be the same SVG)
    fs.copyFileSync('icons/icon.svg', 'icons/icon16.svg');
    fs.copyFileSync('icons/icon.svg', 'icons/icon48.svg');
    fs.copyFileSync('icons/icon.svg', 'icons/icon128.svg');

    console.log('\n✓ Created SVG copies for different sizes');
    process.exit(0);
  }
}

console.log('\n✓ All icons created successfully!');
console.log('  • icons/icon16.png');
console.log('  • icons/icon48.png');
console.log('  • icons/icon128.png');
console.log(`\n💡 Try different styles: 'shield', 'minimalist', 'modernV', 'document'`);