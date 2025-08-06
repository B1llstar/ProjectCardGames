<template>
  <div class="space-y-4">    <!-- Quick Actions -->
    <div class="flex space-x-3">
      <button
        v-if="canCheck"
        @click="$emit('make-action', 'check')"
        class="action-button flex-1"
      >
        Check
      </button>
      <button
        v-if="canCall"
        @click="$emit('make-action', 'call')"
        class="btn btn-primary flex-1"
      >
        Call {{ callAmount }}
      </button>
      <button
        @click="$emit('make-action', 'fold')"
        class="btn btn-danger flex-1"
      >
        Fold
      </button>
    </div>

    <!-- Betting Actions -->
    <div v-if="canRaise" class="space-y-3">
      <div class="flex items-center space-x-3">
        <label class="text-sm font-medium text-gray-300 whitespace-nowrap">
          Raise Amount:
        </label>
        <input
          v-model.number="raiseAmount"
          type="number"
          :min="minRaise"
          :max="currentPlayer?.peligold || currentPlayer?.chips"
          class="input-dark flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        <button
          @click="handleRaise"
          :disabled="!isValidRaise"
          class="btn btn-warning"
        >
          Raise
        </button>
      </div>

      <!-- Quick Raise Buttons -->
      <div class="flex space-x-2">
        <button
          v-for="preset in raisePresets"
          :key="preset.label"
          @click="raiseAmount = preset.amount"
          :disabled="preset.amount > (currentPlayer?.peligold || 0)"
          class="btn btn-secondary text-xs flex-1"
        >
          {{ preset.label }}
        </button>
      </div>

      <!-- All-in Button -->      <button
        @click="$emit('make-action', 'all-in')"
        :disabled="(currentPlayer?.peligold || 0) === 0"
        class="btn bg-purple-600 text-white hover:bg-purple-700 w-full"
      >
        All-in ({{ currentPlayer?.peligold || 0 }} Peligold)
      </button>
    </div>

    <!-- Betting Information -->    <div class="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">Current bet to call:</span>
        <span class="font-medium">{{ callAmount }} Peligold</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Your current bet:</span>
        <span class="font-medium">{{ currentPlayer?.bet || 0 }} Peligold</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Pot size:</span>
        <span class="font-medium">{{ gameState?.pot || 0 }} Peligold</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Your stack:</span>
        <span class="font-bold text-green-600">{{ currentPlayer?.peligold || 0 }} Peligold</span>
      </div>
    </div>

    <!-- Hand Strength Indicator -->
    <div v-if="handStrength" class="bg-blue-50 p-3 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-blue-800">Hand Strength</span>
        <span :class="[
          'text-xs px-2 py-1 rounded',
          handStrength.strength > 0.7 ? 'bg-green-200 text-green-800' :
          handStrength.strength > 0.4 ? 'bg-yellow-200 text-yellow-800' :
          'bg-red-200 text-red-800'
        ]">
          {{ handStrength.description }}
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          :class="[
            'h-2 rounded-full transition-all duration-500',
            handStrength.strength > 0.7 ? 'bg-green-500' :
            handStrength.strength > 0.4 ? 'bg-yellow-500' :
            'bg-red-500'
          ]"
          :style="{ width: `${handStrength.strength * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Timer (Future Enhancement) -->
    <div class="bg-gray-100 p-3 rounded-lg text-center">
      <div class="text-sm text-gray-600">Time to act</div>
      <div class="text-2xl font-bold text-gray-800">∞</div>
      <div class="text-xs text-gray-500">No time limit</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  currentPlayer: Object,
  gameState: Object
})

const emit = defineEmits(['make-action'])

const raiseAmount = ref(0)

const currentBet = computed(() => props.gameState?.currentBet || 0)
const playerBet = computed(() => props.currentPlayer?.bet || 0)
const callAmount = computed(() => Math.max(0, currentBet.value - playerBet.value))

const canCheck = computed(() => callAmount.value === 0)
const canCall = computed(() => callAmount.value > 0 && callAmount.value <= (props.currentPlayer?.peligold || 0))
const canRaise = computed(() => (props.currentPlayer?.peligold || 0) > callAmount.value)

const minRaise = computed(() => {
  const bigBlind = 20 // Should come from game settings
  return Math.max(bigBlind, currentBet.value - playerBet.value + bigBlind)
})

const isValidRaise = computed(() => {
  return raiseAmount.value >= minRaise.value && 
         raiseAmount.value <= (props.currentPlayer?.peligold || 0) - callAmount.value
})

const raisePresets = computed(() => {
  const pot = props.gameState?.pot || 0
  const playerStack = props.currentPlayer?.peligold || 0
  const maxRaise = playerStack - callAmount.value
  
  return [
    { label: '1/4 Pot', amount: Math.min(Math.ceil(pot * 0.25), maxRaise) },
    { label: '1/2 Pot', amount: Math.min(Math.ceil(pot * 0.5), maxRaise) },
    { label: '3/4 Pot', amount: Math.min(Math.ceil(pot * 0.75), maxRaise) },
    { label: 'Pot', amount: Math.min(pot, maxRaise) }
  ].filter(preset => preset.amount >= minRaise.value)
})

const handStrength = computed(() => {
  // This would come from the server in a real implementation
  // For now, we'll simulate it based on current player data
  if (!props.currentPlayer?.cards || props.currentPlayer.cards.length === 0) {
    return null
  }
  
  // Simplified hand strength calculation
  const cards = props.currentPlayer.cards
  const maxValue = Math.max(...cards.map(c => c.value || 10))
  const isPair = cards.length === 2 && cards[0].rank === cards[1].rank
  
  let strength = maxValue / 14
  if (isPair) strength += 0.3
  strength = Math.min(strength, 1)
  
  return {
    strength,
    description: strength > 0.7 ? 'Strong' : strength > 0.4 ? 'Medium' : 'Weak'
  }
})

const handleRaise = () => {
  if (isValidRaise.value) {
    emit('make-action', 'raise', raiseAmount.value)
    raiseAmount.value = minRaise.value
  }
}

// Set initial raise amount
watch(() => minRaise.value, (newMinRaise) => {
  if (raiseAmount.value < newMinRaise) {
    raiseAmount.value = newMinRaise
  }
}, { immediate: true })
</script>
