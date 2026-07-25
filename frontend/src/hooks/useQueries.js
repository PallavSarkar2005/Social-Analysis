import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardOverview,
  getTopVideos,
  getForecast,
  getAnalyticsSeries,
  getAnalyticsLatest,
  getAnalyticsCompare,
  getCompareAccounts,
} from "../api/analyticsApi";
import { getGroupsList, getGroupCreators } from "../api/groupApi";
import {
  getAccounts,
  deleteAccount,
  updateAccountGroup,
  updateAccountPartyState,
} from "../api/accountApi";
import { analyzeYoutubeUrl } from "../api/analyzerApi";
import { compareAccounts, compareYoutubeCreators } from "../api/compareApi";
import { getChannelHistory } from "../api/historyApi";
import { syncAllChannels } from "../api/youtubeApi";
import { getNotifications, markAsRead, markAllAsRead } from "../api/notificationApi";
import {
  getReports,
  deleteReport as apiDeleteReport,
  patchReport as apiPatchReport,
} from "../api/reportApi";
import { getCompetitors, addCompetitor, deleteCompetitor } from "../api/competitorApi";
import { devWarn } from "../utils/devLog";
import { asArray } from "../utils/safeData";
import {
  getBillingStatus,
  cancelSubscription as apiCancelSubscription,
  resumeSubscription as apiResumeSubscription,
  getInvoices,
  getInvoice,
  getBillingPlans,
  createBillingOrder,
  verifyBillingPayment,
  applyCoupon,
} from "../api/billingApi";
import {
  getAccountStats,
  getPrivacyPreferences,
  updatePrivacyPreferences,
  getSecurityPreferences,
  updateSecurityPreferences,
  getAdvancedPreferences,
  updateAdvancedPreferences,
  getIntegrations,
  updateIntegration,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  getPlanCatalog,
  exportProfileData,
  resetWorkspace,
} from "../api/settingsApi";

// 1. Dashboard Hook
export const useDashboard = () => {
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const res = await getDashboardOverview();
      return res?.data ?? null;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const groupsQuery = useQuery({
    queryKey: ["dashboard", "groups"],
    queryFn: async () => {
      const res = await getGroupsList();
      return asArray(res?.data);
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const topContentQuery = useQuery({
    queryKey: ["dashboard", "top-videos"],
    queryFn: async () => {
      const res = await getTopVideos();
      return asArray(res?.data);
    },
    staleTime: 90_000,
    refetchInterval: 180_000,
  });

  const compareAccountsQuery = useQuery({
    queryKey: ["compare-accounts"],
    queryFn: async () => {
      const res = await getCompareAccounts();
      return asArray(res?.data);
    },
    staleTime: 90_000,
    refetchInterval: 180_000,
  });

  const syncMutation = useMutation({
    mutationFn: syncAllChannels,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["compare-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });

  return {
    overview: overviewQuery.data ?? null,
    overviewLoading: overviewQuery.isLoading,
    groups: asArray(groupsQuery.data),
    groupsLoading: groupsQuery.isLoading,
    topContent: asArray(topContentQuery.data),
    topContentLoading: topContentQuery.isLoading,
    compareAccounts: asArray(compareAccountsQuery.data),
    compareAccountsLoading: compareAccountsQuery.isLoading,
    loading:
      overviewQuery.isLoading ||
      groupsQuery.isLoading ||
      compareAccountsQuery.isLoading,
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

// 2. Creator Accounts Hook
export const useAccounts = () => {
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await getAccounts();
      return res.data || [];
    },
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["party-bjp"] });
      queryClient.invalidateQueries({ queryKey: ["party-congress"] });
      queryClient.invalidateQueries({ queryKey: ["party-other"] });
    },
  });

  return {
    accounts: accountsQuery.data || [],
    loading: accountsQuery.isLoading,
    deleteAccount: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
    updateAccountGroup: updateGroupMutation.mutateAsync,
    updateAccountPartyState: updatePartyStateMutation.mutateAsync,
    refetch: accountsQuery.refetch,
  };
};

// 3. Party Analytics Hook
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
    refetchOnMount: true,
    refetchInterval: 120_000,
    staleTime: 30_000,
    enabled: !!groupName,
  });
};

// 5. Analyzer Hook (action-driven; every click must hit backend)
export const useAnalyzer = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      searchUrl,
      group = "Other",
      force = true,
      state = "Unknown State",
      party = "Independent",
    }) => {
      return analyzeYoutubeUrl(searchUrl, group, force, state, party);
    },
    onSuccess: async (result) => {
      await queryClient.refetchQueries({
        predicate: (q) => q.queryKey[0]?.toString().startsWith("party"),
        type: "active",
      });

      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0]?.toString().startsWith("party"),
        type: "inactive",
      });

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["compare-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0]?.toString().startsWith("profile-"),
      });
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "snapshots",
      });
    },
  });

  return {
    data: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    analyze: mutation.mutateAsync,
    reset: mutation.reset,
  };
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
    staleTime: 60_000,
  });
};

// 7. Snapshots / Historical Growth Hook (AnalyticsEngine history)
export const useSnapshots = (accountId) => {
  return useQuery({
    queryKey: ["snapshots", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const [histRes, forecastRes] = await Promise.all([
        getChannelHistory(accountId),
        getForecast(accountId).catch((err) => {
          devWarn("Forecast failed, might not have enough historical snapshots yet:", err);
          return { success: true, data: { hasEnoughData: false } };
        }),
      ]);
      return {
        history: histRes.data || [],
        forecast: forecastRes?.data || null,
      };
    },
    enabled: !!accountId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
};
export const useAnalyticsSeries = (
  accountId,
  { range = "all", metrics = "subscribers,views,engagementRate" } = {}
) => {
  return useQuery({
    queryKey: ["analytics", "series", accountId, range, metrics],
    queryFn: async () => {
      if (!accountId) return null;
      const res = await getAnalyticsSeries(accountId, { range, metrics });
      return res?.data ?? null;
    },
    enabled: !!accountId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
};

export const useAnalyticsLatest = (accountId) => {
  return useQuery({
    queryKey: ["analytics", "latest", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const res = await getAnalyticsLatest(accountId);
      return res?.data ?? null;
    },
    enabled: !!accountId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
};

export const useAnalyticsCompare = (ids = []) => {
  const idKey = Array.isArray(ids) ? ids.filter(Boolean).join(",") : String(ids || "");
  return useQuery({
    queryKey: ["analytics", "compare", idKey],
    queryFn: async () => {
      if (!idKey) return [];
      const res = await getAnalyticsCompare(idKey.split(","));
      return asArray(res?.data);
    },
    enabled: !!idKey,
    staleTime: 60_000,
    refetchInterval: 120_000,
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
    staleTime: 30_000,
    refetchInterval: 60_000,
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

// 9. Reports Hook (Intelligence Hub — accepts optional list params)
export const useReports = (params = {}) => {
  const queryClient = useQueryClient();
  const hasParams = params && Object.keys(params).length > 0;

  const reportsQuery = useQuery({
    queryKey: hasParams ? ["reports", params] : ["reports"],
    queryFn: async () => {
      const res = await getReports(hasParams ? params : undefined);
      return {
        reports: res.data || [],
        pagination: res.pagination || null,
        count: res.count ?? (res.data || []).length,
      };
    },
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, hard }) =>
      hard ? apiDeleteReport(id, { hard: true }) : apiDeleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data }) => apiPatchReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const payload = reportsQuery.data;

  return {
    reports: payload?.reports || [],
    pagination: payload?.pagination || null,
    count: payload?.count ?? 0,
    loading: reportsQuery.isLoading,
    error: reportsQuery.error,
    isError: reportsQuery.isError,
    deleteReport: (id, opts) =>
      deleteMutation.mutateAsync(
        typeof id === "object" ? id : { id, hard: opts?.hard }
      ),
    deleting: deleteMutation.isPending,
    patchReport: (id, data) => patchMutation.mutateAsync({ id, data }),
    patching: patchMutation.isPending,
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
    staleTime: 60_000,
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
    staleTime: 60_000,
  });
};

export const useBillingPlans = () => {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: getBillingPlans,
    staleTime: 30 * 60 * 1000,
  });
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: getInvoices,
    staleTime: 60_000,
  });
};

export const useInvoice = (id) => {
  return useQuery({
    queryKey: ["billing", "invoice", id],
    queryFn: () => getInvoice(id),
    enabled: Boolean(id),
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

export const useResumeSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiResumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "status"] });
    },
  });
};

export const useCreateBillingOrder = () =>
  useMutation({
    mutationFn: createBillingOrder,
  });

export const useVerifyBillingPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyBillingPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
};

export const useApplyCoupon = () =>
  useMutation({
    mutationFn: applyCoupon,
  });


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

// 14. Settings Hooks
export const useAccountStats = () =>
  useQuery({
    queryKey: ["settings", "account-stats"],
    queryFn: async () => {
      const res = await getAccountStats();
      return res?.data ?? null;
    },
  });

export const usePrivacyPreferences = () =>
  useQuery({
    queryKey: ["settings", "privacy"],
    queryFn: async () => {
      const res = await getPrivacyPreferences();
      return res?.data ?? {};
    },
  });

export const useUpdatePrivacyPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePrivacyPreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "privacy"] }),
  });
};

export const useSecurityPreferences = () =>
  useQuery({
    queryKey: ["settings", "security"],
    queryFn: async () => {
      const res = await getSecurityPreferences();
      return res?.data ?? {};
    },
  });

export const useUpdateSecurityPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSecurityPreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "security"] }),
  });
};

export const useAdvancedPreferences = () =>
  useQuery({
    queryKey: ["settings", "advanced"],
    queryFn: async () => {
      const res = await getAdvancedPreferences();
      return res?.data ?? {};
    },
  });

export const useUpdateAdvancedPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdvancedPreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "advanced"] }),
  });
};

export const useIntegrations = () =>
  useQuery({
    queryKey: ["settings", "integrations"],
    queryFn: async () => {
      const res = await getIntegrations();
      return res?.data ?? { google: { connected: false }, integrations: [] };
    },
  });

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateIntegration(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] }),
  });
};

export const useApiKeys = () =>
  useQuery({
    queryKey: ["settings", "api-keys"],
    queryFn: async () => {
      const res = await listApiKeys();
      return res?.data ?? [];
    },
  });

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] }),
  });
};

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] }),
  });
};

export const usePlanCatalog = () =>
  useQuery({
    queryKey: ["settings", "plans"],
    queryFn: async () => {
      const res = await getPlanCatalog();
      return res?.data ?? { currency: "INR", plans: [] };
    },
    staleTime: 30 * 60 * 1000,
  });

export const useResetWorkspace = () =>
  useMutation({
    mutationFn: resetWorkspace,
  });

export const useExportProfileData = () =>
  useMutation({
    mutationFn: exportProfileData,
  });
