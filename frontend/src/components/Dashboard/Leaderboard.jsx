import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import api from '../../services/api';

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ compact = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/leaderboard')
      .then(({ data }) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-4 text-gray-400 text-sm">Yüklənir...</div>;
  if (items.length === 0) return null;

  const displayed = compact ? items.slice(0, 5) : items;

  return (
    <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          Həkimlərin Sıralaması
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {displayed.map((item) => (
          <div key={item.rank} className={`px-4 py-2.5 flex items-center justify-between ${item.rank <= 3 ? 'bg-yellow-50/40' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-lg w-8 text-center">
                {item.rank <= 3 ? medals[item.rank - 1] : <span className="text-sm font-bold text-gray-300">#{item.rank}</span>}
              </span>
              <span className={`font-medium ${item.rank <= 3 ? 'text-gray-900' : 'text-gray-700'} text-sm`}>
                {item.doctorName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`font-bold ${item.rank === 1 ? 'text-yellow-600 text-lg' : item.rank <= 3 ? 'text-blue-600' : 'text-gray-600'}`}>
                {item.codingCount}
              </span>
              <span className="text-xs text-gray-400">kodlama</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
