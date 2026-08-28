/**
 * One in-flight request, shared by every caller that asks for it.
 *
 * Two screens mounting at once, a StrictMode double-mount, a debounce landing
 * on the same payload twice — all of them are the same request, and firing it
 * N times is N times the server work for one answer. This joins them: the
 * first caller starts it, the rest wait on the same promise, and it is
 * cancelled only when the LAST of them walks away.
 *
 * The refcount is the whole point, and it is not decoration. The naive version
 * (share the promise, let any caller's AbortSignal cancel it) hangs the screen
 * under StrictMode, which mounts → aborts → mounts again within a tick: the
 * second mount adopts the first mount's cancellation and waits forever on a
 * request nobody will ever answer. That bug shipped twice before this shape
 * was settled, so the two rules below are load-bearing:
 *
 *   1. Never hand out an entry that is already aborted. Its rejection settles a
 *      tick later, so between the abort and that tick it is still sitting in
 *      the registry — and that tick is exactly where the remount lands.
 *   2. Evict before aborting. A caller arriving in the same tick must find an
 *      empty slot and start fresh, not adopt a corpse.
 */

/**
 * @param store  Map used as the registry. Caller owns it, so different request
 *               families keep separate namespaces.
 * @param key    Identity of the request — same key means same request.
 * @param run    (signal) => Promise. Called only when there is no live entry.
 * @param signal Optional caller AbortSignal. Leaving drops a reference; the
 *               request itself is only cancelled when the last one leaves.
 */
export function sharedRequest(store, key, run, signal) {
  let entry = store.get(key);
  if (entry && entry.controller.signal.aborted) {
    store.delete(key);
    entry = null;
  }

  if (!entry) {
    const controller = new AbortController();
    entry = { controller, waiters: 0, promise: null };
    // Settled requests leave the registry: this de-duplicates concurrent
    // callers, it is not a result cache. Callers that want to keep the value
    // hold it themselves.
    entry.promise = run(controller.signal).then(
      (value) => {
        if (store.get(key) === entry) store.delete(key);
        return value;
      },
      (err) => {
        if (store.get(key) === entry) store.delete(key);
        throw err;
      },
    );
    store.set(key, entry);
  }

  entry.waiters += 1;
  if (signal) {
    const leave = () => {
      entry.waiters -= 1;
      if (entry.waiters > 0) return;
      // Nobody left to receive it — now the abort is ours to make.
      if (store.get(key) === entry) store.delete(key);
      entry.controller.abort();
    };
    if (signal.aborted) leave();
    else signal.addEventListener("abort", leave, { once: true });
  }

  return entry.promise;
}

/** `sharedRequest` bound to an axios GET. */
export function sharedGet(axios, store, key, url, config = {}, map = (res) => res.data) {
  const { signal, ...rest } = config;
  return sharedRequest(store, key, (s) => axios.get(url, { ...rest, signal: s }).then(map), signal);
}

/** `sharedRequest` bound to an axios POST — previews and other read-shaped POSTs. */
export function sharedPost(axios, store, key, url, body, config = {}, map = (res) => res.data) {
  const { signal, ...rest } = config;
  return sharedRequest(
    store,
    key,
    (s) => axios.post(url, body, { ...rest, signal: s }).then(map),
    signal,
  );
}

export default sharedRequest;
