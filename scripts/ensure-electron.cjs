

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const electronDir = path.join(rootDir, 'node_modules', 'electron');
const pathFile = path.join(electronDir, 'path.txt');
const distDir = path.join(electronDir, 'dist');
const platformExe = process.platform === 'win32' ? 'electron.exe' : 'electron';
const targetExe = path.join(distDir, platformExe);

function isElectronReady() {
  if (!fs.existsSync(electronDir)) return false;
  if (!fs.existsSync(pathFile)) return false;
  try {
    const recordedName = fs.readFileSync(pathFile, 'utf8').trim();
    if (!recordedName) return false;
    const exe = path.join(distDir, recordedName);
    return fs.existsSync(exe);
  } catch {
    return false;
  }
}

async function ensureElectron() {
  if (isElectronReady()) {
    console.log('[ensure-electron] Electron binary is verified and ready at: ' + targetExe);
    return;
  }

  console.log('[ensure-electron] Electron binary missing or incomplete. Initializing recovery...');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Locate cached zip from @electron/get
  const electronPkg = require(path.join(electronDir, 'package.json'));
  const version = electronPkg.version;
  const arch = process.arch;
  const platform = process.platform;

  console.log(`[ensure-electron] Target Electron v${version} (${platform}-${arch})`);

  let zipPath = null;
  try {
    const { downloadArtifact } = require('@electron/get');
    zipPath = await downloadArtifact({
      version,
      artifactName: 'electron',
      platform,
      arch,
    });
  } catch (err) {
    console.warn('[ensure-electron] @electron/get download failed, checking local cache...', err.message);
  }

  // Check fallback cache locations if @electron/get didn't return a path
  if (!zipPath || !fs.existsSync(zipPath)) {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    const cacheDir = path.join(localAppData, 'electron', 'Cache');
    if (fs.existsSync(cacheDir)) {
      const entries = fs.readdirSync(cacheDir);
      for (const entry of entries) {
        const candidate = path.join(cacheDir, entry, `electron-v${version}-${platform}-${arch}.zip`);
        if (fs.existsSync(candidate)) {
          zipPath = candidate;
          break;
        }
      }
    }
  }

  if (!zipPath || !fs.existsSync(zipPath)) {
    throw new Error(`[ensure-electron] Could not find or download Electron v${version} zip archive.`);
  }

  console.log('[ensure-electron] Extracting zip archive: ' + zipPath);

  // 2. Perform native extraction based on OS
  if (process.platform === 'win32') {
    // PowerShell Expand-Archive is fast, rock-solid, and immune to Node v26 stream pipeline issues
    const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${distDir.replace(/'/g, "''")}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    execSync(`unzip -o -q "${zipPath}" -d "${distDir}"`, { stdio: 'inherit' });
  }

  // 3. Populate path.txt
  fs.writeFileSync(pathFile, platformExe, 'utf8');

  // Move electron.d.ts if it was extracted into dist
  const distDts = path.join(distDir, 'electron.d.ts');
  const targetDts = path.join(electronDir, 'electron.d.ts');
  if (fs.existsSync(distDts) && !fs.existsSync(targetDts)) {
    try {
      fs.renameSync(distDts, targetDts);
    } catch {
      // ignore
    }
  }

  if (isElectronReady()) {
    console.log('[ensure-electron] Successfully extracted and populated path.txt!');
  } else {
    throw new Error('[ensure-electron] Extraction completed but electron executable was not found at ' + targetExe);
  }
}

ensureElectron().catch((err) => {
  console.error('[ensure-electron] Error:', err.message);
  process.exit(1);
});
