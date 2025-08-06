<template>
  <div class="min-h-screen p-4 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
    <div class="max-w-7xl mx-auto">
      <!-- Game Header -->      <div class="flex items-center justify-between mb-4">
        <div class="text-white">
          <h1 class="text-xl font-bold">{{ currentLobby?.name }}</h1>
          <p class="text-green-200 text-sm">Round: {{ gameState?.round || 'Pre-game' }}</p>
        </div>
        <div class="flex items-center space-x-3">
          <div class="text-white text-right text-sm">
            <div class="text-xs text-green-200">Your Peligold</div>
            <div class="text-lg font-bold">💰 {{ currentPlayer?.chips || currentPlayer?.peligold || 0 }}</div>
          </div>
          <button 
            v-if="isHost && gameState?.gameState === 'betting'"
            @click="forceNextTurn" 
            class="btn btn-warning text-xs"
            title="Force the current player to fold and move to next turn"
          >
            Force Next Turn
          </button>
          <button @click="leaveLobby" class="btn btn-secondary text-sm">
            Leave Game
          </button>
        </div>
      </div>      <!-- Poker Table -->
      <div class="relative mb-6">
        <PokerTable
          :game-state="gameState"
          :current-player="currentPlayer"
          :is-current-turn="isCurrentPlayerTurn"
          @make-action="handlePokerAction"
          @card-interaction="handleCardInteraction"
        />
      </div>

      <!-- Community Cards and Round Info -->
      <div v-if="gameState?.communityCards?.length > 0" class="card p-4 mb-4">
        <div class="text-center">
          <h3 class="text-lg font-bold text-white mb-2">{{ getRoundName() }}</h3>
          <div class="flex justify-center space-x-2 mb-3">
            <PlayingCard
              v-for="(card, index) in gameState.communityCards"
              :key="`community-${index}`"
              :card="card"
              class="w-12 h-18"
            />
          </div>
          <div class="text-sm text-gray-300">
            {{ getHandExplanation() }}
          </div>
        </div>
      </div>

      <!-- Action Panel -->
      <div v-if="isCurrentPlayerTurn" class="card p-4 mb-4">        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-white">Your Turn</h3>
          <div class="text-sm text-gray-300">
            Current bet: {{ gameState?.currentBet || 0 }} Peligold
          </div>
        </div>

        <ActionPanel
          :current-player="currentPlayer"
          :game-state="gameState"
          @make-action="handlePokerAction"
        />
      </div>      <!-- Suggestions Panel -->
      <div v-if="currentPlayer?.suggestions?.length" class="card p-4 mb-4">
        <h3 class="text-lg font-bold text-white mb-3">💡 Suggested Actions</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="suggestion in currentPlayer.suggestions"
            :key="suggestion.action"
            :class="[
              'p-4 rounded-lg border cursor-pointer transition-all',
              suggestion.confidence === 'high' ? 'border-green-400 bg-green-900 hover:bg-green-800' :
              suggestion.confidence === 'medium' ? 'border-yellow-400 bg-yellow-900 hover:bg-yellow-800' :
              'border-gray-400 bg-gray-800 hover:bg-gray-700'
            ]"
            @click="handleSuggestionClick(suggestion)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium capitalize text-white">{{ suggestion.action }}</span>
              <span :class="[
                'text-xs px-2 py-1 rounded',
                suggestion.confidence === 'high' ? 'bg-green-700 text-green-200' :
                suggestion.confidence === 'medium' ? 'bg-yellow-700 text-yellow-200' :
                'bg-gray-700 text-gray-200'
              ]">
                {{ suggestion.confidence }}
              </span>
            </div>
            <p class="text-sm text-gray-300">{{ suggestion.explanation }}</p>
            <div v-if="suggestion.amount" class="text-xs text-gray-400 mt-1">
              Amount: {{ suggestion.amount }} Peligold
            </div>
          </div>
        </div>
      </div><!-- Game Info Panel -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <!-- Pot Info -->
        <div class="card p-4">
          <h4 class="font-bold text-white mb-2">💰 Pot</h4>
          <div class="text-2xl font-bold text-green-400">
            {{ gameState?.pot || 0 }} Peligold
          </div>
        </div>

        <!-- Game State -->
        <div class="card p-4">
          <h4 class="font-bold text-white mb-2">🎮 Game State</h4>
          <div class="space-y-1 text-sm text-gray-300">
            <div>Round: <span class="font-medium text-white">{{ gameState?.round }}</span></div>
            <div>Active Players: <span class="font-medium text-white">{{ activePlayers.length }}</span></div>
          </div>
        </div>

        <!-- Last Action -->
        <div class="card p-4">
          <h4 class="font-bold text-white mb-2">📝 Last Action</h4>
          <div v-if="gameState?.lastAction" class="text-sm">
            <div class="font-medium text-white">{{ getPlayerName(gameState.lastAction.playerId) }}</div>
            <div class="text-gray-300">{{ formatAction(gameState.lastAction) }}</div>
          </div>
          <div v-else class="text-gray-400 text-sm">No actions yet</div>
        </div>
      </div>

      <!-- Poker Hand Rankings -->
      <div class="card p-4 mb-6">
        <div class="flex items-center justify-between mb-3 cursor-pointer" @click="showHandRankings = !showHandRankings">
          <h3 class="text-lg font-bold text-white">🃏 Poker Hand Rankings</h3>
          <span class="text-gray-300">{{ showHandRankings ? '▼' : '▶' }}</span>
        </div>
        
        <div v-if="showHandRankings" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div v-for="hand in pokerHands" :key="hand.name" class="p-3 bg-gray-800 rounded-lg border border-gray-600">
            <div class="font-bold text-white mb-1">{{ hand.rank }}. {{ hand.name }}</div>
            <div class="text-gray-300 text-xs mb-2">{{ hand.description }}</div>
            <div class="text-green-400 text-xs">{{ hand.example }}</div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        {{ error }}
        <button @click="clearError" class="ml-2 text-red-800 hover:text-red-900">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PokerTable from '@/components/PokerTable.vue'
import ActionPanel from '@/components/ActionPanel.vue'
import PlayingCard from '@/components/PlayingCard.vue'

const props = defineProps(['id'])

const gameStore = useGameStore()
const router = useRouter()
const { user, currentLobby, gameState, currentPlayer, isCurrentPlayerTurn, error } = storeToRefs(gameStore)

// Reactive data
const showHandRankings = ref(false)

// Poker hand rankings data
const pokerHands = ref([
  {
    rank: 1,
    name: 'Royal Flush',
    description: 'A, K, Q, J, 10, all the same suit',
    example: 'A♠ K♠ Q♠ J♠ 10♠'
  },
  {
    rank: 2,
    name: 'Straight Flush',
    description: 'Five cards in sequence, all the same suit',
    example: '9♥ 8♥ 7♥ 6♥ 5♥'
  },
  {
    rank: 3,
    name: 'Four of a Kind',
    description: 'Four cards of the same rank',
    example: 'K♠ K♥ K♦ K♣ 3♠'
  },
  {
    rank: 4,
    name: 'Full House',
    description: 'Three of a kind plus a pair',
    example: 'Q♠ Q♥ Q♦ 7♣ 7♠'
  },
  {
    rank: 5,
    name: 'Flush',
    description: 'Five cards of the same suit',
    example: 'A♦ J♦ 9♦ 5♦ 3♦'
  },
  {
    rank: 6,
    name: 'Straight',
    description: 'Five cards in sequence',
    example: '10♠ 9♥ 8♦ 7♣ 6♠'
  },
  {
    rank: 7,
    name: 'Three of a Kind',
    description: 'Three cards of the same rank',
    example: '8♠ 8♥ 8♦ K♣ 4♠'
  },
  {
    rank: 8,
    name: 'Two Pair',
    description: 'Two different pairs',
    example: 'A♠ A♥ 6♦ 6♣ K♠'
  },
  {
    rank: 9,
    name: 'One Pair',
    description: 'Two cards of the same rank',
    example: '10♠ 10♥ K♦ 5♣ 3♠'
  },
  {
    rank: 10,
    name: 'High Card',
    description: 'When no other hand is achieved',
    example: 'A♠ J♥ 9♦ 7♣ 2♠'
  }
])

const gameStore = useGameStore()
const router = useRouter()
const { user, currentLobby, gameState, currentPlayer, isCurrentPlayerTurn, error } = storeToRefs(gameStore)

const activePlayers = computed(() => {
  return gameState.value?.players?.filter(p => p.isActive && !p.isFolded) || []
})

const isHost = computed(() => {
  return currentLobby.value?.hostId === user.value?.id
})

const forceNextTurn = () => {
  gameStore.forceNextTurn()
}

const getRoundName = () => {
  if (!gameState.value?.communityCards) return ''
  
  const cardCount = gameState.value.communityCards.length
  if (cardCount === 3) return 'The Flop'
  if (cardCount === 4) return 'The Turn'
  if (cardCount === 5) return 'The River'
  return 'Community Cards'
}

const getHandExplanation = () => {
  if (!gameState.value?.communityCards) return ''
  
  const cardCount = gameState.value.communityCards.length
  const explanations = {
    3: 'Three community cards are revealed. You can now start forming your best 5-card hand.',
    4: 'Fourth community card revealed. One more card to come!',
    5: 'All community cards revealed. Make your final betting decisions!'
  }
  
  return explanations[cardCount] || 'Community cards help you form the best possible 5-card poker hand.'
}

const handlePokerAction = (action, amount = 0) => {
  gameStore.makePokerAction(action, amount)
}

const handleCardInteraction = (type, cardId, position = null) => {
  gameStore.sendCardInteraction(type, cardId, position)
}

const handleSuggestionClick = (suggestion) => {
  if (isCurrentPlayerTurn.value) {
    handlePokerAction(suggestion.action, suggestion.amount || 0)
  }
}

const getPlayerName = (playerId) => {
  const player = gameState.value?.players?.find(p => p.id === playerId)
  return player?.name || 'Unknown'
}

const formatAction = (action) => {
  if (action.amount && action.amount > 0) {
    return `${action.action} ${action.amount} Peligold`
  }
  return action.action
}

const leaveLobby = () => {
  gameStore.leaveLobby()
  router.push('/')
}

const clearError = () => {
  gameStore.clearError()
}
</script>
