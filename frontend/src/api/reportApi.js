import client from "./client";

export const getReports = async (type) => {
  const res = await client.get("/api/reports", { params: { type } });
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

export const deleteReport = async (id) => {
  const res = await client.delete(`/api/reports/${id}`);
  return res.data;
};
