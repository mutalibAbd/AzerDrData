import { useState } from 'react';
import { AlertTriangle, X, SpellCheck, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import useCodingStore from '../../stores/codingStore';

export default function ErrorReportModal({ anomalyId, onClose }) {
  const [errorType, setErrorType] = useState('spelling');
  const [fieldName, setFieldName] = useState('diagnosis');
  const [correctedText, setCorrectedText] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const reportError = useCodingStore((s) => s.reportError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reportError(anomalyId, {
        errorType,
        fieldName: errorType === 'spelling' ? fieldName : null,
        correctedText: errorType === 'spelling' ? correctedText : null,
        description: errorType === 'logic' ? description : null,
        note: note || null,
      });
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
            Xəta bildir
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Error Type Selection */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setErrorType('spelling')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
              errorType === 'spelling'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <SpellCheck size={16} />
            Yazım xətası
          </button>
          <button
            type="button"
            onClick={() => setErrorType('logic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
              errorType === 'logic'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <GitBranch size={16} />
            Məntiq / ICD xətası
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorType === 'spelling' ? (
            <>
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
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problemin təsviri</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ICD kodu ilə bağlı problemi izah edin... Məs: Bu anomaliya üçün uyğun ICD kodu tapılmır, diaqnoz məlumatı kifayət deyil, və s."
                required
              />
            </div>
          )}
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
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm text-white rounded disabled:opacity-50 ${
                errorType === 'spelling'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {loading ? 'Göndərilir...' : 'Bildir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
