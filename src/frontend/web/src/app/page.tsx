'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { 
  Rocket, 
  Twitch, 
  Youtube, 
  TikTok, 
  Gamepad2 
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold text-white mb-4 flex items-center justify-center gap-4">
          <Rocket className="text-cyan-400" /> Space HUB
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Your all-in-one streaming platform for creators, powered by cutting-edge technology
        </p>

        <div className="flex justify-center space-x-4 mb-12">
          <Button variant="outline" size="lg" className="bg-transparent text-white hover:bg-white/10">
            <Twitch className="mr-2" /> Twitch
          </Button>
          <Button variant="outline" size="lg" className="bg-transparent text-white hover:bg-white/10">
            <Youtube className="mr-2" /> YouTube
          </Button>
          <Button variant="outline" size="lg" className="bg-transparent text-white hover:bg-white/10">
            <TikTok className="mr-2" /> TikTok
          </Button>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Button size="xl" className="bg-cyan-500 text-black hover:bg-cyan-400">
            <Gamepad2 className="mr-2" /> Get Started
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
