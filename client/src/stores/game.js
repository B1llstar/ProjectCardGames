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

  // Computed
  const isInLobby = computed(() => currentLobby.value !== null)
  const isInGame = computed(() => gameState.value !== null)
  const currentPlayer = computed(() => {
    if (!gameState.value || !user.value) return null
    return gameState.value.players?.find(p => p.id === user.value.id)
  })
  const isCurrentPlayerTurn = computed(() => {
    if (!gameState.value || !currentPlayer.value) return false
    return gameState.value.players?.[gameState.value.currentPlayerIndex]?.id === user.value.id  })

  // Actions
  const initializeConnection = () => {
    if (socket.value) return
    
    socket.value = io('http://localhost:3002', {
      transports: ['websocket']
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      console.log('Connected to server')
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      console.log('Disconnected from server')
    })

    // User events
    socket.value.on('user-joined', (userData) => {
      user.value = userData
    })

    // Lobby events
    socket.value.on('lobby-created', (lobby) => {
      currentLobby.value = lobby
    })

    socket.value.on('lobby-joined', (lobby) => {
      currentLobby.value = lobby
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

  const joinAsUser = (name, avatar = '🎮') => {
    if (!socket.value) return
    socket.value.emit('join-user', { name, avatar })
  }

  const createLobby = (lobbyData) => {
    if (!socket.value) return
    socket.value.emit('create-lobby', lobbyData)
  }

  const joinLobby = (lobbyId) => {
    if (!socket.value) return
    socket.value.emit('join-lobby', lobbyId)
  }

  const leaveLobby = () => {
    if (!socket.value || !currentLobby.value) return
    socket.value.emit('leave-lobby', currentLobby.value.id)
    currentLobby.value = null
    gameState.value = null
  }

  const startGame = () => {
    if (!socket.value || !currentLobby.value) return
    socket.value.emit('start-game', currentLobby.value.id)
  }

  const makePokerAction = (action, amount = 0) => {
    if (!socket.value || !currentLobby.value) return
    socket.value.emit('poker-action', {
      lobbyId: currentLobby.value.id,
      action,
      amount
    })
  }

  const updateCursorPosition = (x, y) => {
    if (!socket.value || !currentLobby.value) return
    socket.value.emit('cursor-move', {
      lobbyId: currentLobby.value.id,
      x,
      y
    })
  }

  const sendCardInteraction = (type, cardId, position = null) => {
    if (!socket.value || !currentLobby.value) return
    socket.value.emit('card-interaction', {
      lobbyId: currentLobby.value.id,
      type,
      cardId,
      position
    })
  }

  const getLobbies = () => {
    if (!socket.value) return
    socket.value.emit('get-lobbies')
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
    user.value = null
    currentLobby.value = null
    gameState.value = null
    otherPlayersCursors.value = []
  }

  const clearError = () => {
    error.value = null
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
    
    // Computed
    isInLobby,
    isInGame,
    currentPlayer,
    isCurrentPlayerTurn,
    
    // Actions
    initializeConnection,
    joinAsUser,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    makePokerAction,
    updateCursorPosition,
    sendCardInteraction,
    getLobbies,
    disconnect,
    clearError
  }
})
