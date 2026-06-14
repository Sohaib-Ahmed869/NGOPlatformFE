import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getSocket, disconnectSocket } from "../services/socket";
import contactsService from "../services/contacts.service";
import joinTeamService from "../services/joinTeam.service";

/**
 * Owns the single admin websocket connection and the cross-screen counts that
 * power the sidebar badges:
 *   • unreadContacts   — contacts with activity this admin hasn't seen
 *   • pendingVolunteers — volunteer applications still awaiting review
 * Screens read `socket` for fine-grained events and call the matching
 * `refresh*()` after they act so the badges stay in sync.
 */
const AdminRealtimeContext = createContext(null);

export function AdminRealtimeProvider({ children }) {
  const { user } = useAuth();
  const [unreadContacts, setUnreadContacts] = useState(0);
  const [pendingVolunteers, setPendingVolunteers] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      setUnreadContacts(await contactsService.unreadCount());
    } catch {
      /* non-fatal — leave the last known value */
    }
  }, []);

  const refreshVolunteers = useCallback(async () => {
    try {
      const stats = await joinTeamService.stats();
      setPendingVolunteers(stats?.pending || 0);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket();

    refreshUnread();
    refreshVolunteers();

    const onContactActivity = () => refreshUnread();
    const onVolunteerActivity = () => refreshVolunteers();
    const onConnect = () => {
      refreshUnread();
      refreshVolunteers();
    };

    socket.on("connect", onConnect);
    socket.on("contact:new", onContactActivity);
    socket.on("contact:message", onContactActivity);
    socket.on("contact:deleted", onContactActivity);
    socket.on("volunteer:new", onVolunteerActivity);
    socket.on("volunteer:updated", onVolunteerActivity);
    socket.on("volunteer:deleted", onVolunteerActivity);
    socket.on("volunteer:bulk", onVolunteerActivity);

    return () => {
      socket.off("connect", onConnect);
      socket.off("contact:new", onContactActivity);
      socket.off("contact:message", onContactActivity);
      socket.off("contact:deleted", onContactActivity);
      socket.off("volunteer:new", onVolunteerActivity);
      socket.off("volunteer:updated", onVolunteerActivity);
      socket.off("volunteer:deleted", onVolunteerActivity);
      socket.off("volunteer:bulk", onVolunteerActivity);
    };
  }, [user, refreshUnread, refreshVolunteers]);

  // Tear the socket down on logout so a new login reconnects with a fresh token.
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);

  return (
    <AdminRealtimeContext.Provider
      value={{ unreadContacts, pendingVolunteers, refreshUnread, refreshVolunteers }}
    >
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtime() {
  return (
    useContext(AdminRealtimeContext) || {
      unreadContacts: 0,
      pendingVolunteers: 0,
      refreshUnread: () => {},
      refreshVolunteers: () => {},
    }
  );
}
