import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy loading all page views
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Compare = lazy(() => import("./pages/Compare"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const HistoryLogs = lazy(() => import("./pages/HistoryLogs"));
const SettingsEngine = lazy(() => import("./pages/SettingsEngine"));
const Competitors = lazy(() => import("./pages/Competitors"));
const Reports = lazy(() => import("./pages/Reports"));
const Activity = lazy(() => import("./pages/Activity"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const GroupAnalytics = lazy(() => import("./pages/GroupAnalytics"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Standard high-end loading fallback
const SuspenseFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#090a0f] text-slate-100 flex-col space-y-4">
    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-400 tracking-wider">Loading social telemetry dashboard...</span>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Dashboard Workspace */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/history" element={<HistoryLogs />} />
            <Route path="/settings" element={<SettingsEngine />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/groups/:groupName" element={<GroupAnalytics />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
