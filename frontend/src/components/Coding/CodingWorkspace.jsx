import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, SkipForward, AlertTriangle, ArrowLeft, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import useCodingStore from '../../stores/codingStore';
import PatientInfo from './PatientInfo';
import IcdSelector from './IcdSelector';
import ErrorReportModal from './ErrorReportModal';

export default function CodingWorkspace() {
  const { currentAnomaly, loading, fetchNext, saveCoding, skipAnomaly } = useCodingStore();
  const [icdData, setIcdData] = useState({});
  const [qeyd, setQeyd] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const navigate = useNavigate();

  // Auto-fetch first anomaly when entering coding page
  useEffect(() => {
    if (!currentAnomaly && initialLoad) {
      fetchNext().then((result) => {
        if (!result) toast.error('Kodlanmamış anomaliya qalmayıb!');
        else if (result._authError) toast.error('Sessiya bitib, yenidən daxil olun');
        setInitialLoad(false);
      });
    }
  }, []);

  const handleSave = async () => {
    if (!icdData.diaqnozCode) {
      toast.error('Zəhmət olmasa ICD diaqnoz seçin');
      return;
    }
    setSaving(true);
    try {
      await saveCoding(currentAnomaly.id, { ...icdData, qeyd: qeyd || null });
      toast.success('Kodlama saxlanıldı!');
      setQeyd('');
      setIcdData({});
      // Auto-fetch next
      const next = await fetchNext();
      if (!next) toast.success('Bütün anomaliyalar kodlandı! 🎉');
    } catch {
      toast.error('Xəta baş verdi');
    }
    setSaving(false);
  };

  const handleSkip = async () => {
    await skipAnomaly(currentAnomaly.id);
    setQeyd('');
    setIcdData({});
    const next = await fetchNext();
    if (!next) toast('Kodlanmamış anomaliya qalmayıb');
  };

  if (!currentAnomaly) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {loading ? (
          <>
            <Loader size={32} className="animate-spin text-blue-500 mb-3" />
            <p className="text-gray-500">Anomaliya yüklənir...</p>
          </>
        ) : (
          <>
            <p className="text-gray-500 mb-4">Kodlanmamış anomaliya tapılmadı</p>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
            >
              <ArrowLeft size={16} /> Ana Səhifəyə Qayıt
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PatientInfo anomaly={currentAnomaly} />
      <IcdSelector value={icdData} onChange={setIcdData} />

      {/* Note */}
      <div className="bg-white border rounded-lg p-5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Qeyd (ixtiyari)</label>
        <textarea
          value={qeyd}
          onChange={(e) => setQeyd(e.target.value)}
          rows={2}
          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="Əlavə qeyd yaza bilərsiniz..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
          >
            <ArrowLeft size={16} /> Ana Səhifəyə Qayıt
          </button>
          <button
            onClick={() => setShowErrorModal(true)}
            className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800"
          >
            <AlertTriangle size={16} /> Yazım xətası bildir
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <SkipForward size={16} /> Keç
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !icdData.diaqnozCode}
            className="flex items-center gap-1 px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saxlanılır...' : 'Saxla & Növbəti'}
          </button>
        </div>
      </div>

      {showErrorModal && (
        <ErrorReportModal anomalyId={currentAnomaly.id} onClose={() => setShowErrorModal(false)} />
      )}
    </div>
  );
}
