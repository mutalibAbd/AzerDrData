import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useCodingStore from '../../stores/codingStore';

export default function ErrorReportModal({ anomalyId, onClose }) {
  const [fieldName, setFieldName] = useState('diagnosis');
  const [correctedText, setCorrectedText] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const reportError = useCodingStore((s) => s.reportError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reportError(anomalyId, { fieldName, correctedText, note: note || null });
      toast.success('Xəta bildirişi göndərildi');
      onClose();
    } catch {
      toast.error('Xəta baş verdi');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Yazım xətası bildir
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sahə</label>
            <select
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="diagnosis">Diaqnoz (Həkimin rəyi)</option>
              <option value="explanation">Açıqlama</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Düzəldilmiş mətn</label>
            <textarea
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Düzgün mətni buraya yazın..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qeyd (ixtiyari)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Əlavə qeyd..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
              Ləğv et
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
              {loading ? 'Göndərilir...' : 'Bildir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
