import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

interface YouTubeCredentials {
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken?: string
}

interface StreamMetadata {
  channelId: string
  channelTitle: string
  title: string
  description: string
  scheduledStartTime: Date
  concurrentViewers: number
}

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name)
  private readonly YOUTUBE_API_BASE = 'https://youtube.googleapis.com/youtube/v3'

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {}

  async getAccessToken(code: string): Promise<YouTubeCredentials> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', null, {
          params: {
            client_id: this.configService.get('YOUTUBE_CLIENT_ID'),
            client_secret: this.configService.get('YOUTUBE_CLIENT_SECRET'),
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.configService.get('YOUTUBE_REDIRECT_URI')
          }
        })
      )

      return {
        clientId: this.configService.get('YOUTUBE_CLIENT_ID'),
        clientSecret: this.configService.get('YOUTUBE_CLIENT_SECRET'),
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token
      }
    } catch (error) {
      this.logger.error('YouTube OAuth Error', error)
      throw error
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<YouTubeCredentials> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', null, {
          params: {
            client_id: this.configService.get('YOUTUBE_CLIENT_ID'),
            client_secret: this.configService.get('YOUTUBE_CLIENT_SECRET'),
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          }
        })
      )

      return {
        clientId: this.configService.get('YOUTUBE_CLIENT_ID'),
        clientSecret: this.configService.get('YOUTUBE_CLIENT_SECRET'),
        accessToken: response.data.access_token,
        refreshToken
      }
    } catch (error) {
      this.logger.error('YouTube Token Refresh Error', error)
      throw error
    }
  }

  async getCurrentLiveStream(
    accessToken: string, 
    channelId: string
  ): Promise<StreamMetadata | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.YOUTUBE_API_BASE}/search`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            part: 'snippet',
            channelId,
            eventType: 'live',
            type: 'video'
          }
        })
      )

      const streams = response.data.items
      if (streams.length === 0) return null

      const streamDetails = await this.getStreamDetails(
        accessToken, 
        streams[0].id.videoId
      )

      return {
        channelId: streams[0].snippet.channelId,
        channelTitle: streams[0].snippet.channelTitle,
        title: streams[0].snippet.title,
        description: streams[0].snippet.description,
        scheduledStartTime: new Date(streams[0].snippet.publishedAt),
        concurrentViewers: streamDetails.concurrentViewers
      }
    } catch (error) {
      this.logger.error('Error fetching YouTube live stream', error)
      throw error
    }
  }

  private async getStreamDetails(
    accessToken: string, 
    videoId: string
  ): Promise<{ concurrentViewers: number }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.YOUTUBE_API_BASE}/videos`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            part: 'liveStreamingDetails',
            id: videoId
          }
        })
      )

      const videoDetails = response.data.items[0]
      return {
        concurrentViewers: parseInt(
          videoDetails.liveStreamingDetails.concurrentViewers || '0', 
          10
        )
      }
    } catch (error) {
      this.logger.error('Error fetching YouTube stream details', error)
      return { concurrentViewers: 0 }
    }
  }

  async getChannelSubscribers(
    accessToken: string, 
    channelId: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.YOUTUBE_API_BASE}/channels`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            part: 'statistics',
            id: channelId
          }
        })
      )

      return parseInt(
        response.data.items[0].statistics.subscriberCount || '0', 
        10
      )
    } catch (error) {
      this.logger.error('Error fetching YouTube subscribers', error)
      throw error
    }
  }

  generateAuthorizationUrl(): string {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const params = new URLSearchParams({
      client_id: this.configService.get('YOUTUBE_CLIENT_ID'),
      redirect_uri: this.configService.get('YOUTUBE_REDIRECT_URI'),
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    return `${baseUrl}?${params.toString()}`
  }
}
