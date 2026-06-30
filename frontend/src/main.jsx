import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppearanceProvider } from './context/AppearanceContext.jsx'
import ErrorBoundary from './errors/ErrorBoundary.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Global error classification helper — maps HTTP status codes or error messages
 * to the appropriate dedicated error page path.
 */
const classifyApiError = (error) => {
  const status = error?.status || error?.response?.status;
  const message = (error?.message || '').toLowerCase();

  if (!navigator.onLine) return '/error/offline';
  if (status === 401) return '/error/401';
  if (status === 403) return '/error/403';
  if (status === 404) return '/error/404';
  if (status === 503 || status === 504) return '/error/network';
  if (status >= 500) return '/error/500';
  if (message.includes('network') || message.includes('timeout') || message.includes('failed to fetch')) return '/error/network';
  if (message.includes('payment') || message.includes('razorpay') || message.includes('billing')) return '/error/payment';
  if (message.includes('groq') || message.includes('openai') || message.includes('llm')) return '/error/ai';
  return null; // let React Query handle minor errors inline
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5-minute cache staleness window
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
  // Global React Query error handler — intercepts network / API failures
  // and routes to appropriate dedicated error pages
  queryCache: undefined,
});

// Wire global error handler into queryClient after construction
queryClient.getQueryCache().config.onError = (error) => {
  const path = classifyApiError(error);
  if (path && window.location.pathname !== path) {
    // Store the error for correlation ID display on error pages
    try {
      sessionStorage.setItem('latest_error_telemetry', JSON.stringify({
        requestId: 'rq-' + Math.random().toString(36).substring(2, 10),
        timestamp: new Date().toISOString(),
        errorMessage: error?.message,
        route: window.location.pathname,
      }));
    } catch (_) {}
    window.location.href = path;
  }
};

queryClient.getMutationCache().config.onError = (error) => {
  const path = classifyApiError(error);
  // Only redirect for hard infrastructure errors from mutations (not validation errors)
  const status = error?.status || error?.response?.status;
  if (path && status && status >= 500 && window.location.pathname !== path) {
    window.location.href = path;
  }
};

// Global uncaught promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const path = classifyApiError(error);
  if (path && window.location.pathname !== path) {
    event.preventDefault();
    window.location.href = path;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppearanceProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </AppearanceProvider>
    </ErrorBoundary>
  </StrictMode>,
)
