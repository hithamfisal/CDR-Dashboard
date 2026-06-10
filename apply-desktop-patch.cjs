const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const vitePath = path.join(root, 'vite.config.ts');

if (!fs.existsSync(packagePath)) {
  console.error('ERROR: package.json was not found. Run this command from the project root folder.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.main = 'electron/main.cjs';
pkg.scripts = pkg.scripts || {};
pkg.scripts.dev = pkg.scripts.dev || 'vite --host 127.0.0.1';
pkg.scripts.build = pkg.scripts.build || 'vite build';
pkg.scripts['desktop:dev'] = 'concurrently -k "vite --host 127.0.0.1" "wait-on http://127.0.0.1:5173 && electron ."';
pkg.scripts['desktop:pack'] = 'yarn build && electron-builder --dir';
pkg.scripts['desktop:dist'] = 'yarn build && electron-builder';

pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies.electron = pkg.devDependencies.electron || '^33.4.11';
pkg.devDependencies['electron-builder'] = pkg.devDependencies['electron-builder'] || '^25.1.8';
pkg.devDependencies.concurrently = pkg.devDependencies.concurrently || '^9.1.2';
pkg.devDependencies['wait-on'] = pkg.devDependencies['wait-on'] || '^8.0.1';

pkg.build = pkg.build || {
  appId: 'com.nasco.dmr.cdrdashboard',
  productName: 'DMR CDR Dashboard',
  artifactName: '${productName}-Setup-${version}.${ext}',
  directories: { output: 'release' },
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  asar: true,
  win: { target: ['nsis'] },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'DMR CDR Dashboard'
  },
  linux: { target: ['AppImage', 'deb'], category: 'Office' },
  mac: { target: ['dmg'], category: 'public.app-category.business' }
};

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

if (fs.existsSync(vitePath)) {
  let vite = fs.readFileSync(vitePath, 'utf8');
  if (!/base\s*:/.test(vite)) {
    vite = vite.replace('export default defineConfig({', 'export default defineConfig({\n  base: "./",');
    fs.writeFileSync(vitePath, vite);
  }
}

console.log('Desktop patch applied successfully. Now run:');
console.log('  yarn install');
console.log('  yarn desktop:dev');
