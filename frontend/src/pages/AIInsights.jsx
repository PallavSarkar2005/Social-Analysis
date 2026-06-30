import { useEffect, useState, useRef } from "react";
import SidebarLayout from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getAccounts } from "../api/accountApi";
import { getChannelSummary } from "../api/analyticsApi";
import {
  Sparkles,
  Brain,
  Cpu,
  Send,
  RefreshCw,
  User,
  Copy,
  Check,
  RotateCcw,
  Square,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function AIInsights() {
  const [accounts, setAccounts] = useState([]);
  const [totalStats, setTotalStats] = useState({ subscribers: 0, views: 0, count: 0 });
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  
  // Active chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [aiOffline, setAiOffline] = useState(false);

  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Initialize and load telemetry details
  useEffect(() => {
    const loadTelemetry = async () => {
      try {
        const res = await getAccounts();
        const filtered = (res.data || []).filter((a) => a.platform === "youtube");
        setAccounts(filtered);

        let subs = 0;
        let views = 0;

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
    loadChatSessions();

    // Check if offline insights should be auto-loaded
    const savedOffline = sessionStorage.getItem("cached_offline_insights");
    if (savedOffline) {
      try {
        setChatHistory(JSON.parse(savedOffline));
        sessionStorage.removeItem("cached_offline_insights");
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamingContent, loading]);

  // Load past chat sessions from LocalStorage
  const loadChatSessions = () => {
    try {
      const stored = localStorage.getItem("socialiq_chat_sessions_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
          setChatHistory(parsed[0].history || []);
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch (e) {
      createNewSession();
    }
  };

  const saveSessions = (updatedSessions) => {
    setSessions(updatedSessions);
    localStorage.setItem("socialiq_chat_sessions_v1", JSON.stringify(updatedSessions));
  };

  const createNewSession = () => {
    const newId = "session_" + Math.random().toString(36).substring(2, 9);
    const newSession = {
      id: newId,
      title: `Conversation ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      history: [
        {
          id: "welcome",
          role: "assistant",
          content: "Hello! I am your Social IQ Political Research Assistant. I have indexed the real-time YouTube telemetry database. Ask me about party footprints (e.g. BJP vs Congress), specific leader statistics, state presence, or performance optimizations.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };

    const next = [newSession, ...sessions];
    saveSessions(next);
    setActiveSessionId(newId);
    setChatHistory(newSession.history);
    setAiOffline(false);
  };

  const switchSession = (id) => {
    const found = sessions.find((s) => s.id === id);
    if (found) {
      setActiveSessionId(id);
      setChatHistory(found.history || []);
      setAiOffline(false);
    }
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    const next = sessions.filter((s) => s.id !== id);
    saveSessions(next);
    if (activeSessionId === id) {
      if (next.length > 0) {
        setActiveSessionId(next[0].id);
        setChatHistory(next[0].history || []);
      } else {
        createNewSession();
      }
    }
  };

  const clearAllHistory = () => {
    localStorage.removeItem("socialiq_chat_sessions_v1");
    setSessions([]);
    createNewSession();
    toast.success("Chat history cleared.");
  };

  // Helper to copy content
  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Terminate active request
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      toast.success("Generation stopped.");
    }
  };

  // Send Prompt Message
  const handleSendMessage = async (customMessage) => {
    const textToSend = customMessage || inputMessage;
    if (!textToSend.trim() || loading) return;

    setAiOffline(false);
    setInputMessage("");
    setLoading(true);
    setStreamingContent("");

    const newMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...chatHistory, newMsg];
    setChatHistory(updatedHistory);

    // Sync back to local session store
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return { ...s, title: textToSend.substring(0, 24) + "...", history: updatedHistory };
      }
      return s;
    });
    saveSessions(updatedSessions);

    const getCookie = (name) => {
      if (typeof document === "undefined") return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    };

    // Setup abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = localStorage.getItem("token");
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${baseURL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        },
        credentials: "include",
        body: JSON.stringify({
          message: textToSend,
          history: updatedHistory.map((h) => ({ role: h.role, content: h.content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Provider returned error code");
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
        buffer = lines.pop();

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              } else if (parsed.content) {
                fullResponseText += parsed.content;
                setStreamingContent(fullResponseText);
              }
            } catch (e) {
              if (e.message.includes("GROQ") || e.message.includes("unconfigured")) {
                throw e;
              }
            }
          }
        }
      }

      const assistantMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: fullResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalHistory = [...updatedHistory, assistantMsg];
      setChatHistory(finalHistory);
      setStreamingContent("");

      const finalSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return { ...s, history: finalHistory };
        }
        return s;
      });
      saveSessions(finalSessions);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      setAiOffline(true);
      toast.error("AI service is temporarily offline.");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    // Find last user message
    const userMsgs = chatHistory.filter((m) => m.role === "user");
    if (userMsgs.length > 0) {
      const lastMsg = userMsgs[userMsgs.length - 1].content;
      // Chop off last assistant response if exists
      const lastIndex = chatHistory.length - 1;
      if (chatHistory[lastIndex].role === "assistant") {
        setChatHistory((prev) => prev.slice(0, -1));
      }
      handleSendMessage(lastMsg);
    }
  };

  const loadOfflineMockInsights = () => {
    const mockMsg = {
      id: "mock_" + Math.random().toString(36).substring(2, 9),
      role: "assistant",
      content: `### 🌐 LOCALIZED OFFLINE INSIGHTS CACHE

Loaded pre-saved political telemetry analysis reports from local indexed storage.

#### 📈 Combined Footprints
* **BJP footprint**: Tracked members have **12.8M** combined followers. Views average **24.2M** per creator.
* **Congress footprint**: Tracked leaders reach **6.4M** combined followers. Engagement averages **8.4%**.

#### 🎯 Actionable Optimization
1. Structure candidate profiles to include short-form briefs (under 2 minutes) to increase click rates.
2. Publish updates around **5:30 PM IST** to align with peak telemetry viewer traffic.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const finalHistory = [...chatHistory, mockMsg];
    setChatHistory(finalHistory);
    setAiOffline(false);

    const finalSessions = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return { ...s, history: finalHistory };
      }
      return s;
    });
    saveSessions(finalSessions);
    toast.success("Loaded offline insights cached reports.");
  };

  // Rendering Helper: Markdown + Code Blocks
  const renderMarkdown = (text) => {
    if (!text) return null;

    // Identify code block bounds
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].replace("```", "").trim() || "code";
        const codeText = lines.slice(1, -1).join("\n");
        return (
          <pre
            key={idx}
            className="my-3 p-4 rounded-xl bg-slate-950/80 border border-white/[0.06] font-mono text-[11px] text-indigo-300 overflow-x-auto select-text"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04] mb-2 text-[9px] text-slate-500 font-sans font-bold uppercase">
              <span>{lang}</span>
              <button
                type="button"
                onClick={() => copyMessage(codeText, idx)}
                className="hover:text-indigo-400 flex items-center gap-1 transition"
              >
                <Copy size={10} /> Copy
              </button>
            </div>
            <code>{codeText}</code>
          </pre>
        );
      }

      const lines = part.split("\n");
      return lines.map((line, lineIdx) => {
        if (line.startsWith("### ")) {
          return (
            <h4 key={`${idx}-${lineIdx}`} className="text-xs sm:text-sm font-bold text-white mt-4 mb-2">
              {line.replace("### ", "")}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3
              key={`${idx}-${lineIdx}`}
              className="text-sm sm:text-base font-black text-indigo-300 mt-5 mb-2 border-b border-white/[0.04] pb-1"
            >
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={`${idx}-${lineIdx}`} className="text-base sm:text-lg font-black text-indigo-400 mt-6 mb-3">
              {line.replace("# ", "")}
            </h2>
          );
        }
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          return (
            <li key={`${idx}-${lineIdx}`} className="ml-4 list-disc text-xs sm:text-sm text-slate-300 py-0.5">
              {line.trim().replace(/^[-*]\s+/, "")}
            </li>
          );
        }
        return (
          <p key={`${idx}-${lineIdx}`} className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-2 min-h-[1em]">
            {line}
          </p>
        );
      });
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
      <SidebarLayout />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-hidden max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative z-10">
          <Toaster position="top-right" />

          {/* Left panel: Conversation list & database overview */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
            {/* New chat & History list */}
            <div className="bg-[#111319]/80 border border-white/[0.06] rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col max-h-[300px] lg:max-h-[380px]">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-indigo-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Chat Sessions
                </span>
                <button
                  onClick={createNewSession}
                  className="p-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                  title="New Conversation"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => switchSession(s.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isActive
                          ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                          : "bg-white/[0.01] border-white/[0.04] text-slate-400 hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="truncate max-w-[170px] font-medium">{s.title}</span>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        className="hover:text-rose-400 p-0.5 rounded transition opacity-50 hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={clearAllHistory}
                className="mt-3 py-2 w-full border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition shrink-0"
              >
                <Trash2 size={13} /> Clear Chat History
              </button>
            </div>

            {/* Ground-truth stats */}
            <div className="bg-[#111319]/80 border border-white/[0.06] rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4">
                <Cpu size={14} className="animate-pulse" />
                Assistant Context
              </div>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-slate-500">Tracked Leaders</span>
                  <span className="text-white font-semibold">{totalStats.count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-slate-500">Subscribers</span>
                  <span className="text-white font-semibold">{totalStats.subscribers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-slate-500">Views Indexed</span>
                  <span className="text-white font-semibold">{totalStats.views.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Chat Interface */}
          <div className="flex-1 bg-[#111319]/80 border border-white/[0.06] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md relative min-h-[480px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 animate-pulse">
                  <Brain size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Political Intelligence Assistant</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">RAG model: Llama-3.3-70b-versatile</p>
                </div>
              </div>

              {loading && (
                <button
                  onClick={handleStopGeneration}
                  className="h-8 px-3 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Square size={10} fill="currentColor" /> Stop
                </button>
              )}
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-8">
                  <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Brain size={32} className="animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Ask anything</h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Index channel telemetries, footprints, leader rankings, or suggest political strategies.
                    </p>
                  </div>
                </div>
              )}

              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 h-8 w-8 flex items-center justify-center border ${
                      msg.role === "user"
                        ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400"
                        : "bg-purple-600/10 border-purple-500/20 text-purple-400"
                    }`}
                  >
                    {msg.role === "user" ? <User size={14} /> : <Brain size={14} />}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm border shadow-sm relative group ${
                        msg.role === "user"
                          ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-200 rounded-tr-none"
                          : "bg-white/[0.02] border-white/[0.04] text-slate-300 rounded-tl-none"
                      }`}
                    >
                      {/* Message copy & options */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyMessage(msg.content, msg.id)}
                          className="p-1 rounded bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white transition"
                          title="Copy Message"
                        >
                          {copiedId === msg.id ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                        </button>
                      </div>

                      {renderMarkdown(msg.content)}
                    </div>

                    <div
                      className={`text-[9px] text-slate-500 font-mono ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {msg.timestamp || "Just now"}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming content buffer */}
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

              {/* Loading skeletons */}
              {loading && !streamingContent && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="p-2 rounded-xl shrink-0 h-8 w-8 flex items-center justify-center border bg-purple-600/10 border-purple-500/20 text-purple-400">
                    <Brain size={14} className="animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] space-y-2 w-48 rounded-tl-none animate-pulse">
                    <div className="h-2 bg-white/10 rounded w-5/6" />
                    <div className="h-2 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              )}

              {/* Hardened Failure / Offline Inline UI Card */}
              {aiOffline && (
                <div className="p-5 border border-rose-500/20 bg-rose-500/5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg relative overflow-hidden backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">AI assistant temporarily offline</h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        LLM endpoints are rate-limited or unconfigured. You may retry or inspect mock cached records.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={loadOfflineMockInsights}
                      className="h-8 px-3 bg-purple-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition"
                    >
                      View Cached Insights
                    </button>
                    <button
                      onClick={() => handleSendMessage("Compare BJP vs Congress growth")}
                      className="h-8 px-3 border border-white/[0.08] hover:bg-white/[0.02] text-slate-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <RotateCcw size={10} /> Retry
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Footer Form & Prompt Chips */}
            <div className="p-4 border-t border-white/[0.06] bg-white/[0.01] shrink-0 space-y-3">
              {/* Predefined prompts */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar scrollbar-h-1 max-w-full">
                {suggestionChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(chip)}
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
                  className="h-11 w-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition shrink-0 active:scale-95 cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
