import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'

import { TwitchService } from './services/twitch.service'
import { YouTubeService } from './services/youtube.service'
import { StreamingService } from './services/streaming.service'
import { StreamingMetricsService } from './services/streaming-metrics.service'
import { StreamCollaborationService } from './services/collaboration.service'
import { StreamingController } from './controllers/streaming.controller'
import { StreamingGateway } from './gateways/streaming.gateway'

import { UserPlatform } from '../users/entities/user-platform.entity'
import { User } from '../users/entities/user.entity'
import { CustomLoggerService } from '../core/services/logging.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    HttpModule,
    AuthModule,
    TypeOrmModule.forFeature([UserPlatform, User])
  ],
  providers: [
    TwitchService, 
    YouTubeService,
    StreamingService,
    StreamingMetricsService,
    StreamCollaborationService,
    StreamingGateway,
    CustomLoggerService
  ],
  controllers: [StreamingController],
  exports: [
    TwitchService, 
    YouTubeService,
    StreamingService,
    StreamingMetricsService,
    StreamCollaborationService,
    StreamingGateway
  ]
})
export class StreamingModule {}
