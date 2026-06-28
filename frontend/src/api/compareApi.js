import client from "./client";

export const compareAccounts = async (url1, url2) => {
  const response = await client.post("/api/compare", { url1, url2 });
  return response.data;
};

export const compareYoutubeCreators = async (creator1, creator2) => {
  const response = await client.post("/api/compare/youtube", { creator1, creator2 });
  return response.data;
};
