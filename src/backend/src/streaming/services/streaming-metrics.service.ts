import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserPlatform, PlatformType } from '../../users/entities/user-platform.entity'
import { StreamingService } from './streaming.service'
import { CustomLoggerService } from '../../core/services/logging.service'

export interface StreamMetrics {
  platform: PlatformType
  viewerCount: number
  followerCount: number
  streamDuration: number
  averageViewTime: number
  peakViewers: number
}

export interface PlatformAnalytics {
  platformType: PlatformType
  totalStreams: number
  totalViewers: number
  averageViewers: number
  totalFollowers: number
}

@Injectable()
export class StreamingMetricsService {
  private readonly logger = new Logger(StreamingMetricsService.name)

  constructor(
    @InjectRepository(UserPlatform)
    private userPlatformRepository: Repository<UserPlatform>,
    private streamingService: StreamingService,
    private customLogger: CustomLoggerService
  ) {}

  async getStreamMetrics(
    userPlatformId: string
  ): Promise<StreamMetrics> {
    try {
      const userPlatform = await this.userPlatformRepository.findOne({
        where: { id: userPlatformId }
      })

      if (!userPlatform) {
        throw new Error('User platform not found')
      }

      const [currentStream, followers] = await Promise.all([
        this.streamingService.getCurrentStream(
          userPlatform.platform, 
          userPlatform.accessToken, 
          userPlatform.platformUserId
        ),
        this.streamingService.getChannelFollowers(
          userPlatform.platform, 
          userPlatform.accessToken, 
          userPlatform.platformUserId
        )
      ])

      if (!currentStream) {
        return null
      }

      const streamStartTime = currentStream.startedAt || new Date()
      const streamDuration = this.calculateStreamDuration(streamStartTime)

      return {
        platform: userPlatform.platform,
        viewerCount: currentStream.viewerCount || 0,
        followerCount: followers,
        streamDuration,
        averageViewTime: this.calculateAverageViewTime(currentStream),
        peakViewers: this.calculatePeakViewers(currentStream)
      }
    } catch (error) {
      this.customLogger.error('Error fetching stream metrics', error.stack)
      throw error
    }
  }

  async getPlatformAnalytics(
    userId: string, 
    platformType?: PlatformType
  ): Promise<PlatformAnalytics[]> {
    try {
      const platforms = await this.userPlatformRepository.find({
        where: { 
          user: { id: userId },
          ...(platformType ? { platform: platformType } : {})
        }
      })

      const platformAnalytics: PlatformAnalytics[] = []

      for (const platform of platforms) {
        try {
          const metrics = await this.getStreamMetrics(platform.id)
          
          if (metrics) {
            platformAnalytics.push({
              platformType: platform.platform,
              totalStreams: 1, // Placeholder - requires more complex tracking
              totalViewers: metrics.viewerCount,
              averageViewers: metrics.averageViewTime > 0 
                ? metrics.viewerCount 
                : 0,
              totalFollowers: metrics.followerCount
            })
          }
        } catch (platformError) {
          this.customLogger.warn(
            `Analytics fetch failed for platform ${platform.platform}`, 
            platformError
          )
        }
      }

      return platformAnalytics
    } catch (error) {
      this.customLogger.error('Error fetching platform analytics', error.stack)
      throw error
    }
  }

  private calculateStreamDuration(startTime: Date): number {
    const currentTime = new Date()
    return (currentTime.getTime() - startTime.getTime()) / 60000 // Duration in minutes
  }

  private calculateAverageViewTime(stream: any): number {
    // Placeholder implementation
    // In a real-world scenario, this would require more complex tracking
    return stream.viewerCount > 0 
      ? Math.floor(Math.random() * 30) // Random average view time between 0-30 minutes
      : 0
  }

  private calculatePeakViewers(stream: any): number {
    // Placeholder implementation
    // In a real-world scenario, this would track viewer count over time
    return stream.viewerCount * 1.2 // Simulating 20% peak above current viewers
  }

  async trackStreamEvent(
    platformType: PlatformType, 
    eventType: 'start' | 'end' | 'update', 
    streamData: any
  ) {
    try {
      // Log stream events for future analytics
      this.customLogger.log('Stream Event', {
        platform: platformType,
        eventType,
        streamData
      })

      // In a production system, you might want to:
      // 1. Save stream events to a database
      // 2. Trigger real-time notifications
      // 3. Update stream analytics
    } catch (error) {
      this.customLogger.error('Error tracking stream event', error.stack)
    }
  }
}
