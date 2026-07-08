import React, { useState } from "react";
import { Shield, Key, Eye, EyeOff, Fingerprint, Lock, ShieldAlert, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useSecurityPreferences, useUpdateSecurityPreferences } from "../../hooks/useQueries";

export default function Security({ onUpdatePassword }) {
  const { data: secPrefs, isLoading, isError, refetch } = useSecurityPreferences();
  const updateSec = useUpdateSecurityPreferences();

  const [formData, setFormData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  const twoFactor = secPrefs?.twoFactorEnabled ?? false;
  const passkey = secPrefs?.passkeysEnabled ?? false;
  const alertsEnabled = secPrefs?.suspiciousLoginAlerts ?? true;
  const passkeyCount = secPrefs?.passkeyCount ?? 0;

  const securityScore = (() => {
    let score = 40;
    if (twoFactor) score += 25;
    if (passkey) score += 15;
    if (alertsEnabled) score += 10;
    score += 10;
    return Math.min(100, score);
  })();

  const scoreGrade = securityScore >= 90 ? "A" : securityScore >= 80 ? "B+" : securityScore >= 70 ? "B" : "C";

  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "Empty", color: "bg-slate-800" };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    if (s <= 2) return { score: 20, label: "Weak", color: "bg-rose-500", text: "text-rose-400" };
    if (s <= 4) return { score: 60, label: "Moderate", color: "bg-amber-500", text: "text-amber-400" };
    return { score: 100, label: "Very Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  };

  const strength = calculatePasswordStrength(formData.newPassword);

  const togglePref = async (field, value) => {
    try {
      await updateSec.mutateAsync({ ...secPrefs, [field]: value });
      toast.success("Security preference saved.");
    } catch {
      toast.error("Failed to save security preference.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New password and confirmation do not match!");
      return;
    }
    if (formData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    try {
      setUpdating(true);
      await onUpdatePassword(formData.oldPassword, formData.newPassword);
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center text-slate-500 text-xs">
        <RefreshCw size={18} className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load security settings.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="text-indigo-400" size={20} /> Security Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">Configure verification preferences, rotation cycles, passkeys, and log protections.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Workspace Protection</span>
            <h3 className="text-lg font-bold text-white">Security Rating</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Overall configuration strength of your user profile credentials.</p>
          </div>
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-indigo-500/30 flex items-center justify-center">
              <span className="text-2xl font-extrabold text-white">{scoreGrade}</span>
            </div>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-bold tracking-wider">
              {securityScore}/100 SECURITY SCORE
            </span>
          </div>
          <div className="border-t border-white/[0.04] pt-4 space-y-2.5 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>MFA Activation</span>
              <span className={twoFactor ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>{twoFactor ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Strong Password</span>
              <span className="text-emerald-400 font-semibold">Validated</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Passkeys Added</span>
              <span className={passkeyCount > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>{passkeyCount} Keys</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key size={16} className="text-indigo-400" /> Rotate Password Credentials
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: "oldPassword", label: "Current Password", show: showOld, setShow: setShowOld },
              { key: "newPassword", label: "New Password", show: showNew, setShow: setShowNew },
              { key: "confirmPassword", label: "Confirm New Password", show: showConfirm, setShow: setShowConfirm },
            ].map(({ key, label, show, setShow }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={formData[key]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
                    required
                    className="w-full h-11 pl-4 pr-10 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {key === "newPassword" && formData.newPassword && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Password Strength: <strong className={strength.text}>{strength.label}</strong></span>
                      <span>{strength.score}%</span>
                    </div>
                    <div className="w-full bg-[#181b24] rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.score}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={updating} className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                {updating ? <RefreshCw size={12} className="animate-spin" /> : <Lock size={12} />} Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldAlert size={16} className="text-indigo-400" /> Advanced Identity Verifications
        </h3>
        <div className="divide-y divide-white/[0.04] space-y-6">
          {[
            { field: "twoFactorEnabled", label: "Two-Factor Authentication (2FA)", desc: "Add an extra layer of protection by requiring a mobile authenticator code.", value: twoFactor },
            { field: "passkeysEnabled", label: "Passwordless Passkeys", desc: "Use your device fingerprint, face recognition, or secure hardware tokens to log in.", value: passkey, icon: <Fingerprint size={13} className="text-indigo-400" /> },
            { field: "suspiciousLoginAlerts", label: "Suspicious Login Notifications", desc: "Receive immediate e-mail alerts whenever a login attempt succeeds from a new browser.", value: alertsEnabled },
          ].map(({ field, label, desc, value, icon }) => (
            <div key={field} className="flex items-center justify-between pt-4 first:pt-0">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">{icon}{label}</h4>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
              <button
                disabled={updateSec.isPending}
                onClick={() => togglePref(field, !value)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${value ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
