import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as TwitchClient } from 'tmi.js';
import { google } from 'googleapis';
import { Facebook, FacebookApiException } from 'fb';
import { TikTokAPI } from 'tiktok-api';
import { IgApiClient } from 'instagram-private-api';
import { WebSocketClient } from '../utils/websocket.client';
import { StreamingMetricsService } from './streaming-metrics.service';
import { AuthenticationService } from '../../auth/services/authentication.service';
import { CacheService } from '../../core/services/cache.service';
import { LoggerService } from '../../core/services/logger.service';

@Injectable()
export class PlatformIntegrationService implements OnModuleInit {
  private platformClients: Map<string, any> = new Map();
  private platformWebSockets: Map<string, WebSocketClient> = new Map();
  private platformEventHandlers: Map<string, Function[]> = new Map();
  private reconnectionAttempts: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: StreamingMetricsService,
    private readonly authService: AuthenticationService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initializePlatformConnections();
    this.setupHealthChecks();
    this.setupMetricsCollection();
  }

  private async initializePlatformConnections() {
    await Promise.all([
      this.initializeTwitch(),
      this.initializeYouTube(),
      this.initializeFacebook(),
      this.initializeTikTok(),
      this.initializeInstagram(),
    ]);
  }

  // Platform-specific initializations
  private async initializeTwitch() {
    try {
      const twitchClient = new TwitchClient({
        options: { debug: true },
        connection: {
          reconnect: true,
          secure: true,
        },
        identity: {
          username: this.configService.get('TWITCH_BOT_USERNAME'),
          password: this.configService.get('TWITCH_OAUTH_TOKEN'),
        },
      });

      await twitchClient.connect();
      this.platformClients.set('twitch', twitchClient);
      this.setupTwitchEventHandlers(twitchClient);
      
      // Initialize WebSocket connection for real-time updates
      const twitchWs = new WebSocketClient('wss://pubsub-edge.twitch.tv');
      this.platformWebSockets.set('twitch', twitchWs);
      
      this.logger.info('Twitch integration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twitch integration', error);
      this.handlePlatformError('twitch', error);
    }
  }

  private async initializeYouTube() {
    try {
      const youtube = google.youtube('v3');
      const auth = new google.auth.OAuth2(
        this.configService.get('YOUTUBE_CLIENT_ID'),
        this.configService.get('YOUTUBE_CLIENT_SECRET'),
        this.configService.get('YOUTUBE_REDIRECT_URI'),
      );

      auth.setCredentials({
        refresh_token: this.configService.get('YOUTUBE_REFRESH_TOKEN'),
      });

      this.platformClients.set('youtube', { client: youtube, auth });
      this.setupYouTubeEventHandlers(youtube);
      
      this.logger.info('YouTube integration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize YouTube integration', error);
      this.handlePlatformError('youtube', error);
    }
  }

  private async initializeFacebook() {
    try {
      const fb = new Facebook({
        appId: this.configService.get('FACEBOOK_APP_ID'),
        appSecret: this.configService.get('FACEBOOK_APP_SECRET'),
        accessToken: this.configService.get('FACEBOOK_ACCESS_TOKEN'),
      });

      this.platformClients.set('facebook', fb);
      this.setupFacebookEventHandlers(fb);
      
      this.logger.info('Facebook integration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Facebook integration', error);
      this.handlePlatformError('facebook', error);
    }
  }

  // Event Handlers Setup
  private setupTwitchEventHandlers(client: TwitchClient) {
    const handlers = [
      ['message', this.handleTwitchMessage.bind(this)],
      ['subscription', this.handleTwitchSubscription.bind(this)],
      ['cheer', this.handleTwitchCheer.bind(this)],
      ['follow', this.handleTwitchFollow.bind(this)],
      ['raid', this.handleTwitchRaid.bind(this)],
    ];

    handlers.forEach(([event, handler]) => {
      client.on(event, handler);
      this.registerEventHandler('twitch', handler);
    });
  }

  private setupYouTubeEventHandlers(client: any) {
    // Setup YouTube specific event handlers
    const handlers = [
      ['liveChat', this.handleYouTubeLiveChat.bind(this)],
      ['superChat', this.handleYouTubeSuperChat.bind(this)],
      ['subscription', this.handleYouTubeSubscription.bind(this)],
    ];

    handlers.forEach(([event, handler]) => {
      this.registerEventHandler('youtube', handler);
    });
  }

  // Stream Management
  public async startMultiPlatformStream(streamConfig: StreamConfig) {
    const streamSessions = new Map();

    for (const platform of streamConfig.platforms) {
      try {
        const session = await this.startPlatformStream(platform, streamConfig);
        streamSessions.set(platform, session);
      } catch (error) {
        this.logger.error(`Failed to start stream on ${platform}`, error);
        await this.handleStreamError(platform, error);
      }
    }

    return streamSessions;
  }

  private async startPlatformStream(platform: string, config: StreamConfig) {
    const client = this.platformClients.get(platform);
    if (!client) throw new Error(`No client found for platform: ${platform}`);

    switch (platform) {
      case 'twitch':
        return await this.startTwitchStream(client, config);
      case 'youtube':
        return await this.startYouTubeStream(client, config);
      case 'facebook':
        return await this.startFacebookStream(client, config);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  // Metrics Collection
  private setupMetricsCollection() {
    const platforms = ['twitch', 'youtube', 'facebook', 'tiktok', 'instagram'];
    
    platforms.forEach(platform => {
      setInterval(async () => {
        try {
          const metrics = await this.collectPlatformMetrics(platform);
          await this.metricsService.recordMetrics(platform, metrics);
        } catch (error) {
          this.logger.error(`Failed to collect metrics for ${platform}`, error);
        }
      }, this.configService.get('METRICS_COLLECTION_INTERVAL'));
    });
  }

  private async collectPlatformMetrics(platform: string) {
    const client = this.platformClients.get(platform);
    if (!client) return null;

    switch (platform) {
      case 'twitch':
        return await this.collectTwitchMetrics(client);
      case 'youtube':
        return await this.collectYouTubeMetrics(client);
      case 'facebook':
        return await this.collectFacebookMetrics(client);
      default:
        return null;
    }
  }

  // Error Handling
  private async handlePlatformError(platform: string, error: any) {
    await this.metricsService.recordError(platform, error);
    
    const attempts = this.reconnectionAttempts.get(platform) || 0;
    if (attempts < this.configService.get('MAX_RECONNECTION_ATTEMPTS')) {
      await this.attemptReconnection(platform);
    } else {
      await this.notifyAdministrators(platform, error);
    }
  }

  private async attemptReconnection(platform: string) {
    const attempts = (this.reconnectionAttempts.get(platform) || 0) + 1;
    this.reconnectionAttempts.set(platform, attempts);

    try {
      await this.initializePlatformConnection(platform);
      this.reconnectionAttempts.delete(platform);
      this.logger.info(`Successfully reconnected to ${platform}`);
    } catch (error) {
      this.logger.error(`Reconnection attempt ${attempts} failed for ${platform}`, error);
    }
  }

  // Health Checks
  private setupHealthChecks() {
    setInterval(async () => {
      for (const [platform, client] of this.platformClients.entries()) {
        try {
          await this.checkPlatformHealth(platform, client);
        } catch (error) {
          this.logger.error(`Health check failed for ${platform}`, error);
          await this.handlePlatformError(platform, error);
        }
      }
    }, this.configService.get('HEALTH_CHECK_INTERVAL'));
  }

  private async checkPlatformHealth(platform: string, client: any) {
    const healthCheck = await this.performHealthCheck(platform, client);
    await this.metricsService.recordHealthCheck(platform, healthCheck);

    if (!healthCheck.healthy) {
      await this.handleUnhealthyPlatform(platform, healthCheck);
    }
  }
}

// Types
interface StreamConfig {
  platforms: string[];
  title: string;
  description: string;
  tags: string[];
  quality: {
    resolution: string;
    bitrate: number;
    fps: number;
  };
}

interface HealthCheck {
  healthy: boolean;
  latency: number;
  errors: string[];
  timestamp: number;
}
