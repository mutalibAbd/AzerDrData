import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, Loader } from 'lucide-react';

// ECT loaded via <script src="/icd11ect.js"> in index.html → window.ECT
const getECT = () => window.ECT;

const ECT_INO = '1'; // Single ECT instance

/**
 * WHO ECT (Embedded Classification Tool) wrapper.
 * Renders the official WHO ICD-11 search widget.
 * On selection, auto-saves via POST /api/diagnoses/save (UPSERT).
 */
export default function EctSelector({ anomalyId, onSaved }) {
  const anomalyIdRef = useRef(anomalyId);
  const [saving, setSaving] = useState(false);
  const [savedCode, setSavedCode] = useState(null);

  // Keep ref current so the callback never stales
  useEffect(() => {
    anomalyIdRef.current = anomalyId;
    setSavedCode(null); // reset when anomaly changes
  }, [anomalyId]);

  useEffect(() => {
    const settings = {
      apiServerUrl: 'https://icd11restapi-developer-test.azurewebsites.net',
      apiSecured: false,
      icdLinearization: 'mms',
      language: 'en',
      autoBind: false,
    };

    const callbacks = {
      selectedEntityFunction: async (selectedEntity) => {
        const currentAnomalyId = anomalyIdRef.current;
        if (!currentAnomalyId) return;

        const isPostcoordinated = /[&/]/.test(selectedEntity.code || '');

        setSaving(true);
        try {
          const { data } = await api.post('/diagnoses/save', {
            anomalyId: currentAnomalyId,
            icd11FoundationUri: selectedEntity.foundationUri ?? '',
            icd11MmsCode: selectedEntity.code ?? '',
            diagnosisTitle: selectedEntity.title ?? selectedEntity.selectedText ?? '',
            isPostcoordinated,
            clusterDetailsJson: JSON.stringify(selectedEntity),
          });
          setSavedCode({ code: selectedEntity.code, title: selectedEntity.title ?? selectedEntity.selectedText });
          toast.success(`${selectedEntity.code} saxlanıldı`);
          onSaved?.(data);
        } catch {
          toast.error('Saxlama xətası baş verdi');
        } finally {
          setSaving(false);
          getECT()?.clear(ECT_INO);
        }
      },
    };

    getECT().configure(settings, callbacks);
    getECT().bind(ECT_INO);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- configure once

  return (
    <div className="space-y-2">
      {/* Saved diagnosis banner */}
      {savedCode && !saving && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
          <CheckCircle size={14} className="text-green-600 shrink-0" />
          <span className="font-mono text-green-700 font-semibold">{savedCode.code}</span>
          <span className="text-green-700 truncate">{savedCode.title}</span>
        </div>
      )}

      {saving && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-600">
          <Loader size={14} className="animate-spin shrink-0" />
          Saxlanılır...
        </div>
      )}

      {/* WHO ECT widget container */}
      <div className="ctw-window overflow-x-auto" data-ctw-ino={ECT_INO} />
    </div>
  );
}
