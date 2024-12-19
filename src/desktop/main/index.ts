import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import isDev from 'electron-is-dev';
import Store from 'electron-store';
import log from 'electron-log';
import { StreamingService } from './services/streaming.service';
import { HardwareService } from './services/hardware.service';
import { DatabaseService } from './services/database.service';
import { SecurityService } from './services/security.service';
import { IPCHandlerService } from './services/ipc-handler.service';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Initialize services
const store = new Store();
const streamingService = new StreamingService();
const hardwareService = new HardwareService();
const databaseService = new DatabaseService();
const securityService = new SecurityService();
const ipcHandlerService = new IPCHandlerService();

class SpaceHubDesktop {
  private mainWindow: BrowserWindow | null = null;
  private streamingWindow: BrowserWindow | null = null;
  private isQuitting = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Handle app lifecycle events
    this.setupAppEvents();
    
    // Initialize services
    await this.initializeServices();
    
    // Setup IPC handlers
    this.setupIPCHandlers();
    
    // Setup auto-updater
    this.setupAutoUpdater();
  }

  private setupAppEvents() {
    app.on('ready', this.createMainWindow.bind(this));
    app.on('window-all-closed', this.handleWindowsClosed.bind(this));
    app.on('activate', this.handleActivate.bind(this));
    app.on('before-quit', () => this.isQuitting = true);
  }

  private async initializeServices() {
    try {
      await Promise.all([
        streamingService.initialize(),
        hardwareService.initialize(),
        databaseService.initialize(),
        securityService.initialize(),
      ]);
    } catch (error) {
      log.error('Failed to initialize services:', error);
      dialog.showErrorBox(
        'Initialization Error',
        'Failed to initialize application services. Please restart the application.'
      );
    }
  }

  private setupIPCHandlers() {
    // Streaming handlers
    ipcMain.handle('start-stream', async (event, config) => {
      try {
        return await streamingService.startStream(config);
      } catch (error) {
        log.error('Failed to start stream:', error);
        throw error;
      }
    });

    // Hardware monitoring handlers
    ipcMain.handle('get-hardware-stats', async () => {
      try {
        return await hardwareService.getStats();
      } catch (error) {
        log.error('Failed to get hardware stats:', error);
        throw error;
      }
    });

    // Database operations handlers
    ipcMain.handle('database-operation', async (event, operation) => {
      try {
        return await databaseService.executeOperation(operation);
      } catch (error) {
        log.error('Database operation failed:', error);
        throw error;
      }
    });

    // Security handlers
    ipcMain.handle('verify-security', async (event, token) => {
      try {
        return await securityService.verifyToken(token);
      } catch (error) {
        log.error('Security verification failed:', error);
        throw error;
      }
    });
  }

  private setupAutoUpdater() {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: 'A new version is available. Would you like to update now?',
        buttons: ['Yes', 'No']
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to install updates.',
        buttons: ['Restart']
      }).then(() => {
        autoUpdater.quitAndInstall();
      });
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
      show: false,
    });

    // Load the app
    const startUrl = isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`;

    this.mainWindow.loadURL(startUrl);

    // Window event handlers
    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Setup streaming window if needed
    this.setupStreamingWindow();
  }

  private setupStreamingWindow() {
    this.streamingWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    this.streamingWindow.loadURL(
      isDev
        ? 'http://localhost:3000/streaming'
        : `file://${path.join(__dirname, '../build/index.html#/streaming')}`
    );

    this.streamingWindow.on('closed', () => {
      this.streamingWindow = null;
    });
  }

  private handleWindowsClosed() {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private handleActivate() {
    if (this.mainWindow === null) {
      this.createMainWindow();
    }
  }
}

// Initialize the application
new SpaceHubDesktop();
