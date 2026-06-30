import React, { useState, useRef } from "react";
import { Sparkles, Upload, RotateCcw, Save, Trash2, Globe, Clock, ShieldCheck, Mail, MapPin } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile({ user, onUpdateProfile }) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    avatar: user?.avatar || "",
    bio: user?.bio || "",
    username: user?.username || user?.email?.split("@")[0] || "",
    phone: user?.phone || "",
    organization: user?.organization || "Independent Creator",
    designation: user?.designation || "Content Strategist",
    website: user?.website || "",
    country: user?.country || "India",
    state: user?.state || "",
    timeZone: user?.timeZone || "UTC+05:30 (Kolkata)",
    language: user?.language || "English",
  });

  const [dragActive, setDragActive] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      name: user?.name || "",
      avatar: user?.avatar || "",
      bio: user?.bio || "",
      username: user?.username || user?.email?.split("@")[0] || "",
      phone: user?.phone || "",
      organization: user?.organization || "Independent Creator",
      designation: user?.designation || "Content Strategist",
      website: user?.website || "",
      country: user?.country || "India",
      state: user?.state || "",
      timeZone: user?.timeZone || "UTC+05:30 (Kolkata)",
      language: user?.language || "English",
    });
    setCroppedPreview(null);
    toast.success("Profile form reset.");
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload an image file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSaveCrop = () => {
    // Simulated crop: just use the uploaded image as base64
    setCroppedPreview(cropImage);
    setFormData((prev) => ({ ...prev, avatar: cropImage }));
    setCropImage(null);
    toast.success("Avatar cropped and loaded.");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await onUpdateProfile(formData);
    } catch (err) {
      toast.error("Failed to update profile changes.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={20} /> My Profile
        </h2>
        <p className="text-xs text-slate-400 mt-1">Manage your identity, personal information, and professional metadata.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Uploader & Drag-and-Drop */}
        <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-4">
          <label className="text-xs font-semibold text-slate-300 block">Profile Picture</label>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={croppedPreview || formData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(formData.name || "user")}`}
                alt="Avatar"
                className="w-24 h-24 rounded-full border border-white/[0.08] object-cover bg-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  setCroppedPreview(null);
                  setFormData((prev) => ({ ...prev, avatar: "" }));
                }}
                className="absolute -top-1 -right-1 p-1 bg-[#1a1d26] border border-white/[0.08] text-rose-400 rounded-full hover:bg-rose-500/10 hover:text-rose-300 transition"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/[0.02]"
                  : "border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.01]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileInput}
              />
              <Upload className="mx-auto text-slate-400 mb-2 group-hover:text-indigo-400 transition-colors" size={20} />
              <p className="text-xs font-medium text-slate-300">Drag & drop your image here, or <span className="text-indigo-400">browse</span></p>
              <p className="text-[10px] text-slate-500 mt-1">Supports PNG, JPEG or SVG (max. 2MB)</p>
            </div>
          </div>
        </div>

        {/* Identity Inputs Grid */}
        <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full h-11 pl-4 pr-10 bg-[#181b24]/40 border border-white/[0.04] rounded-xl text-xs text-slate-500 cursor-not-allowed outline-none"
                />
                <ShieldCheck size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Short Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about yourself..."
              className="w-full p-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Professional Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organization</label>
              <input
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Website URL</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Language</label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Hindi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Regional & Time Settings */}
        <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Localization & Region</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">State / Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Time Zone</label>
              <select
                name="timeZone"
                value={formData.timeZone}
                onChange={handleChange}
                className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              >
                <option>UTC+05:30 (Kolkata)</option>
                <option>UTC+00:00 (London)</option>
                <option>UTC-05:00 (New York)</option>
                <option>UTC-08:00 (Los Angeles)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] sm:text-xs">
            <Clock size={12} />
            <span>Last updated: {user?.updatedAt ? new Date(user.updatedAt).toLocaleString() : "Just now"}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              <Save size={12} /> Save Changes
            </button>
          </div>
        </div>
      </form>

      {/* Canvas-based crop modal */}
      {cropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="bg-[#111319] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 relative z-10 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Adjust Profile Photo</h3>
              <p className="text-[10px] text-slate-400 mt-1">Preview of your new profile photo.</p>
            </div>
            
            <div className="flex justify-center bg-[#090a0f] p-4 rounded-xl border border-white/[0.04]">
              <img src={cropImage} alt="Crop preview" className="max-h-64 object-contain rounded" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCropImage(null)}
                className="h-9 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:bg-white/[0.04] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
