import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkipForward, ArrowLeft, Loader, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useCodingStore from '../../stores/codingStore';
import PatientInfo from './PatientInfo';
import Icd11Selector from './Icd11Selector';
import ErrorReportModal from './ErrorReportModal';
import Leaderboard from '../Dashboard/Leaderboard';

export default function CodingWorkspace() {
  const { currentAnomaly, loading, fetchNext, skipAnomaly } = useCodingStore();
  const [savedDiagnosis, setSavedDiagnosis] = useState(null);
  const [showIcdErrorModal, setShowIcdErrorModal] = useState(false);
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

  // Reset saved diagnosis state when anomaly changes
  useEffect(() => {
    setSavedDiagnosis(null);
  }, [currentAnomaly?.id]);

  const handleNext = useCallback(async () => {
    const next = await fetchNext();
    if (!next) toast.success('Bütün anomaliyalar kodlandı! 🎉');
  }, [fetchNext]);

  const handleSkip = useCallback(async () => {
    await skipAnomaly(currentAnomaly.id);
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
      {/* Main two-column layout: patient info left, ECT right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left column: patient info + leaderboard */}
        <div className="space-y-4">
          <PatientInfo anomaly={currentAnomaly} />
          <Leaderboard compact />
        </div>

        {/* Right column: ICD-11 ECT coding widget */}
        <div>
          <Icd11Selector
            anomalyId={currentAnomaly.id}
            onSaved={setSavedDiagnosis}
            onReportIcdError={handleOpenIcdError}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
        >
          <ArrowLeft size={16} /> Ana Səhifəyə Qayıt
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <SkipForward size={16} /> Keç
          </button>
          <button
            onClick={handleNext}
            disabled={!savedDiagnosis}
            className="flex items-center gap-1 px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            title={savedDiagnosis ? 'Növbəti anomaliyaya keç' : 'Əvvəlcə diaqnoz seçin'}
          >
            Növbəti <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showIcdErrorModal && (
        <ErrorReportModal anomalyId={currentAnomaly.id} onClose={handleCloseIcdError} />
      )}
    </div>
  );
}
