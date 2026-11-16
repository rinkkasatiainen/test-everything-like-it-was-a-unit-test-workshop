export const exactly = expected => value => {
  if (value !== expected) {
    throw new Error(`expected ${describeValue(expected)}, got ${describeValue(value)}`)
  }
}
