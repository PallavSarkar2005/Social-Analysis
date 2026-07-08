import React, { useState } from "react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Calendar, Clock, Lock, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { formatIndianDate } from "../../utils/dateFormatter";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "../../hooks/useQueries";

export default function APIKeys() {
  const { data: keysList = [], isLoading, isError, refetch } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [revealedIds, setRevealedIds] = useState({});
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState("Read & Write");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState(null);

  const toggleReveal = (id) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (token) => {
    navigator.clipboard.writeText(token);
    toast.success("API key copied to clipboard!");
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke the API key "${name}"?`)) return;
    try {
      await revokeKey.mutateAsync(id);
      toast.success("API key successfully revoked.");
    } catch {
      toast.error("Failed to revoke API key.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key.");
      return;
    }
    try {
      const res = await createKey.mutateAsync({ name: newKeyName, permissions: newKeyPermissions });
      const token = res?.data?.token;
      if (token) {
        setNewlyCreatedToken({ id: res.data.id, token });
        setRevealedIds((prev) => ({ ...prev, [res.data.id]: true }));
      }
      setNewKeyName("");
      setShowCreateModal(false);
      toast.success("API key generated successfully!");
    } catch {
      toast.error("Failed to create API key.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center text-slate-500">
        <RefreshCw size={18} className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load API keys.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  const safeKeys = Array.isArray(keysList) ? keysList : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="text-indigo-400" size={20} /> Developer API Keys
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage API credentials to query the analytics engine and sync video metrics securely.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold self-start">
          <Plus size={14} /> Create API Key
        </button>
      </div>

      {newlyCreatedToken && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-200">
          <p className="font-bold mb-1">Copy your new API key now — it won&apos;t be shown again:</p>
          <code className="block bg-black/30 p-2 rounded font-mono break-all">{newlyCreatedToken.token}</code>
          <button onClick={() => handleCopy(newlyCreatedToken.token)} className="mt-2 text-indigo-400 font-semibold">Copy to clipboard</button>
        </div>
      )}

      <div className="bg-[#111319]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
        {safeKeys.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Lock className="mx-auto text-slate-500" size={32} />
            <h4 className="text-xs font-bold text-white">No API Keys Generated</h4>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Create a secret key to authenticate your server daemons and script integrations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                  {["Key Description", "Secret Key", "Permissions", "Last Used", "Expires On", "Actions"].map((h) => (
                    <th key={h} className={`p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {safeKeys.map((k) => {
                  const displayToken = newlyCreatedToken?.id === k.id ? newlyCreatedToken.token : null;
                  return (
                    <tr key={k.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4"><span className="text-xs font-semibold text-white block">{k.name}</span></td>
                      <td className="p-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-300">
                            {revealedIds[k.id] && displayToken ? displayToken : `${k.tokenPrefix || "sq_live_••••"}`}
                          </span>
                          {displayToken && (
                            <button onClick={() => toggleReveal(k.id)} className="p-1 hover:bg-white/[0.04] rounded text-slate-500 hover:text-white transition">
                              {revealedIds[k.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4"><span className="text-[10px] font-bold px-2 py-0.5 bg-white/[0.02] border border-white/[0.06] rounded-md text-slate-400">{k.permissions}</span></td>
                      <td className="p-4 text-[10px] text-slate-400 font-medium"><span className="flex items-center gap-1"><Clock size={10} /> {k.lastUsed === "Never" ? "Never" : formatIndianDate(k.lastUsed)}</span></td>
                      <td className="p-4 text-[10px] text-slate-400 font-medium"><span className="flex items-center gap-1"><Calendar size={10} /> {k.expiry ? formatIndianDate(k.expiry) : "—"}</span></td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {displayToken && <button onClick={() => handleCopy(displayToken)} className="p-1.5 hover:bg-white/[0.04] rounded-lg text-slate-400 hover:text-white transition" title="Copy Key"><Copy size={13} /></button>}
                          <button onClick={() => handleDelete(k.id, k.name)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition" title="Revoke Key"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <form onSubmit={handleCreate} className="bg-[#111319] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 relative z-10 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Generate Developer API Key</h3>
              <p className="text-[10px] text-slate-400 mt-1">Specify authorization scope and permissions for the new credentials.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Description Name</label>
                <input type="text" placeholder="e.g. Scraper Cron Key" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} required className="w-full h-10 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorization Scope</label>
                <select value={newKeyPermissions} onChange={(e) => setNewKeyPermissions(e.target.value)} className="w-full h-10 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none">
                  <option>Read & Write</option>
                  <option>Read Only</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="h-9 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:bg-white/[0.04] text-xs font-semibold">Cancel</button>
              <button type="submit" disabled={createKey.isPending} className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50">Generate Key</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
