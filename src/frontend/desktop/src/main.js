const { 
  app, 
  BrowserWindow, 
  ipcMain, 
  Tray, 
  Menu 
} = require('electron')
const path = require('path')
const Store = require('electron-store')

// Initialize persistent store
const store = new Store()

let mainWindow
let tray

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Space HUB',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load the index.html from a url
  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  // Create system tray
  createTray()

  // Handle window close
  mainWindow.on('close', (event) => {
    if (app.isQuitting) return
    event.preventDefault()
    mainWindow.hide()
  })
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'))
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Space HUB', 
      click: () => mainWindow.show() 
    },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true
        app.quit()
      } 
    }
  ])
  tray.setToolTip('Space HUB')
  tray.setContextMenu(contextMenu)
}

// Authentication and platform integration IPCs
ipcMain.handle('platform-connect', async (event, platform) => {
  // Implement platform connection logic
  const tokens = await connectToPlatform(platform)
  store.set(`platform.${platform}`, tokens)
  return tokens
})

ipcMain.handle('platform-disconnect', (event, platform) => {
  store.delete(`platform.${platform}`)
  return true
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Stub for platform connection
async function connectToPlatform(platform) {
  // Implement OAuth flow for each platform
  switch(platform) {
    case 'twitch':
      return await connectTwitch()
    case 'youtube':
      return await connectYouTube()
    default:
      throw new Error('Unsupported platform')
  }
}

async function connectTwitch() {
  // Implement Twitch OAuth flow
  return {
    accessToken: 'twitch_access_token',
    refreshToken: 'twitch_refresh_token'
  }
}

async function connectYouTube() {
  // Implement YouTube OAuth flow
  return {
    accessToken: 'youtube_access_token',
    refreshToken: 'youtube_refresh_token'
  }
}
