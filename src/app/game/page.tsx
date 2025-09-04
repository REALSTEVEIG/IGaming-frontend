'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { Timer, Users, ArrowLeft } from 'lucide-react'
import axios from 'axios'

interface GameResult {
  winningNumber: number
  participants: Array<{ username: string; chosenNumber: number; isWinner: boolean }>
  winners: Array<{ username: string; chosenNumber: number }>
  totalPlayers: number
  totalWinners: number
}

export default function GamePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const socket = useSocket()
  const [chosenNumber, setChosenNumber] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [participantCount, setParticipantCount] = useState(0)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gamePhase, setGamePhase] = useState<'choosing' | 'waiting' | 'result'>('choosing')
  const [isShowingResults, setIsShowingResults] = useState(false)
  const [waitingForResults, setWaitingForResults] = useState(false)

  useEffect(() => {
    if (authLoading) return // Don't redirect while still loading authentication
    
    if (!user) {
      router.push('/')
      return
    }
    
    // Check if user has an active session on page load
    checkActiveSession()
  }, [user, authLoading, router])

  const checkActiveSession = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const token = localStorage.getItem('token')
      
      if (!token) return
      
      const response = await axios.get(`${API_BASE_URL}/game/my-session`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const sessionData = response.data
      if (sessionData && sessionData.session) {
        console.log('Found active session, rejoining...', sessionData)
        
        // User has an active session, restore their state
        const userParticipant = sessionData.participantData
        setChosenNumber(userParticipant?.chosenNumber || null)
        setTimeLeft(sessionData.timeRemaining || 0)
        setParticipantCount(sessionData.session.participants?.length || 0)
        
        if (userParticipant?.chosenNumber) {
          setGamePhase('waiting')
        } else {
          setGamePhase('choosing')
        }
        
        // Check if session is completed
        if (!sessionData.session.isActive && sessionData.session.isCompleted) {
          // Session is completed, prepare for results
          setGamePhase('result')
          // We'll get the full results via socket
        }
        
        // Force socket to request current status to sync with live data
        if (socket) {
          socket.emit('requestSessionStatus')
        }
      } else {
        // No active session for this user
        console.log('No active session for user, checking if any sessions exist to join')
        
        try {
          const statusResponse = await axios.get(`${API_BASE_URL}/game/status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (statusResponse.data.hasActiveSession) {
            // There's an active session, but user isn't in it
            console.log('Active session exists but user not participating')
            // Stay on game page, user can manually join
          } else {
            // No active sessions at all, redirect to home
            console.log('No active sessions found, redirecting to home')
            router.push('/home')
          }
        } catch (statusErr) {
          console.log('Error checking session status, redirecting to home')
          router.push('/home')
        }
      }
    } catch (err) {
      console.log('Error fetching user session:', err)
      // Try to check if there are any active sessions to join
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const token = localStorage.getItem('token')
        
        const statusResponse = await axios.get(`${API_BASE_URL}/game/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (statusResponse.data.hasActiveSession) {
          console.log('Active session exists but user not participating')
          // Stay on game page for manual join
        } else {
          console.log('No active sessions found, redirecting to home')
          router.push('/home')
        }
      } catch (statusErr) {
        console.log('Error checking session status, redirecting to home')
        router.push('/home')
      }
    }
  }

  // Use refs to get current state values in callbacks
  const waitingForResultsRef = useRef(false)
  const isShowingResultsRef = useRef(false)
  const gamePhaseRef = useRef(gamePhase)
  
  // Update refs when state changes
  useEffect(() => {
    waitingForResultsRef.current = waitingForResults
  }, [waitingForResults])
  
  useEffect(() => {
    isShowingResultsRef.current = isShowingResults
  }, [isShowingResults])
  
  useEffect(() => {
    gamePhaseRef.current = gamePhase
  }, [gamePhase])

  useEffect(() => {
    if (socket) {
      const handleSessionStatus = (status: any) => {
        console.log('FRONTEND: Received session status:', JSON.stringify(status))
        console.log('FRONTEND: Status data:', {
          timeLeft: status.timeLeft,
          participantCount: status.participantCount,
          hasActiveSession: status.hasActiveSession,
          currentGamePhase: gamePhaseRef.current,
          isShowingResults: isShowingResultsRef.current,
          waitingForResults: waitingForResultsRef.current
        })
        
        if (status && typeof status === 'object') {
          const newTimeLeft = status.timeLeft || 0
          const prevTimeLeft = timeLeft
          
          // CRITICAL: Check if timer just hit 0 and we should wait for results FIRST
          if (prevTimeLeft > 0 && newTimeLeft <= 0 && gamePhaseRef.current === 'waiting') {
            console.log('FRONTEND: Timer hit 0, entering waiting for results state...')
            setWaitingForResults(true)
            setTimeLeft(newTimeLeft)
            setParticipantCount(status.participantCount || 0)
            
            // Set a timeout to fetch results via API if WebSocket event is missed
            setTimeout(async () => {
              console.log('FRONTEND: Timeout waiting for results, checking current state...')
              console.log('FRONTEND: Current refs - waitingForResults:', waitingForResultsRef.current, 'isShowingResults:', isShowingResultsRef.current)
              
              if (waitingForResultsRef.current && !isShowingResultsRef.current) {
                console.log('FRONTEND: WebSocket event missed, attempting to fetch results via API...')
                
                try {
                  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                  const token = localStorage.getItem('token')
                  
                  // Try to fetch the latest completed session results
                  const response = await fetch(`${API_BASE_URL}/game/latest-result`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  })
                  
                  if (response.ok) {
                    const result = await response.json()
                    console.log('FRONTEND: Fetched results via API fallback:', result)
                    
                    if (result && result.winningNumber !== null) {
                      // Transform API response to match gameResult format
                      const gameResult = {
                        winningNumber: result.winningNumber,
                        participants: result.participants || [],
                        winners: result.winners || [],
                        totalPlayers: result.totalPlayers || 0,
                        totalWinners: result.totalWinners || 0
                      }
                      
                      setGameResult(gameResult)
                      setGamePhase('result')
                      setIsShowingResults(true)
                      setWaitingForResults(false)
                      
                      // Auto-redirect after 15 seconds
                      setTimeout(() => {
                        console.log('FRONTEND: Auto-redirecting to home after API results')
                        setIsShowingResults(false)
                        router.push('/home')
                      }, 15000)
                      
                      return
                    }
                  }
                } catch (error) {
                  console.error('FRONTEND: Failed to fetch results via API:', error)
                }
                
                console.log('FRONTEND: No results available, redirecting to home')
                setWaitingForResults(false)
                router.push('/home')
              }
            }, 5000)
            
            // Early return to prevent redirect logic from running
            return
          }
          
          // Update state normally
          setTimeLeft(newTimeLeft)
          setParticipantCount(status.participantCount || 0)
          
          // Don't redirect if we're showing results, waiting for results, or in result phase
          const currentlyWaiting = waitingForResultsRef.current
          const currentlyShowing = isShowingResultsRef.current
          const currentPhase = gamePhaseRef.current
          
          if (!status.hasActiveSession && currentPhase !== 'result' && !currentlyShowing && !currentlyWaiting) {
            console.log('FRONTEND: No active session and not waiting for results, redirecting to home...')
            router.push('/home')
            return
          }
          
          // If time is 0 and we have an active session, switch to waiting
          if (newTimeLeft <= 0 && status.hasActiveSession && gamePhaseRef.current === 'choosing') {
            console.log('FRONTEND: Time up, switching to waiting phase...')
            setGamePhase('waiting')
          }
        } else {
          console.warn('FRONTEND: Invalid session status data:', status)
        }
      }

      const handleGameResult = (result: GameResult) => {
        console.log('FRONTEND: Received game result:', JSON.stringify(result))
        setGameResult(result)
        setGamePhase('result')
        setIsShowingResults(true)
        setWaitingForResults(false) // Stop waiting, we got the results
        
        // Auto-redirect to home after 15 seconds to allow users to see results
        setTimeout(() => {
          console.log('FRONTEND: Auto-redirecting to home after showing results')
          setIsShowingResults(false)
          router.push('/home')
        }, 15000)
      }

      socket.on('sessionStatus', handleSessionStatus)
      socket.on('gameResult', handleGameResult)

      // Request current status when socket connects
      socket.emit('requestSessionStatus')

      return () => {
        socket.off('sessionStatus', handleSessionStatus)
        socket.off('gameResult', handleGameResult)
      }
    }
  }, [socket, gamePhase, router])

  const handleNumberChoice = async (number: number) => {
    // Prevent double-clicking and ensure button responsiveness
    if (loading || chosenNumber !== null) {
      console.log('Frontend: Number choice blocked - loading:', loading, 'chosenNumber:', chosenNumber)
      return
    }

    setLoading(true)
    setError('')

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const token = localStorage.getItem('token')
      console.log('Frontend: Choosing number', number, 'for user', user?.username)
      
      const response = await axios.post(`${API_BASE_URL}/game/choose-number`,
        { number },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      console.log('Frontend: Number choice response:', response.data)
      setChosenNumber(number)
      setGamePhase('waiting')
    } catch (err: any) {
      console.error('Frontend: Number choice error:', err)
      setError(err.response?.data?.message || 'Failed to choose number')
      // Reset loading state on error so user can try again
      setLoading(false)
    } finally {
      // Only reset loading if successful (error case handles it separately)
      if (!error) {
        setLoading(false)
      }
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
    const currentUserParticipant = gameResult.participants?.find(p => p.username === user?.username)
    const currentUserChoice = currentUserParticipant?.chosenNumber
    
    // Use the chosen number from component state if participant data is missing
    const displayChosenNumber = currentUserChoice !== null && currentUserChoice !== undefined
      ? currentUserChoice
      : chosenNumber

    console.log('Frontend renderGameResult - gameResult:', gameResult)
    console.log('Frontend renderGameResult - currentUserParticipant:', currentUserParticipant)
    console.log('Frontend renderGameResult - currentUserChoice:', currentUserChoice)
    console.log('Frontend renderGameResult - chosenNumber from state:', chosenNumber)
    console.log('Frontend renderGameResult - displayChosenNumber:', displayChosenNumber)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div>
            <h2 className="text-2xl font-bold mb-2 font-heading text-gray-700">You chose</h2>
            <div className="text-6xl font-bold text-primary-600 mb-6">
              {displayChosenNumber !== null && displayChosenNumber !== undefined ? displayChosenNumber : '?'}
            </div>
          </div>
          <h2 className={`text-2xl font-bold mb-2 font-heading ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
            {isWinner ? 'Congratulations! You Won!' : 'Better luck next time!'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2 font-heading">Active Users in Session</h3>
            <div className="space-y-1">
              {gameResult.participants && gameResult.participants.length > 0 ? (
                gameResult.participants.map((participant, index) => (
                  <div key={index} className="text-sm flex items-center justify-between">
                    <span className="text-gray-900 font-medium">
                      {participant.username}
                      {participant.username === user?.username && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {participant.chosenNumber !== null ? `Picked ${participant.chosenNumber}` : 'No choice'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-600">
                  No participants found
                </div>
              )}
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
              {gameResult.winners.length > 0 ? (
                gameResult.winners.map((winner, index) => (
                  <div key={index} className="text-sm text-green-600">
                    {winner.username}
                    {winner.username === user?.username && (
                      <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded">You</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No winners this round</div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              setIsShowingResults(false)
              setWaitingForResults(false)
              router.push('/home')
            }}
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
              <span className="font-medium text-gray-900">
                {gamePhase === 'result' && gameResult ?
                  `${gameResult.totalPlayers} users joined` :
                  `${participantCount} users joined`
                }
              </span>
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
                  {waitingForResults ? 'Getting results...' :
                   chosenNumber ? `You chose ${chosenNumber}` : 'Waiting for game to end...'}
                </h1>
                <p className="text-gray-600 mb-6">
                  {waitingForResults ? 'Please wait for the game results' : `Time left: ${formatTime(timeLeft)}`}
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