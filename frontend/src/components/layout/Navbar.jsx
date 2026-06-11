import { Bell, Search, Sparkles } from "lucide-react";

export default function Navbar() {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
      {/* Left */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>

        <p className="text-slate-500 text-sm">
          Monitor your social media analytics
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center gap-3 bg-slate-100 px-4 py-3 rounded-xl w-80">
          <Search size={18} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search channels..."
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>

        {/* AI Badge */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-100 text-purple-700 font-medium">
          <Sparkles size={16} />
          AI Enabled
        </div>

        {/* Notification */}
        <button className="relative p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
          <Bell size={20} />

          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Version Badge */}
        <div className="hidden md:flex px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium">
          v1.0
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 bg-slate-100 rounded-2xl px-3 py-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
            P
          </div>

          <div className="hidden md:block">
            <p className="font-semibold text-sm">Pallav</p>

            <p className="text-xs text-slate-500">Developer</p>
          </div>
        </div>
      </div>
    </header>
  );
}
