import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '../guards/auth.guard'
import { UserService } from '../../services/user.service'
import { CurrentUser } from '../decorators/current-user.decorator'
import { User } from '../../models/user.model'
import { RegisterInput, LoginInput } from '../../inputs/auth.input'

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => AuthPayload)
  async register(
    @Args('input') registerInput: RegisterInput
  ) {
    return this.userService.register(registerInput)
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') loginInput: LoginInput
  ) {
    return this.userService.login(loginInput)
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: User) {
    return this.userService.logout(user.id)
  }

  @Query(() => User, { nullable: true })
  @UseGuards(AuthGuard)
  async currentUser(@CurrentUser() user: User) {
    return user
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard)
  async updateUserProfile(
    @CurrentUser() user: User,
    @Args('username', { nullable: true }) username?: string,
    @Args('avatar', { nullable: true }) avatar?: string
  ) {
    return this.userService.updateProfile(user.id, { username, avatar })
  }

  @Mutation(() => Platform)
  @UseGuards(AuthGuard)
  async connectPlatform(
    @CurrentUser() user: User,
    @Args('platformName') platformName: string,
    @Args('accessToken') accessToken: string,
    @Args('refreshToken', { nullable: true }) refreshToken?: string
  ) {
    return this.userService.connectPlatform(
      user.id, 
      platformName, 
      accessToken, 
      refreshToken
    )
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async disconnectPlatform(
    @CurrentUser() user: User,
    @Args('platformName') platformName: string
  ) {
    return this.userService.disconnectPlatform(user.id, platformName)
  }

  @Query(() => [Platform])
  @UseGuards(AuthGuard)
  async getUserPlatforms(@CurrentUser() user: User) {
    return this.userService.getUserPlatforms(user.id)
  }
}
