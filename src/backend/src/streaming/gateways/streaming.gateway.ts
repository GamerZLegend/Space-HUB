import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket 
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { StreamingMetricsService } from '../services/streaming-metrics.service'
import { PlatformType } from '../../users/entities/user-platform.entity'

export interface StreamNotification {
  type: 'start' | 'update' | 'end'
  platform: PlatformType
  userId: string
  streamData: any
  timestamp: Date
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure in production
    methods: ['GET', 'POST']
  },
  namespace: 'streaming'
})
export class StreamingGateway {
  private readonly logger = new Logger(StreamingGateway.name)

  @WebSocketServer()
  server: Server

  constructor(
    private streamingMetricsService: StreamingMetricsService
  ) {}

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('join_stream_channel')
  handleJoinStreamChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    const channelName = `stream_${data.userId}`
    client.join(channelName)
    
    this.logger.log(`Client joined stream channel: ${channelName}`)
    
    return {
      event: 'channel_joined',
      data: { 
        message: `Joined stream channel for user ${data.userId}` 
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('stream_event')
  async handleStreamEvent(
    @MessageBody() notification: StreamNotification
  ) {
    try {
      // Track stream event in metrics service
      await this.streamingMetricsService.trackStreamEvent(
        notification.platform,
        notification.userId,
        notification.type,
        notification.streamData
      )

      // Broadcast to user's stream channel
      const channelName = `stream_${notification.userId}`
      this.server.to(channelName).emit('stream_notification', notification)

      this.logger.log(`Stream event processed: ${notification.type}`)

      return {
        event: 'stream_event_processed',
        data: { 
          message: 'Stream event successfully processed' 
        }
      }
    } catch (error) {
      this.logger.error('Error processing stream event', error)
      return {
        event: 'stream_event_error',
        data: { 
          message: 'Failed to process stream event',
          error: error.message 
        }
      }
    }
  }

  // Broadcast real-time metrics to connected clients
  async broadcastStreamMetrics(
    userId: string, 
    metrics: any
  ) {
    const channelName = `stream_${userId}`
    this.server.to(channelName).emit('stream_metrics', metrics)
  }

  // Advanced stream recommendation system
  @SubscribeMessage('get_stream_recommendations')
  async getStreamRecommendations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    try {
      // Placeholder for recommendation logic
      // In a real system, this would use machine learning 
      // to generate personalized stream recommendations
      const recommendations = [
        {
          platform: PlatformType.TWITCH,
          streamer: 'top_gamer',
          category: 'Gaming',
          recommendationScore: 0.85
        },
        {
          platform: PlatformType.YOUTUBE,
          streamer: 'tech_expert',
          category: 'Technology',
          recommendationScore: 0.72
        }
      ]

      client.emit('stream_recommendations', recommendations)

      return {
        event: 'recommendations_generated',
        data: { 
          count: recommendations.length 
        }
      }
    } catch (error) {
      this.logger.error('Error generating recommendations', error)
      return {
        event: 'recommendations_error',
        data: { 
          message: 'Failed to generate recommendations',
          error: error.message 
        }
      }
    }
  }

  // Error handling middleware
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }
}
