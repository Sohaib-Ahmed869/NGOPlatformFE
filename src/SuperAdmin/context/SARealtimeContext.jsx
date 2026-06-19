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
  const [pendingBrandingRequests, setPendingBrandingRequests] = useState(0);
  const [socket, setSocket] = useState(null);

  const refreshContactUnread = useCallback(async () => {
    try {
      const res = await superadminService.getContactUnreadCount();
      setUnreadContactQueries(res.data.count || 0);
    } catch {
      /* non-fatal — keep the last known value */
    }
  }, []);

  const refreshBrandingPending = useCallback(async () => {
    try {
      const res = await superadminService.getBrandingPendingCount();
      setPendingBrandingRequests(res.data.count || 0);
    } catch {
      /* non-fatal — keep the last known value */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const s = getSocket();
    setSocket(s);
    refreshContactUnread();
    refreshBrandingPending();

    const onContact = () => refreshContactUnread();
    const onBranding = () => refreshBrandingPending();
    const onConnect = () => {
      refreshContactUnread();
      refreshBrandingPending();
    };
    s.on("connect", onConnect);
    s.on("contactQuery:new", onContact);
    s.on("contactQuery:message", onContact);
    s.on("contactQuery:updated", onContact);
    s.on("contactQuery:deleted", onContact);
    s.on("brandingRequest:new", onBranding);
    s.on("brandingRequest:updated", onBranding);
    s.on("brandingRequest:deleted", onBranding);

    return () => {
      s.off("connect", onConnect);
      s.off("contactQuery:new", onContact);
      s.off("contactQuery:message", onContact);
      s.off("contactQuery:updated", onContact);
      s.off("contactQuery:deleted", onContact);
      s.off("brandingRequest:new", onBranding);
      s.off("brandingRequest:updated", onBranding);
      s.off("brandingRequest:deleted", onBranding);
    };
  }, [user, refreshContactUnread, refreshBrandingPending]);

  // Tear the socket down on logout so a new login reconnects with a fresh token.
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);

  return (
    <SARealtimeContext.Provider value={{ unreadContactQueries, pendingBrandingRequests, refreshContactUnread, refreshBrandingPending, socket }}>
      {children}
    </SARealtimeContext.Provider>
  );
}

export function useSARealtime() {
  return (
    useContext(SARealtimeContext) || {
      unreadContactQueries: 0,
      pendingBrandingRequests: 0,
      refreshContactUnread: () => {},
      refreshBrandingPending: () => {},
      socket: null,
    }
  );
}
