import { useEffect, useMemo, useState } from "react";
import donationTypeService from "../../../../services/donationtypeservice";

// Generic last-resort defaults (used only when a tenant has no donation types
// configured AND the request fails). Charity-specific defaults — incl. Islamic
// categories for Muslim charities — are seeded per-tenant at registration.
const FALLBACK = [
  { donationType: "General Donation" }, { donationType: "Education Fund" }, { donationType: "Water Fund" },
  { donationType: "Food Fund" }, { donationType: "Emergency Fund" },
];

// Stale-while-revalidate: cached types render instantly, then we refresh in the
// background. Falls back to a sensible default list only when there's nothing
// cached and the request fails.
export default function useDonationTypes() {
  const [donationTypes, setDonationTypes] = useState(() => donationTypeService.getCached() || []);
  const [loading, setLoading] = useState(() => !donationTypeService.getCached());

  useEffect(() => {
    let active = true;
    donationTypeService
      .refresh()
      .then((list) => {
        if (active) setDonationTypes(list.length ? list : FALLBACK);
      })
      .catch((err) => {
        console.error("Error fetching donation types:", err);
        if (active) setDonationTypes((prev) => (prev.length ? prev : FALLBACK));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(
    () => donationTypes.map((t) => ({ value: t.donationType, label: t.donationType })),
    [donationTypes]
  );

  return { donationTypes, loading, options };
}
