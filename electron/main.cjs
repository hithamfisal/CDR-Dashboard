const { app, BrowserWindow, shell, protocol, net } = require('electron');
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
  const distRoot = path.join(__dirname, '..', 'dist');
  return path.join(distRoot, pathname.replace(/^\/+/, ''));
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
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadURL('cdr://app/index.html');
  }
}

app.whenReady().then(() => {
  protocol.handle('cdr', (request) => net.fetch(pathToFileURL(resolveDistPath(request.url)).toString()));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
