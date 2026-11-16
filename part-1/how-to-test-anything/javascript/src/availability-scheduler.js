// These are here for building up on the learning steps.
const defaultSlots = () => [
  { duration: 90, max: 2 },
  { duration: 60, max: 4 },
  { duration: 30, max: 6 },
  { duration: 15, max: 6 },
]

export class AvailabilityScheduler {
  #slots = defaultSlots()

  // Step 1 - Incoming Query: returns the slot durations that fit into totalTime.
  fill(totalTime) {
    const result = []
    let remaining = totalTime

    for (const session of this.#slots) {
      let used = 0
      while (remaining >= session.duration && used < session.max) {
        result.push(session.duration)
        remaining -= session.duration
        used++
      }
    }

    return result
  }

  // Step 2 - Incoming Command: replaces the configured session slots.
  setSessions(slots) {
    this.#slots = slots
  }

  getSessions(slots){
    return this.#slots
  }
}
