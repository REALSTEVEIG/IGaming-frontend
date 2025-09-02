'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { Timer, Users, ArrowLeft } from 'lucide-react'
import axios from 'axios'

interface GameResult {
  winningNumber: number
  winners: Array<{ username: string; chosenNumber: number }>
  totalPlayers: number
  totalWinners: number
}

export default function GamePage() {
  const { user } = useAuth()
  const router = useRouter()
  const socket = useSocket()
  const [chosenNumber, setChosenNumber] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [participantCount, setParticipantCount] = useState(0)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gamePhase, setGamePhase] = useState<'choosing' | 'waiting' | 'result'>('choosing')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (socket) {
      socket.on('sessionStatus', (status: any) => {
        setTimeLeft(status.timeLeft)
        setParticipantCount(status.participantCount)
        
        if (status.timeLeft <= 0 && gamePhase === 'choosing') {
          setGamePhase('waiting')
        }
      })

      socket.on('gameResult', (result: GameResult) => {
        setGameResult(result)
        setGamePhase('result')
      })

      return () => {
        socket.off('sessionStatus')
        socket.off('gameResult')
      }
    }
  }, [socket, gamePhase])

  const handleNumberChoice = async (number: number) => {
    setLoading(true)
    setError('')

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      await axios.post(`${API_BASE_URL}/game/choose-number`, { number })
      setChosenNumber(number)
      setGamePhase('waiting')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to choose number')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveSession = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      await axios.delete(`${API_BASE_URL}/game/leave`)
      router.push('/home')
    } catch (err) {
      console.error('Failed to leave session:', err)
      router.push('/home')
    }
  }

  const formatTime = (seconds: number) => {
    return `${seconds}s`
  }

  const renderNumberGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <button
            key={number}
            onClick={() => handleNumberChoice(number)}
            disabled={loading || chosenNumber !== null}
            className={`
              aspect-square text-2xl font-bold rounded-lg border-2 transition-all duration-200
              ${chosenNumber === number
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-900 border-gray-300 hover:border-primary-500 hover:bg-primary-50'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {number}
          </button>
        ))}
      </div>
    )
  }

  const renderGameResult = () => {
    if (!gameResult) return null

    const isWinner = gameResult.winners.some(winner => winner.username === user?.username)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary-600 mb-4">
            {gameResult.winningNumber}
          </div>
          <h2 className={`text-2xl font-bold mb-4 font-heading ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
            {isWinner ? 'Congratulations! You Won!' : 'Better luck next time!'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2 font-heading">Active Users in Session</h3>
            <div className="space-y-1">
              {gameResult.winners.map((winner, index) => (
                <div key={index} className="text-sm">
                  {winner.username}
                  {winner.username === user?.username && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card text-center">
            <h3 className="font-semibold text-gray-700 mb-4 font-heading">Result</h3>
            <div className="text-4xl font-bold text-primary-600 mb-2">
              {gameResult.winningNumber}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Total Players: {gameResult.totalPlayers}</div>
              <div>Total Winners: {gameResult.totalWinners}</div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2 font-heading">Winners</h3>
            <div className="space-y-1">
              {gameResult.winners.map((winner, index) => (
                <div key={index} className="text-sm text-green-600">
                  {winner.username}
                  {winner.username === user?.username && (
                    <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/home')}
            className="btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/home')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-lg text-gray-900">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">{participantCount} users joined</span>
            </div>
          </div>
        </header>

        {gamePhase === 'result' ? (
          renderGameResult()
        ) : (
          <div className="card text-center max-w-2xl mx-auto">
            {gamePhase === 'choosing' ? (
              <div>
                <h1 className="text-3xl font-bold mb-6 font-heading">Pick a number from 1-9</h1>
                
                {error && (
                  <div className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                    {error}
                  </div>
                )}

                {renderNumberGrid()}

                <div className="mt-8">
                  <button
                    onClick={handleLeaveSession}
                    className="btn-secondary"
                  >
                    Leave Session
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold mb-6 font-heading">
                  {chosenNumber ? `You chose ${chosenNumber}` : 'Waiting for game to end...'}
                </h1>
                <p className="text-gray-600 mb-6">
                  Time left: {formatTime(timeLeft)}
                </p>
                <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}