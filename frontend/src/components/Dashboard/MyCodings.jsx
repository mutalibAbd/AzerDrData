import { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import api from '../../services/api';
import EctSelector from '../Coding/EctSelector';

export default function MyCodings() {
  const [codings, setCodings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editAnomaly, setEditAnomaly] = useState(null); // { id, patientId, date }

  useEffect(() => {
    loadCodings();
  }, [page]);

  const loadCodings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/diagnoses/my?page=${page}&size=10`);
      setCodings(data ?? []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleEditSaved = () => {
    setEditAnomaly(null);
    loadCodings();
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Yüklənir...</div>;

  return (
    <>
      <div className="bg-white border rounded-lg">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-800">Mənim kodlaşdırmalarım (ICD-11)</h3>
        </div>
        {codings.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Hələ heç bir kodlama yoxdur</div>
        ) : (
          <div className="divide-y">
            {codings.map((c) => (
              <div key={c.anomalyId} className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      Hasta: {c.patientId}
                    </span>
                    <span className="text-xs text-gray-400">{c.date}</span>
                    {c.isPostcoordinated && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                        Postkoord.
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                      {c.icd11MmsCode}
                    </span>
                    <span className="text-xs text-gray-600 truncate" title={c.diagnosisTitle}>
                      {c.diagnosisTitle}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setEditAnomaly({ id: c.anomalyId, patientId: c.patientId, date: c.date })}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  title="Redaktə et"
                  aria-label="Kodu redaktə et"
                >
                  <Pencil size={14} />
                </button>
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
            disabled={codings.length < 10}
            className="text-sm text-blue-600 disabled:text-gray-300"
          >
            Sonra →
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditAnomaly(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Kodu Redaktə Et</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Hasta: {editAnomaly.patientId} · {editAnomaly.date}
                </p>
              </div>
              <button
                onClick={() => setEditAnomaly(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <EctSelector anomalyId={editAnomaly.id} onSaved={handleEditSaved} />
          </div>
        </div>
      )}
    </>
  );
}
