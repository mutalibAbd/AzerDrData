import { useEffect } from 'react';
import useCodingStore from '../stores/codingStore';
import Navbar from '../components/Layout/Navbar';
import CodingWorkspace from '../components/Coding/CodingWorkspace';

export default function CodingPage() {
  const clear = useCodingStore((s) => s.clear);

  useEffect(() => {
    return () => clear();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">ICD-11 Kodlama</h2>
        <CodingWorkspace />
      </div>
    </div>
  );
}
