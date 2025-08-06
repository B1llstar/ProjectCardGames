class GameManager {
  constructor() {
    this.lobbies = new Map();
    this.games = new Map();
  }

  createLobby(lobbyData) {
    this.lobbies.set(lobbyData.id, lobbyData);
    return lobbyData;
  }

  getLobby(lobbyId) {
    return this.lobbies.get(lobbyId);
  }
  joinLobby(lobbyId, user) {
    const lobby = this.lobbies.get(lobbyId);
    
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }
    
    if (lobby.players.length >= lobby.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }
    
    if (lobby.isGameStarted) {
      return { success: false, error: 'Game already in progress' };
    }
    
    // Check if user already in lobby
    if (lobby.players.find(p => p.id === user.id)) {
      return { success: false, error: 'Already in lobby' };
    }
    
    lobby.players.push({
      ...user,
      isReady: false,
      peligold: 1000 // Starting amount
    });

    return { success: true, lobby };
  }

  leaveLobby(lobbyId, userId) {
    const lobby = this.lobbies.get(lobbyId);
    
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    lobby.players = lobby.players.filter(p => p.id !== userId);

    // If host left, assign new host or close lobby
    if (lobby.hostId === userId) {
      if (lobby.players.length > 0) {
        lobby.hostId = lobby.players[0].id;
      } else {
        this.lobbies.delete(lobbyId);
        return { success: true, lobby: null };
      }
    }

    return { success: true, lobby };
  }
  startGame(lobbyId, requestingPlayerId = null) {
    const lobby = this.lobbies.get(lobbyId);
    
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    lobby.isGameStarted = true;

    // Create game instance based on game type
    if (lobby.game === 'poker') {
      const PokerGame = require('./PokerGame');
      const game = new PokerGame(lobby.players, lobby.settings);
      this.games.set(lobbyId, game);
      
      return { 
        success: true, 
        gameState: game.getGameState(requestingPlayerId) 
      };
    }

    return { success: false, error: 'Unsupported game type' };
  }

  handlePokerAction(lobbyId, playerId, action, amount) {
    const game = this.games.get(lobbyId);
    
    if (!game || game.gameType !== 'poker') {
      return { success: false, error: 'Game not found' };
    }

    return game.handlePlayerAction(playerId, action, amount);
  }

  getGameState(lobbyId, requestingPlayerId) {
    const game = this.games.get(lobbyId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    return {
      success: true,
      gameState: game.getGameState(requestingPlayerId)
    };
  }

  getPublicLobbies() {
    return Array.from(this.lobbies.values())
      .filter(lobby => !lobby.isGameStarted)
      .map(lobby => ({
        id: lobby.id,
        name: lobby.name,
        game: lobby.game,
        playerCount: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        hostName: lobby.players.find(p => p.id === lobby.hostId)?.name || 'Unknown'
      }));
  }

  handleUserDisconnect(userId) {
    // Remove user from all lobbies
    for (const [lobbyId, lobby] of this.lobbies) {
      const playerIndex = lobby.players.findIndex(p => p.id === userId);
      if (playerIndex !== -1) {
        this.leaveLobby(lobbyId, userId);
      }
    }
  }
}

module.exports = GameManager;
