{
  "name": "clarity",
  "version": "1.0.1",
  "description": "A modern task management desktop app.",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "release": "electron-builder --publish always"
  },
  "keywords": [],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "license": "ISC",
  "repository": {
    "type": "git",
    "url": "https://github.com/Raito2543/Taskapp.git"
  },
  "dependencies": {
    "electron-squirrel-startup": "^1.0.0",
    "electron-store": "^8.1.0",
    "electron-updater": "^6.1.1",
    "node-cron": "^3.0.2"
  },
  "devDependencies": {
    "electron": "^26.2.0",
    "electron-builder": "^24.6.4"
  },
  "build": {
    "appId": "com.clarity.app",
    "productName": "Clarity",
    "publish": [
      {
        "provider": "github",
        "owner": "Raito2543",
        "repo": "Taskapp"
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "icon.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}

