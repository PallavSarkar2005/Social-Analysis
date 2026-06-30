import client from "./client";

export const getGroupsList = async () => {
  const response = await client.get("/api/groups");
  return response.data;
};

export const getGroupCreators = async (groupName) => {
  const response = await client.get(`/api/groups/${groupName}`);
  return response.data;
};

/**
 * Triggers a one-time server-side heal of any XSS-mangled image URLs
 * in MongoDB. Safe to call multiple times — only fixes records that need it.
 */
export const healGroupImageUrls = async () => {
  const response = await client.post("/api/groups/heal-images");
  return response.data;
};
