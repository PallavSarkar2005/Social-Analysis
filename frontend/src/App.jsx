import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import Accounts from "./pages/Accounts";
import Analyzer from "./pages/Analyzer";
import AIInsights from "./pages/AIInsights";
import HistoryLogs from "./pages/HistoryLogs";
import SettingsEngine from "./pages/SettingsEngine";
import Competitors from "./pages/Competitors";
import Reports from "./pages/Reports";
import Activity from "./pages/Activity";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Workspace */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/analyzer" element={<Analyzer />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/history" element={<HistoryLogs />} />
          <Route path="/settings" element={<SettingsEngine />} />
          <Route path="/competitors" element={<Competitors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/activity" element={<Activity />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
