// WebSocket event types for type safety and consistency

export const SERVER_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // User events
  JOIN_USER: 'join-user',
  USER_JOINED: 'user-joined',
  
  // Lobby events
  CREATE_LOBBY: 'create-lobby',
  JOIN_LOBBY: 'join-lobby',
  LEAVE_LOBBY: 'leave-lobby',
  LOBBY_CREATED: 'lobby-created',
  LOBBY_JOINED: 'lobby-joined',
  LOBBY_UPDATED: 'lobby-updated',
  LOBBIES_UPDATED: 'lobbies-updated',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  
  // Game events
  START_GAME: 'start-game',
  GAME_STARTED: 'game-started',
  GAME_STATE_UPDATED: 'game-state-updated',
  POKER_ACTION: 'poker-action',
  PLAYER_ACTION: 'player-action',
  
  // Real-time interaction events
  CURSOR_MOVE: 'cursor-move',
  PLAYER_CURSOR_MOVE: 'player-cursor-move',
  CARD_INTERACTION: 'card-interaction',
  PLAYER_CARD_INTERACTION: 'player-card-interaction',
  
  // Utility events
  GET_LOBBIES: 'get-lobbies',
  GET_LOBBY_DETAILS: 'get-lobby-details',
  LOBBY_DETAILS: 'lobby-details',
  
  // Error events
  JOIN_LOBBY_ERROR: 'join-lobby-error',
  START_GAME_ERROR: 'start-game-error',
  POKER_ACTION_ERROR: 'poker-action-error'
}

export const INTERACTION_TYPES = {
  HOVER: 'hover',
  DRAG: 'drag',
  CLICK: 'click',
  DOUBLE_CLICK: 'double-click'
}
