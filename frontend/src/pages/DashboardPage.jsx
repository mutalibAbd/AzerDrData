import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCodingStore from '../stores/codingStore';
import Navbar from '../components/Layout/Navbar';
import StatsCards from '../components/Dashboard/StatsCards';
import MyCodings from '../components/Dashboard/MyCodings';

export default function DashboardPage() {
  const { stats, fetchStats } = useCodingStore();
  const navigate = useNavigate();

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">İdarə paneli</h2>
          <button
            onClick={() => navigate('/coding')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            🚀 Çalışmaya başla
          </button>
        </div>
        <StatsCards stats={stats} />
        <MyCodings />
      </div>
    </div>
  );
}
