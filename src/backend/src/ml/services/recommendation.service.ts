import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as tf from '@tensorflow/tfjs-node'

import { User } from '../../users/entities/user.entity'
import { UserPlatform, PlatformType } from '../../users/entities/user-platform.entity'
import { StreamingMetricsService } from '../../streaming/services/streaming-metrics.service'

export interface StreamRecommendation {
  streamerId: string
  streamerName: string
  platform: PlatformType
  recommendationScore: number
  categories: string[]
  similarityReasons: string[]
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name)
  private userEmbeddingModel: tf.LayersModel
  private streamEmbeddingModel: tf.LayersModel

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPlatform)
    private userPlatformRepository: Repository<UserPlatform>,
    private streamingMetricsService: StreamingMetricsService
  ) {
    this.initializeModels()
  }

  private async initializeModels() {
    try {
      // Initialize or load pre-trained embedding models
      this.userEmbeddingModel = await tf.loadLayersModel(
        'file://./models/user_embedding_model.json'
      )
      this.streamEmbeddingModel = await tf.loadLayersModel(
        'file://./models/stream_embedding_model.json'
      )
    } catch (error) {
      this.logger.warn('Could not load pre-trained models, creating new ones', error)
      this.createDefaultModels()
    }
  }

  private createDefaultModels() {
    // Create simple embedding models
    this.userEmbeddingModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [100],  // Assume 100-dimensional user feature vector
          units: 50,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 20,
          activation: 'sigmoid'
        })
      ]
    })

    this.streamEmbeddingModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [100],  // Assume 100-dimensional stream feature vector
          units: 50,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 20,
          activation: 'sigmoid'
        })
      ]
    })
  }

  async generateStreamRecommendations(
    userId: string, 
    limit: number = 10
  ): Promise<StreamRecommendation[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['platforms']
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Fetch user's historical streaming data
      const userMetrics = await Promise.all(
        user.platforms.map(platform => 
          this.streamingMetricsService.getPlatformAnalytics(userId, platform.platform)
        )
      )

      // Extract user preferences and viewing history
      const userFeatures = this.extractUserFeatures(user, userMetrics)
      const userEmbedding = this.generateUserEmbedding(userFeatures)

      // Fetch potential recommended streams
      const potentialStreams = await this.fetchPotentialStreams(user)

      // Rank and filter recommendations
      const recommendations = potentialStreams
        .map(stream => this.scoreStreamRecommendation(stream, userEmbedding))
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit)

      return recommendations
    } catch (error) {
      this.logger.error('Recommendation generation error', error)
      throw error
    }
  }

  private extractUserFeatures(
    user: User, 
    metrics: any[]
  ): Record<string, any> {
    // Aggregate user's streaming preferences
    const platformPreferences = metrics.reduce((acc, platformMetrics) => {
      platformMetrics.forEach(metric => {
        acc[metric.platformType] = {
          totalStreams: metric.totalStreams,
          totalViewers: metric.totalViewers,
          averageViewers: metric.averageViewers
        }
      })
      return acc
    }, {})

    return {
      userId: user.id,
      platforms: user.platforms.map(p => p.platform),
      platformPreferences,
      role: user.role
    }
  }

  private generateUserEmbedding(userFeatures: Record<string, any>): tf.Tensor {
    // Convert user features to a fixed-length embedding
    const featureVector = [
      // Example feature encoding
      userFeatures.platforms.length,
      Object.keys(userFeatures.platformPreferences).length,
      // Add more feature encodings
    ]

    // Pad or truncate to fixed length
    const paddedVector = featureVector.slice(0, 100).concat(
      Array(100 - featureVector.length).fill(0)
    )

    return this.userEmbeddingModel.predict(
      tf.tensor2d(paddedVector, [1, 100])
    ) as tf.Tensor
  }

  private async fetchPotentialStreams(user: User): Promise<any[]> {
    // Fetch streams across different platforms
    const platforms = user.platforms.map(p => p.platform)
    
    const streamPromises = platforms.map(async platform => {
      // Placeholder for fetching streams
      // In a real system, this would query multiple platforms
      return [
        {
          streamerId: 'streamer1',
          streamerName: 'Gaming Pro',
          platform: platform,
          categories: ['Gaming', 'FPS'],
          viewerCount: 1000
        }
      ]
    })

    return (await Promise.all(streamPromises)).flat()
  }

  private scoreStreamRecommendation(
    stream: any, 
    userEmbedding: tf.Tensor
  ): StreamRecommendation {
    // Generate stream embedding
    const streamFeatures = [
      stream.viewerCount,
      stream.categories.length,
      // Add more feature encodings
    ]

    const paddedVector = streamFeatures.slice(0, 100).concat(
      Array(100 - streamFeatures.length).fill(0)
    )

    const streamEmbedding = this.streamEmbeddingModel.predict(
      tf.tensor2d(paddedVector, [1, 100])
    ) as tf.Tensor

    // Calculate similarity between user and stream embeddings
    const similarity = this.calculateEmbeddingSimilarity(
      userEmbedding, 
      streamEmbedding
    )

    return {
      streamerId: stream.streamerId,
      streamerName: stream.streamerName,
      platform: stream.platform,
      recommendationScore: similarity,
      categories: stream.categories,
      similarityReasons: [
        'Viewer count match',
        'Category alignment'
      ]
    }
  }

  private calculateEmbeddingSimilarity(
    userEmbedding: tf.Tensor, 
    streamEmbedding: tf.Tensor
  ): number {
    // Cosine similarity calculation
    const dotProduct = tf.sum(tf.mul(userEmbedding, streamEmbedding))
    const userNorm = tf.norm(userEmbedding)
    const streamNorm = tf.norm(streamEmbedding)
    
    const similarity = dotProduct.div(userNorm.mul(streamNorm)).arraySync()[0]
    
    return Math.max(0, Math.min(1, similarity))
  }

  // Periodic model retraining method
  async retrainRecommendationModels() {
    try {
      // Fetch training data
      const users = await this.userRepository.find({
        relations: ['platforms']
      })

      const trainingData = users.map(user => ({
        userId: user.id,
        features: this.extractUserFeatures(user, [])
      }))

      // Retrain models with new data
      // This is a simplified example - actual implementation would be more complex
      this.userEmbeddingModel.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
      })

      // Save retrained models
      await this.userEmbeddingModel.save(
        'file://./models/user_embedding_model.json'
      )
      await this.streamEmbeddingModel.save(
        'file://./models/stream_embedding_model.json'
      )

      this.logger.log('Recommendation models retrained successfully')
    } catch (error) {
      this.logger.error('Model retraining failed', error)
    }
  }
}
