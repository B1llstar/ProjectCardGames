<template>
  <div
    :class="[
      'playing-card',
      card.suit,
      { 'suggested': isSuggested },
      { 'card-back': isHidden }
    ]"
    @mouseenter="handleHover"
    @mouseleave="handleLeave"
    @mousedown="startDrag"
    @mouseup="endDrag"
  >
    <!-- Front of card -->
    <div v-if="!isHidden" class="card-front">
      <div class="absolute top-1 left-1 text-xs">
        <div>{{ card.rank }}</div>
        <div>{{ getSuitSymbol(card.suit) }}</div>
      </div>
      <div class="text-center">
        <div class="text-lg">{{ getSuitSymbol(card.suit) }}</div>
      </div>
      <div class="absolute bottom-1 right-1 text-xs transform rotate-180">
        <div>{{ card.rank }}</div>
        <div>{{ getSuitSymbol(card.suit) }}</div>
      </div>
    </div>

    <!-- Back of card -->
    <div v-else class="card-back flex items-center justify-center">
      <div class="text-blue-600 text-2xl">🂠</div>
    </div>

    <!-- Suggestion Tooltip -->
    <div v-if="isSuggested && showTooltip" class="suggestion-tooltip">
      <div class="bg-black bg-opacity-80 text-white text-xs p-2 rounded absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10">
        Suggested play
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black border-opacity-80"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  isSuggested: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['card-hover', 'card-drag'])

const showTooltip = ref(false)
const isDragging = ref(false)

const getSuitSymbol = (suit) => {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }
  return symbols[suit] || '?'
}

const handleHover = (event) => {
  showTooltip.value = true
  emit('card-hover', event)
}

const handleLeave = () => {
  showTooltip.value = false
}

const startDrag = (event) => {
  isDragging.value = true
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', endDrag)
}

const handleDrag = (event) => {
  if (isDragging.value) {
    emit('card-drag', event)
  }
}

const endDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', endDrag)
}
</script>

<style scoped>
.card-back {
  @apply bg-blue-100 border-blue-300;
}

.suggestion-tooltip {
  pointer-events: none;
}
</style>
