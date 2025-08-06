const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const GameManager = require('./game/GameManager');
const PokerGame = require('./game/PokerGame');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

const gameManager = new GameManager();

// Store connected users and their cursor positions
const connectedUsers = new Map();
const userCursors = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join-user', (userData) => {
    const user = {
      id: socket.id,
      name: userData.name,
      avatar: userData.avatar || '🎮'
    };
    connectedUsers.set(socket.id, user);
    socket.emit('user-joined', user);
  });

  // Handle lobby creation
  socket.on('create-lobby', (lobbyData) => {
    const lobby = {
      id: uuidv4(),
      name: lobbyData.name,
      game: lobbyData.game,
      hostId: socket.id,
      players: [],
      maxPlayers: lobbyData.maxPlayers || 8,
      isGameStarted: false,
      settings: lobbyData.settings || {}
    };

    gameManager.createLobby(lobby);
    socket.join(lobby.id);
    socket.emit('lobby-created', lobby);
    
    // Broadcast updated lobby list
    io.emit('lobbies-updated', gameManager.getPublicLobbies());
  });

  // Handle joining lobby
  socket.on('join-lobby', (lobbyId) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const result = gameManager.joinLobby(lobbyId, user);
    if (result.success) {
      socket.join(lobbyId);
      socket.emit('lobby-joined', result.lobby);
      
      // Notify all players in lobby
      socket.to(lobbyId).emit('player-joined', user);
      
      // Send updated lobby to all players
      io.to(lobbyId).emit('lobby-updated', result.lobby);
      
      // Update public lobby list
      io.emit('lobbies-updated', gameManager.getPublicLobbies());
    } else {
      socket.emit('join-lobby-error', result.error);
    }
  });

  // Handle leaving lobby
  socket.on('leave-lobby', (lobbyId) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const result = gameManager.leaveLobby(lobbyId, user.id);
    if (result.success) {
      socket.leave(lobbyId);
      socket.to(lobbyId).emit('player-left', user);
      
      if (result.lobby) {
        io.to(lobbyId).emit('lobby-updated', result.lobby);
      }
      
      io.emit('lobbies-updated', gameManager.getPublicLobbies());
    }
  });
  // Handle starting game
  socket.on('start-game', (lobbyId) => {
    const lobby = gameManager.getLobby(lobbyId);
    if (!lobby || lobby.hostId !== socket.id) return;

    const result = gameManager.startGame(lobbyId, socket.id);
    if (result.success) {
      // Send personalized game state to each player
      lobby.players.forEach(player => {
        const personalizedResult = gameManager.getGameState(lobbyId, player.id);
        if (personalizedResult.success) {
          io.to(player.id).emit('game-started', personalizedResult.gameState);
        }
      });
    } else {
      socket.emit('start-game-error', result.error);
    }
  });
  // Handle poker game actions
  socket.on('poker-action', (data) => {
    const { lobbyId, action, amount } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const result = gameManager.handlePokerAction(lobbyId, user.id, action, amount);
    if (result.success) {
      // Send personalized game state to each player
      const lobby = gameManager.getLobby(lobbyId);
      if (lobby) {
        lobby.players.forEach(player => {
          const personalizedResult = gameManager.getGameState(lobbyId, player.id);
          if (personalizedResult.success) {
            io.to(player.id).emit('game-state-updated', personalizedResult.gameState);
          }
        });
      }
      
      if (result.action) {
        io.to(lobbyId).emit('player-action', {
          playerId: user.id,
          playerName: user.name,
          action: result.action
        });
      }
    } else {
      socket.emit('poker-action-error', result.error);
    }
  });

  // Handle card interactions (dragging, hovering, etc.)
  socket.on('card-interaction', (data) => {
    const { lobbyId, type, cardId, position } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Broadcast card interaction to other players in the lobby
    socket.to(lobbyId).emit('player-card-interaction', {
      playerId: user.id,
      playerName: user.name,
      type,
      cardId,
      position
    });
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    const { lobbyId, x, y } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    userCursors.set(socket.id, { x, y, user });
    
    // Broadcast cursor position to other players in the lobby
    socket.to(lobbyId).emit('player-cursor-move', {
      playerId: user.id,
      playerName: user.name,
      x,
      y
    });
  });

  // Handle getting lobby list
  socket.on('get-lobbies', () => {
    socket.emit('lobbies-updated', gameManager.getPublicLobbies());
  });

  // Handle getting lobby details
  socket.on('get-lobby-details', (lobbyId) => {
    const lobby = gameManager.getLobby(lobbyId);
    if (lobby) {
      socket.emit('lobby-details', lobby);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Remove from all lobbies
      gameManager.handleUserDisconnect(socket.id);
      
      // Clean up
      connectedUsers.delete(socket.id);
      userCursors.delete(socket.id);
      
      // Update lobby lists
      io.emit('lobbies-updated', gameManager.getPublicLobbies());
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🎮 Project Board Games server running on port ${PORT}`);
});
