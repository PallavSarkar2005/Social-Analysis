import client from "./client";

/**
 * List reports. Pass an object for hub query params, or a string for legacy ?type=.
 */
export const getReports = async (params) => {
  const query =
    typeof params === "string" || params == null
      ? { type: params || undefined }
      : params;
  const res = await client.get("/api/reports", { params: query });
  return res.data;
};

export const getReportById = async (id) => {
  const res = await client.get(`/api/reports/${id}`);
  return res.data;
};

export const saveReport = async (data) => {
  const res = await client.post("/api/reports", data);
  return res.data;
};

export const upsertReport = async (data) => {
  const res = await client.post("/api/reports/upsert", data, {
    // Background hub indexing must never hard-redirect the active analysis page
    _skipErrorRedirect: true,
  });
  return res.data;
};

export const patchReport = async (id, data) => {
  const res = await client.patch(`/api/reports/${id}`, data);
  return res.data;
};

export const deleteReport = async (id, options = {}) => {
  const params = {};
  if (options.hard) params.hard = true;
  const res = await client.delete(`/api/reports/${id}`, { params });
  return res.data;
};

export const shareReport = async (id, data = {}) => {
  const res = await client.post(`/api/reports/${id}/share`, data);
  return res.data;
};

export const revokeReportShare = async (id) => {
  const res = await client.delete(`/api/reports/${id}/share`);
  return res.data;
};

export const getReportHistory = async (id, params = {}) => {
  const res = await client.get(`/api/reports/${id}/history`, { params });
  return res.data;
};

export const regenerateReport = async (id) => {
  const res = await client.post(`/api/reports/${id}/regenerate`);
  return res.data;
};

/** Public shared report — no auth cookie required */
export const getSharedReport = async (token) => {
  const res = await client.get(`/api/shared/${token}`);
  return res.data;
};
