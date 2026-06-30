import React from "react";
import { User, Calendar, Key, Shield, Layers, BadgeAlert, MailCheck, HardDrive, Cpu, Sparkles } from "lucide-react";

export default function Account({ user }) {
  const accountStats = [
    {
      title: "Account Type",
      value: user?.role?.toUpperCase() || "CREATOR",
      desc: "System permission role",
      icon: <User className="text-indigo-400" size={18} />,
    },
    {
      title: "Member Since",
      value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" }) : "June 2026",
      desc: "Date of first registration",
      icon: <Calendar className="text-emerald-400" size={18} />,
    },
    {
      title: "User ID",
      value: user?._id || "Unavailable",
      desc: "System unique key",
      icon: <Key className="text-amber-400" size={18} className="rotate-45" />,
      isCode: true,
    },
    {
      title: "Current Plan",
      value: (user?.plan || "Free").toUpperCase(),
      desc: "Active billing package",
      icon: <Sparkles className="text-purple-400" size={18} />,
    },
    {
      title: "Workspace Identifier",
      value: `ws_${user?._id?.substring(0, 8) || "default"}`,
      desc: "Team shared namespace",
      icon: <Layers className="text-sky-400" size={18} />,
      isCode: true,
    },
    {
      title: "Account Status",
      value: "ACTIVE",
      desc: "Operational health status",
      icon: <Shield className="text-emerald-400" size={18} />,
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Email Verification",
      value: user?.isEmailVerified ? "VERIFIED" : "PENDING",
      desc: "Security authentication state",
      icon: <MailCheck className="text-indigo-400" size={18} />,
      badge: user?.isEmailVerified ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      title: "Storage Space Used",
      value: "14.2 MB",
      desc: "Cached reports & analytics data",
      icon: <HardDrive className="text-slate-400" size={18} />,
    },
    {
      title: "API Usage Limit",
      value: "942 / 10,000",
      desc: "Queries executed this cycle",
      icon: <Cpu className="text-rose-400" size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="text-indigo-400" size={20} /> Account Registry
        </h2>
        <p className="text-xs text-slate-400 mt-1">General system metadata, subscription limits, and database workspace details.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accountStats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</span>
              <div className="p-2 bg-white/[0.02] border border-white/[0.04] rounded-xl">{stat.icon}</div>
            </div>

            <div className="space-y-1">
              {stat.badge ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold border ${stat.badge}`}>
                  {stat.value}
                </span>
              ) : stat.isCode ? (
                <code className="text-xs font-mono text-indigo-300 bg-indigo-950/20 px-2 py-1 rounded border border-indigo-500/10 break-all inline-block select-all">
                  {stat.value}
                </code>
              ) : (
                <h4 className="text-sm sm:text-base font-extrabold text-white">{stat.value}</h4>
              )}
              <p className="text-[10px] text-slate-500 font-medium">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
