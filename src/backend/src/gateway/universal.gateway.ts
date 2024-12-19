import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../core/services/redis.service';
import { MetricsService } from '../core/services/metrics.service';
import { LoggerService } from '../core/services/logger.service';
import { SecurityService } from '../core/services/security.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class UniversalGateway implements OnModuleInit, OnModuleDestroy, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private rateLimiter: RateLimiterMemory;
  private connections: Map<string, Set<Socket>> = new Map();
  private platformConnections: Map<string, Map<string, Socket>> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
    private readonly jwtService: JwtService,
    private readonly securityService: SecurityService,
  ) {
    this.initializeRateLimiter();
  }

  async onModuleInit() {
    await this.initializeGateway();
    this.setupEventHandlers();
    this.startMetricsCollection();
  }

  onModuleDestroy() {
    this.cleanup();
  }

  private initializeRateLimiter() {
    this.rateLimiter = new RateLimiterMemory({
      points: 100, // Number of points
      duration: 1, // Per second
    });
  }

  private async initializeGateway() {
    // Initialize Redis pub/sub
    await this.redisService.subscribe('platform-events', this.handlePlatformEvent.bind(this));
    await this.redisService.subscribe('system-events', this.handleSystemEvent.bind(this));

    // Initialize metrics collection
    await this.metricsService.initializeGatewayMetrics();

    this.logger.info('Universal Gateway initialized');
  }

  private setupEventHandlers() {
    this.server.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    // Handle platform-specific events
    this.setupPlatformEventHandlers();

    // Handle system events
    this.setupSystemEventHandlers();

    // Handle custom events
    this.setupCustomEventHandlers();
  }

  async handleConnection(client: Socket) {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(client.handshake.address);

      // Authenticate client
      const authenticated = await this.authenticateClient(client);
      if (!authenticated) {
        client.disconnect();
        return;
      }

      // Register client
      await this.registerClient(client);

      // Setup heartbeat
      this.setupHeartbeat(client);

      // Metrics
      await this.metricsService.recordConnection(client);

    } catch (error) {
      this.logger.error('Connection handling error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      // Cleanup client resources
      await this.cleanupClient(client);

      // Update metrics
      await this.metricsService.recordDisconnection(client);

      // Notify relevant services
      await this.handleClientDisconnection(client);

    } catch (error) {
      this.logger.error('Disconnect handling error:', error);
    }
  }

  private async authenticateClient(client: Socket): Promise<boolean> {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        return false;
      }

      // Verify JWT
      const decoded = await this.jwtService.verifyAsync(token);
      
      // Additional security checks
      const securityCheck = await this.securityService.validateConnection({
        ip: client.handshake.address,
        userId: decoded.sub,
        deviceId: client.handshake.auth.deviceId,
      });

      return securityCheck.valid;

    } catch (error) {
      this.logger.error('Client authentication error:', error);
      return false;
    }
  }

  private async registerClient(client: Socket) {
    const userId = client.handshake.auth.userId;
    const platform = client.handshake.auth.platform;

    // Register in general connections
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(client);

    // Register in platform-specific connections
    if (!this.platformConnections.has(platform)) {
      this.platformConnections.set(platform, new Map());
    }
    this.platformConnections.get(platform).set(userId, client);

    // Store client metadata
    await this.redisService.setClientMetadata(client.id, {
      userId,
      platform,
      deviceId: client.handshake.auth.deviceId,
      connectionTime: Date.now(),
    });
  }

  private setupHeartbeat(client: Socket) {
    const interval = setInterval(() => {
      client.emit('heartbeat', { timestamp: Date.now() });
    }, 30000); // 30 seconds

    this.heartbeatIntervals.set(client.id, interval);
  }

  private async cleanupClient(client: Socket) {
    const userId = client.handshake.auth.userId;
    const platform = client.handshake.auth.platform;

    // Remove from connections
    this.connections.get(userId)?.delete(client);
    if (this.connections.get(userId)?.size === 0) {
      this.connections.delete(userId);
    }

    // Remove from platform connections
    this.platformConnections.get(platform)?.delete(userId);
    if (this.platformConnections.get(platform)?.size === 0) {
      this.platformConnections.delete(platform);
    }

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(client.id);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(client.id);
    }

    // Clear metadata
    await this.redisService.deleteClientMetadata(client.id);
  }

  private setupPlatformEventHandlers() {
    // Streaming events
    this.server.on('stream:start', this.handleStreamStart.bind(this));
    this.server.on('stream:end', this.handleStreamEnd.bind(this));
    this.server.on('stream:error', this.handleStreamError.bind(this));

    // Chat events
    this.server.on('chat:message', this.handleChatMessage.bind(this));
    this.server.on('chat:moderation', this.handleChatModeration.bind(this));

    // Analytics events
    this.server.on('analytics:update', this.handleAnalyticsUpdate.bind(this));
    this.server.on('analytics:request', this.handleAnalyticsRequest.bind(this));
  }

  private setupSystemEventHandlers() {
    // Performance events
    this.server.on('system:performance', this.handlePerformanceEvent.bind(this));
    this.server.on('system:error', this.handleSystemError.bind(this));

    // Security events
    this.server.on('security:breach', this.handleSecurityBreach.bind(this));
    this.server.on('security:warning', this.handleSecurityWarning.bind(this));
  }

  private setupCustomEventHandlers() {
    // Collaboration events
    this.server.on('collab:request', this.handleCollaborationRequest.bind(this));
    this.server.on('collab:response', this.handleCollaborationResponse.bind(this));

    // Integration events
    this.server.on('integration:webhook', this.handleWebhook.bind(this));
    this.server.on('integration:callback', this.handleCallback.bind(this));
  }

  private async handlePlatformEvent(event: any) {
    try {
      const { platform, type, data } = JSON.parse(event);
      const platformClients = this.platformConnections.get(platform);

      if (platformClients) {
        for (const [userId, client] of platformClients) {
          client.emit(type, data);
        }
      }
    } catch (error) {
      this.logger.error('Platform event handling error:', error);
    }
  }

  private async handleSystemEvent(event: any) {
    try {
      const { type, data } = JSON.parse(event);

      // Broadcast to all connected clients
      this.server.emit(type, data);

      // Log system event
      await this.logger.info('System event:', { type, data });

      // Update metrics
      await this.metricsService.recordSystemEvent(type, data);

    } catch (error) {
      this.logger.error('System event handling error:', error);
    }
  }

  private startMetricsCollection() {
    setInterval(async () => {
      try {
        const metrics = {
          totalConnections: this.getTotalConnections(),
          platformConnections: this.getPlatformConnectionCounts(),
          messageRate: await this.metricsService.getMessageRate(),
          errorRate: await this.metricsService.getErrorRate(),
        };

        await this.metricsService.recordGatewayMetrics(metrics);
      } catch (error) {
        this.logger.error('Metrics collection error:', error);
      }
    }, 5000); // Every 5 seconds
  }

  private getTotalConnections(): number {
    let total = 0;
    for (const userConnections of this.connections.values()) {
      total += userConnections.size;
    }
    return total;
  }

  private getPlatformConnectionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [platform, connections] of this.platformConnections) {
      counts[platform] = connections.size;
    }
    return counts;
  }

  private cleanup() {
    // Clear all intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }

    // Close all connections
    for (const userConnections of this.connections.values()) {
      for (const socket of userConnections) {
        socket.disconnect(true);
      }
    }

    // Clear maps
    this.connections.clear();
    this.platformConnections.clear();
    this.heartbeatIntervals.clear();
  }
}
