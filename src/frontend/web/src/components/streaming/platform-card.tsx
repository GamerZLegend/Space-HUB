'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Twitch, 
  Youtube, 
  TikTok, 
  Facebook, 
  Globe 
} from 'lucide-react'

export interface PlatformCardProps {
  name: string
  icon?: React.ReactNode
  description: string
  connectUrl?: string
  isConnected?: boolean
}

const platformIcons: Record<string, React.ReactNode> = {
  twitch: <Twitch className="w-12 h-12 text-purple-500" />,
  youtube: <Youtube className="w-12 h-12 text-red-500" />,
  tiktok: <TikTok className="w-12 h-12 text-black" />,
  facebook: <Facebook className="w-12 h-12 text-blue-500" />,
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  name,
  description,
  connectUrl,
  isConnected = false
}) => {
  const platformIcon = platformIcons[name.toLowerCase()] || <Globe />

  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className={`
        bg-white dark:bg-gray-800 
        rounded-xl shadow-lg p-6 
        flex flex-col items-center 
        transition-all duration-300
        ${isConnected ? 'border-2 border-green-500' : 'border border-gray-200'}
      `}
    >
      <div className="mb-4">
        {platformIcon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-center capitalize">
        {name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
        {description}
      </p>
      <Button 
        variant={isConnected ? 'secondary' : 'default'}
        onClick={() => {
          if (connectUrl) {
            window.location.href = connectUrl
          }
        }}
      >
        {isConnected ? 'Connected' : 'Connect'}
      </Button>
    </motion.div>
  )
}
