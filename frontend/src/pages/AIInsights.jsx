import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getAccounts } from "../api/accountApi";
import { getChannelSummary } from "../api/analyticsApi";
import { Sparkles, Brain, Cpu, Send, RefreshCw, BarChart2, ShieldAlert, ArrowRight, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function AIInsights() {
  const [accounts, setAccounts] = useState([]);
  const [totalStats, setTotalStats] = useState({ subscribers: 0, views: 0, count: 0 });
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: "Hello! I am your Social IQ Political Research Assistant. I have indexed the real-time YouTube telemetry database. Ask me about party footprints (e.g. BJP vs Congress), specific leader statistics, state presence, or performance optimizations.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadTelemetry = async () => {
      try {
        const res = await getAccounts();
        const filtered = (res.data || []).filter((a) => a.platform === "youtube");
        setAccounts(filtered);

        let subs = 0;
        let views = 0;

        // Fetch summaries for all tracked creators in parallel to construct database metrics overview
        await Promise.all(
          filtered.map(async (acc) => {
            try {
              const sumRes = await getChannelSummary(acc._id);
              if (sumRes.data) {
                subs += Number(sumRes.data.followers || 0);
                views += Number(sumRes.data.totalViews || 0);
              }
            } catch (e) {
              console.warn(`Could not load summary for ${acc.name}`);
            }
          })
        );

        setTotalStats({
          subscribers: subs,
          views: views,
          count: filtered.length,
        });
      } catch (err) {
        console.error("Failed to load political telemetry dashboard:", err);
      }
    };
    loadTelemetry();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamingContent]);

  const handleSendMessage = async (customMessage) => {
    const textToSend = customMessage || inputMessage;
    if (!textToSend.trim() || loading) return;

    // Append user message
    const updatedHistory = [...chatHistory, { role: "user", content: textToSend }];
    setChatHistory(updatedHistory);
    setInputMessage("");
    setLoading(true);
    setStreamingContent("");

    try {
      const token = localStorage.getItem("token");
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const response = await fetch(`${baseURL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend,
          history: updatedHistory.map((h) => ({ role: h.role, content: h.content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant response failed. Verify GROQ_API_KEY.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Hold incomplete chunk

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.slice(6).trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                toast.error(parsed.error);
                fullResponseText += `\n\n*Error: ${parsed.error}*`;
                setStreamingContent(fullResponseText);
              } else if (parsed.content) {
                fullResponseText += parsed.content;
                setStreamingContent(fullResponseText);
              }
            } catch (e) {
              // ignore JSON parse exceptions for partial lines
            }
          }
        }
      }

      // Save streamed content to history
      setChatHistory((prev) => [...prev, { role: "assistant", content: fullResponseText }]);
      setStreamingContent("");
    } catch (err) {
      console.error(err);
      toast.error("AI service is offline. Please check connection.");
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Political Research Assistant offline. Verify that `GROQ_API_KEY` is loaded and active in backend `.env` configuration.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (prompt) => {
    handleSendMessage(prompt);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-xs sm:text-sm font-bold text-white mt-4 mb-2">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-sm sm:text-base font-black text-indigo-300 mt-5 mb-2 border-b border-white/[0.04] pb-1">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-base sm:text-lg font-black text-indigo-400 mt-6 mb-3">{line.replace("# ", "")}</h2>;
      }
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return <li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-slate-300 py-0.5">{line.trim().replace(/^[-*]\s+/, "")}</li>;
      }
      return <p key={idx} className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-2 min-h-[1em]">{line}</p>;
    });
  };

  const suggestionChips = [
    "Compare BJP vs Congress growth",
    "Identify top political performers",
    "State-wise tracked presence distribution",
    "Analyze Narendra Modi's performance",
  ];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-hidden max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative z-10">
          <Toaster position="top-right" />

          {/* Left Panel: Ground-Truth Database Context */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            <div className="bg-[#111319]/80 border border-white/[0.06] rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4">
                <Cpu size={14} className="animate-pulse" />
                Assistant Memory Context
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-slate-500">Tracked Leaders</span>
                  <span className="text-white font-semibold">{totalStats.count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-slate-500">Total Subscribers</span>
                  <span className="text-white font-semibold">{totalStats.subscribers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-slate-500">Total Views Indexed</span>
                  <span className="text-white font-semibold">{totalStats.views.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-sans">
                These cumulative metrics represent verified database context injected automatically into the LLM system prompt.
              </p>
            </div>

            <div className="hidden lg:block bg-[#111319]/40 border border-white/[0.04] rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Indexed Channels</h3>
              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {accounts.map((acc) => (
                  <div key={acc._id} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs">
                    <span className="text-slate-200 font-medium truncate max-w-[120px]">{acc.name}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20 capitalize">
                      {acc.party}
                    </span>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <div className="text-[10px] text-slate-500 text-center py-4">No accounts indexed yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Chat Interface */}
          <div className="flex-1 bg-[#111319]/80 border border-white/[0.06] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md relative">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Brain size={18} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Political Intelligence Assistant</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">RAG model: Llama-3.3-70b-versatile</p>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  <div className={`p-2 rounded-xl shrink-0 h-8 w-8 flex items-center justify-center border ${
                    msg.role === "user" 
                      ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400" 
                      : "bg-purple-600/10 border-purple-500/20 text-purple-400"
                  }`}>
                    {msg.role === "user" ? <User size={14} /> : <Brain size={14} />}
                  </div>

                  <div className={`p-4 rounded-2xl text-xs sm:text-sm border shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-200 rounded-tr-none"
                      : "bg-white/[0.02] border-white/[0.04] text-slate-300 rounded-tl-none"
                  }`}>
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}

              {/* Streaming message chunk block */}
              {streamingContent && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="p-2 rounded-xl shrink-0 h-8 w-8 flex items-center justify-center border bg-purple-600/10 border-purple-500/20 text-purple-400">
                    <Brain size={14} className="animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl text-xs sm:text-sm border border-white/[0.04] bg-white/[0.02] text-slate-300 rounded-tl-none">
                    {renderMarkdown(streamingContent)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Footer Form & Prompt Chips */}
            <div className="p-4 border-t border-white/[0.06] bg-white/[0.01] shrink-0 space-y-3">
              
              {/* Predefined prompt chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar scrollbar-h-1 max-w-full">
                {suggestionChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleChipClick(chip)}
                    disabled={loading}
                    className="shrink-0 h-7 px-3 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-indigo-500/30 text-[10px] text-slate-400 hover:text-white transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message send form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about BJP vs Congress, Narendra Modi stats..."
                  className="flex-1 h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] focus:outline-none focus:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-600 transition"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="h-11 w-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition shrink-0 active:scale-95"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
