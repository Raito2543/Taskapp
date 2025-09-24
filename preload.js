const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath), // Added this line
});

