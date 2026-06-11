import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { analyzeYoutubeUrl, analyzeXUrl } from "../api/analyzerApi";
import { getVideoInsights } from "../api/aiApi";
import { getChannelInsights } from "../api/aiChannelApi";
import FollowerChart from "../components/charts/FollowerChart";

function Analyzer() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channelInsights, setChannelInsights] = useState("");

  const [loadingChannelInsights, setLoadingChannelInsights] = useState(false);
  const [insights, setInsights] = useState("");

  const [loadingInsights, setLoadingInsights] = useState(false);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError("");

      setResult(null);
      setInsights("");
      setChannelInsights("");

      let response;

      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        response = await analyzeYoutubeUrl(url);
      } else if (url.includes("x.com")) {
        response = await analyzeXUrl(url);
      } else {
        throw new Error("Unsupported URL");
      }

      console.log("API RESPONSE");
      console.log(response);

      setResult(response);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message || err.message || "Failed to analyze URL",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!result?.data) return;

    try {
      setLoadingInsights(true);

      const response = await getVideoInsights({
        title: result.data.title,
        views: result.data.views,
        likes: result.data.likes,
        comments: result.data.comments,
      });

      setInsights(response.insights);
    } catch (err) {
      console.error(err);

      setInsights("Failed to generate AI insights.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleChannelInsights = async () => {
    try {
      setLoadingChannelInsights(true);

      const response = await getChannelInsights({
        title: result.data.title,

        subscribers: result.data.subscribers,

        totalViews: result.data.totalViews,

        videoCount: result.data.videoCount,

        recentTitles: result.data.recentVideos.map((v) => v.snippet.title),
      });

      setChannelInsights(response.insights);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingChannelInsights(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 min-h-screen bg-slate-100">
        <Navbar />

        <div className="max-w-7xl mx-auto p-8">
          {/* Search */}
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2">Social Media Analyzer</h1>

            <p className="text-slate-500">
              Analyze YouTube videos, channels and X profiles
            </p>

            <div className="flex gap-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube or X URL..."
                className="flex-1 border rounded-2xl p-4 text-lg"
              />

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-8 py-4 bg-black text-white rounded-2xl hover:bg-gray-800"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            {error && <p className="mt-4 text-red-500">{error}</p>}
          </div>

          {/* VIDEO */}
          {result?.type === "video" && (
            <div className="bg-white rounded-3xl shadow-xl p-8 mt-8">
              <img
                src={result.data.thumbnail}
                alt={result.data.title}
                className="w-full h-[450px] object-cover rounded-3xl"
              />

              <h2 className="text-4xl font-bold mt-6">{result.data.title}</h2>

              <p className="text-gray-500 mt-2">{result.data.channel}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-slate-100 p-5 rounded-2xl">
                  <p className="text-gray-500">Views</p>
                  <h3 className="text-2xl font-bold">
                    {Number(result.data.views).toLocaleString()}
                  </h3>
                </div>

                <div className="bg-slate-100 p-5 rounded-2xl">
                  <p className="text-gray-500">Likes</p>
                  <h3 className="text-2xl font-bold">
                    {Number(result.data.likes).toLocaleString()}
                  </h3>
                </div>

                <div className="bg-slate-100 p-5 rounded-2xl">
                  <p className="text-gray-500">Comments</p>
                  <h3 className="text-2xl font-bold">
                    {Number(result.data.comments).toLocaleString()}
                  </h3>
                </div>

                <div className="bg-slate-100 p-5 rounded-2xl">
                  <p className="text-gray-500">Engagement</p>
                  <h3 className="text-2xl font-bold">
                    {result.data.engagement}%
                  </h3>
                </div>
              </div>

              <div className="mt-8 bg-slate-50 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-3">Description</h3>

                <p className="text-gray-700 whitespace-pre-wrap">
                  {result.data.description}
                </p>
              </div>

              {/* AI SECTION */}
              <div className="mt-8">
                <button
                  onClick={handleGenerateInsights}
                  disabled={loadingInsights}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                >
                  {loadingInsights
                    ? "Generating AI Insights..."
                    : "Generate AI Insights"}
                </button>
              </div>

              {insights && (
                <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-3xl p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">AI Insights</h2>

                  <div className="whitespace-pre-wrap leading-7">
                    {insights}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHANNEL */}
          {/* YOUTUBE CHANNEL */}
          {result?.type === "channel" && (
            <div className="mt-8">
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="flex items-center gap-6">
                  <img
                    src={result.data.thumbnail}
                    alt={result.data.title}
                    className="w-32 h-32 rounded-full border-4 border-gray-200"
                  />

                  <div>
                    <h2 className="text-4xl font-bold">{result.data.title}</h2>

                    <p className="text-gray-500 mt-2">
                      {result.data.description}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-slate-100 p-5 rounded-2xl">
                    <p className="text-gray-500">Subscribers</p>

                    <h3 className="text-2xl font-bold">
                      {Number(result.data.subscribers).toLocaleString()}
                    </h3>
                  </div>

                  <div className="bg-slate-100 p-5 rounded-2xl">
                    <p className="text-gray-500">Total Views</p>

                    <h3 className="text-2xl font-bold">
                      {Number(result.data.totalViews).toLocaleString()}
                    </h3>
                  </div>

                  <div className="bg-slate-100 p-5 rounded-2xl">
                    <p className="text-gray-500">Videos</p>

                    <h3 className="text-2xl font-bold">
                      {Number(result.data.videoCount).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-8 mt-8">
                <h3 className="text-2xl font-bold mb-6">Recent Videos</h3>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {result.data.recentVideos?.map((video) => (
                    <div
                      key={video.id.videoId}
                      className="bg-slate-50 rounded-2xl overflow-hidden shadow"
                    >
                      <img
                        src={video.snippet.thumbnails.high?.url}
                        alt={video.snippet.title}
                        className="w-full h-48 object-cover"
                      />

                      <div className="p-4">
                        <h4 className="font-bold line-clamp-2">
                          {video.snippet.title}
                        </h4>

                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(
                            video.snippet.publishedAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleChannelInsights}
                  disabled={loadingChannelInsights}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                >
                  {loadingChannelInsights
                    ? "Generating AI Channel Insights..."
                    : "Generate AI Channel Insights"}
                </button>
              </div>

              {channelInsights && (
                <div className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">
                    AI Channel Insights
                  </h2>

                  <div className="whitespace-pre-wrap leading-7">
                    {channelInsights}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* X PROFILE */}
          {result?.type === "x" && (
            <div className="mt-8">
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-bold">{result.data.name}</h2>

                    <p className="text-gray-500 mt-2">
                      @{result.data.username}
                    </p>
                  </div>

                  <a
                    href={result.data.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 bg-black text-white rounded-xl"
                  >
                    Open Profile
                  </a>
                </div>

                <p className="mt-6 text-gray-700">{result.data.bio}</p>

                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-slate-100 p-5 rounded-2xl">
                    <p className="text-gray-500">Followers</p>

                    <h3 className="text-3xl font-bold">
                      {result.data.followers}
                    </h3>
                  </div>

                  <div className="bg-slate-100 p-5 rounded-2xl">
                    <p className="text-gray-500">Following</p>

                    <h3 className="text-3xl font-bold">
                      {result.data.following}
                    </h3>
                  </div>

                  <div className="bg-slate-100 p-5 rounded-2xl">
                    <p className="text-gray-500">Posts</p>

                    <h3 className="text-3xl font-bold">{result.data.posts}</h3>
                  </div>
                </div>

                {result?.data?.history?.length > 0 && (
                  <>
                    <div className="mt-8">
                      <FollowerChart data={result.data.history} />
                    </div>
                    <div className="mt-8 bg-slate-50 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4">
                        Follower History
                      </h3>

                      {result.data.history.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between border-b py-3"
                        >
                          <span>{item.date}</span>

                          <span className="font-semibold">
                            {item.followers.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analyzer;
