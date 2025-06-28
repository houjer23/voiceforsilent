#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src} → ${dest}`);
}

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    });
}

console.log('🚀 Building project for deployment...');

// Clean dist directory
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Copy HTML files to root of dist
console.log('\n📄 Copying HTML files...');
const htmlFiles = fs.readdirSync('src/html');
htmlFiles.forEach(file => {
    copyFile(`src/html/${file}`, `dist/${file}`);
});

// Copy CSS files to root of dist  
console.log('\n🎨 Copying CSS files...');
const cssFiles = fs.readdirSync('src/css');
cssFiles.forEach(file => {
    copyFile(`src/css/${file}`, `dist/${file}`);
});

// Copy JS files to root of dist
console.log('\n⚡ Copying JavaScript files...');
const jsFiles = fs.readdirSync('src/js');
jsFiles.forEach(file => {
    copyFile(`src/js/${file}`, `dist/${file}`);
});

// Copy assets to root of dist
console.log('\n🖼️ Copying assets...');
const assetFiles = fs.readdirSync('assets');
assetFiles.forEach(file => {
    copyFile(`assets/${file}`, `dist/${file}`);
});

// Copy data files to root of dist
console.log('\n📊 Copying data files...');
const dataFiles = fs.readdirSync('data');
dataFiles.forEach(file => {
    copyFile(`data/${file}`, `dist/${file}`);
});

// Copy utility scripts to dist (for migration purposes)
console.log('\n🔧 Copying utility scripts...');
copyFile('scripts/migrate.js', 'dist/migrate.js');

console.log('\n✅ Build completed! Files ready for deployment in dist/'); 