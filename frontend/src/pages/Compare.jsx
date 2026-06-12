import { useState } from "react";
import { compareAccounts } from "../api/compareApi";

export default function Compare() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    try {
      setLoading(true);

      const response = await compareAccounts(url1, url2);

      setData(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-8">Compare Accounts</h1>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={url1}
              onChange={(e) => setUrl1(e.target.value)}
              placeholder="First X URL"
              className="border rounded-2xl p-4"
            />

            <input
              value={url2}
              onChange={(e) => setUrl2(e.target.value)}
              placeholder="Second X URL"
              className="border rounded-2xl p-4"
            />
          </div>

          <button
            onClick={handleCompare}
            className="mt-6 px-8 py-4 bg-black text-white rounded-2xl"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {data && (
          <div className="grid md:grid-cols-2 gap-8 mt-10">
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <h2 className="text-3xl font-bold">{data.account1.name}</h2>

              <p>@{data.account1.username}</p>

              <div className="mt-6 space-y-2">
                <p>Followers: {data.account1.followers}</p>
                <p>Following: {data.account1.following}</p>
                <p>Posts: {data.account1.posts}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <h2 className="text-3xl font-bold">{data.account2.name}</h2>

              <p>@{data.account2.username}</p>

              <div className="mt-6 space-y-2">
                <p>Followers: {data.account2.followers}</p>
                <p>Following: {data.account2.following}</p>
                <p>Posts: {data.account2.posts}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
