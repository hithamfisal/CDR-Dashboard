const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cdrDesktop', {
  showItemInFolder: (filePath) => ipcRenderer.invoke('cdr:show-item-in-folder', filePath),
});
