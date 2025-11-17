import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { Fields } from './pages/Fields';
import { Login } from './pages/Login';
import { Tutorial } from './pages/Tutorial';
import { authApi } from './services/auth';

/**
 * Main application component with routing.
 */
function App() {
  // Check if user is logged in
  const isAuthenticated = authApi.isAuthenticated();

  // Check if user has seen tutorial
  const hasSeenTutorial = localStorage.getItem('soilviews_tutorial_completed') === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !hasSeenTutorial ? (
              <Navigate to="/tutorial" replace />
            ) : (
              <Dashboard />
            )
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/fields" element={<Fields />} />
      </Routes>
    </div>
  );
}

export default App;
