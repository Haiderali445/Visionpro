'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printCheck: (opts) => ipcRenderer.invoke('print:check', opts),
  listPrinters: () => ipcRenderer.invoke('printer:list'),
});