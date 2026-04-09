import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './stores/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CodingPage from './pages/CodingPage';
import AdminPage from './pages/AdminPage';

function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/coding" element={<PrivateRoute><CodingPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
