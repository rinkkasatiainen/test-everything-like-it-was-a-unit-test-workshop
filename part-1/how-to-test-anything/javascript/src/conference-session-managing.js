// The production collaborator that plays the `ManagesConferenceSessions` role
// (an `assignSession(sessionInfo, slotDuration)` method). In a real system this
// would reserve the slot. Your Step 4 tests must NOT use this class - inject a
// test double that plays the same role instead.
export class ConferenceSessionManaging {
  assignSession(sessionInfo, slotDuration) {
    console.log(
      `Assigned session "${sessionInfo.title}" (${sessionInfo.duration} min) into slot ${slotDuration} min`,
    )
    // In a real system, this would reserve the slot.
  }
}
