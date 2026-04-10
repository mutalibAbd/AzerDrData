import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Shield } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import logo from '../../assets/logo.jpeg';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src={logo} alt="RadVision" className="h-8 w-8 rounded object-cover" />
          <h1 className="text-xl font-bold text-blue-700">RadVision</h1>
        </div>
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${isActive('/') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <LayoutDashboard size={16} /> İdarə paneli
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${isActive('/admin') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Shield size={16} /> Admin
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.fullName} <span className="text-xs text-gray-400">({user?.role})</span>
        </span>
        <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
          <LogOut size={16} /> Çıxış
        </button>
      </div>
    </nav>
  );
}
