class PokerGame {
  constructor(players, settings = {}) {
    this.gameType = 'poker';
      this.players = players.map((player, index) => ({
      ...player,
      position: index,
      cards: [],
      bet: 0,
      totalBet: 0,
      isActive: true,
      isFolded: false,
      isAllIn: false,
      handRank: null,
      peligold: player.peligold || 1000 // Ensure peligold is preserved/initialized
    }));
    
    this.settings = {
      blinds: { small: 10, big: 20 },
      autoDealer: settings.autoDealer || true,
      ...settings
    };

    this.gameState = 'waiting'; // waiting, dealing, betting, showdown, finished
    this.round = 'preflop'; // preflop, flop, turn, river
    this.communityCards = [];
    this.pot = 0;
    this.currentPlayerIndex = 0;
    this.dealerIndex = 0;
    this.smallBlindIndex = 1;
    this.bigBlindIndex = 2;
    this.deck = this.createDeck();
    this.lastRaiseAmount = this.settings.blinds.big;
    this.lastAction = null;

    this.initializeGame();
  }

  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: `${rank}_${suit}`,
          rank,
          suit,
          value: this.getCardValue(rank)
        });
      }
    }

    return this.shuffleDeck(deck);
  }

  getCardValue(rank) {
    const values = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank];
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  initializeGame() {
    if (this.settings.autoDealer) {
      this.dealCards();
    }
    this.postBlinds();
    this.gameState = 'betting';
    this.currentPlayerIndex = (this.bigBlindIndex + 1) % this.players.length;
  }

  dealCards() {
    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        if (player.isActive) {
          player.cards.push(this.deck.pop());
        }
      }
    }
  }
  postBlinds() {
    const smallBlindPlayer = this.players[this.smallBlindIndex];
    const bigBlindPlayer = this.players[this.bigBlindIndex];

    smallBlindPlayer.bet = Math.min(this.settings.blinds.small, smallBlindPlayer.peligold);
    smallBlindPlayer.peligold -= smallBlindPlayer.bet;
    smallBlindPlayer.totalBet += smallBlindPlayer.bet;

    bigBlindPlayer.bet = Math.min(this.settings.blinds.big, bigBlindPlayer.peligold);
    bigBlindPlayer.peligold -= bigBlindPlayer.bet;
    bigBlindPlayer.totalBet += bigBlindPlayer.bet;

    this.pot = smallBlindPlayer.bet + bigBlindPlayer.bet;
  }

  handlePlayerAction(playerId, action, amount = 0) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];

    if (!player || !currentPlayer || player.id !== currentPlayer.id) {
      return { success: false, error: 'Not your turn' };
    }

    if (player.isFolded || !player.isActive) {
      return { success: false, error: 'Player is not active' };
    }

    let actionResult = null;

    switch (action) {
      case 'fold':
        actionResult = this.handleFold(player);
        break;
      case 'call':
        actionResult = this.handleCall(player);
        break;
      case 'raise':
        actionResult = this.handleRaise(player, amount);
        break;
      case 'check':
        actionResult = this.handleCheck(player);
        break;
      case 'all-in':
        actionResult = this.handleAllIn(player);
        break;
      default:
        return { success: false, error: 'Invalid action' };
    }

    if (!actionResult.success) {
      return actionResult;
    }

    this.lastAction = {
      playerId,
      action,
      amount: actionResult.amount || 0
    };

    // Move to next player
    this.moveToNextPlayer();

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.nextRound();
    }

    return {
      success: true,
      gameState: this.getGameState(),
      action: actionResult
    };
  }

  handleFold(player) {
    player.isFolded = true;
    return { 
      success: true, 
      action: 'fold',
      message: `${player.name} folded`
    };
  }
  handleCall(player) {
    const currentBet = this.getCurrentBet();
    const callAmount = Math.min(currentBet - player.bet, player.peligold);
    
    player.peligold -= callAmount;
    player.bet += callAmount;
    player.totalBet += callAmount;
    this.pot += callAmount;

    const action = callAmount === 0 ? 'check' : 'call';
    return { 
      success: true, 
      action,
      amount: callAmount,
      message: `${player.name} ${action === 'check' ? 'checked' : `called ${callAmount} Peligold`}`
    };
  }
  handleRaise(player, raiseAmount) {
    const currentBet = this.getCurrentBet();
    const totalAmount = currentBet - player.bet + raiseAmount;
    
    if (totalAmount > player.peligold) {
      return { success: false, error: 'Insufficient Peligold' };
    }

    if (raiseAmount < this.lastRaiseAmount && player.peligold > totalAmount) {
      return { success: false, error: `Minimum raise is ${this.lastRaiseAmount} Peligold` };
    }

    player.peligold -= totalAmount;
    player.bet += totalAmount;
    player.totalBet += totalAmount;
    this.pot += totalAmount;
    this.lastRaiseAmount = raiseAmount;

    return { 
      success: true, 
      action: 'raise',
      amount: raiseAmount,
      message: `${player.name} raised by ${raiseAmount} Peligold`
    };
  }

  handleCheck(player) {
    const currentBet = this.getCurrentBet();
    if (player.bet < currentBet) {
      return { success: false, error: 'Cannot check, must call or fold' };
    }

    return { 
      success: true, 
      action: 'check',
      message: `${player.name} checked`
    };
  }
  handleAllIn(player) {
    const allInAmount = player.peligold;
    player.bet += allInAmount;
    player.totalBet += allInAmount;
    player.peligold = 0;
    player.isAllIn = true;
    this.pot += allInAmount;

    return { 
      success: true, 
      action: 'all-in',
      amount: allInAmount,
      message: `${player.name} went all-in with ${allInAmount} Peligold`
    };
  }

  getCurrentBet() {
    return Math.max(...this.players.map(p => p.bet));
  }

  moveToNextPlayer() {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (
      this.players[this.currentPlayerIndex].isFolded || 
      !this.players[this.currentPlayerIndex].isActive ||
      this.players[this.currentPlayerIndex].isAllIn
    );
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => p.isActive && !p.isFolded);
    if (activePlayers.length <= 1) return true;

    const currentBet = this.getCurrentBet();
    const playersWhoNeedToAct = activePlayers.filter(p => 
      p.bet < currentBet && !p.isAllIn
    );

    return playersWhoNeedToAct.length === 0;
  }

  nextRound() {
    // Reset bets for next round
    this.players.forEach(player => {
      player.bet = 0;
    });

    switch (this.round) {
      case 'preflop':
        this.dealFlop();
        this.round = 'flop';
        break;
      case 'flop':
        this.dealTurn();
        this.round = 'turn';
        break;
      case 'turn':
        this.dealRiver();
        this.round = 'river';
        break;
      case 'river':
        this.showdown();
        return;
    }

    // Start new betting round with player after dealer
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
    while (
      this.players[this.currentPlayerIndex].isFolded || 
      !this.players[this.currentPlayerIndex].isActive
    ) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }
  }

  dealFlop() {
    // Burn one card, deal 3 community cards
    this.deck.pop(); // burn card
    for (let i = 0; i < 3; i++) {
      this.communityCards.push(this.deck.pop());
    }
  }

  dealTurn() {
    // Burn one card, deal 1 community card
    this.deck.pop(); // burn card
    this.communityCards.push(this.deck.pop());
  }

  dealRiver() {
    // Burn one card, deal 1 community card
    this.deck.pop(); // burn card
    this.communityCards.push(this.deck.pop());
  }
  showdown() {
    const activePlayers = this.players.filter(p => !p.isFolded && p.isActive);
    
    // Evaluate hands for all active players
    activePlayers.forEach(player => {
      player.handRank = this.evaluateHand(player.cards, this.communityCards);
    });

    // Determine winner(s)
    const winner = this.determineWinner(activePlayers);
    winner.peligold += this.pot;

    this.gameState = 'finished';
  }

  evaluateHand(playerCards, communityCards) {
    const allCards = [...playerCards, ...communityCards];
    // Simplified hand evaluation - in a real implementation, this would be much more complex
    // For now, just return the highest card value
    const highCard = Math.max(...allCards.map(card => card.value));
    return {
      rank: 'high-card',
      value: highCard,
      description: `High card: ${allCards.find(c => c.value === highCard).rank}`
    };
  }

  determineWinner(players) {
    // Simplified winner determination
    return players.reduce((winner, player) => 
      player.handRank.value > winner.handRank.value ? player : winner
    );
  }
  getPlayerSuggestions(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.id !== this.players[this.currentPlayerIndex].id) {
      return [];
    }

    const suggestions = [];
    const currentBet = this.getCurrentBet();
    const callAmount = currentBet - player.bet;
    const potOdds = this.pot > 0 ? callAmount / (this.pot + callAmount) : 0;

    // Analyze hand strength (enhanced)
    const handStrength = this.analyzeHandStrength(player.cards, this.communityCards);
    const position = this.getPlayerPosition(player);
    const activePlayers = this.players.filter(p => !p.isFolded && p.isActive).length;

    // Enhanced suggestions with detailed explanations
    if (handStrength.strength >= 0.8) {
      const raiseAmount = Math.min(this.pot / 2, player.peligold);
      suggestions.push({
        action: 'raise',
        amount: raiseAmount,
        explanation: `${handStrength.description} hand! Raise to build the pot and extract value from weaker hands.`,
        reasoning: `With ${handStrength.handType}, you're likely ahead. Betting builds the pot when you have the best hand.`,
        confidence: 'high',
        highlight: true
      });
      
      if (player.peligold > this.pot) {
        suggestions.push({
          action: 'all-in',
          amount: player.peligold,
          explanation: 'Premium hand - consider going all-in for maximum value!',
          reasoning: 'With such a strong hand, you want to get maximum value before opponents realize their weakness.',
          confidence: 'medium'
        });
      }
    } else if (handStrength.strength >= 0.6) {
      const raiseAmount = Math.min(this.pot / 3, player.peligold);
      suggestions.push({
        action: 'raise',
        amount: raiseAmount,
        explanation: `Good hand in ${position} position. A moderate raise shows strength.`,
        reasoning: 'Your hand is strong enough to bet for value, but not so strong that you want to price out all opponents.',
        confidence: 'medium',
        highlight: true
      });
      
      if (callAmount <= player.peligold * 0.1) {
        suggestions.push({
          action: 'call',
          explanation: 'Solid hand with good pot odds - calling keeps weaker hands in the pot.',
          reasoning: `Pot odds of ${(potOdds * 100).toFixed(1)}% make this a profitable call with your hand strength.`,
          confidence: 'high'
        });
      }
    } else if (handStrength.strength >= 0.4) {
      if (callAmount === 0) {
        suggestions.push({
          action: 'check',
          explanation: 'Marginal hand - check to see the next card for free.',
          reasoning: 'No need to invest more with a medium-strength hand when you can see more cards cheaply.',
          confidence: 'high',
          highlight: true
        });
      } else if (potOdds < 0.25 && callAmount <= player.peligold * 0.15) {
        suggestions.push({
          action: 'call',
          explanation: 'Decent drawing hand with reasonable pot odds.',
          reasoning: `Your hand has potential to improve, and the ${(potOdds * 100).toFixed(1)}% pot odds justify a call.`,
          confidence: 'medium'
        });
      } else {
        suggestions.push({
          action: 'fold',
          explanation: 'Marginal hand with poor pot odds - folding saves Peligold.',
          reasoning: `The ${callAmount} Peligold call doesn't justify the risk with this hand strength.`,
          confidence: 'medium',
          highlight: true
        });
      }
    } else {
      if (callAmount === 0) {
        suggestions.push({
          action: 'check',
          explanation: 'Weak hand but free to see next card - always check when free.',
          reasoning: 'Never fold when you can check for free, even with weak hands.',
          confidence: 'high',
          highlight: true
        });
      } else {
        suggestions.push({
          action: 'fold',
          explanation: 'Weak hand and expensive to continue - fold to preserve Peligold.',
          reasoning: `With ${handStrength.description} and ${callAmount} Peligold to call, folding is the mathematically correct play.`,
          confidence: 'high',
          highlight: true
        });
      }
    }

    // Add bluffing suggestions in certain situations
    if (handStrength.strength < 0.3 && activePlayers <= 3 && position === 'late' && this.round !== 'preflop') {
      suggestions.push({
        action: 'raise',
        amount: Math.min(this.pot * 0.6, player.peligold),
        explanation: 'Bluff opportunity! Few opponents and good position for a steal.',
        reasoning: 'With few opponents remaining and late position, a well-timed bluff can win the pot.',
        confidence: 'low',
        isBluff: true
      });
    }

    return suggestions;
  }

  getPlayerPosition(player) {
    const totalPlayers = this.players.filter(p => p.isActive).length;
    const playerIndex = player.position;
    const dealerIndex = this.dealerIndex;
    
    // Calculate position relative to dealer
    let relativePosition = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;
    
    if (totalPlayers <= 3) {
      return relativePosition === 0 ? 'dealer' : relativePosition === 1 ? 'early' : 'late';
    } else if (totalPlayers <= 6) {
      if (relativePosition <= 1) return 'early';
      if (relativePosition <= 3) return 'middle';
      return 'late';
    } else {
      if (relativePosition <= 2) return 'early';
      if (relativePosition <= 4) return 'middle';
      return 'late';
    }
  }

  analyzeHandStrength(playerCards, communityCards) {
    const allCards = [...playerCards, ...communityCards];
    let strength = 0;
    let handType = 'high card';
    let description = 'Weak';

    // Get card values and suits
    const values = playerCards.map(c => c.value);
    const suits = playerCards.map(c => c.suit);
    
    // Check for pairs in hole cards
    if (values[0] === values[1]) {
      const pairValue = values[0];
      if (pairValue >= 10) {
        strength = 0.8;
        handType = 'premium pair';
        description = 'Premium';
      } else if (pairValue >= 7) {
        strength = 0.6;
        handType = 'medium pair';
        description = 'Strong';
      } else {
        strength = 0.4;
        handType = 'low pair';
        description = 'Medium';
      }
    }
    // Check for high cards
    else {
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      
      // Ace-King, Ace-Queen suited, etc.
      if (maxValue === 14) { // Ace
        if (minValue >= 10) {
          strength = suits[0] === suits[1] ? 0.7 : 0.5;
          handType = suits[0] === suits[1] ? 'suited ace-high' : 'ace-high';
          description = 'Strong';
        } else if (minValue >= 7) {
          strength = suits[0] === suits[1] ? 0.4 : 0.3;
          handType = 'ace with kicker';
          description = 'Medium';
        } else {
          strength = 0.2;
          handType = 'weak ace';
          description = 'Weak';
        }
      }
      // King-Queen, etc.
      else if (maxValue >= 11 && minValue >= 10) {
        strength = suits[0] === suits[1] ? 0.5 : 0.3;
        handType = suits[0] === suits[1] ? 'suited broadways' : 'broadway cards';
        description = 'Medium';
      }
      // Suited connectors
      else if (suits[0] === suits[1] && Math.abs(values[0] - values[1]) <= 1) {
        strength = 0.4;
        handType = 'suited connector';
        description = 'Medium';
      }
      // Connectors
      else if (Math.abs(values[0] - values[1]) <= 1 && minValue >= 7) {
        strength = 0.3;
        handType = 'connector';
        description = 'Medium';
      }
      else {
        strength = Math.max(...values) / 20; // Very weak
        handType = 'high card';
        description = 'Weak';
      }
    }

    // Adjust for community cards if available
    if (communityCards.length >= 3) {
      // Check for potential draws, made hands, etc.
      const communityValues = communityCards.map(c => c.value);
      const communitySuits = communityCards.map(c => c.suit);
      
      // Boost for flush draws
      if (suits[0] === suits[1]) {
        const flushCount = communitySuits.filter(s => s === suits[0]).length;
        if (flushCount >= 2) {
          strength += 0.1;
          description = 'Drawing';
        }
      }
      
      // Boost for straight draws
      const allValues = [...values, ...communityValues].sort((a, b) => a - b);
      // Simplified straight draw detection
      strength += 0.05; // Small boost for potential
    }

    return {
      strength: Math.min(strength, 1),
      description,
      handType
    };
  }

  getGameState() {
    return {
      gameType: this.gameType,
      gameState: this.gameState,
      round: this.round,
      players: this.players.map(player => ({
        ...player,
        cards: player.cards, // In real game, only show to the player themselves
        suggestions: this.getPlayerSuggestions(player.id)
      })),
      communityCards: this.communityCards,
      pot: this.pot,
      currentPlayerIndex: this.currentPlayerIndex,
      currentBet: this.getCurrentBet(),
      lastAction: this.lastAction,
      dealerIndex: this.dealerIndex,
      settings: this.settings
    };
  }
}

module.exports = PokerGame;
