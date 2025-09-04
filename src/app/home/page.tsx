'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { Timer, Users, LogOut } from 'lucide-react'
import axios from 'axios'

interface SessionStatus {
  hasActiveSession: boolean
  timeLeft: number
  participantCount: number
  queueCount: number
  sessionId?: string
}

interface UserStats {
  totalWins: number
  totalLosses: number
  totalGames: number
  winRate: string
}

export default function HomePage() {
  const { user, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const socket = useSocket()
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    hasActiveSession: false,
    timeLeft: 0,
    participantCount: 0,
    queueCount: 0,
  })
  const [userStats, setUserStats] = useState<UserStats>({
    totalWins: 0,
    totalLosses: 0,
    totalGames: 0,
    winRate: '0%'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Wait for auth loading to complete before checking user
    if (authLoading) return
    
    if (!user) {
      router.push('/')
      return
    }

    fetchSessionStatus()
    fetchUserStats()
  }, [user, router, authLoading])

  useEffect(() => {
    if (socket) {
      socket.emit('requestSessionStatus')
      
      socket.on('sessionStatus', (status: SessionStatus) => {
        setSessionStatus(status)
      })

      return () => {
        socket.off('sessionStatus')
      }
    }
  }, [socket])

  const fetchSessionStatus = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await axios.get(`${API_BASE_URL}/game/status`)
      setSessionStatus(response.data)
    } catch (err) {
      console.error('Failed to fetch session status:', err)
    }
  }

  const fetchUserStats = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/leaderboard/user-stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setUserStats(response.data)
    } catch (err) {
      console.error('Failed to fetch user stats:', err)
    }
  }

  const handleJoinSession = async () => {
    setLoading(true)
    setError('')

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }
      
      console.log('HOME: Attempting to join session...')
      await axios.post(`${API_BASE_URL}/game/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('HOME: Successfully joined session, navigating to game...')
      router.push('/game')
    } catch (err: any) {
      console.error('HOME: Join session error:', err)
      setError(err.response?.data?.message || 'Failed to join session')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const formatTime = (seconds: number) => {
    return `${seconds}s`
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-heading">Hi {user?.username}</h1>
            <p className="text-gray-600">Welcome to the game lobby</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 font-heading">Session Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${sessionStatus.hasActiveSession ? 'text-green-600' : 'text-gray-400'}`}>
                  {sessionStatus.hasActiveSession ? 'Active' : 'Waiting'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Time Left:</span>
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{formatTime(sessionStatus.timeLeft)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Players:</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{sessionStatus.participantCount}</span>
                </div>
              </div>
              {sessionStatus.queueCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">In Queue:</span>
                  <span className="font-medium text-yellow-600">{sessionStatus.queueCount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4 font-heading">User Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Wins:</span>
                <span className="font-medium text-green-600">{userStats.totalWins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Losses:</span>
                <span className="font-medium text-red-600">{userStats.totalLosses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Win Rate:</span>
                <span className="font-medium text-blue-600">{userStats.winRate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card text-center">
          {sessionStatus.hasActiveSession && sessionStatus.timeLeft > 0 ? (
            <div>
              <h2 className="text-2xl font-bold mb-4 font-heading">Active Session Available!</h2>
              <p className="text-gray-600 mb-6">
                There is an active session, you can join in {formatTime(sessionStatus.timeLeft)}
              </p>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              <button
                onClick={handleJoinSession}
                disabled={loading}
                className="btn-primary text-xl py-4 px-8"
              >
                {loading ? 'Joining...' : 'JOIN'}
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-4 font-heading">No Active Session</h2>
              <p className="text-gray-600 mb-6">
                Waiting for the next session to start...
              </p>
              <button
                onClick={handleJoinSession}
                disabled={loading}
                className="btn-primary text-xl py-4 px-8"
              >
                {loading ? 'Starting...' : 'START NEW SESSION'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/leaderboard')}
            className="btn-secondary"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}