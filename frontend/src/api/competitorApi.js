import client from "./client";

export const getCompetitors = async () => {
  const res = await client.get("/api/competitors");
  return res.data;
};

export const addCompetitor = async (data) => {
  const res = await client.post("/api/competitors", data);
  return res.data;
};

export const deleteCompetitor = async (id) => {
  const res = await client.delete(`/api/competitors/${id}`);
  return res.data;
};
