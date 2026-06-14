// Minimal classnames joiner. Accepts strings, arrays, and falsy values
// (false/undefined/null are skipped) so conditional classes read cleanly:
//   cn('base', isActive && 'active', collapsed ? 'w-16' : 'w-60')
// No tailwind-merge — we don't rely on conflicting-class resolution here.
export function cn(...args) {
  return args.flat().filter(Boolean).join(' ')
}

export default cn
