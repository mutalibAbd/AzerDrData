import { useEffect } from 'react';
import useCodingStore from '../stores/codingStore';
import Navbar from '../components/Layout/Navbar';
import CodingWorkspace from '../components/Coding/CodingWorkspace';
import Leaderboard from '../components/Dashboard/Leaderboard';

export default function CodingPage() {
  const clear = useCodingStore((s) => s.clear);

  useEffect(() => {
    return () => clear();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-gray-800 mb-4">ICD-10 Kodlama</h2>
            <CodingWorkspace />
          </div>
          <div className="lg:col-span-1">
            <Leaderboard compact />
          </div>
        </div>
      </div>
    </div>
  );
}
