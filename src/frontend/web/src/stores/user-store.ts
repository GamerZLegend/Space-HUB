import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  user: {
    id?: string
    username?: string
    email?: string
    avatar?: string
  }
  platforms: string[]
  setUser: (userData: Partial<UserState['user']>) => void
  addPlatform: (platform: string) => void
  removePlatform: (platform: string) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: {},
      platforms: [],
      setUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),
      addPlatform: (platform) => set((state) => ({
        platforms: [...new Set([...state.platforms, platform])]
      })),
      removePlatform: (platform) => set((state) => ({
        platforms: state.platforms.filter(p => p !== platform)
      })),
      logout: () => set({ user: {}, platforms: [] })
    }),
    {
      name: 'space-hub-user-storage',
      version: 1
    }
  )
)
