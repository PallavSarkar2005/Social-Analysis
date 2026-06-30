import { useState, useEffect, useRef } from "react";
import { Bell, Sparkles, LogOut, CheckCheck, RefreshCw, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getNotifications, markAsRead, markAllAsRead } from "../../api/notificationApi";
import client from "../../api/client";
import toast from "react-hot-toast";
import PartyLogo from "../common/PartyLogo";


export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [realSearchOpen, setRealSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchContainerRef = useRef(null);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await client.get(`/api/search?query=${encodeURIComponent(val)}`);
      if (res.data && res.data.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      console.warn("Failed search execution", err);
    } finally {
      setSearching(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      console.warn("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 45 seconds for background changes
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click-away listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setRealSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (e) {
      toast.error("Logout failed");
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      await fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
      await fetchNotifications();
    } catch (e) {
      console.error(e);
      toast.error("Failed to mark notifications read.");
    }
  };

  // Safe checks for user fields
  const userName = user?.name || "User Node";
  const userRole = user?.role || "Analytics User";
  const isAvatarUrl = user?.avatar && (user.avatar.startsWith("http") || user.avatar.includes("svg"));

  return (
    <>
      {!isOnline && (
        <div className="w-full bg-rose-600/20 border-b border-rose-500/30 text-rose-200 text-center py-2 text-[10px] font-mono font-bold flex items-center justify-center gap-2 animate-pulse z-[60] relative">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
          Offline Mode: Telemetry synchronization is paused. Check connection.
        </div>
      )}
      <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="h-20 w-full bg-[#111319] border-b border-white/[0.08] flex items-center justify-between px-4 sm:px-6 lg:px-8 relative z-50 shadow-lg shadow-black/50 select-none"
    >
      {/* Left Section: Contextual Title */}
      <div className="min-w-0 py-2">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
          Social Analytics Node
        </h1>
        <p className="hidden sm:block text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
          Real-time cross-platform analytics engine
        </p>
      </div>

      {/* Global Search Bar */}
      <div className="hidden md:flex items-center relative max-w-xs xl:max-w-md w-full mx-6" ref={searchContainerRef}>
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search accounts, competitors, reports, history..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setRealSearchOpen(true)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* Dropdown Results */}
        {realSearchOpen && (searchResults || searchQuery) && (
          <div className="absolute top-12 left-0 w-full bg-[#121318] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 p-2.5 space-y-3.5 max-h-96 overflow-y-auto">
            {searching ? (
              <div className="text-[10px] text-slate-400 font-semibold p-3 text-center flex items-center justify-center gap-2">
                <RefreshCw size={12} className="animate-spin text-indigo-400" />
                Searching...
              </div>
            ) : (
              <>
                {/* Accounts */}
                {searchResults?.accounts?.length > 0 && (
                  <div className="space-y-1 text-left">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5">
                      My Channels
                    </div>
                    {searchResults.accounts.map((acc) => (
                      <button
                        key={acc._id}
                        onClick={() => {
                          navigate("/accounts");
                          setRealSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-white/[0.03] text-slate-200 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <PartyLogo party={acc.party} size={18} />
                          <span className="font-medium truncate max-w-[130px]">{acc.name}</span>
                        </div>
                        <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full capitalize">
                          {acc.platform}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Competitors */}
                {searchResults?.competitors?.length > 0 && (
                  <div className="space-y-1 text-left">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5">
                      Competitors
                    </div>
                    {searchResults.competitors.map((comp) => (
                      <button
                        key={comp._id}
                        onClick={() => {
                          navigate("/competitors");
                          setRealSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-white/[0.03] text-slate-200 transition flex items-center justify-between"
                      >
                        <span className="font-medium">{comp.name}</span>
                        <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full capitalize">
                          {comp.platform}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reports */}
                {searchResults?.reports?.length > 0 && (
                  <div className="space-y-1 text-left">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5">
                      Saved Reports
                    </div>
                    {searchResults.reports.map((rep) => (
                      <button
                        key={rep._id}
                        onClick={() => {
                          navigate("/reports");
                          setRealSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-white/[0.03] text-slate-200 transition flex items-center justify-between"
                      >
                        <span className="font-medium truncate max-w-[180px]">{rep.title}</span>
                        <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full capitalize">
                          {rep.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* History */}
                {searchResults?.history?.length > 0 && (
                  <div className="space-y-1 text-left">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5">
                      History Snapshot Logs
                    </div>
                    {searchResults.history.map((hist) => (
                      <button
                        key={hist._id}
                        onClick={() => {
                          navigate("/history");
                          setRealSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-white/[0.03] text-slate-200 transition flex items-center justify-between"
                      >
                        <span className="font-medium">{hist.accountName}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(hist.capturedAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results placeholder */}
                {(!searchResults ||
                  (searchResults.accounts?.length === 0 &&
                    searchResults.competitors?.length === 0 &&
                    searchResults.reports?.length === 0 &&
                    searchResults.history?.length === 0)) && (
                  <div className="text-[10px] text-slate-500 text-center p-3">
                    No matching records found.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Section: System Metrics & Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Premium AI Status Badge */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide"
        >
          <Sparkles size={13} className="animate-pulse text-indigo-400" />
          <span className="hidden xs:inline">AI Engine Active</span>
          <span className="xs:hidden">AI</span>
        </motion.div>

        {/* System Version Pin */}
        <div className="hidden md:block px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 font-mono text-[11px]">
          v1.0.4_core
        </div>

        {/* Notification Bell Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`relative p-2.5 rounded-xl border transition-all group focus:outline-none shadow-sm ${
              dropdownOpen
                ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                : "bg-white/[0.04] border-white/[0.08] text-slate-200 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
            
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-indigo-600 border border-[#111319] text-[9px] font-black text-white shadow-md">
                {unreadCount}
              </span>
            )}
          </motion.button>

          {/* Notifications Dropdown Panel */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#121318] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition"
                    >
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>

                {/* Body list */}
                <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No notifications to display.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => !notif.isRead && handleMarkRead(notif._id)}
                        className={`p-4 text-left transition-colors cursor-pointer relative ${
                          notif.isRead
                            ? "bg-transparent hover:bg-white/[0.01]"
                            : "bg-indigo-600/[0.03] hover:bg-indigo-600/[0.06]"
                        }`}
                      >
                        {/* Unread Blue dot */}
                        {!notif.isRead && (
                          <span className="absolute top-4 left-3 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}

                        <div className={`${!notif.isRead ? "pl-3.5" : ""}`}>
                          <h4 className="text-xs font-bold text-slate-200">{notif.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                            {notif.message}
                          </p>
                          <span className="text-[9px] text-slate-500 mt-2 block font-mono">
                            {new Date(notif.createdAt).toLocaleDateString()} at{" "}
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Separator Line */}
        <div className="h-6 w-[1px] bg-white/[0.12] hidden sm:block" />

        {/* User Profile Block */}
        <div className="flex items-center gap-2">
          <Link to="/settings" className="block">
            <motion.div
              whileHover={{ x: 1 }}
              className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] p-1.5 pr-3 rounded-xl cursor-pointer"
            >
              {/* Avatar */}
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-indigo-600/30 overflow-hidden">
                {isAvatarUrl ? (
                  <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 blur-[4px] opacity-40 -z-10" />
              </div>

              {/* User Data Metas */}
              <div className="hidden sm:block text-left max-w-[100px]">
                <p className="font-semibold text-xs text-slate-100 leading-none truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1 leading-none">
                  {userRole}
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Quick Logout Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleLogout}
            title="Log Out"
            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/80 transition-all focus:outline-none"
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </div>
    </motion.header>
    </>
  );
}
