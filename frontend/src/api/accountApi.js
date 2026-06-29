import client from "./client";

export const getAccounts = async () => {
  const res = await client.get("/api/accounts");
  return res.data;
};

export const createAccount = async (data) => {
  const res = await client.post("/api/accounts", data);
  return res.data;
};

export const deleteAccount = async (id) => {
  const res = await client.delete(`/api/accounts/${id}`);
  return res.data;
};

export const updateAccountGroup = async (id, groupName) => {
  const res = await client.patch(`/api/accounts/${id}/group`, { group: groupName });
  return res.data;
};

export const updateAccountPartyState = async (id, party, state) => {
  const res = await client.patch(`/api/accounts/${id}/party-state`, { party, state });
  return res.data;
};
