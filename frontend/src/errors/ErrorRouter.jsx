import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const Error404 = lazy(() => import("./Error404"));
const Error401 = lazy(() => import("./Error401"));
const Error403 = lazy(() => import("./Error403"));
const Error500 = lazy(() => import("./Error500"));
const ErrorNetwork = lazy(() => import("./ErrorNetwork"));
const ErrorOffline = lazy(() => import("./ErrorOffline"));
const ErrorMaintenance = lazy(() => import("./ErrorMaintenance"));
const ErrorPayment = lazy(() => import("./ErrorPayment"));
const ErrorAI = lazy(() => import("./ErrorAI"));
const ErrorUnknown = lazy(() => import("./ErrorUnknown"));

const SuspenseFallback = () => (
  <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400 font-mono text-xs">
    <span>Loading diagnostics...</span>
  </div>
);

export default function ErrorRouter() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="404" element={<Error404 />} />
        <Route path="401" element={<Error401 />} />
        <Route path="403" element={<Error403 />} />
        <Route path="500" element={<Error500 />} />
        <Route path="network" element={<ErrorNetwork />} />
        <Route path="offline" element={<ErrorOffline />} />
        <Route path="maintenance" element={<ErrorMaintenance />} />
        <Route path="payment" element={<ErrorPayment />} />
        <Route path="ai" element={<ErrorAI />} />
        <Route path="unknown" element={<ErrorUnknown />} />
        <Route path="*" element={<Navigate to="unknown" replace />} />
      </Routes>
    </Suspense>
  );
}
