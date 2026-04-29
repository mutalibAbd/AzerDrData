import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useCodingStore from '../../stores/codingStore';

export default function MyCodings() {
  const [codings, setCodings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(null); // anomalyId being loaded
  const navigate = useNavigate();
  const setAnomaly = useCodingStore((s) => s.setAnomaly);

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

  const handleEdit = async (anomalyId) => {
    setEditLoading(anomalyId);
    try {
      const { data } = await api.get(`/anomaly/${anomalyId}`);
      setAnomaly(data);
      navigate('/coding', { state: { editMode: true } });
    } catch {
      // anomaly not found or not owned by this doctor
    } finally {
      setEditLoading(null);
    }
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Yüklənir...</div>;

  return (
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
                onClick={() => handleEdit(c.anomalyId)}
                disabled={editLoading === c.anomalyId}
                className="shrink-0 p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
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
  );
}
