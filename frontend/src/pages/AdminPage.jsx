import { useEffect, useState } from 'react';
import useCodingStore from '../stores/codingStore';
import Navbar from '../components/Layout/Navbar';
import StatsCards from '../components/Dashboard/StatsCards';
import DoctorManagement from '../components/Admin/DoctorManagement';
import ProgressOverview from '../components/Admin/ProgressOverview';
import ErrorReports from '../components/Admin/ErrorReports';

export default function AdminPage() {
  const { stats, fetchStats } = useCodingStore();
  const [tab, setTab] = useState('doctors');

  useEffect(() => { fetchStats(); }, []);

  const tabs = [
    { id: 'doctors', label: 'Həkimlər' },
    { id: 'progress', label: 'İrəliləyiş' },
    { id: 'errors', label: 'Xəta bildirişləri' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Admin Paneli</h2>
        <StatsCards stats={stats} />

        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'doctors' && <DoctorManagement />}
        {tab === 'progress' && <ProgressOverview />}
        {tab === 'errors' && <ErrorReports />}
      </div>
    </div>
  );
}
