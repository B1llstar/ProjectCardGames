<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-4xl w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Project: Board Games
        </h1>        <p class="text-xl text-gray-300">
          Multiplayer gaming platform featuring Poker with Peligold
        </p>
      </div>      <!-- User Setup -->
      <div v-if="!user" class="card p-8 mb-8">
        <h2 class="text-2xl font-bold mb-6 text-white">Join the Game</h2>
        <form @submit.prevent="handleJoinUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
            <input
              v-model="userName"
              type="text"
              required
              class="input-dark w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Choose Avatar</label>
            <div class="flex space-x-3">
              <button
                v-for="avatar in avatars"
                :key="avatar"
                type="button"
                @click="selectedAvatar = avatar"
                :class="[
                  'w-12 h-12 rounded-full border-2 text-2xl flex items-center justify-center transition-all',
                  selectedAvatar === avatar ? 'border-primary-500 bg-primary-900' : 'border-gray-600 hover:border-primary-400 bg-gray-700'
                ]"
              >
                {{ avatar }}
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-full">
            Join Game
          </button>
        </form>
      </div>

      <!-- Main Game Interface -->
      <div v-else>        <!-- Create Lobby Section -->
        <div class="card p-6 mb-6">
          <h2 class="text-xl font-bold mb-4 text-white">Create New Lobby</h2>
          <form @submit.prevent="handleCreateLobby" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Lobby Name</label>
                <input
                  v-model="newLobby.name"
                  type="text"
                  required
                  class="input-dark w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter lobby name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Game</label>
                <select
                  v-model="newLobby.game"
                  class="input-dark w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="poker">Poker (Texas Hold'em)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Max Players</label>
                <select
                  v-model="newLobby.maxPlayers"
                  class="input-dark w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="2">2 Players</option>
                  <option value="4">4 Players</option>
                  <option value="6">6 Players</option>
                  <option value="8">8 Players</option>
                </select>
              </div>
              <div>
                <label class="flex items-center">
                  <input
                    v-model="newLobby.settings.autoDealer"
                    type="checkbox"
                    class="mr-2 bg-gray-700 border-gray-600 text-primary-500 focus:ring-primary-500"
                  />
                  <span class="text-sm text-gray-300">Auto-deal cards</span>
                </label>
              </div>
            </div>
            <button type="submit" class="btn btn-primary">
              Create Lobby
            </button>
          </form>
        </div>        <!-- Available Lobbies -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Available Lobbies</h2>
            <button @click="refreshLobbies" class="btn btn-secondary">
              🔄 Refresh
            </button>
          </div>
          
          <div v-if="lobbies.length === 0" class="text-center py-8 text-gray-400">
            No lobbies available. Create one to get started!
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="lobby in lobbies"
              :key="lobby.id"
              class="lobby-card cursor-pointer"
              @click="handleJoinLobby(lobby.id)"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-white">{{ lobby.name }}</h3>
                <span class="text-xs bg-primary-900 text-primary-300 px-2 py-1 rounded">
                  {{ lobby.game }}
                </span>
              </div>
              <p class="text-sm text-gray-300 mb-2">
                Host: {{ lobby.hostName }}
              </p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-400">
                  {{ lobby.playerCount }}/{{ lobby.maxPlayers }} players
                </span>
                <button class="btn btn-primary text-xs">
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="mt-4 p-4 bg-red-900 border border-red-600 text-red-300 rounded-lg">
        {{ error }}
        <button @click="clearError" class="ml-2 text-red-200 hover:text-red-100">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

const gameStore = useGameStore()
const router = useRouter()
const { user, lobbies, error } = storeToRefs(gameStore)

// User setup
const userName = ref('')
const selectedAvatar = ref('🎮')
const avatars = ['🎮', '🎯', '🎲', '🃏', '🎪', '🎨', '🎭', '🎬']

// Lobby creation
const newLobby = ref({
  name: '',
  game: 'poker',
  maxPlayers: 6,
  settings: {
    autoDealer: true
  }
})

const handleJoinUser = () => {
  gameStore.joinAsUser(userName.value, selectedAvatar.value)
}

const handleCreateLobby = () => {
  gameStore.createLobby(newLobby.value)
  // Reset form
  newLobby.value = {
    name: '',
    game: 'poker',
    maxPlayers: 6,
    settings: {
      autoDealer: true
    }
  }
}

const handleJoinLobby = (lobbyId) => {
  gameStore.joinLobby(lobbyId)
}

const refreshLobbies = () => {
  gameStore.getLobbies()
}

const clearError = () => {
  gameStore.clearError()
}

// Watch for lobby changes to redirect
gameStore.$subscribe((mutation, state) => {
  if (state.currentLobby && !state.gameState) {
    router.push(`/lobby/${state.currentLobby.id}`)
  } else if (state.gameState) {
    router.push(`/game/${state.currentLobby.id}`)
  }
})

onMounted(() => {
  refreshLobbies()
})
</script>
