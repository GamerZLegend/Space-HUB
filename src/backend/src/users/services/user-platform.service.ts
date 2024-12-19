import { 
  Injectable, 
  Logger, 
  ConflictException, 
  NotFoundException 
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { UserPlatform, PlatformType } from '../entities/user-platform.entity'
import { StreamingService } from '../../streaming/services/streaming.service'

@Injectable()
export class UserPlatformService {
  private readonly logger = new Logger(UserPlatformService.name)

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPlatform)
    private userPlatformRepository: Repository<UserPlatform>,
    private streamingService: StreamingService
  ) {}

  async connectPlatform(
    userId: string, 
    platformType: PlatformType, 
    code: string
  ) {
    try {
      // Get user with platforms
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['platforms']
      })

      if (!user) {
        throw new NotFoundException('User not found')
      }

      // Check if platform is already connected
      const existingPlatform = user.platforms?.find(
        p => p.platform === platformType
      )

      if (existingPlatform) {
        throw new ConflictException(`${platformType} platform already connected`)
      }

      // Get access tokens from streaming service
      const credentials = await this.streamingService.connectPlatform(
        platformType, 
        code
      )

      // Fetch platform user details
      const platformUserDetails = await this.fetchPlatformUserDetails(
        platformType, 
        credentials.accessToken
      )

      // Create new platform connection
      const newPlatform = this.userPlatformRepository.create({
        platform: platformType,
        platformUserId: platformUserDetails.id,
        platformUsername: platformUserDetails.username,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        tokenExpiresAt: this.calculateTokenExpiration(credentials),
        user
      })

      await this.userPlatformRepository.save(newPlatform)

      return newPlatform.toSafeObject()
    } catch (error) {
      this.logger.error(`Platform connection error: ${platformType}`, error)
      throw error
    }
  }

  async disconnectPlatform(
    userId: string, 
    platformType: PlatformType
  ) {
    try {
      const platform = await this.userPlatformRepository.findOne({
        where: { 
          user: { id: userId },
          platform: platformType 
        }
      })

      if (!platform) {
        throw new NotFoundException('Platform connection not found')
      }

      await this.userPlatformRepository.remove(platform)

      return { 
        message: `${platformType} platform disconnected successfully` 
      }
    } catch (error) {
      this.logger.error(`Platform disconnection error: ${platformType}`, error)
      throw error
    }
  }

  async refreshPlatformToken(
    userId: string, 
    platformType: PlatformType
  ) {
    try {
      const platform = await this.userPlatformRepository.findOne({
        where: { 
          user: { id: userId },
          platform: platformType 
        }
      })

      if (!platform) {
        throw new NotFoundException('Platform connection not found')
      }

      // Refresh token using streaming service
      const refreshedCredentials = await this.streamingService.refreshPlatformToken(
        platformType, 
        platform.refreshToken
      )

      // Update platform tokens
      platform.accessToken = refreshedCredentials.accessToken
      platform.refreshToken = refreshedCredentials.refreshToken
      platform.tokenExpiresAt = this.calculateTokenExpiration(refreshedCredentials)

      await this.userPlatformRepository.save(platform)

      return platform.toSafeObject()
    } catch (error) {
      this.logger.error(`Token refresh error: ${platformType}`, error)
      throw error
    }
  }

  async getUserPlatforms(userId: string) {
    const platforms = await this.userPlatformRepository.find({
      where: { user: { id: userId } }
    })

    return platforms.map(p => p.toSafeObject())
  }

  private async fetchPlatformUserDetails(
    platformType: PlatformType, 
    accessToken: string
  ) {
    // Implement platform-specific user detail fetching
    switch(platformType) {
      case PlatformType.TWITCH:
        return this.fetchTwitchUserDetails(accessToken)
      case PlatformType.YOUTUBE:
        return this.fetchYouTubeUserDetails(accessToken)
      default:
        throw new Error(`Unsupported platform: ${platformType}`)
    }
  }

  private async fetchTwitchUserDetails(accessToken: string) {
    try {
      const twitchService = this.streamingService.getPlatform('twitch')
      // Implement method to get Twitch user details
      // This is a placeholder - actual implementation depends on Twitch API
      return {
        id: 'twitch_user_id',
        username: 'twitch_username'
      }
    } catch (error) {
      this.logger.error('Twitch user details fetch error', error)
      throw error
    }
  }

  private async fetchYouTubeUserDetails(accessToken: string) {
    try {
      const youtubeService = this.streamingService.getPlatform('youtube')
      // Implement method to get YouTube user details
      // This is a placeholder - actual implementation depends on YouTube API
      return {
        id: 'youtube_channel_id',
        username: 'youtube_channel_name'
      }
    } catch (error) {
      this.logger.error('YouTube user details fetch error', error)
      throw error
    }
  }

  private calculateTokenExpiration(credentials: any): Date {
    // Calculate token expiration based on access token details
    // This is a simplified implementation
    const expiresIn = credentials.expiresIn || 3600 // Default 1 hour
    return new Date(Date.now() + expiresIn * 1000)
  }
}
