/**
 * The live socket's id, published where the axios interceptor can read it
 * without importing the socket module (socket.js already imports from axios.jsx
 * — going the other way would be a cycle).
 *
 * Every mutating request carries it as `X-Socket-Id`, and the server echoes it
 * back on the socket event it emits. That's what lets a client recognise its
 * OWN echo and skip the refetch for a change it already applied — precisely,
 * per CONNECTION rather than per user, so a second tab (same operator) still
 * updates itself normally.
 */
let currentSocketId = "";

export const setSocketId = (id) => {
  currentSocketId = id || "";
};

export const getSocketId = () => currentSocketId;
