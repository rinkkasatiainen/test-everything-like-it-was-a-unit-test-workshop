# Learning log of How to test anything

## Getting started, 2 minutes:

- What is difference between a Query and a Command?

> [your answer here]

- Why does it matter? Why is it important to separate them?

> [your answer here]

Done? time to go back to [README.md](./README.md)

------------

<a id="step-1-connections"></a>

## Step 1: Connections!

✍ **Guess first (~2 min):** The `SessionScheduler#fill` takes a number as parameter and returns a list of numbers
as values. Using unit tests as your tool - how would you test it

> [your answer here]

✍ **When testing the `fill` method**, is it query or command?

> [your answer here]

Done? time to go back to [Step 1](./step1.md#step-1-concrete-practice)

------------

<a id="step-1-concrete-practice"></a>

## Step 1: Concrete Practice!

✍ **Your sense of the tests:** Which of your assertions felt solid, and which felt like a guess? What did you assert -
the return value, or something else?

> [your answer here]

✍ **Your approach:** Did you try to understand the code? Did you read the code? Or did you just start testing?

> [your answer here]

Done? time to go back to [Step 1](./step1.md#step-1-concepts)

------------

<a id="step-1-concepts"></a>

## Step 1: Concepts!

✍ **In your own words:** for an incoming query, what do you assert, and what do you deliberately ignore?

> [your answer here]

✍ **Myth or fact** _Mark **M** (myth) or **F** (fact) first, then correct any you got wrong in one line._

1. To test `fill` properly you should also verify the private `#slots` field it loops over. → ___ (M/F)
2. A query test should assert the returned value and not care _how_ the result was produced. → ___ (M/F)
3. If `fill` had logged to the console, it would make `fill` both a command and a query. → ___ (M/F)

Done? time to go back to [Step 1](./step1.md#step-1-conclusions)

------------

<a id="step-1-conclusions"></a>

## Step 1: Conclusions!

✍ Anything you want to add for your future self? Now would be a good time

> [your answer here]

Done? time to go to [Step 2](./step2.md)
 
------------

<a id="step-2-connections"></a>

## Step 2: Connections!

✍ **Bridge from Step 1 (~2 min):** In Step 1 you asserted a return value. `setSessions(slots)` returns **nothing** -
it changes the internals scheduler. How is the verification of this _command_ different than the previous _query_?

> [your answer here]

✍ **Look at code (~1 min):** skim quickly
[`javascript/src/availability-scheduler.js`](./javascript/src/availability-scheduler.js) - how would you test this piece
of code?

> [your answer here]

Done? time to go back to [Step 2](./step2.md#step-2-concrete-practice)
------------

<a id="step-2-concrete-practice"></a>

## Step 2: Concrete Practice!

✍ **Small reflection:** How did you verify the command worked? Did you reach for the internal `#slots`, or did you
observe the change some other way?

> [your answer here]

✍ **Think it and ink it:** There clearly are two ways to test `setSessions`

- verify the return value of `getSessions`, or
- send the message `setSessions` and verify the direct side-effect using `fill` method

Question is: what's the fundamental difference? What's the "side-effect" of this design decision. Think about the
surface area of the object in hand - the public API?

> [your answer here]

Done? time to go back to [Step 2](./step2.md#step-2-concepts)

------------

<a id="step-2-concepts"></a>

## Step 2: Concepts!

✍ **What surprised you:** Was there anything that you felt surprised of this task? It seemed easy, right? And it is.

> [your answer here]

✍ **It depends?** I claim that sometimes the change in DB is direct side-effect. Can you think of a scenario where that
might be the case? How about a scenario where the message we're sending is HTTP POST call. When, in that scenario, DB
change could be a direct side-effect

> [your answer here]

✍ **Myth or fact:** answer to the following statements with M/F

1. The way to test `setSessions` is to assert on the private `#slots` field afterwards. → ___ (M/F)
2. A command returns nothing, so the thing to assert is its observable effect. → ___ (M/F)
3. DB changes are never direct side-effects → ___ (M/F)

Done? time to go back to [Step 2](./step2.md#step-2-conclusions)

------------

<a id="step-2-conclusions"></a>

## Step 2: Conclusions!

✍ **Fill in your cell:** Incoming **Command** → _assert _______________________._ By writing the exact phrase, you make
it more likely to remember - please double check it.

> [your answer here]

Done? time to go to [Step 3](./step3.md)
------------

<a id="step-3-connections"></a>

## Step 3: Connections!

✍ **Test doubles:** Have you ever heard the term 'test double'? What does it mean? How is it relevant now?

> [your answer here]

Done? time to go back to [Step 3](./step3.md#step-3-concrete-practice)

------------

<a id="step-3-concrete-practice"></a>

## Step 3: Concrete Practice!

✍ **Name the concept:** What did you pass in as the collaborator? was it a real class, a stub, a fake, a mock,
a dummy or a spy? Do you know the difference of all the said terms.

> [your answer here]

Done? time to go back to [Step 3](./step3.md#step-3-concepts)

------------

<a id="step-3-concepts"></a>

## Step 3: Concepts!

One-minute review

✍ **One-minute review:** In your own words: why does the outgoing query get _no_ assertion of its own here?

> [your answer here]

✍ **Myth or fact:** answer to the following statements with M/F

1. You should add a test asserting that `fill` called `availableSlots()`. → ___  (M/F)
2. An outgoing query is an incoming query from the collaborator's side, so it's tested over there. → ___ (M/F)
3. Using a hand-rolled object with an `availableSlots()` method (instead of the real class) is a legitimate test
   double. → ___ (M/F)

Done? time to go back to [Step 3](./step3.md#step-3-conclusions)

------------

<a id="step-3-conclusions"></a>

## Step 3: Conclusions!

> ✍ **Looking back:** Looking back all you have learned so far, what - if any - has surprised you the most?

> [your answer here]

Done? time to go to [Step 4](./step4.md)

------------

<a id="step-4-connections"></a>

## Step 4: Connections!

✍ **Bridge from Step 3 (~2 min):** In Step 3 the scheduler _asked_ a collaborator a question (a query) and you
ignored it. Now `SessionScheduling` _tells_ a collaborator to do something: `assignSession(...)`. Does telling feel
different from asking? Would you ignore it too?

> [your answer here]


✍ **Guess first (~1 min):** `planSession` reserves a slot by calling another object. With no return value to check,
how would you prove, in a test, that the reservation actually happened?

> [your answer here]

Done? time to go back to [Step 4](./step4.md#step-4-concrete-practice)
------------

<a id="step-4-concrete-practice"></a>

## Step 4: Concrete Practice!

✍ **Compare to Step 3:** How is the testing strategy different from Step 3? Do we verify something here? why?

> [your answer here]

Done? time to go back to [Step 4](./step4.md#step-4-concepts)

------------

<a id="step-4-concepts"></a>

## Step 4: Concepts!

✍ **One-minute review:** ✍ In your own words: for an outgoing command, what is the assertion, and why is a mock/spy the
right tool?

> [your answer here]

✍ **Myth or fact:** answer to the following statements with M/F

1. For an outgoing command you should let the real collaborator run and then check the database it wrote to. → ___ (M/F)
2. "Expect to send" means asserting the collaborator received the right message with the right arguments. → ___ (M/F)
3. Outgoing query and outgoing command are tested the same way. → ___ (M/F)

Done? time to go back to [Step 4](./step4.md#step-4-conclusions)

------------

<a id="step-4-conclusions"></a>

## Step 4: Conclusions!

✍ **See the future:** I stated that this model is useful regardless of how big the imaginary box is? Any thoughts on
how this could be used in microservices architecture and in component tests?

> [your answer here]


Done? time to go to [Step 4](./step5.md)
