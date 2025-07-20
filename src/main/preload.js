// Preload script for Urtext Piano with secure file operations
const { contextBridge, ipcRenderer } = require('electron');

// Security validation - ensure no Node.js globals are accessible
if (process.env.NODE_ENV === 'development') {
  // Log security status for development
  console.log('Preload security check:', {
    nodeIntegration: process.versions ? 'ENABLED (INSECURE)' : 'DISABLED',
    contextIsolation: window === self ? 'DISABLED (INSECURE)' : 'ENABLED',
    sandbox: typeof require === 'undefined' ? 'ENABLED' : 'DISABLED',
  });
}

// Expose secure file operations to renderer via context bridge
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations - returns FileData or null (canceled) or throws error
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  
  // Drag-drop file operations - handles ArrayBuffer for .mxl files
  loadDroppedFile: (fileName, fileBuffer) => 
    ipcRenderer.invoke('file:loadContent', fileName, fileBuffer)
});