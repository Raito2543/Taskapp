const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const cron = require('node-cron');
const squirrelStartup = require('electron-squirrel-startup');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

const store = new Store();
let mainWindow;
let tray;

// Function to show notifications
function showNotification(title, body) {
  new Notification({ title, body, icon: path.join(__dirname, 'icon.png') }).show();
}

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
};

const createTray = () => {
  const iconPath = path.join(__dirname, 'icon.png');
  if (!fs.existsSync(iconPath)) {
    console.error(`Icon file not found at ${iconPath}`);
    return;
  }
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    {
      label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Clarity Task App');
  tray.setContextMenu(contextMenu);
};

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // Set app to launch on startup
  app.setLoginItemSettings({
    openAtLogin: true
  });

  // Startup Notification
  const tasks = store.get('tasks', []);
  const today = new Date().toISOString().split('T')[0];
  const upcomingTasks = tasks.filter(t => !t.isArchived && t.status !== 'done' && t.dueDate >= today);
  if (upcomingTasks.length > 0) {
    showNotification(
      `คุณมี ${upcomingTasks.length} งานที่ต้องทำ`,
      `งานที่ใกล้ถึงที่สุดคือ: ${upcomingTasks[0].title}`
    );
  } else {
    showNotification(
        'วันนี้ไม่มีงานค้าง!',
        'เริ่มต้นวันใหม่ได้อย่างสบายใจ'
    );
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Scheduled Task Summary Notification at 5 PM
cron.schedule('0 17 * * *', () => {
    const tasks = store.get('tasks', []);
    const today = new Date().toISOString().split('T')[0];
    const completedToday = tasks.filter(t => t.status === 'done' && t.dueDate === today); // Simple check for now
  
    if (completedToday.length > 0) {
      // Basic summary. This is where Gemini API would be integrated.
      const summary = `วันนี้คุณทำงานเสร็จไป ${completedToday.length} อย่าง: ${completedToday.map(t => t.title).join(', ')}`;
      showNotification('สรุปงานประจำวัน', summary);
    } else {
      showNotification('สรุปงานประจำวัน', 'วันนี้ยังไม่มีงานที่ทำเสร็จครับ');
    }
}, {
    scheduled: true,
    timezone: "Asia/Bangkok"
});


// IPC Handlers (No changes here)
ipcMain.handle('get-tasks', async () => {
    return store.get('tasks', []);
});
ipcMain.handle('save-tasks', async (event, tasks) => {
    store.set('tasks', tasks);
});
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  try {
    const originalPath = filePaths[0];
    const fileName = path.basename(originalPath);
    const appDataPath = app.getPath('userData');
    const filesDir = path.join(appDataPath, 'attached_files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    const newPath = path.join(filesDir, `${Date.now()}-${fileName}`);
    fs.copyFileSync(originalPath, newPath);
    return { name: fileName, path: newPath };
  } catch (error) {
    console.error('Failed to attach file:', error);
    dialog.showErrorBox('File Error', 'Could not attach the selected file.');
    return null;
  }
});
ipcMain.handle('open-file', (event, filePath) => {
    shell.openPath(filePath).catch(err => {
        console.error("Failed to open file:", err);
        dialog.showErrorBox('File Error', 'Could not open the specified file.');
    });
});
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
});

