/**
 * Route + data prefetch for instant navigation.
 * Call on sidebar hover / focus before the user clicks.
 */

import {
  getDashboardOverview,
  getTopVideos,
  getCompareAccounts,
} from "../api/analyticsApi";
import { getGroupsList } from "../api/groupApi";
import { getCompetitors } from "../api/competitorApi";
import { getReports } from "../api/reportApi";
import { getBillingStatus, getInvoices } from "../api/billingApi";
import { getAccounts } from "../api/accountApi";
import { asArray } from "./safeData";

const pageImporters = {
  "/dashboard": () => import("../pages/Dashboard"),
  "/analyzer": () => import("../pages/Analyzer"),
  "/compare": () => import("../pages/Compare"),
  "/competitors": () => import("../pages/Competitors"),
  "/reports": () => import("../pages/Reports"),
  "/ai-insights": () => import("../pages/AIInsights"),
  "/history": () => import("../pages/HistoryLogs"),
  "/settings": () => import("../pages/SettingsEngine"),
  "/billing": () => import("../pages/Billing"),
  "/pricing": () => import("../pages/Pricing"),
  "/profile": () => import("../pages/PoliticalProfile"),
};

const warmed = new Set();

/** Prefetch the JS chunk for a path (and nearest parent for nested routes). */
export function prefetchRoute(path) {
  if (!path || typeof path !== "string") return;
  const base = path.split("?")[0];
  const key =
    Object.keys(pageImporters).find((p) => base === p || base.startsWith(`${p}/`)) ||
    null;
  if (!key || warmed.has(key)) return;
  warmed.add(key);
  pageImporters[key]().catch(() => {
    warmed.delete(key);
  });
}

/**
 * Prefetch React Query data for common destinations.
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} path
 */
export async function prefetchRouteData(queryClient, path) {
  if (!queryClient || !path) return;
  const base = path.split("?")[0];

  try {
    if (base === "/dashboard") {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "overview"],
          queryFn: async () => (await getDashboardOverview())?.data ?? null,
          staleTime: 60_000,
        }),
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "groups"],
          queryFn: async () => asArray((await getGroupsList())?.data),
          staleTime: 60_000,
        }),
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "top-videos"],
          queryFn: async () => asArray((await getTopVideos())?.data),
          staleTime: 60_000,
        }),
        queryClient.prefetchQuery({
          queryKey: ["compare-accounts"],
          queryFn: async () => asArray((await getCompareAccounts())?.data),
          staleTime: 60_000,
        }),
      ]);
    }

    if (base === "/competitors") {
      await queryClient.prefetchQuery({
        queryKey: ["competitors"],
        queryFn: async () => (await getCompetitors())?.data || [],
        staleTime: 60_000,
      });
    }

    if (base === "/reports") {
      await queryClient.prefetchQuery({
        queryKey: ["reports"],
        queryFn: async () => {
          const res = await getReports();
          return {
            reports: res.data || [],
            pagination: res.pagination || null,
            count: res.count ?? (res.data || []).length,
          };
        },
        staleTime: 60_000,
      });
    }

    if (base === "/billing") {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["billing", "status"],
          queryFn: getBillingStatus,
          staleTime: 60_000,
        }),
        queryClient.prefetchQuery({
          queryKey: ["billing", "invoices"],
          queryFn: getInvoices,
          staleTime: 60_000,
        }),
      ]);
    }

    if (base === "/settings") {
      await queryClient.prefetchQuery({
        queryKey: ["accounts"],
        queryFn: async () => (await getAccounts())?.data || [],
        staleTime: 60_000,
      });
    }
  } catch {
    // Prefetch failures must never block navigation
  }
}

/** Warm both chunk + data on pointer intent */
export function prefetchOnIntent(queryClient, path) {
  prefetchRoute(path);
  prefetchRouteData(queryClient, path);
}
