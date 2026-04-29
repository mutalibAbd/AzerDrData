import { useState } from 'react';
import { Microscope } from 'lucide-react';
import toast from 'react-hot-toast';
import useCodingStore from '../../stores/codingStore';

function SpellingCheck({ fieldName, fieldLabel, anomalyId }) {
  const [expanded, setExpanded] = useState(false);
  const [correctedText, setCorrectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const reportError = useCodingStore((s) => s.reportError);

  const handleReport = async () => {
    if (!correctedText.trim()) {
      toast.error('Düzəldilmiş mətni yazın');
      return;
    }
    setLoading(true);
    try {
      await reportError(anomalyId, {
        errorType: 'spelling',
        fieldName,
        correctedText: correctedText.trim(),
        description: null,
        note: null,
      });
      toast.success('Yazım xətası bildirildi');
      setExpanded(false);
      setCorrectedText('');
    } catch {
      toast.error('Xəta baş verdi');
    }
    setLoading(false);
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Yazılışda səhv var?</span>
        <button
          onClick={() => setExpanded(true)}
          className={`px-3 py-0.5 rounded border text-xs font-medium transition-all ${expanded ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-amber-50 hover:border-amber-300'}`}
        >
          Hə
        </button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-2">
          <textarea
            value={correctedText}
            onChange={(e) => setCorrectedText(e.target.value)}
            rows={2}
            className="w-full border border-amber-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            placeholder={`"${fieldLabel}" sahəsi üçün düzgün mətni yazın...`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleReport}
              disabled={loading}
              className="px-4 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 font-medium"
            >
              {loading ? 'Göndərilir...' : 'Bildir'}
            </button>
            <button
              onClick={() => { setExpanded(false); setCorrectedText(''); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Ləğv et
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientInfo({ anomaly }) {
  if (!anomaly) return null;

  return (
    <div className="border-2 border-amber-300 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-800">Xəstə Məlumatları</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
            <span>ID: <strong>{anomaly.patientId}</strong></span>
            <span>Tarix: <strong>{anomaly.date}</strong></span>
            <span>Rapor: <strong>{anomaly.reportId}</strong></span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-amber-50/40 to-white px-4 py-4 space-y-4">
        {/* Prominent title */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-100 via-blue-100 to-indigo-100 rounded-lg border border-indigo-200">
          <Microscope size={20} className="text-indigo-600" />
          <span className="text-base font-bold text-indigo-800 tracking-wide">Dr.Azərin anormal tapıntıları</span>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rəy (Diaqnoz)</label>
          <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded text-gray-800">
            {anomaly.diagnosis || <span className="text-gray-400 italic">Boş</span>}
          </div>
          <SpellingCheck fieldName="diagnosis" fieldLabel="Rəy (Diaqnoz)" anomalyId={anomaly.id} />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Açıqlama</label>
          <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded text-gray-800">
            {anomaly.explanation || <span className="text-gray-400 italic">Boş</span>}
          </div>
          <SpellingCheck fieldName="explanation" fieldLabel="Açıqlama" anomalyId={anomaly.id} />
        </div>
      </div>
    </div>
  );
}
