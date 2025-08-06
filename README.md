# Project: Board Games

A multiplayer board game platform built with Vue.js and WebSocket server, currently featuring Poker.

## Features

- **Multiplayer Lobbies**: Create and join game lobbies
- **Poker Game**: Full Texas Hold'em implementation
- **Peligold Currency**: In-game currency system
- **Real-time Interactions**: See other players' cursor movements and card interactions
- **Smart Suggestions**: Highlighted cards with strategic explanations
- **Flexible Dealing**: Auto-deal or manual dealer mode

## Quick Start

1. Install dependencies:
```bash
npm run install-all
```

2. Start the development server:
```bash
npm run dev
```

This will start both the WebSocket server (port 3001) and Vue client (port 5173).

## Project Structure

```
project-board-games/
├── client/          # Vue.js frontend
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   └── utils/
├── server/          # WebSocket server
│   ├── game/        # Game logic
│   └── handlers/    # WebSocket handlers
└── shared/          # Shared utilities
```

## How to Play

1. Create or join a lobby
2. Wait for other players (2-8 players for Poker)
3. The host starts the game
4. Follow the highlighted card suggestions
5. Use Peligold to bet, call, raise, or fold
6. Try to win with the best poker hand!

## Technology Stack

- **Frontend**: Vue 3, Pinia, Socket.io-client
- **Backend**: Node.js, Socket.io, Express
- **Real-time**: WebSocket connections for all interactions
