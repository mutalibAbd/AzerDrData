import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ErrorReports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadReports(); }, [filter]);

  const loadReports = async () => {
    const { data } = await api.get(`/admin/error-reports?status=${filter}`);
    setReports(data);
  };

  const handleReview = async (id, status) => {
    await api.put(`/admin/error-reports/${id}`, { status });
    toast.success(status === 'accepted' ? 'Qəbul edildi' : 'Rədd edildi');
    loadReports();
  };

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Xəta bildirişləri</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="pending">Gözləmədə</option>
          <option value="accepted">Qəbul edilmiş</option>
          <option value="rejected">Rədd edilmiş</option>
        </select>
      </div>
      <div className="divide-y">
        {reports.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">Hasta: {r.patientId}</span>
                <span className="text-xs text-gray-400 ml-2">Həkim: {r.doctorName}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                  {r.fieldName === 'diagnosis' ? 'Diaqnoz' : 'Açıqlama'}
                </span>
              </div>
              {filter === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(r.id, 'accepted')}
                    className="text-green-600 hover:text-green-800"
                    title="Qəbul et"
                  >
                    <CheckCircle size={18} />
                  </button>
                  <button
                    onClick={() => handleReview(r.id, 'rejected')}
                    className="text-red-600 hover:text-red-800"
                    title="Rədd et"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-gray-500">Orijinal:</span>
                <p className="bg-red-50 border border-red-100 rounded p-2 mt-1">{r.originalText}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Düzəldilmiş:</span>
                <p className="bg-green-50 border border-green-100 rounded p-2 mt-1">{r.correctedText}</p>
              </div>
            </div>
            {r.note && <p className="text-xs text-gray-500">Qeyd: {r.note}</p>}
          </div>
        ))}
        {reports.length === 0 && (
          <div className="p-6 text-center text-gray-400">Bildiriş yoxdur</div>
        )}
      </div>
    </div>
  );
}
