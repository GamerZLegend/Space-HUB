'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthService } from '@/lib/auth/auth-service'
import { useToast } from '@/components/ui/use-toast'
import { 
  User, 
  Lock, 
  Mail, 
  LogIn, 
  UserPlus 
} from 'lucide-react'

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isLogin) {
        await AuthService.login({ email, password })
        toast({
          title: "Login Successful",
          description: "Welcome back to Space HUB!",
        })
      } else {
        await AuthService.register({ email, password, username })
        toast({
          title: "Registration Successful",
          description: "Your Space HUB account is ready!",
        })
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Login to Space HUB' : 'Create Your Account'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isLogin}
              className="pl-10"
            />
          </div>
        )}
        
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            className="pl-10"
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            className="pl-10"
          />
        </div>
        
        <Button type="submit" className="w-full">
          {isLogin ? (
            <>
              <LogIn className="mr-2" /> Login
            </>
          ) : (
            <>
              <UserPlus className="mr-2" /> Register
            </>
          )}
        </Button>
      </form>
      
      <div className="text-center mt-4">
        <Button 
          variant="link" 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin 
            ? 'Need an account? Register' 
            : 'Already have an account? Login'}
        </Button>
      </div>
    </motion.div>
  )
}
