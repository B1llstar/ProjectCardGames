<template>
  <div class="min-h-screen p-4 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
    <div class="max-w-7xl mx-auto">
      <!-- Game Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="text-white">
          <h1 class="text-2xl font-bold">{{ currentLobby?.name }}</h1>
          <p class="text-green-200">Round: {{ gameState?.round || 'Pre-game' }}</p>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-white text-right">            <div class="text-sm text-green-200">Your Peligold</div>
            <div class="text-xl font-bold">💰 {{ currentPlayer?.peligold || 0 }}</div>
          </div>
          <button @click="leaveLobby" class="btn btn-secondary">
            Leave Game
          </button>
        </div>
      </div>

      <!-- Poker Table -->
      <div class="relative mb-8">
        <PokerTable
          :game-state="gameState"
          :current-player="currentPlayer"
          :is-current-turn="isCurrentPlayerTurn"
          @make-action="handlePokerAction"
          @card-interaction="handleCardInteraction"
        />
      </div>

      <!-- Action Panel -->
      <div v-if="isCurrentPlayerTurn" class="card p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">Your Turn</h3>
          <div class="text-sm text-gray-600">
            Current bet: {{ gameState?.currentBet || 0 }} Peligold
          </div>
        </div>

        <ActionPanel
          :current-player="currentPlayer"
          :game-state="gameState"
          @make-action="handlePokerAction"
        />
      </div>

      <!-- Suggestions Panel -->
      <div v-if="currentPlayer?.suggestions?.length" class="card p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">💡 Suggested Actions</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="suggestion in currentPlayer.suggestions"
            :key="suggestion.action"
            :class="[
              'p-4 rounded-lg border cursor-pointer transition-all',
              suggestion.confidence === 'high' ? 'border-green-400 bg-green-50 hover:bg-green-100' :
              suggestion.confidence === 'medium' ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100' :
              'border-gray-400 bg-gray-50 hover:bg-gray-100'
            ]"
            @click="handleSuggestionClick(suggestion)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium capitalize">{{ suggestion.action }}</span>
              <span :class="[
                'text-xs px-2 py-1 rounded',
                suggestion.confidence === 'high' ? 'bg-green-200 text-green-800' :
                suggestion.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                'bg-gray-200 text-gray-800'
              ]">
                {{ suggestion.confidence }}
              </span>
            </div>
            <p class="text-sm text-gray-600">{{ suggestion.explanation }}</p>
            <div v-if="suggestion.amount" class="text-xs text-gray-500 mt-1">
              Amount: {{ suggestion.amount }} Peligold
            </div>
          </div>
        </div>
      </div>

      <!-- Game Info Panel -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Pot Info -->
        <div class="card p-4">
          <h4 class="font-bold text-gray-800 mb-2">💰 Pot</h4>
          <div class="text-2xl font-bold text-green-600">
            {{ gameState?.pot || 0 }} Peligold
          </div>
        </div>

        <!-- Game State -->
        <div class="card p-4">
          <h4 class="font-bold text-gray-800 mb-2">🎮 Game State</h4>
          <div class="space-y-1 text-sm">
            <div>Round: <span class="font-medium">{{ gameState?.round }}</span></div>
            <div>Active Players: <span class="font-medium">{{ activePlayers.length }}</span></div>
          </div>
        </div>

        <!-- Last Action -->
        <div class="card p-4">
          <h4 class="font-bold text-gray-800 mb-2">📝 Last Action</h4>
          <div v-if="gameState?.lastAction" class="text-sm">
            <div class="font-medium">{{ getPlayerName(gameState.lastAction.playerId) }}</div>
            <div class="text-gray-600">{{ formatAction(gameState.lastAction) }}</div>
          </div>
          <div v-else class="text-gray-500 text-sm">No actions yet</div>
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
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PokerTable from '@/components/PokerTable.vue'
import ActionPanel from '@/components/ActionPanel.vue'

const props = defineProps(['id'])

const gameStore = useGameStore()
const router = useRouter()
const { user, currentLobby, gameState, currentPlayer, isCurrentPlayerTurn, error } = storeToRefs(gameStore)

const activePlayers = computed(() => {
  return gameState.value?.players?.filter(p => p.isActive && !p.isFolded) || []
})

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
