import React from "react";
import { Bell, Mail, ToggleLeft, ToggleRight, Sparkles, ShieldCheck, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function Notifications({
  notificationPrefs,
  onUpdatePrefs,
  emailSchedule,
  onUpdateSchedule,
  loadingPrefs,
  loadingSchedule,
}) {
  const togglePref = async (field) => {
    const nextPrefs = { ...notificationPrefs, [field]: !notificationPrefs[field] };
    await onUpdatePrefs(nextPrefs);
  };

  const handleFrequencyChange = async (e) => {
    const nextSchedule = { ...emailSchedule, frequency: e.target.value };
    await onUpdateSchedule(nextSchedule);
  };

  const handleActiveToggle = async () => {
    const nextSchedule = { ...emailSchedule, isActive: !emailSchedule.isActive };
    await onUpdateSchedule(nextSchedule);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="text-indigo-400" size={20} /> Notifications
        </h2>
        <p className="text-xs text-slate-400 mt-1">Configure subscription notification channels, AI report alerts, and Weekly digest schedules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Toggles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" /> Platform & Real-time Alerts
            </h3>

            <div className="divide-y divide-white/[0.04] space-y-4">
              <div className="flex items-center justify-between pt-4 first:pt-0">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">Growth Spikes</h4>
                  <p className="text-[10px] text-slate-400">Receive alerts whenever an account grows faster than normal thresholds.</p>
                </div>
                <button
                  disabled={loadingPrefs}
                  onClick={() => togglePref("growthSpike")}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${
                    notificationPrefs.growthSpike ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      notificationPrefs.growthSpike ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">New AI Report Generation</h4>
                  <p className="text-[10px] text-slate-400">Receive notifications when Groq finishes generating content insights.</p>
                </div>
                <button
                  disabled={loadingPrefs}
                  onClick={() => togglePref("newAiReport")}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${
                    notificationPrefs.newAiReport ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      notificationPrefs.newAiReport ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">Snapshot Completion</h4>
                  <p className="text-[10px] text-slate-400">Receive alerts when the daily background database sync ends.</p>
                </div>
                <button
                  disabled={loadingPrefs}
                  onClick={() => togglePref("snapshotCompleted")}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${
                    notificationPrefs.snapshotCompleted ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      notificationPrefs.snapshotCompleted ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">Milestone Reached</h4>
                  <p className="text-[10px] text-slate-400">Receive notifications when any creator channel crosses a major subscriber milestone.</p>
                </div>
                <button
                  disabled={loadingPrefs}
                  onClick={() => togglePref("milestoneReached")}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${
                    notificationPrefs.milestoneReached ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      notificationPrefs.milestoneReached ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* E-mail Digest scheduler */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Mail size={16} className="text-indigo-400" /> E-mail Reports
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Set up automated emails to send platform growth stats straight to your inbox.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Enable Email Reports</span>
                  <button
                    disabled={loadingSchedule}
                    onClick={handleActiveToggle}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${
                      emailSchedule.isActive ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        emailSchedule.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {emailSchedule.isActive && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digest Frequency</label>
                    <select
                      value={emailSchedule.frequency}
                      onChange={handleFrequencyChange}
                      disabled={loadingSchedule}
                      className="w-full h-10 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="daily">Daily Recap</option>
                      <option value="weekly">Weekly Summary</option>
                      <option value="monthly">Monthly Audit</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/[0.04] pt-4 mt-6 text-[10px] text-slate-500 flex items-center gap-2">
              <ShieldCheck size={12} className="text-indigo-400" />
              <span>Receiving to: {emailSchedule.emailAddress || "your email"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
