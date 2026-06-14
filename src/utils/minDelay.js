// Resolve a promise, but not before `ms` has elapsed. Gives loaders a graceful
// minimum on-screen time so the brand loader doesn't flash on fast loads.
// (Only used on the first/uncached fetch — cached revisits stay instant.)
export async function withMinDelay(promise, ms = 500) {
  const [value] = await Promise.all([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
  return value
}

export default withMinDelay
