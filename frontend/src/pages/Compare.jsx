import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { compareAccounts } from "../api/compareApi";
import { getCompareAccounts } from "../api/analyticsApi";
import CompareChart from "../components/charts/CompareChart";
import { BarChart3, Link as LinkIcon, Users, Trophy, Percent, Video, Eye, ShieldAlert, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function Compare() {
  const [activeTab, setActiveTab] = useState("direct"); // "direct" or "database"
  
  // Tab 1: Direct URLs
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [directData, setDirectData] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState("");

  // Tab 2: Database Stored Comparisons
  const [dbAccounts, setDbAccounts] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  const fetchDbAccounts = async () => {
    try {
      setDbLoading(true);
      const response = await getCompareAccounts();
      setDbAccounts(response.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tracked accounts comparison data.");
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "database") {
      fetchDbAccounts();
    }
  }, [activeTab]);

  const handleDirectCompare = async (e) => {
    e.preventDefault();
    if (!url1 || !url2) {
      setDirectError("Please enter both profile URLs.");
      return;
    }

    try {
      setDirectLoading(true);
      setDirectError("");
      setDirectData(null);
      
      const response = await compareAccounts(url1, url2);
      setDirectData(response);
      toast.success("Comparison analysis completed.");
    } catch (err) {
      console.error(err);
      setDirectError(
        err?.response?.data?.message || 
        "Failed to run direct comparison. Ensure both accounts are from the same platform and use correct formats."
      );
    } finally {
      setDirectLoading(false);
    }
  };

  // Logic to determine winner
  const getWinner = (val1, val2) => {
    const num1 = Number(val1 || 0);
    const num2 = Number(val2 || 0);
    if (num1 > num2) return "left";
    if (num2 > num1) return "right";
    return "tie";
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Comparison Matrix Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Compare social performance metrics side-by-side using URL index scrapers or database snapshots.
              </p>
            </div>

            {/* Tab Swappers */}
            <div className="bg-[#111319] border border-white/[0.08] p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveTab("direct")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  activeTab === "direct" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                URL vs URL
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  activeTab === "database" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Tracked Nodes Charts
              </button>
            </div>
          </div>

          {activeTab === "direct" ? (
            <div className="space-y-8">
              {/* Direct URLs Compare Form */}
              <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 sm:p-8 shadow-2xl">
                <form onSubmit={handleDirectCompare} className="space-y-6 max-w-5xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <LinkIcon size={12} /> Target Node 1
                      </label>
                      <input
                        type="text"
                        value={url1}
                        onChange={(e) => setUrl1(e.target.value)}
                        placeholder="Paste first YouTube channel or X profile link..."
                        className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <LinkIcon size={12} /> Target Node 2
                      </label>
                      <input
                        type="text"
                        value={url2}
                        onChange={(e) => setUrl2(e.target.value)}
                        placeholder="Paste second YouTube channel or X profile link..."
                        className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={directLoading}
                    className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition shadow-md active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
                  >
                    {directLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0112-7.32V4a10 10 0 00-10 10h2z" />
                        </svg>
                        Comparing Matrix...
                      </>
                    ) : (
                      "Compare Direct Nodes"
                    )}
                  </button>

                  {directError && (
                    <p className="text-xs font-semibold text-red-400 text-center">{directError}</p>
                  )}
                </form>
              </div>

              {/* URL Compare Results */}
              <AnimatePresence>
                {directData && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
                  >
                    {/* Account 1 Card */}
                    <div className={`bg-[#121318]/40 border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl transition-all ${
                      getWinner(directData.account1.followers, directData.account2.followers) === "left"
                        ? "border-indigo-500/40 bg-indigo-500/[0.01]"
                        : "border-white/[0.06]"
                    }`}>
                      <div className="flex items-center gap-4 border-b border-white/[0.06] pb-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-md">
                          {directData.account1.name?.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            {directData.account1.name}
                            {getWinner(directData.account1.followers, directData.account2.followers) === "left" && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                                <Trophy size={10} /> Leader
                              </span>
                            )}
                          </h2>
                          <p className="text-xs text-slate-400">@{directData.account1.username || directData.account1.name}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-white/[0.04] text-xs">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">Followers / Subs</span>
                          <span className="text-white font-bold">{Number(directData.account1.followers).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/[0.04] text-xs">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">
                            {directData.type === "youtube" ? "Total Videos" : "Total Posts"}
                          </span>
                          <span className="text-white font-bold">{Number(directData.account1.posts).toLocaleString()}</span>
                        </div>
                        {directData.type === "youtube" && (
                          <div className="flex justify-between py-2 border-b border-white/[0.04] text-xs">
                            <span className="text-slate-400 uppercase font-bold tracking-wider">Total Video Views</span>
                            <span className="text-white font-bold">{Number(directData.account1.views).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account 2 Card */}
                    <div className={`bg-[#121318]/40 border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl transition-all ${
                      getWinner(directData.account1.followers, directData.account2.followers) === "right"
                        ? "border-indigo-500/40 bg-indigo-500/[0.01]"
                        : "border-white/[0.06]"
                    }`}>
                      <div className="flex items-center gap-4 border-b border-white/[0.06] pb-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-md">
                          {directData.account2.name?.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            {directData.account2.name}
                            {getWinner(directData.account1.followers, directData.account2.followers) === "right" && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                                <Trophy size={10} /> Leader
                              </span>
                            )}
                          </h2>
                          <p className="text-xs text-slate-400">@{directData.account2.username || directData.account2.name}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-white/[0.04] text-xs">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">Followers / Subs</span>
                          <span className="text-white font-bold">{Number(directData.account2.followers).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/[0.04] text-xs">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">
                            {directData.type === "youtube" ? "Total Videos" : "Total Posts"}
                          </span>
                          <span className="text-white font-bold">{Number(directData.account2.posts).toLocaleString()}</span>
                        </div>
                        {directData.type === "youtube" && (
                          <div className="flex justify-between py-2 border-b border-white/[0.04] text-xs">
                            <span className="text-slate-400 uppercase font-bold tracking-wider">Total Video Views</span>
                            <span className="text-white font-bold">{Number(directData.account2.views).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stored Db Charts */}
              {dbLoading ? (
                <div className="h-64 bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse" />
              ) : dbAccounts.length > 1 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl">
                      <CompareChart data={dbAccounts} title="Followers Comparison" dataKey="followers" />
                    </div>
                    <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl">
                      <CompareChart data={dbAccounts} title="Average Views Comparison" dataKey="avgViews" />
                    </div>
                    <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl">
                      <CompareChart data={dbAccounts} title="Average Engagement Comparison" dataKey="avgEngagement" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-[#121318]/30 rounded-2xl border border-white/[0.06] border-dashed space-y-3">
                  <p className="text-sm font-semibold text-slate-400">Not enough tracked nodes.</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Index at least two channels in the Accounts page to visualize database comparative charts.
                  </p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
