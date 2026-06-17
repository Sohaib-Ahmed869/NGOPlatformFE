import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket, disconnectSocket } from "../../services/socket";
import superadminService from "../../services/superadmin.service";

/**
 * Owns the platform-console websocket connection (the operator's token drops
 * them into the `platform:superadmins` room server-side) and the cross-screen
 * unread count that powers the "Contact Queries" sidebar badge. Screens read
 * `socket` for fine-grained events and call `refreshContactUnread()` after they
 * act so the badge stays in sync.
 */
const SARealtimeContext = createContext(null);

export function SARealtimeProvider({ children }) {
  const { user } = useAuth();
  const [unreadContactQueries, setUnreadContactQueries] = useState(0);
  const [socket, setSocket] = useState(null);

  const refreshContactUnread = useCallback(async () => {
    try {
      const res = await superadminService.getContactUnreadCount();
      setUnreadContactQueries(res.data.count || 0);
    } catch {
      /* non-fatal — keep the last known value */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const s = getSocket();
    setSocket(s);
    refreshContactUnread();

    const onActivity = () => refreshContactUnread();
    s.on("connect", onActivity);
    s.on("contactQuery:new", onActivity);
    s.on("contactQuery:message", onActivity);
    s.on("contactQuery:updated", onActivity);
    s.on("contactQuery:deleted", onActivity);

    return () => {
      s.off("connect", onActivity);
      s.off("contactQuery:new", onActivity);
      s.off("contactQuery:message", onActivity);
      s.off("contactQuery:updated", onActivity);
      s.off("contactQuery:deleted", onActivity);
    };
  }, [user, refreshContactUnread]);

  // Tear the socket down on logout so a new login reconnects with a fresh token.
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);

  return (
    <SARealtimeContext.Provider value={{ unreadContactQueries, refreshContactUnread, socket }}>
      {children}
    </SARealtimeContext.Provider>
  );
}

export function useSARealtime() {
  return (
    useContext(SARealtimeContext) || {
      unreadContactQueries: 0,
      refreshContactUnread: () => {},
      socket: null,
    }
  );
}
