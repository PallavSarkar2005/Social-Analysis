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
  if (status === 403) return '/error/403';
  if (status === 404) return '/error/404';
  if (status === 503 || status === 504) return '/error/network';
  if (status >= 500) return '/error/500';
  if (message.includes('network') || message.includes('timeout') || message.includes('failed to fetch')) return '/error/network';
  if (message.includes('payment') || message.includes('razorpay') || message.includes('billing')) return '/error/payment';
  if (message.includes('groq') || message.includes('openai') || message.includes('llm')) return '/error/ai';
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 2 * 60 * 1000, // 2 min — avoid duplicate network storms
      gcTime: 15 * 60 * 1000, // formerly cacheTime
      retry: (failureCount, error) => {
        const status = error?.response?.status || error?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      retry: 0,
    },
  },
});

queryClient.getQueryCache().config.onError = (error) => {
  const status = error?.status || error?.response?.status;
  if (!status || status < 500) return;

  const path = classifyApiError(error);
  if (path && window.location.pathname !== path) {
    try {
      sessionStorage.setItem('latest_error_telemetry', JSON.stringify({
        requestId: 'rq-' + Math.random().toString(36).substring(2, 10),
        timestamp: new Date().toISOString(),
        errorMessage: error?.message,
        route: window.location.pathname,
      }));
    } catch (_e) { /* ignore storage errors */ }
    window.location.href = path;
  }
};

queryClient.getMutationCache().config.onError = (error) => {
  const path = classifyApiError(error);
  const status = error?.status || error?.response?.status;
  if (path && status && status >= 500 && window.location.pathname !== path) {
    window.location.href = path;
  }
};

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const status = error?.status || error?.response?.status;
  if (!status || status < 500) return;

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

export { queryClient };
