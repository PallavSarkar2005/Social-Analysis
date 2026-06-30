import React, { useState } from "react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, ShieldCheck, Calendar, Clock, Lock } from "lucide-react";
import toast from "react-hot-toast";

export default function APIKeys() {
  const [keysList, setKeysList] = useState([
    {
      id: "key-1",
      name: "Production Scraper Daemon",
      token: "sq_live_48ac9120de884b2c8cf15b94236e7",
      permissions: "Read & Write",
      lastUsed: "Just now",
      expiry: "Dec 31, 2026",
      revealed: false,
    },
    {
      id: "key-2",
      name: "Staging Analytics Sync",
      token: "sq_live_98bf120fa22b512c7af1455d3e11",
      permissions: "Read Only",
      lastUsed: "2 hours ago",
      expiry: "Sep 30, 2026",
      revealed: false,
    },
  ]);

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState("Read & Write");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleReveal = (id) => {
    setKeysList((prev) =>
      prev.map((key) => (key.id === id ? { ...key, revealed: !key.revealed } : key))
    );
  };

  const handleCopy = (token) => {
    navigator.clipboard.writeText(token);
    toast.success("API key copied to clipboard!");
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke the API key "${name}"?`)) return;
    setKeysList((prev) => prev.filter((key) => key.id !== id));
    toast.success("API key successfully revoked.");
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newKeyName) {
      toast.error("Please enter a name for the API key.");
      return;
    }

    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const generatedToken = `sq_live_${randomHex.substring(0, 24)}`;

    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      token: generatedToken,
      permissions: newKeyPermissions,
      lastUsed: "Never",
      expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      revealed: true, // Reveal immediately on creation
    };

    setKeysList((prev) => [...prev, newKey]);
    setNewKeyName("");
    setShowCreateModal(false);
    toast.success("API key generated successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="text-indigo-400" size={20} /> Developer API Keys
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage API credentials to query the analytics engine and sync video metrics securely.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold self-start"
        >
          <Plus size={14} /> Create API Key
        </button>
      </div>

      {/* Keys registry table */}
      <div className="bg-[#111319]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
        {keysList.length === 0 ? (
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
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Description</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secret Key</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Permissions</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Used</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires On</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {keysList.map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <span className="text-xs font-semibold text-white block">{k.name}</span>
                    </td>
                    <td className="p-4 font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-300">
                          {k.revealed ? k.token : `sq_live_••••••••••••••••••••`}
                        </span>
                        <button
                          onClick={() => toggleReveal(k.id)}
                          className="p-1 hover:bg-white/[0.04] rounded text-slate-500 hover:text-white transition"
                        >
                          {k.revealed ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white/[0.02] border border-white/[0.06] rounded-md text-slate-400">
                        {k.permissions}
                      </span>
                    </td>
                    <td className="p-4 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><Clock size={10} /> {k.lastUsed}</span>
                    </td>
                    <td className="p-4 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {k.expiry}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopy(k.token)}
                          className="p-1.5 hover:bg-white/[0.04] rounded-lg text-slate-400 hover:text-white transition"
                          title="Copy Key"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(k.id, k.name)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition"
                          title="Revoke Key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <form
            onSubmit={handleCreate}
            className="bg-[#111319] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 relative z-10 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-white">Generate Developer API Key</h3>
              <p className="text-[10px] text-slate-400 mt-1">Specify authorization scope and permissions for the new credentials.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Description Name</label>
                <input
                  type="text"
                  placeholder="e.g. Scraper Cron Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorization Scope</label>
                <select
                  value={newKeyPermissions}
                  onChange={(e) => setNewKeyPermissions(e.target.value)}
                  className="w-full h-10 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none"
                >
                  <option>Read & Write</option>
                  <option>Read Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-9 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:bg-white/[0.04] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Generate Key
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
