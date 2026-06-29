import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getAccounts, createAccount, deleteAccount, updateAccountGroup, updateAccountPartyState } from "../api/accountApi";
import { syncYoutubeChannel, syncChannelContent } from "../api/youtubeApi";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { Users, Plus, Trash2, RefreshCw, Layers, ShieldCheck, Globe, Link2, Key } from "lucide-react";

const YoutubeIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    style={{ width: props.size, height: props.size }}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState("");

  const [form, setForm] = useState({
    name: "",
    platform: "youtube",
    accountId: "",
    profileUrl: "",
    state: "",
    party: "",
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await getAccounts();
      setAccounts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = async (e, id) => {
    const newGroup = e.target.value;
    try {
      toast.loading("Updating group assignment...", { id: `group-${id}` });
      const res = await updateAccountGroup(id, newGroup);
      if (res.success) {
        toast.success("Group updated successfully!", { id: `group-${id}` });
        loadAccounts();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update group.", { id: `group-${id}` });
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.accountId || !form.state || !form.party) {
      toast.error("Please fill out all required fields (Name, Channel ID, State, and Party).");
      return;
    }

    try {
      setSubmitting(true);
      await createAccount(form);
      toast.success(`Social node "${form.name}" registered successfully.`);
      setForm({
        name: "",
        platform: "youtube",
        accountId: "",
        profileUrl: "",
        state: "",
        party: "",
      });
      loadAccounts();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to index social node.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to stop tracking "${name}"?`)) return;
    try {
      await deleteAccount(id);
      toast.success("Account untracked successfully.");
      loadAccounts();
    } catch (error) {
      console.error(error);
      toast.error("Deletion request failed.");
    }
  };

  const handleSyncSingleNode = async (id, name) => {
    try {
      setSyncingId(id);
      toast.loading(`Syncing statistics for "${name}"...`, { id: "sync" });
      await Promise.all([
        syncYoutubeChannel(id),
        syncChannelContent(id)
      ]);
      toast.success(`Node "${name}" successfully synchronized!`, { id: "sync" });
      loadAccounts();
    } catch (err) {
      console.error(err);
      toast.error(`Sync failed for "${name}". Verify API key limits.`, { id: "sync" });
    } finally {
      setSyncingId("");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="border-b border-white/[0.06] pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Layers size={28} className="text-indigo-400" />
              Node Registry Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Index and orchestrate active platform connections for automated scraping & daily metric snapshot history.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Form */}
            <div className="lg:col-span-1 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-xl space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Plus size={16} className="text-indigo-400" />
                  Index Social Profile
                </h3>
                <p className="text-xs text-slate-400">Add YouTube nodes to begin indexing.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PewDiePie, Elon Musk"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    YouTube Channel ID
                  </label>
                  <input
                    type="text"
                    placeholder={form.platform === "youtube" ? "e.g. UCX6OQ3DkcsbYNE6H8uQQuVA" : "e.g. elonmusk"}
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Assam, Delhi, Gujarat"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Party</label>
                  <input
                    type="text"
                    placeholder="e.g. BJP, Congress, AAP"
                    value={form.party}
                    onChange={(e) => setForm({ ...form, party: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-semibold text-white rounded-xl transition shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
                >
                  {submitting ? "Indexing Profile..." : "Register Social Node"}
                </button>
              </form>
            </div>

            {/* List Table */}
            <div className="lg:col-span-2 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <Globe size={16} className="text-indigo-400" />
                  Active Connections Matrix
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Total Indexed: {accounts.length}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-[#121318]/30 rounded-xl" />
                  ))}
                </div>
              ) : accounts.length > 0 ? (
                <div className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Profile Node</th>
                          <th className="p-4">Platform</th>
                          <th className="p-4">State</th>
                          <th className="p-4">Party</th>
                          <th className="p-4">Group</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {accounts.map((acc) => (
                          <tr key={acc._id} className="hover:bg-white/[0.01] transition-colors text-xs">
                            <td className="p-4 font-bold text-slate-200">{acc.name}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                acc.platform === "youtube"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              }`}>
                                {acc.platform === "youtube" ? <YoutubeIcon size={10} /> : <Link2 size={10} />}
                                {acc.platform}
                              </span>
                            </td>
                            <td className="p-4">
                              <input
                                type="text"
                                defaultValue={acc.state || "Unknown State"}
                                onBlur={async (e) => {
                                  const val = e.target.value.trim();
                                  if (val && val !== acc.state) {
                                    try {
                                      await updateAccountPartyState(acc._id, undefined, val);
                                      toast.success(`State updated for "${acc.name}"`);
                                      loadAccounts();
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Failed to update state.");
                                    }
                                  }
                                }}
                                className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none text-slate-300 w-24 px-1 py-0.5 text-xs transition"
                              />
                            </td>
                            <td className="p-4">
                              <input
                                type="text"
                                defaultValue={acc.party || "Independent"}
                                onBlur={async (e) => {
                                  const val = e.target.value.trim();
                                  if (val && val !== acc.party) {
                                    try {
                                      await updateAccountPartyState(acc._id, val, undefined);
                                      toast.success(`Party updated for "${acc.name}"`);
                                      loadAccounts();
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Failed to update party.");
                                    }
                                  }
                                }}
                                className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none text-slate-300 w-24 px-1 py-0.5 text-xs transition"
                              />
                            </td>
                            <td className="p-4">
                              <select
                                value={acc.group || "Other"}
                                onChange={(e) => handleGroupChange(e, acc._id)}
                                className="bg-[#171923] border border-white/[0.08] text-[10px] text-slate-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                              >
                                <option value="BJP">BJP</option>
                                <option value="Congress">Congress</option>
                                <option value="AAP">AAP</option>
                                <option value="TMC">TMC</option>
                                <option value="BJD">BJD</option>
                                <option value="DMK">DMK</option>
                                <option value="Shiv Sena">Shiv Sena</option>
                                <option value="NCP">NCP</option>
                                <option value="Independent">Independent</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                            <td className="p-4 text-right space-x-1.5">
                              {acc.platform === "youtube" && (
                                <button
                                  onClick={() => handleSyncSingleNode(acc._id, acc.name)}
                                  disabled={syncingId === acc._id}
                                  className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                                  title="Sync Node telemetry details"
                                >
                                  <RefreshCw size={12} className={syncingId === acc._id ? "animate-spin text-indigo-400" : ""} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(acc._id, acc.name)}
                                className="p-1.5 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500 transition"
                                title="Stop tracking node"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-white/[0.01] border border-white/[0.04] border-dashed rounded-xl space-y-3">
                  <p className="text-xs text-slate-400">No active social nodes indexed.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Fill out the form on the left to index channels and enable social telemetry collection.
                  </p>
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}