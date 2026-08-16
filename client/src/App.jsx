import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PageTransitionProvider } from './context/PageTransitionContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PageTransitionProvider>
            <AppRoutes />
          </PageTransitionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
