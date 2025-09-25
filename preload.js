// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ฟังก์ชันเดิม
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

    // เพิ่มฟังก์ชันสำหรับ Quick Add และการอัปเดต
    quickAddTask: (title) => ipcRenderer.invoke('quick-add-task', title),
    onTasksUpdated: (callback) => ipcRenderer.on('tasks-updated', callback),
    
    // เพิ่มฟังก์ชันสำหรับสั่งปิดหน้าต่าง
    closeQuickAddWindow: () => ipcRenderer.send('close-quick-add-window')
});