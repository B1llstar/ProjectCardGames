<template>
  <div class="min-h-screen p-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white">{{ currentLobby?.name }}</h1>
          <p class="text-gray-300">{{ currentLobby?.game }} Lobby</p>
        </div>
        <button @click="leaveLobby" class="btn btn-secondary">
          Leave Lobby
        </button>
      </div>

      <!-- Lobby Info -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Players Section -->
        <div class="lg:col-span-2">
          <div class="card p-6">
            <h2 class="text-xl font-bold mb-4 text-gray-800">
              Players ({{ currentLobby?.players?.length || 0 }}/{{ currentLobby?.maxPlayers }})
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="player in currentLobby?.players"
                :key="player.id"
                :class="[
                  'flex items-center space-x-3 p-3 rounded-lg border',
                  player.id === currentLobby?.hostId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'
                ]"
              >
                <div class="text-2xl">{{ player.avatar }}</div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="font-medium text-gray-800">{{ player.name }}</span>
                    <span v-if="player.id === currentLobby?.hostId" class="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                      HOST
                    </span>
                    <span v-if="player.id === user?.id" class="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      YOU
                    </span>
                  </div>                  <div class="text-sm text-gray-600">
                    💰 {{ player.peligold || 1000 }} Peligold
                  </div>
                </div>
                <div v-if="player.isReady" class="text-green-500">✓</div>
              </div>
            </div>

            <!-- Waiting for more players -->
            <div v-if="(currentLobby?.players?.length || 0) < 2" class="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
              <p class="text-blue-800">
                ⏳ Waiting for more players to join (minimum 2 players needed)
              </p>
            </div>
          </div>
        </div>

        <!-- Game Settings & Controls -->
        <div class="space-y-6">
          <!-- Game Settings -->
          <div class="card p-6">
            <h3 class="text-lg font-bold mb-4 text-gray-800">Game Settings</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">Game Type:</span>
                <span class="font-medium">{{ currentLobby?.game }}</span>
              </div>              <div class="flex justify-between">
                <span class="text-gray-600">Small Blind:</span>
                <span class="font-medium">10 Peligold</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Big Blind:</span>
                <span class="font-medium">20 Peligold</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Auto Dealer:</span>
                <span class="font-medium">
                  {{ currentLobby?.settings?.autoDealer ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Host Controls -->
          <div v-if="isHost" class="card p-6">
            <h3 class="text-lg font-bold mb-4 text-gray-800">Host Controls</h3>
            <div class="space-y-3">
              <button
                @click="startGame"
                :disabled="(currentLobby?.players?.length || 0) < 2"
                :class="[
                  'btn w-full',
                  (currentLobby?.players?.length || 0) >= 2 ? 'btn-success' : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                ]"
              >
                Start Game
              </button>
              <p class="text-xs text-gray-500 text-center">
                Game will start when you click the button
              </p>
            </div>
          </div>

          <!-- Waiting for Host -->
          <div v-else class="card p-6">
            <h3 class="text-lg font-bold mb-4 text-gray-800">Waiting for Host</h3>
            <p class="text-gray-600 text-center">
              The host will start the game when ready
            </p>
          </div>

          <!-- Quick Rules -->
          <div class="card p-6">
            <h3 class="text-lg font-bold mb-4 text-gray-800">Quick Rules</h3>
            <div class="space-y-2 text-sm text-gray-600">
              <p>• Each player starts with 1000 Peligold</p>
              <p>• Best 5-card hand wins the pot</p>
              <p>• Cards will highlight with suggestions</p>
              <p>• Follow the betting rounds: preflop, flop, turn, river</p>
              <p>• See other players' movements in real-time</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Area (Future Enhancement) -->
      <div class="card p-6 mt-6">
        <h3 class="text-lg font-bold mb-4 text-gray-800">Lobby Chat</h3>
        <div class="h-32 bg-gray-50 rounded-lg p-3 mb-3 overflow-y-auto">
          <p class="text-gray-500 text-center">Chat feature coming soon...</p>
        </div>
        <div class="flex space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            disabled
          />
          <button class="btn btn-primary" disabled>Send</button>
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

const props = defineProps(['id'])

const gameStore = useGameStore()
const router = useRouter()
const { user, currentLobby, error } = storeToRefs(gameStore)

const isHost = computed(() => {
  return user.value?.id === currentLobby.value?.hostId
})

const startGame = () => {
  gameStore.startGame()
}

const leaveLobby = () => {
  gameStore.leaveLobby()
  router.push('/')
}

const clearError = () => {
  gameStore.clearError()
}

// Watch for game start to redirect
gameStore.$subscribe((mutation, state) => {
  if (state.gameState) {
    router.push(`/game/${props.id}`)
  }
})
</script>
