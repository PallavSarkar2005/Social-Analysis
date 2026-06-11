import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Sparkles,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Compare",
      path: "/compare",
      icon: BarChart3,
    },
    {
      name: "Accounts",
      path: "/accounts",
      icon: Users,
    },
  ];

  return (
    <aside className="w-72 min-h-screen bg-slate-950 text-white flex flex-col border-r border-slate-800">
      {/* Logo */}
      <div className="px-8 py-8 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          SocialIQ
        </h1>

        <p className="text-slate-400 text-sm mt-2">AI Social Analytics</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-5 py-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-4 px-3">
          Analytics
        </p>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={20} />

                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Section */}
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-4 px-3">
            AI Tools
          </p>

          <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-slate-900">
            <Sparkles size={20} className="text-purple-400" />

            <div>
              <h3 className="font-medium">AI Insights</h3>

              <p className="text-xs text-slate-400">GPT-powered analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Card */}
      <div className="p-5">
        <div className="rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 p-5">
          <h3 className="font-bold text-lg">Pro Analytics</h3>

          <p className="text-sm text-white/80 mt-2">
            Advanced AI reports, growth prediction, and competitor tracking.
          </p>

          <button className="mt-4 w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-slate-100 transition">
            Upgrade
          </button>
        </div>

        <button className="mt-4 flex items-center gap-3 text-slate-400 hover:text-white transition px-2">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  );
}
