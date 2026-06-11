import { BrowserRouter, Routes, Route } from "react-router-dom";
import Accounts from "./pages/Accounts";
import Dashboard from "./pages/Dashboard";
import CompareAccounts from "./pages/CompareAccounts";
import Analyzer from "./pages/Analyzer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/compare" element={<CompareAccounts />} />

        <Route path="/accounts" element={<Accounts />} />
        
        <Route path="/analyzer" element={<Analyzer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
