import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import Accounts from "./pages/Accounts";
import Analyzer from "./pages/Analyzer";
import AIInsights from "./pages/AIInsights";
import HistoryLogs from "./pages/HistoryLogs";
import SettingsEngine from "./pages/SettingsEngine";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/analyzer" element={<Analyzer />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/history" element={<HistoryLogs />} />
        <Route path="/settings" element={<SettingsEngine />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
