import { useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import EctSelector from './EctSelector';

export default function Icd11Selector({ anomalyId, onReportIcdError, onSelected, onCleared }) {
  const handleReportError = useCallback(() => {
    if (onReportIcdError) onReportIcdError();
  }, [onReportIcdError]);

  return (
    <div className="bg-white border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          ICD-11 Diaqnozu <span className="text-red-500">*</span>
        </h3>
        {/* {onReportIcdError && (
          <button
            onClick={handleReportError}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700"
            title="Anomaliyada xəta bildir"
          >
            <AlertCircle size={14} /> Xəta bildir
          </button>
        )} */}
      </div>

      <EctSelector anomalyId={anomalyId} onSelected={onSelected} onCleared={onCleared} />
    </div>
  );
}

