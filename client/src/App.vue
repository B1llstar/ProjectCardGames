<template>
  <div id="app" class="min-h-screen" @mousemove="trackCursor">
    <router-view />
    
    <!-- Connection Status Indicator -->
    <ConnectionStatus />
    
    <!-- Other players' cursors -->
    <div
      v-for="cursor in otherPlayersCursors"
      :key="cursor.playerId"
      :style="{ left: cursor.x + 'px', top: cursor.y + 'px' }"
      class="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
    >
      <div class="flex items-center space-x-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-lg text-xs">
        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
        <span>{{ cursor.playerName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import { storeToRefs } from 'pinia'
import ConnectionStatus from './components/ConnectionStatus.vue'

const gameStore = useGameStore()
const { otherPlayersCursors } = storeToRefs(gameStore)

let cursorThrottle = null

const trackCursor = (event) => {
  if (cursorThrottle) return
  
  cursorThrottle = setTimeout(() => {
    gameStore.updateCursorPosition(event.clientX, event.clientY)
    cursorThrottle = null
  }, 50) // Throttle to 20fps for cursor updates
}

onMounted(() => {
  gameStore.initializeWithNetworkMonitoring()
})

onUnmounted(() => {
  gameStore.disconnect()
})
</script>
