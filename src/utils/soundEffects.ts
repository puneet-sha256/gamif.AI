/**
 * Sound Effects Utility
 * Generates satisfying sound effects for reward claiming actions
 */

class SoundEffectsManager {
  private audioContext: AudioContext | null = null

  constructor() {
    // Initialize AudioContext lazily (only when first needed)
    if (typeof window !== 'undefined') {
      this.audioContext = null
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  /**
   * Play a satisfying "coin collect" sound for individual reward claims
   * A quick, pleasant ascending tone
   */
  playIndividualClaimSound(): void {
    try {
      const ctx = this.getAudioContext()
      const now = ctx.currentTime

      // Create oscillator for the main tone
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Create a pleasant ascending tone (like a coin pickup)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(600, now)
      oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.1)

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

      oscillator.start(now)
      oscillator.stop(now + 0.15)

      // Add a subtle harmonic for richness
      const harmonic = ctx.createOscillator()
      const harmonicGain = ctx.createGain()
      
      harmonic.connect(harmonicGain)
      harmonicGain.connect(ctx.destination)
      
      harmonic.type = 'sine'
      harmonic.frequency.setValueAtTime(1200, now)
      harmonic.frequency.exponentialRampToValueAtTime(1800, now + 0.1)
      
      harmonicGain.gain.setValueAtTime(0, now)
      harmonicGain.gain.linearRampToValueAtTime(0.15, now + 0.01)
      harmonicGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      
      harmonic.start(now)
      harmonic.stop(now + 0.15)
    } catch (error) {
      console.warn('Failed to play individual claim sound:', error)
    }
  }

  /**
   * Play a more satisfying "achievement unlock" sound for claiming all rewards
   * A triumphant, multi-layered ascending melody
   */
  playClaimAllSound(): void {
    try {
      const ctx = this.getAudioContext()
      const now = ctx.currentTime

      // Create a triumphant chord progression
      const notes = [
        { freq: 523.25, start: 0, duration: 0.3 },      // C5
        { freq: 659.25, start: 0.05, duration: 0.3 },   // E5
        { freq: 783.99, start: 0.1, duration: 0.35 },   // G5
        { freq: 1046.50, start: 0.15, duration: 0.4 }   // C6
      ]

      notes.forEach(note => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(note.freq, now + note.start)

        // Create a pleasant envelope
        gainNode.gain.setValueAtTime(0, now + note.start)
        gainNode.gain.linearRampToValueAtTime(0.2, now + note.start + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration)

        oscillator.start(now + note.start)
        oscillator.stop(now + note.start + note.duration)
      })

      // Add a "shimmer" effect with high-frequency tones
      const shimmerStart = 0.2
      for (let i = 0; i < 3; i++) {
        const shimmer = ctx.createOscillator()
        const shimmerGain = ctx.createGain()

        shimmer.connect(shimmerGain)
        shimmerGain.connect(ctx.destination)

        shimmer.type = 'sine'
        shimmer.frequency.setValueAtTime(2000 + i * 500, now + shimmerStart + i * 0.05)

        shimmerGain.gain.setValueAtTime(0, now + shimmerStart + i * 0.05)
        shimmerGain.gain.linearRampToValueAtTime(0.1, now + shimmerStart + i * 0.05 + 0.01)
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + shimmerStart + i * 0.05 + 0.15)

        shimmer.start(now + shimmerStart + i * 0.05)
        shimmer.stop(now + shimmerStart + i * 0.05 + 0.15)
      }

      // Add a subtle bass note for depth
      const bass = ctx.createOscillator()
      const bassGain = ctx.createGain()

      bass.connect(bassGain)
      bassGain.connect(ctx.destination)

      bass.type = 'sine'
      bass.frequency.setValueAtTime(130.81, now) // C3

      bassGain.gain.setValueAtTime(0, now)
      bassGain.gain.linearRampToValueAtTime(0.15, now + 0.02)
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

      bass.start(now)
      bass.stop(now + 0.5)
    } catch (error) {
      console.warn('Failed to play claim all sound:', error)
    }
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsManager()
