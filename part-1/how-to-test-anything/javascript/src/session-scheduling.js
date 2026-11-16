// Step 4 - the command handler this whole exercise builds towards.
//
// `planSession` queries the scheduler for the available slots (an outgoing
// query), picks the shortest slot long enough for the session, and then sends
// the `assignSession` command to a collaborator playing the
// `ManagesConferenceSessions` role (an outgoing command).
//
// Testing focus: assert that the outgoing COMMAND was sent (expect-to-send with
// a test double). Do not re-test what `fill` returns - that is covered by the
// scheduler's own incoming-query tests.
export class SessionScheduling {
  #scheduler
  #managesConferenceSessions
  #totalTime

  constructor(scheduler, managesConferenceSessions, totalTime) {
    this.#scheduler = scheduler
    this.#managesConferenceSessions = managesConferenceSessions
    this.#totalTime = totalTime
  }

  planSession(sessionInfo) {
    const availableSlots = this.#scheduler.fill(this.#totalTime)

    const slot = this.#findMatchingSlot(availableSlots, sessionInfo)

    if (slot) {
      this.#managesConferenceSessions.assignSession(sessionInfo, slot)
    } else {
      const msg = `No available slot for session "${sessionInfo.title}" (${sessionInfo.duration} min)`
      console.log(msg)
      throw new Error(msg)
    }
  }

  #findMatchingSlot(availableSlots, sessionInfo) {
    return [...availableSlots]
      .sort((a, b) => a - b)
      .find(duration => duration >= sessionInfo.duration)
  }
}
