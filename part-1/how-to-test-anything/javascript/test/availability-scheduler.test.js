import { expect } from 'chai'
import { AvailabilityScheduler } from '../src/availability-scheduler.js'
// The production code lives in ../src and already works.
// Your job in this session is the TESTS. Turn the `todo`s into real `it`s.
//
// Add the imports you need as you go, e.g.:
//   import { expect } from 'chai'
//   import { AvailabilityScheduler } from '../src/availability-scheduler.js'
//
// Cheat sheet (you will discover these in the steps, don't peek too early):
//   Incoming  query   -> assert the returned value
//   Incoming  command -> assert the observable state change
//   Outgoing  query   -> don't test it (trust the contract / inject a stub)
//   Outgoing  command -> assert the message was SENT (expect-to-send, use a double)

const todo = msg => it.skip(msg)

describe('How to test anything - incoming messages', () => {

  it('this test should fail', () => {
    expect(true).to.be.eql(false, 'Remove this when you start working')
  })
  // Step 1
  describe('Incoming Query - AvailabilityScheduler#fill', () => {
    todo('add step 1 test(s) here')
  })

  // Step 2
  describe('Incoming Command - AvailabilityScheduler#setSessions', () => {
    todo('add step 2 test(s) here')
  })
})
