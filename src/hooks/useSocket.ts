'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    console.log('SOCKET: Connecting to', SOCKET_URL)
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    })

    newSocket.on('connect', () => {
      console.log('SOCKET: Connected successfully')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('SOCKET: Disconnected:', reason)
    })

    newSocket.on('connect_error', (error) => {
      console.error('SOCKET: Connection error:', error)
    })

    setSocket(newSocket)

    return () => {
      console.log('SOCKET: Cleaning up connection')
      newSocket.close()
    }
  }, [])

  return socket
}