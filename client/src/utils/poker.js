// Utility functions for poker game logic

export const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const CARD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades']

export const POKER_ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  RAISE: 'raise',
  ALL_IN: 'all-in'
}

export const GAME_ROUNDS = {
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river'
}

export const formatCurrency = (amount) => {
  return `${amount.toLocaleString()} Pelicoins`
}

export const getCardValue = (rank) => {
  const values = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  }
  return values[rank] || 0
}

export const getSuitSymbol = (suit) => {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }
  return symbols[suit] || '?'
}

export const getSuitColor = (suit) => {
  return ['hearts', 'diamonds'].includes(suit) ? 'red' : 'black'
}

export const formatPlayerAction = (action) => {
  if (!action) return ''
  
  if (action.amount && action.amount > 0) {
    return `${action.action} ${formatCurrency(action.amount)}`
  }
  
  return action.action
}

export const calculatePotOdds = (pot, betToCall) => {
  if (betToCall === 0) return 0
  return (betToCall / (pot + betToCall)) * 100
}

export const getPlayerPosition = (playerIndex, totalPlayers) => {
  const positions = {
    2: ['Dealer/SB', 'BB'],
    3: ['Dealer', 'SB', 'BB'],
    4: ['Dealer', 'SB', 'BB', 'UTG'],
    5: ['Dealer', 'SB', 'BB', 'UTG', 'UTG+1'],
    6: ['Dealer', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2'],
    7: ['Dealer', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'CO'],
    8: ['Dealer', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'CO']
  }
  
  return positions[totalPlayers]?.[playerIndex] || 'Unknown'
}
