import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { UserPlatform, PlatformType } from '../../users/entities/user-platform.entity'

export interface CollaborationProposal {
  id: string
  proposerId: string
  proposerName: string
  proposerPlatforms: PlatformType[]
  targetUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  proposedCategories: string[]
  proposedPlatforms: PlatformType[]
  createdAt: Date
}

export interface CollaborationMatch {
  users: {
    id: string
    username: string
    platforms: PlatformType[]
  }[]
  compatibilityScore: number
  sharedCategories: string[]
  recommendedCollaborationType: 'crossover' | 'joint_stream' | 'series'
}

@Injectable()
export class StreamCollaborationService {
  private readonly logger = new Logger(StreamCollaborationService.name)

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPlatform)
    private userPlatformRepository: Repository<UserPlatform>
  ) {}

  async findPotentialCollaborators(
    userId: string, 
    options?: {
      categories?: string[]
      platforms?: PlatformType[]
      maxResults?: number
    }
  ): Promise<CollaborationMatch[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['platforms']
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Find users with similar streaming characteristics
      const query = this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.platforms', 'platforms')
        .where('user.id != :userId', { userId })
        .andWhere('platforms.isActive = true')

      if (options?.platforms?.length) {
        query.andWhere('platforms.platform IN (:...platforms)', { 
          platforms: options.platforms 
        })
      }

      const potentialCollaborators = await query.getMany()

      // Calculate collaboration matches
      const matches = potentialCollaborators
        .map(collaborator => this.calculateCollaborationCompatibility(user, collaborator))
        .filter(match => match.compatibilityScore > 0.5)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, options?.maxResults || 10)

      return matches
    } catch (error) {
      this.logger.error('Collaboration search error', error)
      throw error
    }
  }

  private calculateCollaborationCompatibility(
    user1: User, 
    user2: User
  ): CollaborationMatch {
    // Calculate platform overlap
    const user1Platforms = user1.platforms.map(p => p.platform)
    const user2Platforms = user2.platforms.map(p => p.platform)
    const sharedPlatforms = user1Platforms.filter(
      platform => user2Platforms.includes(platform)
    )

    // Simulate category matching (would be more complex in real implementation)
    const sharedCategories = [
      'Gaming', 
      'Technology', 
      'Music', 
      'Art'
    ].filter(() => Math.random() > 0.5)

    // Calculate compatibility score
    const platformCompatibility = sharedPlatforms.length / 
      Math.max(user1Platforms.length, user2Platforms.length)
    const categoryCompatibility = sharedCategories.length / 4

    const compatibilityScore = (platformCompatibility + categoryCompatibility) / 2

    // Recommend collaboration type
    const recommendedCollaborationType = this.recommendCollaborationType(
      compatibilityScore, 
      sharedPlatforms, 
      sharedCategories
    )

    return {
      users: [
        {
          id: user1.id,
          username: user1.username,
          platforms: user1Platforms
        },
        {
          id: user2.id,
          username: user2.username,
          platforms: user2Platforms
        }
      ],
      compatibilityScore,
      sharedCategories,
      recommendedCollaborationType
    }
  }

  private recommendCollaborationType(
    compatibilityScore: number, 
    sharedPlatforms: PlatformType[], 
    sharedCategories: string[]
  ): CollaborationMatch['recommendedCollaborationType'] {
    if (compatibilityScore > 0.8 && sharedPlatforms.length > 0) {
      return 'joint_stream'
    } else if (compatibilityScore > 0.6 && sharedCategories.length > 0) {
      return 'crossover'
    } else {
      return 'series'
    }
  }

  async createCollaborationProposal(
    proposerId: string, 
    targetUserId: string, 
    details: {
      proposedCategories?: string[]
      proposedPlatforms?: PlatformType[]
    }
  ): Promise<CollaborationProposal> {
    try {
      const [proposer, targetUser] = await Promise.all([
        this.userRepository.findOne({
          where: { id: proposerId },
          relations: ['platforms']
        }),
        this.userRepository.findOne({
          where: { id: targetUserId }
        })
      ])

      if (!proposer || !targetUser) {
        throw new Error('Users not found')
      }

      const proposal: CollaborationProposal = {
        id: crypto.randomUUID(),
        proposerId: proposer.id,
        proposerName: proposer.username,
        proposerPlatforms: proposer.platforms.map(p => p.platform),
        targetUserId: targetUser.id,
        status: 'pending',
        proposedCategories: details.proposedCategories || [],
        proposedPlatforms: details.proposedPlatforms || [],
        createdAt: new Date()
      }

      // In a real system, you'd save this to a database
      this.logger.log('Collaboration proposal created', proposal)

      return proposal
    } catch (error) {
      this.logger.error('Collaboration proposal creation error', error)
      throw error
    }
  }
}
