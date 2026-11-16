// Step 3 - Outgoing Query: the scheduler no longer owns its slots. It asks a
// collaborator (anything matching the `ProvidesAvailableSlots` shape, i.e. can respond to
// `availableSlots()` method) for them.
export class ScheduleAwareAvailabilityScheduler {
  #providesSlots

  constructor(providesSlots) {
    this.#providesSlots = providesSlots
  }

  fill(totalTime) {
    const result = []
    let remaining = totalTime
    console.log(this.#providesSlots)

    for (const session of this.#providesSlots.availableSlots()) {
      let used = 0
      while (remaining >= session.duration && used < session.max) {
        result.push(session.duration)
        remaining -= session.duration
        used++
      }
    }

    return result
  }
}
