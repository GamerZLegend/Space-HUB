import { apolloClient } from '../graphql-client'
import { useUserStore } from '@/stores/user-store'

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterCredentials extends LoginCredentials {
  username: string
}

export class AuthService {
  static async login(credentials: LoginCredentials) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: credentials
      })

      if (data?.login) {
        const { user } = data.login
        useUserStore.getState().setUser(user)
        return user
      }
      throw new Error('Login failed')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  static async register(credentials: RegisterCredentials) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: REGISTER_MUTATION,
        variables: credentials
      })

      if (data?.register) {
        const { user } = data.register
        useUserStore.getState().setUser(user)
        return user
      }
      throw new Error('Registration failed')
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  static async logout() {
    try {
      await apolloClient.mutate({
        mutation: LOGOUT_MUTATION
      })
      useUserStore.getState().logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  static async getCurrentUser() {
    try {
      const { data } = await apolloClient.query({
        query: GET_CURRENT_USER_QUERY
      })
      
      if (data?.currentUser) {
        useUserStore.getState().setUser(data.currentUser)
        return data.currentUser
      }
      return null
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }
}

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        username
        avatar
      }
      token
    }
  }
`

const REGISTER_MUTATION = `
  mutation Register($email: String!, $password: String!, $username: String!) {
    register(email: $email, password: $password, username: $username) {
      user {
        id
        email
        username
        avatar
      }
      token
    }
  }
`

const LOGOUT_MUTATION = `
  mutation Logout {
    logout
  }
`

const GET_CURRENT_USER_QUERY = `
  query GetCurrentUser {
    currentUser {
      id
      email
      username
      avatar
    }
  }
`
