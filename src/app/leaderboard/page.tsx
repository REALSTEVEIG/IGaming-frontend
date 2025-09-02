'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Trophy, Calendar, ArrowLeft, Filter } from 'lucide-react'
import axios from 'axios'

interface Player {
  id: string
  username: string
  wins: number
  totalGames: number
}

interface Session {
  id: string
  sessionNumber: number
  startedAt: string
  winningNumber: number
  participants: Array<{
    user: { username: string }
    isWinner: boolean
    chosenNumber: number
  }>
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [topPlayers, setTopPlayers] = useState<Player[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [winnersByPeriod, setWinnersByPeriod] = useState<Array<{ username: string; wins: number }>>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [activeTab, setActiveTab] = useState<'players' | 'sessions' | 'period'>('players')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    fetchData()
  }, [user, router, selectedPeriod])

  const fetchData = async () => {
    setLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const [playersRes, sessionsRes, periodRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaderboard/top-players`),
        axios.get(`${API_BASE_URL}/leaderboard/sessions`),
        axios.get(`${API_BASE_URL}/leaderboard/winners?period=${selectedPeriod}`)
      ])

      setTopPlayers(playersRes.data)
      setSessions(sessionsRes.data.slice(0, 10))
      setWinnersByPeriod(periodRes.data)
    } catch (err) {
      console.error('Failed to fetch leaderboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderTopPlayers = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 font-heading">
        <Trophy className="w-6 h-6 text-yellow-500" />
        Top 10 Players
      </h2>
      <div className="card">
        <div className="space-y-3">
          {topPlayers.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium text-gray-900">{player.username}</span>
                {player.username.toLowerCase() === user?.username.toLowerCase() && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{player.wins} wins</div>
                <div className="text-sm text-gray-500">{player.totalGames} games</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSessions = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 font-heading">
        <Calendar className="w-6 h-6 text-blue-500" />
        Recent Sessions
      </h2>
      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  Session {session.sessionNumber || session.id.slice(-4)}
                </div>
                <div className="text-sm text-gray-500">{formatDate(session.startedAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">{session.winningNumber}</div>
                <div className="text-sm text-gray-500">Winning Number</div>
              </div>
            </div>
            <div className="flex">
              <div className="flex-1">
                <h4 className="font-medium text-gray-700 mb-2 font-heading">Players</h4>
                <div className="space-y-1">
                  {session.participants.length > 0 ? (
                    session.participants.map((participant, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-gray-900">{participant.user.username}</span>
                        <span className="text-gray-500 ml-2">({participant.chosenNumber || 'No pick'})</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No players</div>
                  )}
                </div>
              </div>
              <div className="flex-1 text-center">
                <h4 className="font-medium text-gray-700 mb-2 font-heading">Winner</h4>
                <div className="text-center">
                  {session.participants.filter(p => p.isWinner).length > 0 ? (
                    session.participants
                      .filter(p => p.isWinner)
                      .map((winner, index) => (
                        <div key={index} className="text-sm text-green-600 text-center">
                          {winner.user.username}
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center">No winner</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderWinnersByPeriod = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 font-heading">
          <Filter className="w-6 h-6 text-purple-500" />
          Winners by Period
        </h2>
        <div className="flex bg-gray-200 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="space-y-3">
          {winnersByPeriod.map((winner, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <span className="font-medium text-gray-900">{winner.username}</span>
                {winner.username.toLowerCase() === user?.username.toLowerCase() && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                )}
              </div>
              <div className="font-bold text-purple-600">{winner.wins} wins</div>
            </div>
          ))}
          {winnersByPeriod.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No winners found for this period
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-heading">Leaderboard</h1>
          <button
            onClick={() => router.push('/home')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </header>

        <div className="flex mb-6 bg-white rounded-lg p-1 shadow-sm">
          {[
            { key: 'players', label: 'Top Players', icon: Trophy },
            { key: 'sessions', label: 'Recent Sessions', icon: Calendar },
            { key: 'period', label: 'By Period', icon: Filter }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'players' && renderTopPlayers()}
        {activeTab === 'sessions' && renderSessions()}
        {activeTab === 'period' && renderWinnersByPeriod()}
      </div>
    </div>
  )
}