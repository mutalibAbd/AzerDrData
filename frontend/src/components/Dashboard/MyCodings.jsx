import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function MyCodings() {
  const [codings, setCodings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCodings();
  }, [page]);

  const loadCodings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/dashboard/my-codings?page=${page}&size=5`);
      setCodings(data);
    } catch {
      // handled by interceptor
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Yüklənir...</div>;

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800">Mənim kodlaşdırmalarım</h3>
      </div>
      {codings.length === 0 ? (
        <div className="p-6 text-center text-gray-400">Hələ heç bir kodlama yoxdur</div>
      ) : (
        <div className="divide-y">
          {codings.map((c) => (
            <div key={c.anomalyId} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">Hasta: {c.patientId}</span>
                <span className="text-xs text-gray-400 ml-2">{c.date}</span>
              </div>
              <div className="text-right">
                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                  {(c.codes ?? []).map((code, i) => (
                    <span
                      key={i}
                      className="text-xs bg-blue-100 text-blue-700 font-mono px-1.5 py-0.5 rounded"
                      title={code.icd11Title}
                    >
                      {code.icd11Code}
                    </span>
                  ))}
                  {(!c.codes || c.codes.length === 0) && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="px-4 py-2 border-t flex justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="text-sm text-blue-600 disabled:text-gray-300"
        >
          ← Əvvəl
        </button>
        <span className="text-xs text-gray-400">Səhifə {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={codings.length < 5}
          className="text-sm text-blue-600 disabled:text-gray-300"
        >
          Sonra →
        </button>
      </div>
    </div>
  );
}
