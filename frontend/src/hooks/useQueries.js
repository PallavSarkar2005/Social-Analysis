import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardOverview,
  getTopVideos,
  getForecast,
} from "../api/analyticsApi";
import { getCompareAccounts } from "../api/analyticsApi";
import { getGroupsList, getGroupCreators } from "../api/groupApi";
import {
  getAccounts,
  createAccount,
  deleteAccount,
  updateAccountGroup,
  updateAccountPartyState,
} from "../api/accountApi";
import { analyzeYoutubeUrl } from "../api/analyzerApi";
import { compareAccounts, compareYoutubeCreators } from "../api/compareApi";
import { getChannelHistory } from "../api/historyApi";
import { syncAllChannels } from "../api/youtubeApi";
import { getNotifications, markAsRead, markAllAsRead } from "../api/notificationApi";
import { getReports, deleteReport as apiDeleteReport } from "../api/reportApi";
import { getCompetitors, addCompetitor, deleteCompetitor } from "../api/competitorApi";
import { getBillingStatus, cancelSubscription as apiCancelSubscription, getInvoices } from "../api/billingApi";

// 1. Dashboard Hook
export const useDashboard = () => {
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const res = await getDashboardOverview();
      return res.data;
    },
    refetchInterval: 30000, // 30 seconds automatic refetch
  });

  const groupsQuery = useQuery({
    queryKey: ["dashboard", "groups"],
    queryFn: async () => {
      const res = await getGroupsList();
      return res.data || [];
    },
    refetchInterval: 30000,
  });

  const topContentQuery = useQuery({
    queryKey: ["dashboard", "top-videos"],
    queryFn: async () => {
      const res = await getTopVideos();
      return res.data || [];
    },
    refetchInterval: 45000,
  });

  const compareAccountsQuery = useQuery({
    queryKey: ["compare-accounts"],
    queryFn: async () => {
      const res = await getCompareAccounts();
      return res.data || [];
    },
    refetchInterval: 45000,
  });

  const syncMutation = useMutation({
    mutationFn: syncAllChannels,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["compare-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return {
    overview: overviewQuery.data,
    overviewLoading: overviewQuery.isLoading,
    groups: groupsQuery.data,
    groupsLoading: groupsQuery.isLoading,
    topContent: topContentQuery.data,
    topContentLoading: topContentQuery.isLoading,
    compareAccounts: compareAccountsQuery.data || [],
    compareAccountsLoading: compareAccountsQuery.isLoading,
    loading: overviewQuery.isLoading || groupsQuery.isLoading || topContentQuery.isLoading,
    syncAll: syncMutation.mutateAsync,
    syncing: syncMutation.isPending,
    refetch: () => {
      overviewQuery.refetch();
      groupsQuery.refetch();
      topContentQuery.refetch();
      compareAccountsQuery.refetch();
    },
  };
};

// 2. Creator Accounts Hook (Tracked Connections)
export const useAccounts = () => {
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await getAccounts();
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["trackedNodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["compare-accounts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["trackedNodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["compare-accounts"] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, group }) => updateAccountGroup(id, group),
    onMutate: async ({ id, group }) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previousAccounts = queryClient.getQueryData(["accounts"]);
      queryClient.setQueryData(["accounts"], (old) =>
        old ? old.map((acc) => (acc._id === id ? { ...acc, group } : acc)) : []
      );
      return { previousAccounts };
    },
    onError: (err, newValues, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(["accounts"], context.previousAccounts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["trackedNodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["party-bjp"] });
      queryClient.invalidateQueries({ queryKey: ["party-congress"] });
      queryClient.invalidateQueries({ queryKey: ["party-other"] });
    },
  });

  const updatePartyStateMutation = useMutation({
    mutationFn: ({ id, party, state }) => updateAccountPartyState(id, party, state),
    onMutate: async ({ id, party, state }) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previousAccounts = queryClient.getQueryData(["accounts"]);
      queryClient.setQueryData(["accounts"], (old) =>
        old
          ? old.map((acc) =>
              acc._id === id
                ? {
                    ...acc,
                    party: party !== undefined ? party : acc.party,
                    state: state !== undefined ? state : acc.state,
                  }
                : acc
            )
          : []
      );
      return { previousAccounts };
    },
    onError: (err, newValues, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(["accounts"], context.previousAccounts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["trackedNodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["party-bjp"] });
      queryClient.invalidateQueries({ queryKey: ["party-congress"] });
      queryClient.invalidateQueries({ queryKey: ["party-other"] });
    },
  });

  return {
    accounts: accountsQuery.data || [],
    loading: accountsQuery.isLoading,
    createAccount: createMutation.mutateAsync,
    creating: createMutation.isPending,
    deleteAccount: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
    updateAccountGroup: updateGroupMutation.mutateAsync,
    updateAccountPartyState: updatePartyStateMutation.mutateAsync,
    refetch: accountsQuery.refetch,
  };
};

// 3. Tracked Nodes Hook (Background Sync list)
export const useTrackedNodes = () => {
  return useQuery({
    queryKey: ["trackedNodes"],
    queryFn: async () => {
      const res = await getAccounts();
      return res.data || [];
    },
    refetchInterval: 30000, // 30s background refetch
  });
};

// 4. Party Analytics Hook
export const useParty = (groupName) => {
  const queryKey =
    groupName?.toLowerCase() === "bjp"
      ? ["party-bjp"]
      : groupName?.toLowerCase() === "congress"
      ? ["party-congress"]
      : ["party-other", groupName];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getGroupCreators(groupName);
      return res.data || [];
    },
    refetchInterval: 30000,
    enabled: !!groupName,
  });
};

// 5. Analyzer Hook (With stale duration cache strategy + cache busting after save)
export const useAnalyzer = (searchUrl, group = "Other", force = false, state = "Unknown State", party = "Independent", profileImage = "") => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["analyzer", searchUrl, group, force, state, party, profileImage],
    queryFn: async () => {
      if (!searchUrl) return null;
      const result = await analyzeYoutubeUrl(searchUrl, group, force, state, party, profileImage);
      // After a successful analysis, invalidate all downstream caches so
      // Party Analytics, Dashboard, Tracked Nodes reflect the new data immediately
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["trackedNodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["compare-accounts"] });
      // Invalidate all party caches generically
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().startsWith("party") });
      return result;
    },
    enabled: !!searchUrl,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// 6. Comparison Hook
export const useCompare = (creator1, creator2) => {
  return useQuery({
    queryKey: ["compare", creator1, creator2],
    queryFn: async () => {
      if (!creator1 || !creator2) return null;
      return await compareYoutubeCreators(creator1, creator2);
    },
    enabled: !!creator1 && !!creator2,
  });
};

// 7. Snapshots / Historical Growth Hook
export const useSnapshots = (accountId) => {
  return useQuery({
    queryKey: ["snapshots", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const [histRes, forecastRes] = await Promise.all([
        getChannelHistory(accountId),
        getForecast(accountId).catch((err) => {
          console.warn("Forecast failed, might not have enough historical snapshots yet:", err);
          return { success: true, data: { hasEnoughData: false } };
        })
      ]);
      return {
        history: histRes.data || [],
        forecast: forecastRes?.data || null,
      };
    },
    enabled: !!accountId,
  });
};

// 8. Notifications Hook
export const useNotifications = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await getNotifications();
      return res.data || [];
    },
    refetchInterval: 20000, // 20s background refetch
  });

  const readMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    loading: notificationsQuery.isLoading,
    markAsRead: readMutation.mutateAsync,
    markAllAsRead: readAllMutation.mutateAsync,
    refetch: notificationsQuery.refetch,
  };
};

// 9. Reports Hook
export const useReports = () => {
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await getReports();
      return res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  return {
    reports: reportsQuery.data || [],
    loading: reportsQuery.isLoading,
    deleteReport: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
    refetch: reportsQuery.refetch,
  };
};

// 10. Competitors Hook
export const useCompetitors = () => {
  const queryClient = useQueryClient();

  const competitorsQuery = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const res = await getCompetitors();
      return res.data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: addCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
    },
  });

  return {
    competitors: competitorsQuery.data || [],
    loading: competitorsQuery.isLoading,
    addCompetitor: addMutation.mutateAsync,
    adding: addMutation.isPending,
    deleteCompetitor: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
    refetch: competitorsQuery.refetch,
  };
};

// 12. Billing Hooks
export const useBillingStatus = () => {
  return useQuery({
    queryKey: ["billing", "status"],
    queryFn: getBillingStatus,
  });
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: getInvoices,
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiCancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "status"] });
    },
  });
};

// 13. Appearance Preferences Hook (server-synced via AppearanceContext)
// This is a lightweight read-only query — actual mutations go through AppearanceContext directly.
export const useAppearanceQuery = () => {
  return useQuery({
    queryKey: ["settings", "appearance"],
    queryFn: async () => {
      const { default: client } = await import("../api/client");
      const res = await client.get("/api/settings/appearance", { _skipErrorRedirect: true });
      return res.data?.data || null;
    },
    staleTime: 10 * 60 * 1000, // 10 min — appearance rarely changes
    retry: 0,
  });
};
