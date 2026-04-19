import { useEffect, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useCodingStore from '../stores/codingStore';
import Navbar from '../components/Layout/Navbar';
import CodingWorkspace from '../components/Coding/CodingWorkspace';
import Leaderboard from '../components/Dashboard/Leaderboard';

export default function CodingPage() {
  const clear = useCodingStore((s) => s.clear);
  const [showIcdRef, setShowIcdRef] = useState(false);
  const [icdData, setIcdData] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    return () => clear();
  }, []);

  const loadIcdData = async () => {
    if (!icdData) {
      try {
        const res = await fetch('/ICD10.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setIcdData(data);
      } catch {
        toast.error('ICD referans cədvəli yüklənmədi');
        return;
      }
    }
    setShowIcdRef((v) => !v);
  };

  const filteredData = icdData && search.trim()
    ? icdData.map((r) => {
        const rMatch = r.name.toLowerCase().includes(search.toLowerCase());
        const filteredB = r.bashliqlar?.map((b) => {
          const bMatch = b.name.toLowerCase().includes(search.toLowerCase());
          const filteredD = b.diaqnozlar?.filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase())
          );
          if (bMatch || (filteredD && filteredD.length > 0)) {
            return { ...b, diaqnozlar: bMatch ? b.diaqnozlar : filteredD };
          }
          return null;
        }).filter(Boolean);
        if (rMatch || (filteredB && filteredB.length > 0)) {
          return { ...r, bashliqlar: rMatch ? r.bashliqlar : filteredB };
        }
        return null;
      }).filter(Boolean)
    : icdData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-gray-800 mb-4">ICD-10 Kodlama</h2>
            <CodingWorkspace />
          </div>
          <div className="lg:col-span-1">
            <div className="mb-4 h-[28px]" /> {/* spacer to align with h2 */}
            <div className="space-y-4">
              <Leaderboard compact />
              <button
                onClick={loadIcdData}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  showIcdRef
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'
                }`}
              >
                <BookOpen size={16} />
                Ümumi Fetal İCD10
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom slide-up popup */}
      {showIcdRef && icdData && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowIcdRef(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white border-t-2 border-teal-300 rounded-t-xl shadow-2xl animate-slide-up"
            style={{ maxHeight: '55vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-5 py-3 border-b border-teal-200 flex items-center justify-between rounded-t-xl">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen size={18} className="text-teal-600" />
                Ümumi Fetal İCD-10 Kodları
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Axtar..."
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none w-56"
                  />
                </div>
                <button onClick={() => setShowIcdRef(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(55vh - 56px)' }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-1/4">Rubrika</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-1/4">Başlıq</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-1/2">Diaqnoz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData?.map((rubrika) =>
                    rubrika.bashliqlar?.map((bashliq) =>
                      bashliq.diaqnozlar?.map((diaqnoz, di) => (
                        <tr key={`${rubrika.id}-${bashliq.id}-${di}`} className="hover:bg-teal-50/30">
                          <td className="px-4 py-1.5 text-xs text-gray-500">{di === 0 ? rubrika.code?.split(' ')[0] : ''}</td>
                          <td className="px-4 py-1.5 text-xs text-gray-700">{di === 0 ? bashliq.name : ''}</td>
                          <td className="px-4 py-1.5 text-xs text-gray-800">{diaqnoz.name}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
              {filteredData?.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">Nəticə tapılmadı</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
