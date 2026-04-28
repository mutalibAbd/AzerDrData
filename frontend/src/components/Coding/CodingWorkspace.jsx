import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SkipForward, ArrowLeft, Loader, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useCodingStore from '../../stores/codingStore';
import PatientInfo from './PatientInfo';
import Icd11Selector from './Icd11Selector';
import ErrorReportModal from './ErrorReportModal';
import DoctorNote from './DoctorNote';

export default function CodingWorkspace() {
  const { currentAnomaly, loading, fetchNext, skipAnomaly } = useCodingStore();
  const [pendingEntity, setPendingEntity] = useState(null); // selected locally, not yet in DB
  const [saving, setSaving] = useState(false);
  const [showIcdErrorModal, setShowIcdErrorModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [doctorNote, setDoctorNote] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = location.state?.editMode === true;

  // Auto-fetch first anomaly (skip in edit mode)
  useEffect(() => {
    if (!currentAnomaly && initialLoad && !isEditMode) {
      fetchNext().then((result) => {
        if (!result) toast.error('Kodlanmamış anomaliya qalmayıb!');
        else if (result._authError) toast.error('Sessiya bitib, yenidən daxil olun');
        setInitialLoad(false);
      });
    }
  }, []);

  // Reset local selection and note when anomaly changes
  useEffect(() => {
    setPendingEntity(null);
    setDoctorNote('');
  }, [currentAnomaly?.id]);

  // Save to DB — only called when doctor clicks Növbəti
  const handleSaveAndNext = useCallback(async () => {
    if (!pendingEntity || !currentAnomaly) return;
    setSaving(true);
    try {
      await api.post('/diagnoses/save', {
        anomalyId: currentAnomaly.id,
        icd11FoundationUri: pendingEntity.foundationUri ?? '',
        icd11MmsCode: pendingEntity.code ?? '',
        diagnosisTitle: pendingEntity.title ?? pendingEntity.selectedText ?? '',
        isPostcoordinated: /[&/]/.test(pendingEntity.code || ''),
        clusterDetailsJson: JSON.stringify(pendingEntity),
        doctorNote: doctorNote || null,
      });
      if (isEditMode) {
        toast.success('Diaqnoz yeniləndi');
        navigate(-1);
      } else {
        const next = await fetchNext();
        if (!next) toast.success('Bütün anomaliyalar kodlandı! 🎉');
      }
    } catch {
      toast.error('Saxlama xətası baş verdi');
    } finally {
      setSaving(false);
    }
  }, [pendingEntity, currentAnomaly, doctorNote, isEditMode, fetchNext, navigate]);

  const handleSkip = useCallback(async () => {
    try {
      await skipAnomaly(currentAnomaly.id);
    } catch {
      // Ignore skip errors
    }
    const next = await fetchNext();
    if (!next) toast('Kodlanmamış anomaliya qalmayıb');
  }, [currentAnomaly, skipAnomaly, fetchNext]);

  const handleOpenIcdError = useCallback(() => setShowIcdErrorModal(true), []);
  const handleCloseIcdError = useCallback(() => setShowIcdErrorModal(false), []);

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
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_5fr] gap-4 items-start">
        <div className="space-y-4">
          <PatientInfo anomaly={currentAnomaly} />
          <DoctorNote
            note={doctorNote}
            onChange={setDoctorNote}
            anomalyId={currentAnomaly.id}
          />
        </div>

        <div>
          <Icd11Selector
            anomalyId={currentAnomaly.id}
            onSelected={setPendingEntity}
            onCleared={() => setPendingEntity(null)}
            onReportIcdError={handleOpenIcdError}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(isEditMode ? -1 : '/')}
          className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
        >
          <ArrowLeft size={16} /> {isEditMode ? 'Geri Qayıt' : 'Ana Səhifəyə Qayıt'}
        </button>

        <div className="flex gap-3">
          {!isEditMode && (
            <button
              onClick={handleSkip}
              disabled={loading || saving}
              className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Növbəti anomaliyaya keç (bu anomaliyanı atla)"
            >
              <SkipForward size={16} /> Keç
            </button>
          )}
          <button
            onClick={handleSaveAndNext}
            disabled={!pendingEntity || saving}
            className="flex items-center gap-2 px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            title={pendingEntity ? 'Saxla və növbəti anomaliyaya keç' : 'Əvvəlcə diaqnoz seçin'}
          >
            {saving ? (
              <><Loader size={14} className="animate-spin" /> Saxlanılır...</>
            ) : isEditMode ? (
              <><CheckCircle size={14} /> Yadda saxla</>
            ) : (
              <><span>Növbəti</span><ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>

      {showIcdErrorModal && (
        <ErrorReportModal anomalyId={currentAnomaly.id} onClose={handleCloseIcdError} />
      )}
    </div>
  );
}
