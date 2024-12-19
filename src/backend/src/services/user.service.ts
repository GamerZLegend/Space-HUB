import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'

import { User } from '../models/user.model'
import { Platform } from '../models/platform.model'
import { RegisterInput, LoginInput } from '../inputs/auth.input'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {}

  async register(input: RegisterInput) {
    const { username, email, password } = input

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ 
      where: [{ email }, { username }] 
    })

    if (existingUser) {
      throw new ConflictException('User already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword
    })

    await this.userRepository.save(user)

    // Generate JWT token
    const token = this.generateToken(user)

    return { user, token }
  }

  async login(input: LoginInput) {
    const { email, password } = input

    // Find user
    const user = await this.userRepository.findOne({ 
      where: { email },
      relations: ['platforms']
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Generate JWT token
    const token = this.generateToken(user)

    return { user, token }
  }

  async logout(userId: string) {
    // Implement logout logic if needed (e.g., token blacklisting)
    return true
  }

  async updateProfile(
    userId: string, 
    updateData: { username?: string; avatar?: string }
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    if (updateData.username) {
      user.username = updateData.username
    }

    if (updateData.avatar) {
      user.avatar = updateData.avatar
    }

    return this.userRepository.save(user)
  }

  async connectPlatform(
    userId: string, 
    platformName: string, 
    accessToken: string, 
    refreshToken?: string
  ) {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['platforms']
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Check if platform is already connected
    const existingPlatform = user.platforms.find(
      p => p.name.toLowerCase() === platformName.toLowerCase()
    )

    if (existingPlatform) {
      // Update existing platform tokens
      existingPlatform.accessToken = accessToken
      if (refreshToken) {
        existingPlatform.refreshToken = refreshToken
      }
      return this.platformRepository.save(existingPlatform)
    }

    // Create new platform connection
    const platform = this.platformRepository.create({
      name: platformName,
      accessToken,
      refreshToken,
      user
    })

    return this.platformRepository.save(platform)
  }

  async disconnectPlatform(userId: string, platformName: string) {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['platforms']
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const platformToRemove = user.platforms.find(
      p => p.name.toLowerCase() === platformName.toLowerCase()
    )

    if (!platformToRemove) {
      return false
    }

    await this.platformRepository.remove(platformToRemove)
    return true
  }

  async getUserPlatforms(userId: string) {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['platforms']
    })

    return user?.platforms || []
  }

  private generateToken(user: User) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    )
  }
}
