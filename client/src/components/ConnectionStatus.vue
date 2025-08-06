<template>
  <div 
    v-if="shouldShow" 
    class="fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300"
    :class="statusClasses"
  >
    <div class="flex items-center space-x-2">
      <div 
        class="w-3 h-3 rounded-full"
        :class="indicatorClasses"
      ></div>
      
      <div class="text-sm font-medium">
        <div>{{ statusMessage }}</div>
        <div v-if="isReconnecting && reconnectAttempts > 0" class="text-xs opacity-75">
          Attempt {{ reconnectAttempts }}/{{ maxReconnectAttempts }}
        </div>
      </div>
      
      <button 
        v-if="connectionLost && !isReconnecting"
        @click="forceReconnect"
        class="ml-2 px-3 py-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors"
      >
        Retry
      </button>
    </div>
    
    <!-- Progress bar for reconnection -->
    <div v-if="isReconnecting" class="mt-2 w-full bg-white bg-opacity-20 rounded-full h-1">
      <div 
        class="bg-white h-1 rounded-full transition-all duration-1000"
        :style="{ width: `${progressWidth}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

const progressInterval = ref(null)
const progressWidth = ref(0)

const shouldShow = computed(() => {
  return gameStore.shouldShowReconnectIndicator || gameStore.connectionLost
})

const statusClasses = computed(() => {
  switch (gameStore.connectionStatus) {
    case 'connected':
      return 'bg-green-500 text-white'
    case 'reconnecting':
      return 'bg-yellow-500 text-white'
    case 'lost':
      return 'bg-red-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
})

const indicatorClasses = computed(() => {
  switch (gameStore.connectionStatus) {
    case 'connected':
      return 'bg-green-200'
    case 'reconnecting':
      return 'bg-yellow-200 animate-pulse'
    case 'lost':
      return 'bg-red-200'
    default:
      return 'bg-gray-200'
  }
})

const statusMessage = computed(() => {
  switch (gameStore.connectionStatus) {
    case 'connected':
      return 'Connected'
    case 'reconnecting':
      return 'Reconnecting...'
    case 'lost':
      return 'Connection Lost'
    default:
      return 'Disconnected'
  }
})

const { isReconnecting, connectionLost, reconnectAttempts, maxReconnectAttempts, forceReconnect } = gameStore

// Animate progress bar during reconnection
watch(isReconnecting, (newValue) => {
  if (newValue) {
    progressWidth.value = 0
    progressInterval.value = setInterval(() => {
      progressWidth.value = (progressWidth.value + 2) % 100
    }, 100)
  } else {
    if (progressInterval.value) {
      clearInterval(progressInterval.value)
      progressInterval.value = null
    }
    progressWidth.value = 0
  }
})

onUnmounted(() => {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
  }
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
