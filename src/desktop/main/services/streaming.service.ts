import { EventEmitter } from 'events';
import * as ffmpeg from 'fluent-ffmpeg';
import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import log from 'electron-log';
import { HardwareService } from './hardware.service';
import { DatabaseService } from './database.service';
import { SecurityService } from './security.service';

export class StreamingService extends EventEmitter {
  private streams: Map<string, StreamInstance> = new Map();
  private wsServer: WebSocket.Server | null = null;
  private hardwareService: HardwareService;
  private databaseService: DatabaseService;
  private securityService: SecurityService;

  private readonly QUALITY_PRESETS = {
    ultralow: {
      videoBitrate: '500k',
      audioBitrate: '64k',
      fps: 24,
      resolution: '852x480'
    },
    low: {
      videoBitrate: '1000k',
      audioBitrate: '96k',
      fps: 30,
      resolution: '1280x720'
    },
    medium: {
      videoBitrate: '2500k',
      audioBitrate: '128k',
      fps: 30,
      resolution: '1280x720'
    },
    high: {
      videoBitrate: '4000k',
      audioBitrate: '192k',
      fps: 60,
      resolution: '1920x1080'
    },
    ultra: {
      videoBitrate: '8000k',
      audioBitrate: '320k',
      fps: 60,
      resolution: '2560x1440'
    }
  };

  constructor() {
    super();
    this.hardwareService = new HardwareService();
    this.databaseService = new DatabaseService();
    this.securityService = new SecurityService();
  }

  public async initialize() {
    try {
      await this.hardwareService.initialize();
      await this.initializeWebSocketServer();
      await this.setupHardwareMonitoring();
      log.info('Streaming service initialized');
    } catch (error) {
      log.error('Failed to initialize streaming service:', error);
      throw error;
    }
  }

  private async initializeWebSocketServer() {
    this.wsServer = new WebSocket.Server({ port: 8080 });

    this.wsServer.on('connection', (ws: WebSocket) => {
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(ws, data);
        } catch (error) {
          log.error('WebSocket message handling error:', error);
        }
      });
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'start_stream':
        await this.handleStartStream(ws, message.config);
        break;
      case 'stop_stream':
        await this.handleStopStream(ws, message.streamId);
        break;
      case 'update_quality':
        await this.handleQualityUpdate(ws, message.streamId, message.quality);
        break;
      case 'get_stats':
        await this.handleGetStats(ws, message.streamId);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  public async startStream(config: StreamConfig): Promise<string> {
    try {
      // Validate configuration
      await this.validateStreamConfig(config);

      // Check system resources
      await this.checkSystemResources();

      // Generate stream ID
      const streamId = uuidv4();

      // Create stream instance
      const stream = new StreamInstance(config, this.hardwareService);
      this.streams.set(streamId, stream);

      // Initialize stream
      await stream.initialize();

      // Start streaming
      await stream.start();

      // Log stream start
      await this.logStreamEvent(streamId, 'start', config);

      return streamId;
    } catch (error) {
      log.error('Failed to start stream:', error);
      throw error;
    }
  }

  public async stopStream(streamId: string) {
    try {
      const stream = this.streams.get(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      await stream.stop();
      this.streams.delete(streamId);

      // Log stream stop
      await this.logStreamEvent(streamId, 'stop');
    } catch (error) {
      log.error('Failed to stop stream:', error);
      throw error;
    }
  }

  public async updateStreamQuality(streamId: string, quality: StreamQuality) {
    try {
      const stream = this.streams.get(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      await stream.updateQuality(quality);
      await this.logStreamEvent(streamId, 'quality_update', { quality });
    } catch (error) {
      log.error('Failed to update stream quality:', error);
      throw error;
    }
  }

  private async validateStreamConfig(config: StreamConfig) {
    // Validate platforms
    for (const platform of config.platforms) {
      const isValid = await this.securityService.validatePlatformCredentials(platform);
      if (!isValid) {
        throw new Error(`Invalid credentials for platform: ${platform}`);
      }
    }

    // Validate quality settings
    if (!this.QUALITY_PRESETS[config.quality]) {
      throw new Error('Invalid quality preset');
    }

    // Validate hardware requirements
    const requirements = this.calculateHardwareRequirements(config);
    const canHandle = await this.hardwareService.checkCapabilities(requirements);
    if (!canHandle) {
      throw new Error('System does not meet hardware requirements for stream configuration');
    }
  }

  private calculateHardwareRequirements(config: StreamConfig): HardwareRequirements {
    const qualityPreset = this.QUALITY_PRESETS[config.quality];
    const platformCount = config.platforms.length;

    return {
      cpu: {
        cores: Math.max(2, Math.ceil(platformCount * 0.5)),
        usage: platformCount * 15 // 15% per platform
      },
      memory: {
        minimum: 2048 * platformCount, // 2GB per platform
        recommended: 4096 * platformCount // 4GB per platform
      },
      gpu: {
        memory: 1024 * platformCount, // 1GB per platform
        usage: platformCount * 20 // 20% per platform
      },
      network: {
        uploadSpeed: parseInt(qualityPreset.videoBitrate) * platformCount * 1.2 // 20% overhead
      }
    };
  }

  private async checkSystemResources() {
    const stats = await this.hardwareService.getStats();
    
    // Check CPU usage
    if (stats.cpu.usage > 80) {
      throw new Error('CPU usage too high to start new stream');
    }

    // Check memory usage
    if (stats.memory.usage > 85) {
      throw new Error('Memory usage too high to start new stream');
    }

    // Check GPU usage
    if (stats.gpu.controllers[0].usage > 80) {
      throw new Error('GPU usage too high to start new stream');
    }
  }

  private async logStreamEvent(streamId: string, event: string, data?: any) {
    try {
      await this.databaseService.logStreamEvent({
        streamId,
        event,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('Failed to log stream event:', error);
    }
  }

  private setupHardwareMonitoring() {
    this.hardwareService.on('alert', async (alert) => {
      // Handle hardware alerts
      this.handleHardwareAlert(alert);
    });

    this.hardwareService.on('stats-update', async (stats) => {
      // Update all active streams with new hardware stats
      for (const [streamId, stream] of this.streams) {
        stream.handleHardwareUpdate(stats);
      }
    });
  }

  private async handleHardwareAlert(alert: HardwareAlert) {
    log.warn('Hardware alert:', alert);

    // Notify all active streams
    for (const [streamId, stream] of this.streams) {
      stream.handleHardwareAlert(alert);
    }

    // If critical, take action
    if (alert.severity === 'critical') {
      await this.handleCriticalAlert(alert);
    }
  }

  private async handleCriticalAlert(alert: HardwareAlert) {
    // Log critical alert
    log.error('Critical hardware alert:', alert);

    // Notify all connected clients
    this.broadcastToClients({
      type: 'critical_alert',
      alert
    });

    // If temperature is critical, start emergency shutdown
    if (alert.type === 'temperature' && alert.value > 90) {
      await this.emergencyShutdown();
    }
  }

  private async emergencyShutdown() {
    log.error('Initiating emergency shutdown');

    // Stop all streams
    for (const [streamId, stream] of this.streams) {
      try {
        await this.stopStream(streamId);
      } catch (error) {
        log.error(`Failed to stop stream ${streamId} during emergency shutdown:`, error);
      }
    }

    // Notify all clients
    this.broadcastToClients({
      type: 'emergency_shutdown',
      message: 'Emergency shutdown initiated due to critical system state'
    });
  }

  private broadcastToClients(message: any) {
    if (this.wsServer) {
      this.wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  public cleanup() {
    // Stop all streams
    for (const [streamId, stream] of this.streams) {
      stream.stop();
    }
    this.streams.clear();

    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }

    // Cleanup services
    this.hardwareService.cleanup();

    // Remove all listeners
    this.removeAllListeners();
  }
}

// Types
interface StreamConfig {
  platforms: string[];
  quality: keyof typeof QUALITY_PRESETS;
  title: string;
  description: string;
  tags: string[];
}

interface StreamQuality {
  videoBitrate: string;
  audioBitrate: string;
  fps: number;
  resolution: string;
}

interface HardwareRequirements {
  cpu: {
    cores: number;
    usage: number;
  };
  memory: {
    minimum: number;
    recommended: number;
  };
  gpu: {
    memory: number;
    usage: number;
  };
  network: {
    uploadSpeed: number;
  };
}

interface HardwareAlert {
  type: string;
  severity: 'warning' | 'critical';
  value: number;
  message: string;
}
