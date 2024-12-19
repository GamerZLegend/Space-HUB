import { Injectable, Logger } from '@nestjs/common'
import { TwitchService } from './twitch.service'
import { YouTubeService } from './youtube.service'

export interface StreamPlatform {
  name: string
  getAuthorizationUrl(): string
  getAccessToken(code: string): Promise<any>
  refreshAccessToken(refreshToken: string): Promise<any>
  getCurrentStream(accessToken: string, userId: string): Promise<any>
  getChannelFollowers(accessToken: string, broadcasterId: string): Promise<number>
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name)
  private platforms: Record<string, StreamPlatform>

  constructor(
    private twitchService: TwitchService,
    private youtubeService: YouTubeService
  ) {
    this.platforms = {
      twitch: twitchService,
      youtube: youtubeService
    }
  }

  getPlatform(name: string): StreamPlatform {
    const platform = this.platforms[name.toLowerCase()]
    if (!platform) {
      throw new Error(`Unsupported streaming platform: ${name}`)
    }
    return platform
  }

  async connectPlatform(
    platformName: string, 
    code: string
  ) {
    try {
      const platform = this.getPlatform(platformName)
      return await platform.getAccessToken(code)
    } catch (error) {
      this.logger.error(`Platform connection error: ${platformName}`, error)
      throw error
    }
  }

  async refreshPlatformToken(
    platformName: string, 
    refreshToken: string
  ) {
    try {
      const platform = this.getPlatform(platformName)
      return await platform.refreshAccessToken(refreshToken)
    } catch (error) {
      this.logger.error(`Token refresh error: ${platformName}`, error)
      throw error
    }
  }

  async getCurrentStream(
    platformName: string, 
    accessToken: string, 
    userId: string
  ) {
    try {
      const platform = this.getPlatform(platformName)
      return await platform.getCurrentStream(accessToken, userId)
    } catch (error) {
      this.logger.error(`Get current stream error: ${platformName}`, error)
      throw error
    }
  }

  async getChannelFollowers(
    platformName: string, 
    accessToken: string, 
    broadcasterId: string
  ) {
    try {
      const platform = this.getPlatform(platformName)
      return await platform.getChannelFollowers(accessToken, broadcasterId)
    } catch (error) {
      this.logger.error(`Get followers error: ${platformName}`, error)
      throw error
    }
  }

  getAuthorizationUrl(platformName: string): string {
    const platform = this.getPlatform(platformName)
    return platform.getAuthorizationUrl()
  }

  async aggregateStreamData(platforms: string[], accessTokens: string[]) {
    const streamData = []

    for (let i = 0; i < platforms.length; i++) {
      try {
        const platform = this.getPlatform(platforms[i])
        const stream = await platform.getCurrentStream(
          accessTokens[i], 
          // Assuming userId is part of the access token or passed separately
          '' 
        )
        
        if (stream) {
          streamData.push({
            platform: platforms[i],
            ...stream
          })
        }
      } catch (error) {
        this.logger.warn(`Error aggregating stream for ${platforms[i]}`, error)
      }
    }

    return streamData
  }
}
