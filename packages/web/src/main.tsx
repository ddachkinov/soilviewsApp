import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { FlagProvider } from '@unleash/proxy-client-react';
import App from './App';
import './index.css';
import './i18n';

/**
 * SoilViews Web Application Entry Point
 *
 * Stack:
 * - React 18 with concurrent features
 * - React Query for server state
 * - React Router for navigation
 * - Unleash for feature flags
 * - i18next for Bulgarian/English localization
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const unleashConfig = {
  url: import.meta.env.VITE_UNLEASH_PROXY_URL || 'http://localhost:4242/api/frontend',
  clientKey: import.meta.env.VITE_UNLEASH_CLIENT_KEY || 'default:development',
  appName: 'soilviews-web',
  refreshInterval: 15,
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FlagProvider config={unleashConfig}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </FlagProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
