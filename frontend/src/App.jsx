import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteTracker from "./errors/RouteTracker";
import ErrorRouter from "./errors/ErrorRouter";
import { AppShellSkeleton } from "./components/common/PageSkeleton";

// Route-based code splitting — each page is its own chunk
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Compare = lazy(() => import("./pages/Compare"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const HistoryLogs = lazy(() => import("./pages/HistoryLogs"));
const SettingsEngine = lazy(() => import("./pages/SettingsEngine"));
const Competitors = lazy(() => import("./pages/Competitors"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const SharedReport = lazy(() => import("./pages/SharedReport"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const GroupAnalytics = lazy(() => import("./pages/GroupAnalytics"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Billing = lazy(() => import("./pages/Billing"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutFailed = lazy(() => import("./pages/CheckoutFailed"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PoliticalProfile = lazy(() => import("./pages/PoliticalProfile"));

function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Suspense fallback={<AppShellSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/shared/:token" element={<SharedReport />} />

          <Route path="/error/*" element={<ErrorRouter />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/history" element={<HistoryLogs />} />
            <Route path="/settings" element={<SettingsEngine />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:reportId" element={<ReportDetail />} />
            <Route path="/groups/:groupName" element={<GroupAnalytics />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/checkout" element={<Checkout />} />
            <Route path="/billing/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/billing/checkout/failed" element={<CheckoutFailed />} />
            <Route path="/billing/invoices/:invoiceId" element={<InvoiceDetail />} />
            <Route path="/profile/:creatorId" element={<PoliticalProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/error/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
