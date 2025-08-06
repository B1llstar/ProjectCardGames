import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'

export const useGameStore = defineStore('game', () => {
  // State
  const socket = ref(null)
  const isConnected = ref(false)
  const user = ref(null)
  const currentLobby = ref(null)
  const gameState = ref(null)
  const lobbies = ref([])
  const otherPlayersCursors = ref([])
  const error = ref(null)
  const isLoading = ref(false)
  
  // Reconnection state
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = ref(10)
  const reconnectInterval = ref(null)
  const connectionLost = ref(false)
  const lastConnectionTime = ref(null)
  // Computed
  const isInLobby = computed(() => currentLobby.value !== null)
  const isInGame = computed(() => gameState.value !== null)
  const currentPlayer = computed(() => {
    if (!gameState.value || !user.value) return null
    return gameState.value.players?.find(p => p.id === user.value.id)
  })
  const isCurrentPlayerTurn = computed(() => {    if (!gameState.value || !currentPlayer.value) return false
    return gameState.value.players?.[gameState.value.currentPlayerIndex]?.id === user.value.id
  })
  
  const connectionStatus = computed(() => {
    if (isConnected.value) return 'connected'
    if (isReconnecting.value) return 'reconnecting'
    if (connectionLost.value) return 'lost'
    return 'disconnected'
  })
  
  const shouldShowReconnectIndicator = computed(() => {
    return isReconnecting.value || connectionLost.value
  })
  // Actions
  const initializeConnection = () => {
    if (socket.value) return
    
    // Use environment variable or default to same origin for production
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || window.location.origin
    
    socket.value = io(wsUrl, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: maxReconnectAttempts.value
    })

    setupSocketEventHandlers()
  }
  
  const setupSocketEventHandlers = () => {
    if (!socket.value) return

    socket.value.on('connect', () => {
      console.log('Connected to server')
      isConnected.value = true
      isReconnecting.value = false
      connectionLost.value = false
      reconnectAttempts.value = 0
      lastConnectionTime.value = Date.now()
      
      // Clear any reconnection intervals
      if (reconnectInterval.value) {
        clearInterval(reconnectInterval.value)
        reconnectInterval.value = null
      }
      
      // If we had a user session, try to restore it
      if (user.value) {
        console.log('Restoring user session after reconnection')
        rejoinAfterReconnect()
      }
    })

    socket.value.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      isConnected.value = false
      lastConnectionTime.value = Date.now()
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - don't auto-reconnect
        connectionLost.value = true
        error.value = 'Server disconnected the connection'
      } else if (reason === 'io client disconnect') {
        // Client initiated disconnect - don't auto-reconnect
        return
      } else {
        // Network issues or other problems - attempt reconnection
        connectionLost.value = true
        startReconnectionProcess()
      }
    })
    
    socket.value.on('connect_error', (error) => {
      console.error('Connection error:', error)
      if (!isReconnecting.value) {
        connectionLost.value = true
        startReconnectionProcess()
      }
    })
    
    socket.value.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`)
      isReconnecting.value = false
      connectionLost.value = false
      reconnectAttempts.value = 0
    })
    
    socket.value.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`)
      isReconnecting.value = true
      reconnectAttempts.value = attemptNumber
    })
    
    socket.value.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error)
    })
    
    socket.value.on('reconnect_failed', () => {
      console.error('Reconnection failed after maximum attempts')
      isReconnecting.value = false
      connectionLost.value = true
      error.value = 'Failed to reconnect to server. Please refresh the page.'
    })

    // Continue with other socket event handlers
    setupGameEventHandlers()
  }
  
  const setupGameEventHandlers = () => {
    if (!socket.value) return
    
    // User events
    socket.value.on('user-joined', (userData) => {
      user.value = userData
      console.log('User session established:', userData.name)
    })

    // Lobby events
    socket.value.on('lobby-created', (lobby) => {
      currentLobby.value = lobby
      console.log('Lobby created:', lobby.id)
    })

    socket.value.on('lobby-joined', (lobby) => {
      currentLobby.value = lobby
      console.log('Joined lobby:', lobby.id)
    })

    socket.value.on('lobby-updated', (lobby) => {
      currentLobby.value = lobby
    })

    socket.value.on('lobbies-updated', (lobbyList) => {
      lobbies.value = lobbyList
    })

    socket.value.on('player-joined', (player) => {
      console.log(`${player.name} joined the lobby`)
    })

    socket.value.on('player-left', (player) => {
      console.log(`${player.name} left the lobby`)
    })

    // Game events
    socket.value.on('game-started', (newGameState) => {
      gameState.value = newGameState
      console.log('Game started')
    })

    socket.value.on('game-state-updated', (newGameState) => {
      gameState.value = newGameState
    })

    socket.value.on('player-action', (actionData) => {
      console.log(`${actionData.playerName} ${actionData.action.action}`)
    })

    // Real-time interaction events
    socket.value.on('player-cursor-move', (cursorData) => {
      const existingCursor = otherPlayersCursors.value.find(c => c.playerId === cursorData.playerId)
      if (existingCursor) {
        existingCursor.x = cursorData.x
        existingCursor.y = cursorData.y
      } else {
        otherPlayersCursors.value.push(cursorData)
      }
    })

    socket.value.on('player-card-interaction', (interactionData) => {
      console.log(`${interactionData.playerName} ${interactionData.type} card`)
    })

    // Error events
    socket.value.on('join-lobby-error', (errorMsg) => {
      error.value = errorMsg
    })

    socket.value.on('start-game-error', (errorMsg) => {
      error.value = errorMsg
    })

    socket.value.on('poker-action-error', (errorMsg) => {
      error.value = errorMsg
    })
  }
  
  const startReconnectionProcess = () => {
    if (isReconnecting.value || reconnectInterval.value) return
    
    console.log('Starting manual reconnection process')
    isReconnecting.value = true
    reconnectAttempts.value = 0
    
    const attemptReconnect = () => {
      if (reconnectAttempts.value >= maxReconnectAttempts.value) {
        console.error('Max reconnection attempts reached')
        isReconnecting.value = false
        connectionLost.value = true
        error.value = 'Unable to reconnect to server. Please refresh the page.'
        if (reconnectInterval.value) {
          clearInterval(reconnectInterval.value)
          reconnectInterval.value = null
        }
        return
      }
      
      if (isConnected.value) {
        console.log('Connection restored during manual reconnection')
        isReconnecting.value = false
        if (reconnectInterval.value) {
          clearInterval(reconnectInterval.value)
          reconnectInterval.value = null
        }
        return
      }
      
      reconnectAttempts.value++
      console.log(`Manual reconnection attempt ${reconnectAttempts.value}/${maxReconnectAttempts.value}`)
      
      if (socket.value) {
        socket.value.connect()
      } else {
        initializeConnection()
      }
    }
    
    // Try immediate reconnection
    attemptReconnect()
    
    // Set up interval for subsequent attempts
    reconnectInterval.value = setInterval(attemptReconnect, 3000)
  }
  
  const rejoinAfterReconnect = () => {
    if (!user.value) return
    
    console.log('Attempting to restore session for user:', user.value.name)
    
    // Re-join as user
    socket.value.emit('join-user', { 
      name: user.value.name, 
      avatar: user.value.avatar 
    })
    
    // If we were in a lobby, try to rejoin
    if (currentLobby.value) {
      console.log('Attempting to rejoin lobby:', currentLobby.value.id)
      socket.value.emit('join-lobby', currentLobby.value.id)
    }
    
    // Request current lobbies list
    setTimeout(() => {
      getLobbies()
    }, 1000)
  }
  
  const forceReconnect = () => {
    console.log('Force reconnect requested')
    if (socket.value) {
      socket.value.disconnect()
    }
    
    // Reset state
    isConnected.value = false
    isReconnecting.value = false
    connectionLost.value = false
    reconnectAttempts.value = 0
    
    // Clear any existing intervals
    if (reconnectInterval.value) {
      clearInterval(reconnectInterval.value)
      reconnectInterval.value = null
    }
    
    // Reinitialize connection
    setTimeout(() => {
      initializeConnection()
    }, 1000)
  }
  const joinAsUser = (name, avatar = '🎮') => {
    if (!socket.value || !isConnected.value) {
      console.warn('Cannot join as user: not connected to server')
      if (!isConnected.value && !isReconnecting.value) {
        forceReconnect()
      }
      return
    }
    
    // Store user info for reconnection
    user.value = { name, avatar, id: user.value?.id }
    socket.value.emit('join-user', { name, avatar })
  }
  const createLobby = (lobbyData) => {
    if (!socket.value || !isConnected.value) {
      console.warn('Cannot create lobby: not connected to server')
      error.value = 'Not connected to server. Please wait for reconnection.'
      return
    }
    socket.value.emit('create-lobby', lobbyData)
  }

  const joinLobby = (lobbyId) => {
    if (!socket.value || !isConnected.value) {
      console.warn('Cannot join lobby: not connected to server')
      error.value = 'Not connected to server. Please wait for reconnection.'
      return
    }
    socket.value.emit('join-lobby', lobbyId)
  }

  const leaveLobby = () => {
    if (!socket.value || !currentLobby.value) return
    if (isConnected.value) {
      socket.value.emit('leave-lobby', currentLobby.value.id)
    }
    currentLobby.value = null
    gameState.value = null
  }

  const startGame = () => {
    if (!socket.value || !currentLobby.value || !isConnected.value) {
      console.warn('Cannot start game: not connected to server')
      error.value = 'Not connected to server. Please wait for reconnection.'
      return
    }
    socket.value.emit('start-game', currentLobby.value.id)
  }  const makePokerAction = (action, amount = 0) => {
    if (!socket.value || !currentLobby.value || !isConnected.value) {
      console.warn('Cannot make poker action: not connected to server')
      error.value = 'Not connected to server. Action not sent.'
      return
    }
    socket.value.emit('poker-action', {
      lobbyId: currentLobby.value.id,
      action,
      amount
    })
  }

  const forceNextTurn = () => {
    if (!socket.value || !currentLobby.value || !isConnected.value) return
    socket.value.emit('force-next-turn', currentLobby.value.id)
  }

  const updateCursorPosition = (x, y) => {
    if (!socket.value || !currentLobby.value || !isConnected.value) return
    socket.value.emit('cursor-move', {
      lobbyId: currentLobby.value.id,
      x,
      y
    })
  }

  const sendCardInteraction = (type, cardId, position = null) => {
    if (!socket.value || !currentLobby.value || !isConnected.value) return
    socket.value.emit('card-interaction', {
      lobbyId: currentLobby.value.id,
      type,
      cardId,
      position
    })
  }

  const getLobbies = () => {
    if (!socket.value || !isConnected.value) {
      console.warn('Cannot get lobbies: not connected to server')
      return
    }
    socket.value.emit('get-lobbies')
  }  const disconnect = () => {
    // Clear any reconnection intervals
    if (reconnectInterval.value) {
      clearInterval(reconnectInterval.value)
      reconnectInterval.value = null
    }
    
    // Remove network listeners
    removeNetworkListeners()
    
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    
    // Reset all state
    isConnected.value = false
    isReconnecting.value = false
    connectionLost.value = false
    reconnectAttempts.value = 0
    user.value = null
    currentLobby.value = null
    gameState.value = null
    otherPlayersCursors.value = []
  }

  const clearError = () => {
    error.value = null
  }

  // Add browser online/offline detection
  const handleOnline = () => {
    console.log('Browser came online')
    if (!isConnected.value && !isReconnecting.value) {
      forceReconnect()
    }
  }
  
  const handleOffline = () => {
    console.log('Browser went offline')
    connectionLost.value = true
  }
  
  // Set up browser online/offline listeners
  const setupNetworkListeners = () => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }
  
  const removeNetworkListeners = () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
  
  // Enhanced initialization that includes network monitoring
  const initializeWithNetworkMonitoring = () => {
    initializeConnection()
    setupNetworkListeners()
  }

  return {
    // State
    socket,
    isConnected,
    user,
    currentLobby,
    gameState,
    lobbies,
    otherPlayersCursors,
    error,
    isLoading,
    
    // Reconnection state
    isReconnecting,
    connectionLost,
    reconnectAttempts,
    maxReconnectAttempts,
    
    // Computed
    isInLobby,
    isInGame,
    currentPlayer,
    isCurrentPlayerTurn,
    connectionStatus,
    shouldShowReconnectIndicator,
    
    // Actions
    initializeConnection,
    joinAsUser,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    makePokerAction,
    forceNextTurn,
    updateCursorPosition,
    sendCardInteraction,
    getLobbies,
    disconnect,
    clearError,
    
    // Reconnection actions
    forceReconnect,
    startReconnectionProcess,

    // Network actions
    initializeWithNetworkMonitoring
  }
})
