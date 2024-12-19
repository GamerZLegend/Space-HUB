import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm'
import { User } from './user.entity'

export enum PlatformType {
  TWITCH = 'twitch',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  FACEBOOK = 'facebook',
  KICK = 'kick',
  TROVO = 'trovo'
}

@Entity('user_platforms')
export class UserPlatform {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: PlatformType
  })
  platform: PlatformType

  @Column()
  platformUserId: string

  @Column()
  platformUsername: string

  @Column({ nullable: true })
  accessToken: string

  @Column({ nullable: true })
  refreshToken: string

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date

  @Column({ default: true })
  isActive: boolean

  @ManyToOne(() => User, user => user.platforms, { 
    onDelete: 'CASCADE' 
  })
  user: User

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Method to check if token is expired
  isTokenExpired(): boolean {
    return this.tokenExpiresAt 
      ? new Date() > this.tokenExpiresAt 
      : false
  }

  // Method to mask sensitive information
  toSafeObject() {
    return {
      id: this.id,
      platform: this.platform,
      platformUserId: this.platformUserId,
      platformUsername: this.platformUsername,
      isActive: this.isActive,
      createdAt: this.createdAt
    }
  }
}
