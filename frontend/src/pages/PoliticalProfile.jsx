import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Calendar, MapPin, Award, Shield, Clock, ExternalLink, Globe,
  Briefcase, GraduationCap, Trophy, Newspaper, Send, ArrowLeft,
  ChevronRight, Sparkles, TrendingUp, Users, Eye, Video, BarChart2,
  PieChart as PieIcon, ThumbsUp, MessageSquare, AlertCircle, Bot
} from "lucide-react";
import { ensureAccessToken } from "../api/client";
import Sidebar from "../components/layout/Sidebar";
import LeaderAvatar from "../components/common/LeaderAvatar";
import IndiaMap from "../components/common/IndiaMap";
import {
  getProfileBiography, getProfileNews,
  getProfileCharts, getProfileElections, getProfileInfluence,
  getProfileAiInsights, getProfileSimilar
} from "../api/profileApi";
import VerifiedProfileCard from "../components/profile/VerifiedProfileCard";
import PoliticalTimelinePanel from "../components/profile/PoliticalTimelinePanel";
import SourceVerificationPanel from "../components/profile/SourceVerificationPanel";
import ElectionIntelligencePanel from "../components/profile/ElectionIntelligencePanel";
import ConfidenceBreakdown from "../components/profile/ConfidenceBreakdown";
import PoliticalStatisticsPanel from "../components/profile/PoliticalStatisticsPanel";
import RelationshipIntelligencePanel from "../components/profile/RelationshipIntelligencePanel";
import SectionFreshnessBar from "../components/profile/SectionFreshnessBar";
import AISummaryPanel from "../components/profile/AISummaryPanel";
import WidgetErrorBoundary from "../components/WidgetErrorBoundary";
import { isVerifiedValue, safeArray } from "../utils/profileFacts";
import { formatIndianDate } from "../utils/dateFormatter";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";

const SENTIMENT_COLORS = ["#10b981", "#64748b", "#ef4444"]; // Positive (green), Neutral (slate), Negative (red)

const PROFILE_TABS = [
  { id: "overview", label: "Overview", moduleKey: "overview", always: true },
  { id: "timeline", label: "Timeline & Bio", moduleKey: "timeline" },
  { id: "charts", label: "Telemetry & Charts", moduleKey: "youtube" },
  { id: "influence", label: "Influence & Mapping", moduleKey: "influence" },
  { id: "news", label: "News & Sentiment", moduleKey: "news" },
  { id: "elections", label: "Election History", moduleKey: "elections" },
  { id: "chat", label: "AI Chat Assistant", always: true },
];

export default function PoliticalProfile() {
  const { creatorId } = useParams();
  const chatEndRef = useRef(null);
  const queryClient = useQueryClient();
  const prevSyncStatusRef = useRef(null);

  // AI Chat States
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState("overview");

  // Shell profile — always loaded first; polls while background sync runs
  const { data: bioData, isLoading: bioLoading, error: bioError } = useQuery({
    queryKey: ["profile-bio", creatorId],
    queryFn: () => getProfileBiography(creatorId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchInterval: (query) => {
      const payload = query.state.data?.data;
      const building =
        payload?.building ||
        payload?.syncStatus === "building" ||
        payload?.syncStatus === "pending";
      return building ? 8000 : false;
    },
  });


  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ["profile-news", creatorId],
    queryFn: () => getProfileNews(creatorId),
    staleTime: 15 * 60 * 1000,
    retry: 1,
    enabled: activeTab === "news",
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ["profile-charts", creatorId],
    queryFn: () => getProfileCharts(creatorId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: activeTab === "charts",
  });

  const { data: electionsData, isLoading: electionsLoading } = useQuery({
    queryKey: ["profile-elections", creatorId],
    queryFn: () => getProfileElections(creatorId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: activeTab === "elections",
  });

  const { data: influenceData, isLoading: influenceLoading } = useQuery({
    queryKey: ["profile-influence", creatorId],
    queryFn: () => getProfileInfluence(creatorId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: activeTab === "influence" || activeTab === "overview",
  });

  const { data: aiInsightsData } = useQuery({
    queryKey: ["profile-ai-insights", creatorId],
    queryFn: () => getProfileAiInsights(creatorId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: activeTab === "overview",
  });

  const { data: similarData } = useQuery({
    queryKey: ["profile-similar", creatorId],
    queryFn: () => getProfileSimilar(creatorId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: activeTab === "overview",
  });

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage.trim();
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/profile/${creatorId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory,
        }),
      });

      if (!response.ok) throw new Error("Chat assistant currently offline.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completeText = "";

      // Add a pending message block in history
      setChatHistory((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                completeText += parsed.content;
                setChatHistory((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: completeText };
                  return updated;
                });
              } else if (parsed.error) {
                completeText = parsed.error;
                setChatHistory((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: completeText };
                  return updated;
                });
              }
            } catch (e) {
              // Ignore partial parsing errors
            }
          }
        }
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: err.message || "Failed to contact political research assistant." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const profilePayload = bioData?.data;
  const biography = profilePayload?.biography ?? {};
  const account = profilePayload?.account ?? {};
  const profileTimeline = safeArray(profilePayload?.timeline);
  const verifiedFacts = safeArray(profilePayload?.verifiedFacts);
  const fieldProvenance = profilePayload?.fieldProvenance ?? {};
  const confidenceBreakdown = profilePayload?.confidenceBreakdown ?? {};
  const politicalStatistics = safeArray(profilePayload?.politicalStatistics);
  const rawRelationships = profilePayload?.relationships ?? {};
  const relationships = {
    nodes: safeArray(rawRelationships.nodes),
    edges: safeArray(rawRelationships.edges),
  };
  const sectionMeta = profilePayload?.sectionMeta ?? {};
  const moduleMeta = profilePayload?.moduleMeta ?? {};
  const moduleData = profilePayload?.moduleData ?? {};
  const verificationCatalog = safeArray(profilePayload?.verificationCatalog);
  const sources = safeArray(profilePayload?.sources);
  const confidenceScore = profilePayload?.confidenceScore ?? 0;
  const lastVerified = profilePayload?.lastVerified;
  const lastSynced = profilePayload?.lastSynced;
  const syncStatus = profilePayload?.syncStatus;
  const syncProgress = profilePayload?.syncProgress ?? {};
  const isBuilding =
    profilePayload?.building ||
    syncStatus === "building" ||
    syncStatus === "pending";

  // Refetch tab data when background sync finishes so MongoDB updates appear live
  useEffect(() => {
    const prev = prevSyncStatusRef.current;
    if ((prev === "building" || prev === "pending") && syncStatus === "ready") {
      queryClient.invalidateQueries({ queryKey: ["profile-elections", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["profile-news", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["profile-charts", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["profile-influence", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["profile-ai-insights", creatorId] });
    }
    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus, creatorId, queryClient]);

  const aiInsights = safeArray(aiInsightsData?.data?.insights);
  const aiSummary = aiInsightsData?.data?.summary || {};

  if (bioLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#090a0f] text-slate-100 flex-col space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400 tracking-wider">Analyzing political footprint...</span>
      </div>
    );
  }

  if (bioError || !profilePayload) {
    return (
      <div className="flex min-h-screen bg-[#090a0f] text-slate-100 items-center justify-center">
        <div className="text-center p-8 rounded-2xl bg-white/[0.01] border border-white/[0.06] max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold">Research Profile Offline</h3>
          <p className="text-xs text-slate-400">Failed to resolve this leader's political telemetry profile. Please confirm your internet connection and API keys.</p>
          <Link to="/dashboard" className="inline-flex h-9 items-center justify-center px-4 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 transition">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const verifiedAt = lastVerified || lastSynced;
  const timeSeries = safeArray(chartsData?.data?.timeSeries);
  const uploadsDistribution = safeArray(chartsData?.data?.uploadsDistribution);
  const categories = safeArray(chartsData?.data?.categories);
  const similarLeaders = safeArray(similarData?.data);
  const newsItems = safeArray(newsData?.data?.news);
  const elections = safeArray(electionsData?.data);
  const sentimentKeywords = safeArray(newsData?.data?.sentiment?.keywords);
  const geographicReach = safeArray(influenceData?.data?.geographicReach);

  const contentDistributionMessage =
    chartsData?.data?.contentDistributionMessage ||
    "No YouTube content distribution data is available for this profile.";
  const hasGrowthSeries = timeSeries.length > 0;
  const hasSingleGrowthPoint = timeSeries.length === 1;
  const hasUploadsDistribution = uploadsDistribution.length > 0;
  const hasCategories = categories.length > 0;

  // Pie chart news data mapping
  const sentimentDistribution = newsData?.data?.sentiment
    ? [
        { name: "Positive", value: newsData.data.sentiment.positive },
        { name: "Neutral", value: newsData.data.sentiment.neutral },
        { name: "Negative", value: newsData.data.sentiment.negative },
      ]
    : [
        { name: "Positive", value: 33 },
        { name: "Neutral", value: 34 },
        { name: "Negative", value: 33 },
      ];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10 px-4 py-6 md:p-8 space-y-6">
        
        {/* Navigation back and quick breadcrumbs */}
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Political Intelligence</span>
            <h1 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5 mt-0.5">
              Profile <ChevronRight className="w-3 h-3 text-slate-600" /> {biography.fullName || account.name}
            </h1>
          </div>
        </div>

        {isBuilding && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
            <div className="text-left">
              <p className="text-xs font-semibold text-indigo-300">
                Building political intelligence profile…
              </p>
              {syncProgress?.total > 0 && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {syncProgress.completed ?? 0}/{syncProgress.total} modules
                  {syncProgress.currentSection
                    ? ` · syncing ${syncProgress.currentSection}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: HERO HEADER */}
        <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
          
          <LeaderAvatar
            creator={account}
            size="w-24 h-24 md:w-28 md:h-28"
            className="border-2 border-white/[0.08] shadow-lg shrink-0"
          />

          <div className="text-center md:text-left space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {biography.fullName || account.name}
              </h2>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                <Shield className="w-3 h-3" /> {confidenceScore > 0 ? `Verified (${confidenceScore}%)` : "Profile Pending"}
              </div>
            </div>

            <p className="text-sm text-indigo-400 font-semibold leading-normal">
              {biography.currentPosition || biography.currentOffice || null}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-xs text-slate-400 pt-1 font-sans">
              {isVerifiedValue(biography.state || account.state) && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {biography.state || account.state}</span>
              )}
              {isVerifiedValue(biography.party || account.party) && (
                <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-slate-500" /> {biography.party || account.party}</span>
              )}
              {verifiedAt && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-500" /> Updated {formatIndianDate(verifiedAt)}</span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex gap-2 w-full md:w-auto">
            {biography.officialWebsite && (
              <a
                href={biography.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial h-10 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-xs font-bold text-slate-300 transition flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4" /> Website
              </a>
            )}
            {biography.wikipediaLink && (
              <a
                href={biography.wikipediaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial h-10 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-xs font-bold text-slate-300 transition flex items-center justify-center gap-2"
              >
                Wikipedia <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Tab switchers — all modules available; data loads when tab opens */}
        <div className="flex border-b border-white/[0.06] gap-6 text-sm overflow-x-auto">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 font-semibold relative transition ${activeTab === tab.id ? "text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* TAB WORKSPACES */}
        <div className="space-y-6">

          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Analytics KPI Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Subscribers", val: account.subscribers, icon: Users },
                    { label: "Total Views", val: account.views, icon: Eye },
                    { label: "Videos", val: account.videos, icon: Video },
                    { label: "Engagement", val: `${account.engagement}%`, icon: TrendingUp },
                  ].map((card, i) => (
                    <div key={i} className="bg-[#121318]/30 border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                        <card.icon className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-extrabold text-white mt-3">
                        {typeof card.val === "number" ? card.val.toLocaleString() : card.val}
                      </h3>
                    </div>
                  ))}
                </div>

                <WidgetErrorBoundary name="PoliticalStatisticsPanel">
                  <PoliticalStatisticsPanel statistics={politicalStatistics} sectionMeta={sectionMeta} />
                </WidgetErrorBoundary>

                <WidgetErrorBoundary name="AISummaryPanel">
                  <AISummaryPanel summary={aiSummary} insights={aiInsights} sectionMeta={sectionMeta} />
                </WidgetErrorBoundary>

                {/* Key Biography Fields — verified only */}
                {[
                  { label: "Constituency", val: biography.constituency },
                  { label: "Years in Office", val: biography.yearsInOffice != null ? `${biography.yearsInOffice} years` : null },
                  { label: "Age", val: biography.age ? `${biography.age} years` : null },
                  { label: "Education", val: biography.education },
                  { label: "Profession", val: biography.profession },
                  { label: "First Elected", val: biography.dateFirstElected },
                ].filter((item) => isVerifiedValue(item.val)).length > 0 && (
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Profile Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                      { label: "Constituency", val: biography.constituency },
                      { label: "Years in Office", val: biography.yearsInOffice != null ? `${biography.yearsInOffice} years` : null },
                      { label: "Age", val: biography.age ? `${biography.age} years` : null },
                      { label: "Education", val: biography.education },
                      { label: "Profession", val: biography.profession },
                      { label: "First Elected", val: biography.dateFirstElected },
                    ].filter((item) => isVerifiedValue(item.val)).map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
                        <p className="text-xs font-semibold text-slate-200">{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>

              {/* Sidebar items */}
              <div className="space-y-6">

                <WidgetErrorBoundary name="ConfidenceBreakdown">
                  <ConfidenceBreakdown breakdown={confidenceBreakdown} />
                </WidgetErrorBoundary>

                <WidgetErrorBoundary name="SourceVerificationPanel">
                  <SourceVerificationPanel
                    sources={sources}
                    verificationCatalog={verificationCatalog}
                    lastVerified={verifiedAt}
                  />
                </WidgetErrorBoundary>

                <WidgetErrorBoundary name="RelationshipIntelligencePanel">
                  <RelationshipIntelligencePanel
                    relationships={relationships}
                    sectionMeta={sectionMeta}
                  />
                </WidgetErrorBoundary>
                {influenceData?.data?.influence && (
                  <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Political Reach Index</h4>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-white">{influenceData.data.influence.digitalInfluence}</span>
                      <span className="text-xs text-slate-500">/100</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {influenceData.data.influence.explanation}
                    </p>
                  </div>
                )}

                {/* Similar Leaders Recommendations */}
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Similar Political Figures</h4>
                  <div className="space-y-3">
                    {similarLeaders.map((item) => (
                      <Link
                        key={item._id}
                        to={`/profile/${item._id}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition"
                      >
                        <LeaderAvatar creator={item} size={32} />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{item.party} | {item.state}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-auto" />
                      </Link>
                    ))}
                    {similarLeaders.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No similar political leaders matched.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. TIMELINE & BIO TAB */}
          {activeTab === "timeline" && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2 space-y-4">
                <SectionFreshnessBar meta={moduleMeta.facts || sectionMeta.facts} label="Verified Facts" />
                <VerifiedProfileCard
                  biography={biography}
                  account={account}
                  verifiedFacts={verifiedFacts}
                  fieldProvenance={fieldProvenance}
                  confidenceScore={confidenceScore}
                  confidenceBreakdown={confidenceBreakdown}
                  verifiedAt={verifiedAt}
                  sources={sources}
                />
              </div>

              <div className="lg:col-span-3 space-y-4">
                <SectionFreshnessBar meta={moduleMeta.timeline || sectionMeta.timeline} label="Timeline" />
                <PoliticalTimelinePanel
                  events={profileTimeline}
                  isLoading={bioLoading}
                  sources={sources}
                />
              </div>
            </div>
          )}

          {/* 3. TELEMETRY & CHARTS TAB */}
          {activeTab === "charts" && (
            <div className="space-y-6">
              
              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Subscriber Growth Chart */}
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Subscriber Growth Over Time</h4>
                  <div className="h-[220px]">
                    {hasGrowthSeries ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeries}>
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#161822", borderColor: "rgba(255,255,255,0.08)" }} />
                          <Line
                            type="monotone"
                            dataKey="subscribers"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={hasSingleGrowthPoint ? { r: 4, fill: "#6366f1", strokeWidth: 0 } : false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState
                        title="No subscriber trend yet"
                        message="No stored YouTube snapshots are available for this profile yet."
                      />
                    )}
                  </div>
                  {hasSingleGrowthPoint && (
                    <p className="text-[11px] text-slate-500">
                      Historical trend will build as more analyses are collected.
                    </p>
                  )}
                </div>

                {/* Views Growth Chart */}
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Views Growth Over Time</h4>
                  <div className="h-[220px]">
                    {hasGrowthSeries ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeries}>
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#161822", borderColor: "rgba(255,255,255,0.08)" }} />
                          <Line
                            type="monotone"
                            dataKey="views"
                            stroke="#a855f7"
                            strokeWidth={2}
                            dot={hasSingleGrowthPoint ? { r: 4, fill: "#a855f7", strokeWidth: 0 } : false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState
                        title="No view trend yet"
                        message="No stored YouTube snapshots are available for this profile yet."
                      />
                    )}
                  </div>
                  {hasSingleGrowthPoint && (
                    <p className="text-[11px] text-slate-500">
                      Historical trend will build as more analyses are collected.
                    </p>
                  )}
                </div>

                {/* Monthly Uploads Distribution */}
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Monthly Upload Frequency</h4>
                  <div className="h-[220px]">
                    {hasUploadsDistribution ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={uploadsDistribution}>
                          <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#161822", borderColor: "rgba(255,255,255,0.08)" }} />
                          <Bar dataKey="uploads" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState
                        title="No upload cadence yet"
                        message="Run another analysis later to calculate upload frequency."
                      />
                    )}
                  </div>
                </div>

                {/* Content Categories Donut Chart */}
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Content Distribution</h4>
                  <div className="h-[220px] flex items-center justify-center">
                    {hasCategories ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categories}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={["#6366f1", "#8b5cf6", "#a855f7", "#64748b"][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState
                        title="No content breakdown available"
                        message={contentDistributionMessage}
                      />
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 4. INFLUENCE & MAPPING TAB */}
          {activeTab === "influence" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Detailed reach statistics */}
              <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Influence Score Board</h3>
                  <p className="text-xs text-slate-400 mt-1">Multi-tier outreach and audience indexes</p>
                </div>

                {influenceData?.data?.influence && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "National Reach", val: influenceData.data.influence.nationalReach },
                      { label: "Regional Reach", val: influenceData.data.influence.regionalReach },
                      { label: "Trust Score", val: influenceData.data.influence.trustScore },
                      { label: "Follower Quality", val: influenceData.data.influence.followerQualityScore },
                      { label: "Audience Growth", val: influenceData.data.influence.audienceGrowth },
                      { label: "Engagement Rating", val: influenceData.data.influence.engagementScore },
                    ].map((score, idx) => (
                      <div key={idx} className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{score.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${score.val}%` }} />
                          </div>
                          <span className="text-xs font-bold text-white">{score.val}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geographic Map Widget */}
              <div className="space-y-6">
                <IndiaMap
                  data={geographicReach}
                  activeState={biography.state}
                />
              </div>

            </div>
          )}

          {/* 5. NEWS & SENTIMENT TAB */}
          {activeTab === "news" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left span: News stream */}
              <div className="lg:col-span-2 bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Press & News Timeline</h3>
                  <p className="text-xs text-slate-400 mt-1">Verified search index reports from trusted news publishers</p>
                </div>

                <div className="space-y-4">
                  {newsItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition space-y-3 cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-xs font-bold text-white hover:text-indigo-400 transition leading-snug">
                          {item.headline}
                        </h4>
                        <span className="shrink-0 text-[9px] bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded text-slate-400 font-medium">
                          {item.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Newspaper className="w-3.5 h-3.5" />
                        <span>Published {item.publishedTime}</span>
                      </div>
                    </a>
                  ))}

                  {newsItems.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No recent news crawled for this political profile.</p>
                  )}
                </div>
              </div>

              {/* Right span: Sentiment breakdown */}
              <div className="space-y-6">
                
                {/* Pie Chart Card */}
                <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Headline Sentiment Breakdown</h4>
                  
                  <div className="h-[180px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {sentimentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-around text-xs border-t border-white/[0.04] pt-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-emerald-400 font-bold">Positive</span>
                      <span className="text-sm font-extrabold text-white mt-0.5">{sentimentDistribution[0].value}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-bold">Neutral</span>
                      <span className="text-sm font-extrabold text-white mt-0.5">{sentimentDistribution[1].value}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-red-400 font-bold">Negative</span>
                      <span className="text-sm font-extrabold text-white mt-0.5">{sentimentDistribution[2].value}%</span>
                    </div>
                  </div>
                </div>

                {/* Common Keywords / Trends */}
                {newsData?.data?.sentiment && (
                  <div className="bg-[#121318]/20 border border-white/[0.06] rounded-2xl p-6 text-left space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trending Topics & Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {sentimentKeywords.map((word, idx) => (
                        <span key={idx} className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-lg">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* 6. ELECTION HISTORY TAB */}
          {activeTab === "elections" && (
            <div className="space-y-4">
              <SectionFreshnessBar meta={moduleMeta.elections || sectionMeta.elections} label="Elections" />
              {isBuilding && !moduleData.elections && (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-[11px] text-indigo-300">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
                  Syncing election data from public sources into MongoDB…
                  {syncProgress?.currentSection === "elections" && " (elections in progress)"}
                </div>
              )}
              {moduleData.elections && elections.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  {elections.length} verified record{elections.length !== 1 ? "s" : ""} from database
                </p>
              )}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Election Intelligence</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Verified electoral records from affidavits and commission sources
                </p>
              </div>
              <WidgetErrorBoundary name="ElectionIntelligencePanel">
                <ElectionIntelligencePanel
                  elections={elections}
                  isLoading={electionsLoading}
                />
              </WidgetErrorBoundary>
            </div>
          )}

          {/* 7. AI CHAT TAB */}
          {activeTab === "chat" && (
            <div className="bg-[#121318]/30 border border-white/[0.06] rounded-2xl flex flex-col h-[480px] overflow-hidden shadow-2xl">
              
              {/* Chat Header */}
              <div className="bg-[#161822] border-b border-white/[0.06] p-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Political Assistant</h4>
                  <p className="text-[9px] text-slate-500">Ask questions about {account.name}'s telemetry, timeline, and growth.</p>
                </div>
              </div>

              {/* Chat timeline logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {chatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-[80%] ${item.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${item.role === "user" ? "bg-indigo-600 text-white" : "bg-[#161822] border border-white/[0.08]"}`}>
                      {item.role === "user" ? "U" : <Bot className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className={`p-3.5 rounded-2xl text-left leading-relaxed ${item.role === "user" ? "bg-indigo-600/90 text-white rounded-tr-none" : "bg-[#161822] border border-white/[0.06] text-slate-200 rounded-tl-none"}`}>
                      <p className="whitespace-pre-line">{item.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && chatHistory[chatHistory.length - 1]?.content === "" && (
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] pl-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200" />
                    <span>Analyzing context and timelines...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendChatMessage} className="bg-[#161822] border-t border-white/[0.06] p-3 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={`Ask about ${account.name}'s stats or campaign details...`}
                  className="flex-1 h-10 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition font-sans"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || chatLoading}
                  className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center transition shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function ChartEmptyState({ title, message }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center rounded-xl border border-white/[0.04] border-dashed bg-white/[0.01] px-6">
      <p className="text-xs font-semibold text-slate-400">{title}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500 max-w-xs">{message}</p>
    </div>
  );
}
