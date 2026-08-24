import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSocket, disconnectSocket } from "../../services/socket";
import superadminService from "../../services/superadmin.service";
import platformService from "../../services/platform.service";

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
  // New-lead count for the Leads sidebar badge.
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  // Bumped (debounced) whenever an `organisation:updated` event arrives, after
  // the org caches have been invalidated — mounted org screens depend on it to
  // silently revalidate. Unmounted screens need nothing: the cache is already
  // stale, so their next mount refetches.
  const [orgsVersion, setOrgsVersion] = useState(0);
  // Same idea for the plan catalogue (another operator editing/archiving a
  // plan, or a bulk entitlements save).
  const [plansVersion, setPlansVersion] = useState(0);
  const [couponsVersion, setCouponsVersion] = useState(0);
  const [invoicesVersion, setInvoicesVersion] = useState(0);
  const [ticketsVersion, setTicketsVersion] = useState(0);
  const [contactVersion, setContactVersion] = useState(0);
  // Same idea for the Leads CRM — a mounted list/board/detail screen watches
  // this to revalidate after a socket event; the badge count is separate
  // (newLeadsCount) since a stage change or assignment doesn't move it.
  const [leadsVersion, setLeadsVersion] = useState(0);
  const [platformVersion, setPlatformVersion] = useState(0);
  // Support-impersonation sessions. This one is not a nicety: the Support
  // Sessions screen is the kill switch, so a session started, ended or revoked
  // by another operator (or expired by the server sweep) has to reach an open
  // screen without a manual refresh.
  const [sessionsVersion, setSessionsVersion] = useState(0);
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

  const refreshNewLeadsCount = useCallback(async () => {
    try {
      const res = await superadminService.getLeadsNewCount();
      setNewLeadsCount(res.data.count || 0);
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
    refreshNewLeadsCount();

    // The inbox list is session-cached; flag it so its next mount revalidates
    // even if the event arrived while we were on another screen. `contactVersion`
    // is the signal a MOUNTED inbox watches — the unread count can't serve that
    // role because a status change or an assignment doesn't move it.
    let contactTimer = null;
    const onContact = () => {
      superadminService.markContactQueriesStale();
      refreshContactUnread();
      clearTimeout(contactTimer);
      contactTimer = setTimeout(() => setContactVersion((v) => v + 1), 400);
    };
    const onBranding = () => refreshBrandingPending();
    // A lead was created, messaged, edited, assigned, staged, converted or
    // deleted. `lead:converted` also arrives paired with `organisation:updated`
    // (emitted server-side alongside it), so the new org is picked up by
    // onOrgUpdated below with no extra wiring here.
    let leadTimer = null;
    const onLead = () => {
      superadminService.markLeadsStale();
      superadminService.markLeadBoardStale();
      refreshNewLeadsCount();
      clearTimeout(leadTimer);
      leadTimer = setTimeout(() => setLeadsVersion((v) => v + 1), 400);
    };
    // Org changed somewhere (operator action, Stripe webhook, activation):
    // invalidate the caches immediately, then nudge screens once per burst
    // (webhooks often fire invoice.paid + subscription.updated back to back).
    let orgTimer = null;
    const onOrgUpdated = (payload) => {
      superadminService.invalidateOrgCaches(payload?.organisationId);
      clearTimeout(orgTimer);
      orgTimer = setTimeout(() => setOrgsVersion((v) => v + 1), 400);
    };
    // Plan catalogue changed — plan edits also move MRR/plan breakdowns, which
    // `invalidatePlansCache` already clears (it drops the billing cache too).
    let planTimer = null;
    const onPlanUpdated = () => {
      superadminService.invalidatePlansCache();
      clearTimeout(planTimer);
      planTimer = setTimeout(() => setPlansVersion((v) => v + 1), 400);
    };
    const onBulletsUpdated = () => {
      superadminService.invalidateBulletsCache();
    };
    let couponTimer = null;
    const onCouponUpdated = () => {
      superadminService.invalidateCouponsCache();
      clearTimeout(couponTimer);
      couponTimer = setTimeout(() => setCouponsVersion((v) => v + 1), 400);
    };
    // Stripe mirrors invoices by webhook, so these arrive unprompted — and a
    // paid invoice also moves the billing/dashboard totals.
    let invoiceTimer = null;
    const onInvoiceUpdated = () => {
      superadminService.invalidateInvoicesCache();
      clearTimeout(invoiceTimer);
      invoiceTimer = setTimeout(() => setInvoicesVersion((v) => v + 1), 400);
    };
    // Ticket events used to be handled inside the Tickets screen, so anything
    // arriving while you were elsewhere was missed — which is why the list and
    // board force-refetched on every mount. Tracking staleness here means a
    // quiet cache can be trusted and an unchanged revisit costs no request.
    let ticketTimer = null;
    const onTicketChanged = (p) => {
      if (p?.id) superadminService.markTicketStale(p.id);
      superadminService.markTicketsStale();
      superadminService.markBoardStale();
      clearTimeout(ticketTimer);
      ticketTimer = setTimeout(() => setTicketsVersion((v) => v + 1), 400);
    };
    // A support-impersonation session started, ended, was revoked, or lapsed on
    // the server's sweep. Debounced shorter than the rest: this feeds the kill
    // switch, where "a moment behind" is the whole problem.
    let sessionTimer = null;
    const onSupportSession = () => {
      superadminService.invalidateSupportSessionsCache();
      clearTimeout(sessionTimer);
      sessionTimer = setTimeout(() => setSessionsVersion((v) => v + 1), 300);
    };
    // Platform settings (currently the Stripe credentials) are edited by
    // operators, so a second console open on the same screen would otherwise sit
    // on a cached view showing the wrong "which key is live" status.
    let platformTimer = null;
    const onPlatformUpdated = () => {
      platformService.markStripeStale();
      clearTimeout(platformTimer);
      clearTimeout(sessionTimer);
      platformTimer = setTimeout(() => setPlatformVersion((v) => v + 1), 400);
    };
    // Only a RE-connect can have missed events (the initial connect hasn't) —
    // and if the socket is already live when this effect runs, the next
    // "connect" we observe is by definition a reconnect.
    let hadConnected = s.connected;
    const onConnect = () => {
      refreshContactUnread();
      refreshBrandingPending();
      refreshNewLeadsCount();
      if (hadConnected) {
        // treat everything as possibly stale
        onOrgUpdated({});
        onPlanUpdated();
        onBulletsUpdated();
        onCouponUpdated();
        onInvoiceUpdated();
        onTicketChanged({});
        onPlatformUpdated();
        onSupportSession();
        onLead();
      }
      hadConnected = true;
    };
    s.on("connect", onConnect);
    s.on("contactQuery:new", onContact);
    s.on("contactQuery:message", onContact);
    s.on("contactQuery:updated", onContact);
    s.on("contactQuery:deleted", onContact);
    s.on("brandingRequest:new", onBranding);
    s.on("brandingRequest:updated", onBranding);
    s.on("brandingRequest:deleted", onBranding);
    s.on("organisation:updated", onOrgUpdated);
    s.on("plan:updated", onPlanUpdated);
    s.on("planBullets:updated", onBulletsUpdated);
    s.on("coupon:updated", onCouponUpdated);
    s.on("invoice:updated", onInvoiceUpdated);
    s.on("ticket:new", onTicketChanged);
    s.on("ticket:update", onTicketChanged);
    s.on("platform:updated", onPlatformUpdated);
    s.on("supportSession:updated", onSupportSession);
    s.on("lead:new", onLead);
    s.on("lead:message", onLead);
    s.on("lead:updated", onLead);
    s.on("lead:deleted", onLead);
    s.on("lead:converted", onLead);

    return () => {
      clearTimeout(orgTimer);
      clearTimeout(planTimer);
      clearTimeout(couponTimer);
      clearTimeout(invoiceTimer);
      clearTimeout(ticketTimer);
      clearTimeout(contactTimer);
      clearTimeout(platformTimer);
      clearTimeout(leadTimer);
      s.off("connect", onConnect);
      s.off("contactQuery:new", onContact);
      s.off("contactQuery:message", onContact);
      s.off("contactQuery:updated", onContact);
      s.off("contactQuery:deleted", onContact);
      s.off("brandingRequest:new", onBranding);
      s.off("brandingRequest:updated", onBranding);
      s.off("brandingRequest:deleted", onBranding);
      s.off("organisation:updated", onOrgUpdated);
      s.off("plan:updated", onPlanUpdated);
      s.off("planBullets:updated", onBulletsUpdated);
      s.off("coupon:updated", onCouponUpdated);
      s.off("invoice:updated", onInvoiceUpdated);
      s.off("ticket:new", onTicketChanged);
      s.off("ticket:update", onTicketChanged);
      s.off("platform:updated", onPlatformUpdated);
      s.off("supportSession:updated", onSupportSession);
      s.off("lead:new", onLead);
      s.off("lead:message", onLead);
      s.off("lead:updated", onLead);
      s.off("lead:deleted", onLead);
      s.off("lead:converted", onLead);
    };
  }, [user, refreshContactUnread, refreshBrandingPending, refreshNewLeadsCount]);

  // Tear the socket down on logout so a new login reconnects with a fresh token.
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);

  return (
    <SARealtimeContext.Provider
      value={{ unreadContactQueries, pendingBrandingRequests, newLeadsCount, refreshContactUnread, refreshBrandingPending, refreshNewLeadsCount, orgsVersion, plansVersion, couponsVersion, invoicesVersion, ticketsVersion, contactVersion, leadsVersion, platformVersion, sessionsVersion, socket }}
    >
      {children}
    </SARealtimeContext.Provider>
  );
}

export function useSARealtime() {
  return (
    useContext(SARealtimeContext) || {
      unreadContactQueries: 0,
      pendingBrandingRequests: 0,
      newLeadsCount: 0,
      refreshContactUnread: () => {},
      refreshBrandingPending: () => {},
      refreshNewLeadsCount: () => {},
      orgsVersion: 0,
      plansVersion: 0,
      couponsVersion: 0,
      invoicesVersion: 0,
      ticketsVersion: 0,
      contactVersion: 0,
      leadsVersion: 0,
      platformVersion: 0,
      sessionsVersion: 0,
      socket: null,
    }
  );
}
