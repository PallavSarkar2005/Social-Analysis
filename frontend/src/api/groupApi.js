import client from "./client";

export const getGroupsList = async () => {
  const response = await client.get("/api/groups");
  return response.data;
};

export const getGroupCreators = async (groupName) => {
  const response = await client.get(`/api/groups/${groupName}`);
  return response.data;
};
