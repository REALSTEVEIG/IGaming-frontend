'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

interface User {
  id: string
  username: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string) => Promise<void>
  register: (username: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = () => {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }

      console.log('AuthContext useEffect: Starting token restoration...')
      
      try {
        // Try multiple times to ensure localStorage is available
        let savedToken = null
        for (let i = 0; i < 3; i++) {
          try {
            savedToken = localStorage.getItem('token')
            if (savedToken !== null) break
          } catch (e) {
            console.warn(`localStorage access attempt ${i + 1} failed:`, e)
          }
        }
        
        console.log('AuthContext useEffect: savedToken exists:', !!savedToken)
        console.log('AuthContext useEffect: savedToken length:', savedToken?.length)
        
        if (savedToken && savedToken.length > 0) {
          console.log('AuthContext useEffect: Processing valid token')
          
          // Decode JWT to get user data
          const payload = JSON.parse(atob(savedToken.split('.')[1]))
          console.log('AuthContext useEffect: Decoded payload:', payload)
          
          // Set token and user immediately
          setToken(savedToken)
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
          setUser({
            id: payload.sub,
            username: payload.username
          })
          console.log('AuthContext useEffect: User and token set successfully')
        } else {
          console.log('AuthContext useEffect: No valid token found')
          // Ensure clean state
          setToken(null)
          setUser(null)
          delete axios.defaults.headers.common['Authorization']
        }
      } catch (error) {
        console.error('AuthContext useEffect: Error with token restoration:', error)
        // If any error occurs, clear everything
        try {
          localStorage.removeItem('token')
        } catch (e) {
          console.error('Error removing token from localStorage:', e)
        }
        delete axios.defaults.headers.common['Authorization']
        setToken(null)
        setUser(null)
      }
      
      console.log('AuthContext useEffect: Setting loading to false')
      setLoading(false)
    }

    // Use a small delay to ensure DOM is ready
    const timer = setTimeout(initializeAuth, 50)
    return () => clearTimeout(timer)
  }, [])

  const login = async (username: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
      })
      
      const { accessToken, user: userData } = response.data
      
      // Set axios header first
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      // Set state
      setToken(accessToken)
      setUser(userData)
      
      // Save to localStorage with error handling
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', accessToken)
          console.log('Token saved to localStorage:', accessToken.substring(0, 20) + '...')
        }
      } catch (storageError) {
        console.error('Failed to save token to localStorage:', storageError)
      }
    } catch (error) {
      throw error
    }
  }

  const register = async (username: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
      })
      
      const { accessToken, user: userData } = response.data
      
      // Set axios header first
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      // Set state
      setToken(accessToken)
      setUser(userData)
      
      // Save to localStorage with error handling
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', accessToken)
          console.log('Token saved to localStorage:', accessToken.substring(0, 20) + '...')
        }
      } catch (storageError) {
        console.error('Failed to save token to localStorage:', storageError)
      }
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    
    // Clear localStorage with error handling
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        console.log('Token removed from localStorage')
      }
    } catch (storageError) {
      console.error('Failed to remove token from localStorage:', storageError)
    }
    
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}