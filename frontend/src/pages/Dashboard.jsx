import { useState } from "react";
import { motion } from "framer-motion";
import { analyzeYoutubeUrl, analyzeXUrl } from "../api/analyzerApi";
import { getVideoInsights } from "../api/aiApi";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useEffect } from "react";
import ChannelSearch from "../components/dashboard/ChannelSearch";
import ChannelHeader from "../components/dashboard/ChannelHeader";
import KPICard from "../components/dashboard/KPICard";
import GrowthChart from "../components/dashboard/GrowthChart";
import RecentVideosGrid from "../components/dashboard/RecentVideosGrid";
import AIHealthCard from "../components/dashboard/AIHealthCard";
import FollowerChart from "../components/charts/FollowerChart";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [channel, setChannel] = useState(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const chartData = channel?.history || [];

  const handleAnalyze = async () => {
    try {
      setLoading(true);

      setResult(null);
      setChannel(null);

      let response;

      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        response = await analyzeYoutubeUrl(url);
      } else if (url.includes("x.com") || url.includes("twitter.com")) {
        response = await analyzeXUrl(url);
      } else {
        throw new Error("Unsupported URL");
      }

      setResult(response);

      if (response.type === "channel") {
        setChannel(response.data);
      }
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message || error.message || "Failed to analyze",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setLoadingInsights(true);

      const response = await getVideoInsights({
        title: result.data.title,
        views: result.data.views,
        likes: result.data.likes,
        comments: result.data.comments,
      });

      setInsights(response.insights);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="flex bg-slate-100">
      <Sidebar />

      <div className="flex-1 min-h-screen">
        <Navbar />

        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <ChannelSearch
            url={url}
            setUrl={setUrl}
            onAnalyze={handleAnalyze}
            loading={loading}
          />

          {result?.type === "video" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl overflow-hidden"
            >
              <img
                src={result.data.thumbnail}
                alt={result.data.title}
                className="w-full h-[450px] object-cover"
              />

              <div className="p-8">
                <h2 className="text-4xl font-bold">{result.data.title}</h2>

                <p className="text-gray-500 mt-2">{result.data.channel}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                  <KPICard
                    title="Views"
                    value={Number(result.data.views).toLocaleString()}
                  />

                  <KPICard
                    title="Likes"
                    value={Number(result.data.likes).toLocaleString()}
                  />

                  <KPICard
                    title="Comments"
                    value={Number(result.data.comments).toLocaleString()}
                  />

                  <KPICard
                    title="Engagement"
                    value={`${result.data.engagement}%`}
                  />
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleGenerateInsights}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  >
                    {loadingInsights ? "Generating..." : "Generate AI Insights"}
                  </button>
                </div>

                {insights && (
                  <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-3xl p-6">
                    <h2 className="text-2xl font-bold mb-4">AI Insights</h2>

                    <div className="whitespace-pre-wrap">{insights}</div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-6 mt-8">
                  <h3 className="font-bold text-xl mb-4">Description</h3>

                  <p className="whitespace-pre-wrap">
                    {result.data.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {channel && (
            <>
              <ChannelHeader channel={channel} />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                <KPICard
                  title="Subscribers"
                  value={channel.subscribers.toLocaleString()}
                />

                <KPICard
                  title="Total Views"
                  value={channel.totalViews.toLocaleString()}
                />

                <KPICard
                  title="Videos"
                  value={channel.videoCount.toLocaleString()}
                />

                <KPICard
                  title="Channel ID"
                  value={channel.channelId?.slice(0, 10) || "N/A"}
                />
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <GrowthChart data={chartData} />
                </div>

                <AIHealthCard channel={channel} />
              </div>

              <RecentVideosGrid videos={channel.recentVideos} />
            </>
          )}
          {result?.type === "x" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-4xl font-bold">{result.data.name}</h2>

                  <p className="text-gray-500 mt-2">@{result.data.username}</p>
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
                <KPICard title="Followers" value={result.data.followers} />

                <KPICard title="Following" value={result.data.following} />

                <KPICard title="Posts" value={result.data.posts} />
              </div>

              {result.data.history?.length > 0 && (
                <>
                  <div className="mt-8">
                    <FollowerChart data={result.data.history} />
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 mt-8">
                    <h3 className="font-bold text-xl mb-4">Follower History</h3>

                    {result.data.history.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between border-b py-3"
                      >
                        <span>{item.date}</span>

                        <span>{item.followers.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
