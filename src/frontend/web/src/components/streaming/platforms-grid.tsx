'use client'

import React from 'react'
import { PlatformCard, PlatformCardProps } from './platform-card'
import { useUserStore } from '@/stores/user-store'

const PLATFORMS: PlatformCardProps[] = [
  {
    name: 'Twitch',
    description: 'Connect and stream to Twitch',
    connectUrl: '/auth/twitch'
  },
  {
    name: 'YouTube',
    description: 'Sync your YouTube channel',
    connectUrl: '/auth/youtube'
  },
  {
    name: 'TikTok',
    description: 'Integrate TikTok Live',
    connectUrl: '/auth/tiktok'
  },
  {
    name: 'Facebook',
    description: 'Connect Facebook Gaming',
    connectUrl: '/auth/facebook'
  }
]

export const PlatformsGrid: React.FC = () => {
  const { platforms } = useUserStore()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {PLATFORMS.map(platform => (
        <PlatformCard 
          key={platform.name}
          {...platform}
          isConnected={platforms.includes(platform.name.toLowerCase())}
        />
      ))}
    </div>
  )
}
