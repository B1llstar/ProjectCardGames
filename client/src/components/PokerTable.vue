<template>
  <div class="poker-table">
    <!-- Community Cards -->
    <div class="community-cards">
      <PlayingCard
        v-for="(card, index) in gameState?.communityCards || []"
        :key="`community-${index}`"
        :card="card"
        :class="'animate-card-deal'"
        :style="{ animationDelay: `${index * 0.2}s` }"
      />
      <!-- Placeholder cards for future community cards -->
      <div
        v-for="i in (5 - (gameState?.communityCards?.length || 0))"
        :key="`placeholder-${i}`"
        class="w-16 h-24 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800"
      ></div>
    </div>

    <!-- Pot Display -->
    <div class="pot-display">
      💰 {{ gameState?.pot || 0 }} Peligold
    </div>

    <!-- Player Seats -->
    <div
      v-for="(player, index) in gameState?.players || []"
      :key="player.id"
      :class="getPlayerSeatClass(index)"
      :style="getPlayerSeatStyle(index)"
    >
      <!-- Player Info -->
      <div :class="[
        'player-info text-center',
        player.id === currentPlayer?.id ? 'bg-blue-900 border-2 border-blue-400' : '',
        index === gameState?.currentPlayerIndex ? 'ring-4 ring-yellow-400 ring-opacity-70' : '',
        player.isFolded ? 'opacity-50' : ''
      ]">
        <!-- Avatar and Name -->
        <div class="flex items-center justify-center space-x-2 mb-2">
          <span class="text-2xl">{{ player.avatar }}</span>
          <div class="text-left">
            <div class="font-medium text-sm text-white">{{ player.name }}</div>
            <div class="text-xs text-gray-300">💰 {{ player.chips || player.peligold || 0 }}</div>
          </div>
        </div>

        <!-- Player Status -->
        <div class="text-xs space-y-1">
          <div v-if="player.bet > 0" class="text-green-400 font-medium">
            Bet: {{ player.bet }}
          </div>
          <div v-if="player.isFolded" class="text-red-600">Folded</div>
          <div v-if="player.isAllIn" class="text-purple-600">All-in</div>
          <div v-if="index === gameState?.dealerIndex" class="text-yellow-600">🎩 Dealer</div>
        </div>

        <!-- Player Cards -->
        <div class="flex justify-center space-x-1 mt-2">
          <PlayingCard
            v-for="(card, cardIndex) in getPlayerCards(player)"
            :key="`${player.id}-card-${cardIndex}`"
            :card="card"
            :is-hidden="!isCurrentPlayer(player) && !gameState?.gameState === 'finished'"
            :is-suggested="isCardSuggested(card)"
            :class="'animate-card-deal'"
            :style="{ animationDelay: `${cardIndex * 0.1}s` }"
            @card-hover="handleCardHover(card, $event)"
            @card-drag="handleCardDrag(card, $event)"
          />
        </div>
      </div>
    </div>

    <!-- Dealer Button -->
    <div
      v-if="gameState?.dealerIndex !== undefined"
      :class="getDealerButtonClass()"
      class="absolute w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-yellow-600"
    >
      D
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PlayingCard from './PlayingCard.vue'

const props = defineProps({
  gameState: Object,
  currentPlayer: Object,
  isCurrentTurn: Boolean
})

const emit = defineEmits(['make-action', 'card-interaction'])

const getPlayerSeatClass = (index) => {
  return [
    'player-seat',
    `player-${index}`,
    'transition-all duration-300'
  ]
}

const getPlayerSeatStyle = (index) => {
  const totalPlayers = props.gameState?.players?.length || 8
  const angle = (360 / totalPlayers) * index
  const radius = 280
  
  const x = Math.cos((angle - 90) * Math.PI / 180) * radius
  const y = Math.sin((angle - 90) * Math.PI / 180) * radius
  
  return {
    left: `calc(50% + ${x}px - 75px)`,
    top: `calc(50% + ${y}px - 75px)`,
    width: '150px'
  }
}

const getDealerButtonClass = () => {
  const dealerIndex = props.gameState?.dealerIndex
  if (dealerIndex === undefined) return ''
  
  const totalPlayers = props.gameState?.players?.length || 8
  const angle = (360 / totalPlayers) * dealerIndex
  const radius = 220
  
  const x = Math.cos((angle - 90) * Math.PI / 180) * radius
  const y = Math.sin((angle - 90) * Math.PI / 180) * radius
  
  return {
    left: `calc(50% + ${x}px - 16px)`,
    top: `calc(50% + ${y}px - 16px)`
  }
}

const getPlayerCards = (player) => {
  return player.cards || []
}

const isCurrentPlayer = (player) => {
  return player.id === props.currentPlayer?.id
}

const isCardSuggested = (card) => {
  if (!props.currentPlayer?.suggestions) return false
  
  // Check if any suggestion involves this card
  return props.currentPlayer.suggestions.some(suggestion => 
    suggestion.confidence === 'high'
  )
}

const handleCardHover = (card, event) => {
  emit('card-interaction', 'hover', card.id, {
    x: event.clientX,
    y: event.clientY
  })
}

const handleCardDrag = (card, event) => {
  emit('card-interaction', 'drag', card.id, {
    x: event.clientX,
    y: event.clientY
  })
}
</script>

<style scoped>
.poker-table {
  min-height: 500px;
}
</style>
