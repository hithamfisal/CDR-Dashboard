const { app, BrowserWindow, shell, protocol, net, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cdr',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function resolveDistPath(requestUrl) {
  const url = new URL(requestUrl);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const distRoot = path.resolve(__dirname, '..', 'dist');
  const resolvedPath = path.resolve(distRoot, pathname.replace(/^\/+/, ''));
  if (resolvedPath !== distRoot && !resolvedPath.startsWith(`${distRoot}${path.sep}`)) {
    return null;
  }
  return resolvedPath;
}

function isSafeExternalUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: 'DMR CDR Dashboard',
    backgroundColor: '#071118',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isSafeExternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    await win.loadURL('http://127.0.0.1:5178');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadURL('cdr://app/index.html');
  }
}

app.whenReady().then(() => {
  ipcMain.handle('cdr:show-item-in-folder', async (_event, filePath) => {
    try {
      const resolvedPath = path.resolve(String(filePath || ''));
      if (!path.isAbsolute(resolvedPath) || !fs.existsSync(resolvedPath)) {
        return { ok: false, error: 'File path was not found.' };
      }
      shell.showItemInFolder(resolvedPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not open folder.' };
    }
  });

  protocol.handle('cdr', (request) => {
    const resolvedPath = resolveDistPath(request.url);
    if (!resolvedPath) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(resolvedPath).toString());
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
