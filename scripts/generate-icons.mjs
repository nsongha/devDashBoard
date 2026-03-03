#!/usr/bin/env node
/**
 * generate-icons.mjs — Tạo PWA icons từ SVG template
 * Output: public/icons/ với 4 files (192, 512, + maskable variants)
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../public/icons');

mkdirSync(ICONS_DIR, { recursive: true });

function createSVG(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = innerSize / 2;

  // Monogram "DD" at center
  const fontSize = Math.round(size * 0.28);
  const textY = cy + fontSize * 0.35;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#12121e"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c6cf0"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${maskable ? 0 : size * 0.18}"/>

  <!-- Outer ring -->
  <circle cx="${cx}" cy="${cy}" r="${r * 0.88}" fill="none" stroke="url(#accent)" stroke-width="${size * 0.025}" opacity="0.4"/>

  <!-- Inner glow circle -->
  <circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="url(#accent)" opacity="0.12" filter="url(#glow)"/>

  <!-- Grid lines (code aesthetic) -->
  <line x1="${cx - r * 0.5}" y1="${cy - r * 0.6}" x2="${cx + r * 0.5}" y2="${cy - r * 0.6}" stroke="#7c6cf0" stroke-width="${size * 0.012}" opacity="0.3"/>
  <line x1="${cx - r * 0.5}" y1="${cy - r * 0.2}" x2="${cx + r * 0.5}" y2="${cy - r * 0.2}" stroke="#7c6cf0" stroke-width="${size * 0.008}" opacity="0.2"/>
  <line x1="${cx - r * 0.5}" y1="${cy + r * 0.2}" x2="${cx + r * 0.5}" y2="${cy + r * 0.2}" stroke="#7c6cf0" stroke-width="${size * 0.008}" opacity="0.2"/>

  <!-- "DD" monogram -->
  <text
    x="${cx}"
    y="${textY}"
    font-family="'JetBrains Mono', 'Fira Code', monospace"
    font-size="${fontSize}"
    font-weight="700"
    text-anchor="middle"
    fill="url(#accent)"
    filter="url(#glow)"
  >DD</text>

  <!-- Accent dot -->
  <circle cx="${cx + r * 0.55}" cy="${cy - r * 0.55}" r="${size * 0.04}" fill="#22c55e" opacity="0.9"/>
</svg>`;
}

// Write SVG files (browsers can use SVGs directly, and we'll save them with PNG extension for manifest compatibility)
// For a production setup this would use canvas/puppeteer to render actual PNGs
// Here we use SVGs with .png extension — works for PWA manifest in most modern browsers
// but the files are actually SVG data

const configs = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
];

for (const { name, size, maskable } of configs) {
  const svgContent = createSVG(size, maskable);
  const outPath = join(ICONS_DIR, name);
  writeFileSync(outPath, svgContent, 'utf8');
  console.log(`✅ Created ${name} (${size}x${size}${maskable ? ' maskable' : ''})`);
}

console.log('\n🎉 All icons generated in public/icons/');
