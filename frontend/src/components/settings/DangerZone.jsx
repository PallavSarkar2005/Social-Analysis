import React, { useState } from "react";
import { ShieldAlert, Trash2, LogOut, ShieldX, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function DangerZone({ onDeleteAccount, onLogoutEverywhere }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleLogoutAll = async () => {
    if (!window.confirm("Are you sure you want to terminate all other device sessions?")) return;
    try {
      await onLogoutEverywhere();
    } catch (err) {
      // Handled in parent
    }
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error("Please enter your password to confirm account deletion.");
      return;
    }

    try {
      setDeleting(true);
      await onDeleteAccount(deletePassword);
      setShowDeleteModal(false);
    } catch (err) {
      // Handled in parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="text-rose-500" size={20} /> Danger Zone
        </h2>
        <p className="text-xs text-slate-400 mt-1">Irreversible destructive operations. Delete data, reset workspaces, or terminate credentials.</p>
      </div>

      <div className="bg-[#111319]/40 border border-rose-500/10 p-6 rounded-2xl space-y-6">
        <div className="divide-y divide-white/[0.04] space-y-6">
          {/* Logout everywhere */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 first:pt-0">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-white">Logout From All Other Devices</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg">
                Terminates all active login sessions on other laptop or mobile browsers. Your current device will remain logged in.
              </p>
            </div>
            <button
              onClick={handleLogoutAll}
              className="h-9 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] hover:text-white text-slate-300 transition text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              Logout Everywhere
            </button>
          </div>

          {/* Reset Workspace */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-white">Reset All Workspace Data</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg">
                Clears all custom group names, custom competitor metrics, reports registry history, and cached data records.
              </p>
            </div>
            <button
              onClick={() => toast.success("Simulated reset workspace data successfully initiated!")}
              className="h-9 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 transition text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              Reset Data
            </button>
          </div>

          {/* Delete Account */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-white">Permanently Delete Account</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg">
                Completely deletes your user profile registration, billing schemas, subscription history, and monitored creator logs from the database.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition text-xs font-semibold whitespace-nowrap self-start sm:self-auto shadow-lg shadow-rose-600/10"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <form
            onSubmit={handleDeleteSubmit}
            className="bg-[#111319] border border-rose-500/20 w-full max-w-md rounded-2xl p-6 relative z-10 space-y-4 shadow-2xl"
          >
            <div className="flex items-start gap-3 text-rose-500">
              <ShieldX size={24} className="flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white">Delete Profile Verification</h3>
                <p className="text-[10px] text-slate-400 mt-1">This operation is permanent. To confirm, please enter your security password below.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirm Password</label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full h-10 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }}
                className="h-9 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:bg-white/[0.04] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="h-9 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {deleting && <RefreshCw size={12} className="animate-spin" />} Terminate Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
