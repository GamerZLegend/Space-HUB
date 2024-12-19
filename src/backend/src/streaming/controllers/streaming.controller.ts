import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common'
import { StreamingService } from '../services/streaming.service'
import { AuthGuard } from '../../auth/guards/auth.guard'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { User } from '../../users/entities/user.entity'

@Controller('streaming')
@UseGuards(AuthGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('platforms')
  async getSupportedPlatforms() {
    return ['twitch', 'youtube']
  }

  @Get('authorization-url/:platform')
  async getAuthorizationUrl(@Param('platform') platform: string) {
    return { 
      authorizationUrl: this.streamingService.getAuthorizationUrl(platform) 
    }
  }

  @Post('connect/:platform')
  async connectPlatform(
    @CurrentUser() user: User,
    @Param('platform') platform: string,
    @Body('code') code: string
  ) {
    const credentials = await this.streamingService.connectPlatform(platform, code)
    
    // Here you would typically save the credentials to the user's profile
    // This is a placeholder - actual implementation depends on your user management
    return {
      platform,
      credentials,
      message: 'Platform connected successfully'
    }
  }

  @Get('current-streams')
  async getCurrentStreams(
    @CurrentUser() user: User,
    @Query('platforms') platforms?: string[]
  ) {
    // This would typically fetch access tokens from user's connected platforms
    const userPlatforms = platforms || ['twitch', 'youtube']
    const accessTokens = [] // Fetch from user's stored credentials

    return this.streamingService.aggregateStreamData(userPlatforms, accessTokens)
  }

  @Get('followers/:platform')
  async getChannelFollowers(
    @CurrentUser() user: User,
    @Param('platform') platform: string
  ) {
    // Fetch access token and broadcaster ID from user's profile
    const accessToken = '' // Fetch from user's stored credentials
    const broadcasterId = '' // Fetch from user's profile

    return {
      platform,
      followers: await this.streamingService.getChannelFollowers(
        platform, 
        accessToken, 
        broadcasterId
      )
    }
  }
}
