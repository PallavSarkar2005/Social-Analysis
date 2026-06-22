import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Sparkles,
  Settings,
  Menu,
  X,
  Search,
  Brain,
  History,
  Trophy,
  FileText,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Analyzer", path: "/analyzer", icon: Search },
    { name: "Compare Node", path: "/compare", icon: BarChart3 },
    { name: "Tracked Nodes", path: "/accounts", icon: Users },
    { name: "Competitors", path: "/competitors", icon: Trophy },
    { name: "Saved Reports", path: "/reports", icon: FileText },
    { name: "AI Strategy", path: "/ai-insights", icon: Brain },
    { name: "Snapshot History", path: "/history", icon: History },
    { name: "Audit Trail", path: "/activity", icon: History },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <div className="w-full h-full flex flex-col bg-[#111319] text-slate-100 select-none">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <Link to="/">
            <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-2">
              Social<span className="text-indigo-400">IQ</span>
            </h1>
          </Link>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
            AI Analytics Platform
          </p>
        </div>
        {/* Mobile close */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 space-y-7 overflow-y-auto custom-scrollbar">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-3">
            Navigation Node
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                >
                  <motion.div
                    whileHover={{ x: active ? 0 : 3 }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl relative transition-colors ${
                      active
                        ? "text-white font-semibold shadow-md shadow-indigo-600/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 rounded-xl -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon
                      size={18}
                      className={active ? "text-white" : "text-slate-400"}
                    />
                    <span className="text-xs sm:text-sm">{item.name}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* AI Action Status */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3">
            Active Core Pipeline
          </p>
          <Link to="/ai-insights" onClick={() => setIsOpen(false)}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] shadow-inner cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
                <Sparkles size={16} className="text-purple-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-slate-200">
                  AI Deep Audits
                </h3>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  Llama-3 models operational
                </p>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Pro Upgrade & Settings */}
      <div className="p-4 border-t border-white/[0.06] bg-gradient-to-t from-black/20 to-transparent space-y-4">
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 via-[#111319] to-[#111319] p-4 relative overflow-hidden shadow-lg shadow-black/40 group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all duration-500" />
          <h3 className="font-bold text-xs sm:text-sm text-white tracking-tight">
            Developer Plan
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal mt-1.5">
            Level-2 analytics quota enabled with full platform diagnostics.
          </p>
        </div>

        {/* Global Settings */}
        <Link to="/settings" onClick={() => setIsOpen(false)}>
          <motion.div
            whileHover={{ x: 2 }}
            className={`flex items-center gap-2.5 text-xs font-medium px-2 py-1 cursor-pointer transition-colors ${
              location.pathname === "/settings" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings size={15} />
            <span>Settings Engine</span>
          </motion.div>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="p-3 rounded-xl bg-[#111319] border border-white/[0.08] text-slate-200 hover:text-white shadow-xl focus:outline-none"
        >
          <Menu size={20} />
        </motion.button>
      </div>

      {/* Desktop Sticky Panel */}
      <aside className="hidden lg:block w-64 xl:w-72 min-h-screen bg-[#111319] border-r border-white/[0.08] shrink-0 sticky top-0 h-screen shadow-2xl z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Sliding Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#111319] border-r border-white/[0.08] z-50 lg:hidden shadow-2xl h-full"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
