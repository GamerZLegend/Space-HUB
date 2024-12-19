import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany
} from 'typeorm'
import { UserPlatform } from './user-platform.entity'

export enum UserRole {
  USER = 'user',
  CREATOR = 'creator',
  ADMIN = 'admin'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  username: string

  @Column({ unique: true })
  email: string

  @Column({ select: false })
  password: string

  @Column({ nullable: true })
  avatar: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole

  @Column({ default: true })
  isActive: boolean

  @OneToMany(() => UserPlatform, platform => platform.user, {
    cascade: true,
    eager: true
  })
  platforms: UserPlatform[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Method to get connected platform names
  getConnectedPlatforms(): string[] {
    return this.platforms
      ?.filter(p => p.isActive)
      .map(p => p.platform) || []
  }

  // Method to mask sensitive information
  toSafeObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      role: this.role,
      platforms: this.platforms?.map(p => p.toSafeObject()),
      createdAt: this.createdAt
    }
  }
}
