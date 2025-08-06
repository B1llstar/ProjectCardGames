// Connection quality monitoring utility
export class ConnectionMonitor {
  constructor() {
    this.pingTimes = []
    this.maxPingHistory = 10
    this.lastPingTime = null
  }

  // Measure ping by sending a ping event and measuring response time
  async measurePing(socket) {
    if (!socket || !socket.connected) return null

    return new Promise((resolve) => {
      const startTime = Date.now()
      const timeout = setTimeout(() => {
        resolve(null) // Timeout after 5 seconds
      }, 5000)

      socket.emit('ping', startTime, (responseTime) => {
        clearTimeout(timeout)
        const pingTime = Date.now() - startTime
        this.addPingTime(pingTime)
        resolve(pingTime)
      })
    })
  }

  addPingTime(pingTime) {
    this.pingTimes.push(pingTime)
    if (this.pingTimes.length > this.maxPingHistory) {
      this.pingTimes.shift()
    }
    this.lastPingTime = Date.now()
  }

  getAveragePing() {
    if (this.pingTimes.length === 0) return null
    return Math.round(this.pingTimes.reduce((a, b) => a + b, 0) / this.pingTimes.length)
  }

  getConnectionQuality() {
    const avgPing = this.getAveragePing()
    if (avgPing === null) return 'unknown'
    
    if (avgPing < 100) return 'excellent'
    if (avgPing < 200) return 'good'
    if (avgPing < 500) return 'fair'
    return 'poor'
  }

  getQualityColor() {
    const quality = this.getConnectionQuality()
    switch (quality) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-yellow-500'
      case 'fair': return 'text-orange-500'
      case 'poor': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  shouldMonitor() {
    // Only monitor if we haven't pinged in the last 30 seconds
    return !this.lastPingTime || (Date.now() - this.lastPingTime) > 30000
  }
}
