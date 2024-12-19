'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Settings, 
  Users, 
  Twitch, 
  LogOut, 
  Menu 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthService } from '@/lib/auth/auth-service'
import { useUserStore } from '@/stores/user-store'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user } = useUserStore()

  const sidebarItems = [
    { icon: <Home />, label: 'Dashboard', href: '/dashboard' },
    { icon: <Twitch />, label: 'Streaming', href: '/dashboard/streaming' },
    { icon: <Users />, label: 'Community', href: '/dashboard/community' },
    { icon: <Settings />, label: 'Settings', href: '/dashboard/settings' }
  ]

  const handleLogout = async () => {
    await AuthService.logout()
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Sidebar Toggle */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu />
      </Button>

      {/* Sidebar */}
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ 
          x: isSidebarOpen || window.innerWidth >= 768 ? 0 : '-100%',
          transition: { type: 'spring', stiffness: 300 }
        }}
        className={`
          fixed md:relative z-40 w-64 h-full 
          bg-white dark:bg-gray-800 
          shadow-lg transform transition-transform
          md:translate-x-0
        `}
      >
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <img 
              src={user?.avatar || '/default-avatar.png'} 
              alt="User Avatar" 
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-bold">{user?.username}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          {sidebarItems.map((item, index) => (
            <motion.div 
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                className="w-full justify-start mb-2"
                onClick={() => {
                  window.location.href = item.href
                  setIsSidebarOpen(false)
                }}
              >
                {React.cloneElement(item.icon, { className: 'mr-2' })}
                {item.label}
              </Button>
            </motion.div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2" /> Logout
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50 dark:bg-gray-900">
        {children}
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
