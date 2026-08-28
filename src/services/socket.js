import { io } from "socket.io-client";
import { getStoragePrefix } from "./axios";
import { setSocketId } from "./socketId";

// Single shared admin socket. Connects to the API origin (same server the REST
// API runs on) and authenticates with the stored admin JWT + tenant slug, which
// the server uses to drop us into the right per-organisation room.
let socket = null;

function currentSlug() {
  const parts = window.location.hostname.split(".");
  return parts.length > 1 && parts[0] !== "admin" && parts[0] !== "www" ? parts[0] : "";
}

export function getSocket() {
  if (socket) return socket;
  const prefix = getStoragePrefix();
  const token = localStorage.getItem(prefix + "token");
  socket = io(import.meta.env.VITE_API_BASE_URL, {
    auth: { token, slug: currentSlug() },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });
  // Published for the axios interceptor (see socketId.js) — the id changes on
  // every reconnect, so it's set from the event, not read once here.
  socket.on("connect", () => setSocketId(socket.id));
  socket.on("disconnect", () => setSocketId(""));
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    setSocketId("");
  }
}
