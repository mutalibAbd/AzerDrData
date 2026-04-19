import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ProgressOverview() {
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/progress')
      .then(({ data }) => { setProgress(data); setError(null); })
      .catch(() => setError('İrəliləyiş yüklənmədi'));
  }, []);

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800">İrəliləyiş (Həkim bazında)</h3>
      </div>
      {error ? (
        <div className="p-6 text-center text-red-400 text-sm">{error}</div>
      ) : (
      <div className="divide-y">
        {progress.map((p, i) => (
          <div key={p.doctorId} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-300 w-6">#{i + 1}</span>
              <span className="font-medium text-gray-800">{p.doctorName}</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-blue-600">{p.codingCount}</span>
              <span className="text-sm text-gray-400 ml-1">kodlama</span>
              {p.lastCodingAt && (
                <p className="text-xs text-gray-400">
                  Son: {new Date(p.lastCodingAt).toLocaleDateString('az-AZ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {progress.length === 0 && (
          <div className="p-6 text-center text-gray-400">Hələ heç bir kodlama yoxdur</div>
        )}
      </div>
      )}
    </div>
  );
}
