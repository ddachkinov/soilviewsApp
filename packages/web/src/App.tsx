import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { Fields } from './pages/Fields';
import { Login } from './pages/Login';

/**
 * Main application component with routing.
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/fields" element={<Fields />} />
      </Routes>
    </div>
  );
}

export default App;
