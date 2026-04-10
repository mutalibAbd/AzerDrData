import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCodingStore from '../stores/codingStore';
import useAuthStore from '../stores/authStore';
import Navbar from '../components/Layout/Navbar';
import StatsCards from '../components/Dashboard/StatsCards';
import MyCodings from '../components/Dashboard/MyCodings';

export default function DashboardPage() {
  const { stats, fetchStats } = useCodingStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Xoş gəldiniz, Dr. {user?.fullName || 'Doktor'}!
            </h2>
            <p className="text-sm text-gray-500 mt-1">ICD-10 kodlama platformasına daxil oldunuz</p>
          </div>
          <button
            onClick={() => navigate('/coding')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
          >
            Kodlamağa Başla
          </button>
        </div>
        <StatsCards stats={stats} />
        <MyCodings />
      </div>
    </div>
  );
}
