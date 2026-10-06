'use strict';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Prevent launching multiple app instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

let mainWindow = null;

function getAssetPath(filename) {
  if (isDev) {
    return path.join(__dirname, 'public', filename);
  }
  return path.join(process.resourcesPath, filename);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'VisionCheck Pro',
    icon: getAssetPath('icon.ico'),
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Clean native app window chrome in production
  if (!isDev) {
    mainWindow.setMenu(null);
  }

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Main process crash guard
process.on('uncaughtException', (err) => {
  console.error('[Main Uncaught Exception]:', err);
});

// IPC: Printer enumeration with safe fallback
ipcMain.handle('printer:list', async (event) => {
  try {
    return await event.sender.getPrintersAsync();
  } catch (err) {
    console.error('[printer:list error]:', err);
    return [];
  }
});

// IPC: Check printing with telemetry, offset matrix, and dry-run protection
ipcMain.handle('print:check', async (event, opts = {}) => {
  const {
    silent = true,
    deviceName = '',
    printerOffsetXmm = 0,
    printerOffsetYmm = 0,
    dryRun = false,
  } = opts || {};

  // The cheque template is positioned on an A4 portrait reference sheet.
  const printWidthMm = 210;
  const printHeightMm = 297;
  const widthMicrons = Math.round(printWidthMm * 1000);
  const heightMicrons = Math.round(printHeightMm * 1000);

  try {
    const printers = await event.sender.getPrintersAsync();
    const physicalPrinter =
      deviceName ||
      printers.find((p) => p.isDefault && !p.name.toLowerCase().includes('pdf') && !p.name.toLowerCase().includes('xps'))?.name ||
      printers.find((p) => !p.name.toLowerCase().includes('pdf') && !p.name.toLowerCase().includes('xps'))?.name ||
      printers[0]?.name;

    const payloadSummary = {
      printer: physicalPrinter,
      pageSizeMicrons: { width: widthMicrons, height: heightMicrons },
      offsetMm: { x: printerOffsetXmm, y: printerOffsetYmm },
      silent: Boolean(silent),
      dryRun,
    };

    console.log('[Print Telemetry Payload]:', payloadSummary);

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: `Dry-run payload verified for ${physicalPrinter} (${widthMicrons}x${heightMicrons}μm)`,
        payload: payloadSummary,
      };
    }

    return new Promise((resolve) => {
      const printOptions = {
        silent: Boolean(silent),
        printBackground: true,
        deviceName: physicalPrinter,
        pageSize: { width: widthMicrons, height: heightMicrons },
        margins: { marginType: 'none' },
        // Keep the A4 reference sheet in portrait; the renderer rotates the
        // cheque template inside the sheet as needed.
        landscape: false,
        // scaleFactor: 100 ensures Chromium never auto-scales content to fit
        // a different paper size — the @page mm dimensions are authoritative.
        scaleFactor: 100,
      };

      event.sender.print(printOptions, (success, failureReason) => {
        resolve({
          success,
          failureReason: failureReason || (success ? null : 'Hardware spooler rejected job'),
        });
      });
    });
  } catch (err) {
    console.error('[print:check execution error]:', err);
    return {
      success: false,
      failureReason: err instanceof Error ? err.message : 'Unknown main-process print error',
    };
  }
});