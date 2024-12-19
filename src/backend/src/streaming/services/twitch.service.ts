import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

interface TwitchCredentials {
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken?: string
}

interface StreamMetadata {
  userId: string
  userName: string
  gameId: string
  title: string
  viewerCount: number
  startedAt: Date
}

@Injectable()
export class TwitchService {
  private readonly logger = new Logger(TwitchService.name)
  private readonly TWITCH_API_BASE = 'https://api.twitch.tv/helix'

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {}

  async getAccessToken(code: string): Promise<TwitchCredentials> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://id.twitch.tv/oauth2/token', null, {
          params: {
            client_id: this.configService.get('TWITCH_CLIENT_ID'),
            client_secret: this.configService.get('TWITCH_CLIENT_SECRET'),
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.configService.get('TWITCH_REDIRECT_URI')
          }
        })
      )

      return {
        clientId: this.configService.get('TWITCH_CLIENT_ID'),
        clientSecret: this.configService.get('TWITCH_CLIENT_SECRET'),
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token
      }
    } catch (error) {
      this.logger.error('Twitch OAuth Error', error)
      throw error
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TwitchCredentials> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://id.twitch.tv/oauth2/token', null, {
          params: {
            client_id: this.configService.get('TWITCH_CLIENT_ID'),
            client_secret: this.configService.get('TWITCH_CLIENT_SECRET'),
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          }
        })
      )

      return {
        clientId: this.configService.get('TWITCH_CLIENT_ID'),
        clientSecret: this.configService.get('TWITCH_CLIENT_SECRET'),
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token
      }
    } catch (error) {
      this.logger.error('Twitch Token Refresh Error', error)
      throw error
    }
  }

  async getCurrentStream(
    accessToken: string, 
    userId: string
  ): Promise<StreamMetadata | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.TWITCH_API_BASE}/streams`, {
          headers: {
            'Client-ID': this.configService.get('TWITCH_CLIENT_ID'),
            'Authorization': `Bearer ${accessToken}`
          },
          params: { user_id: userId }
        })
      )

      const streams = response.data.data
      return streams.length > 0 ? {
        userId: streams[0].user_id,
        userName: streams[0].user_name,
        gameId: streams[0].game_id,
        title: streams[0].title,
        viewerCount: streams[0].viewer_count,
        startedAt: new Date(streams[0].started_at)
      } : null
    } catch (error) {
      this.logger.error('Error fetching Twitch stream', error)
      throw error
    }
  }

  async getChannelFollowers(
    accessToken: string, 
    broadcasterId: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.TWITCH_API_BASE}/channels/followers`, {
          headers: {
            'Client-ID': this.configService.get('TWITCH_CLIENT_ID'),
            'Authorization': `Bearer ${accessToken}`
          },
          params: { broadcaster_id: broadcasterId }
        })
      )

      return response.data.total
    } catch (error) {
      this.logger.error('Error fetching Twitch followers', error)
      throw error
    }
  }

  generateAuthorizationUrl(): string {
    const baseUrl = 'https://id.twitch.tv/oauth2/authorize'
    const params = new URLSearchParams({
      client_id: this.configService.get('TWITCH_CLIENT_ID'),
      redirect_uri: this.configService.get('TWITCH_REDIRECT_URI'),
      response_type: 'code',
      scope: [
        'user:read:email',
        'channel:read:stream_key',
        'channel:manage:broadcast',
        'user:read:follows'
      ].join(' ')
    })

    return `${baseUrl}?${params.toString()}`
  }
}
