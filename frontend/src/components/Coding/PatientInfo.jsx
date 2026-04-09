export default function PatientInfo({ anomaly }) {
  if (!anomaly) return null;

  return (
    <div className="bg-white border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Hasta Məlumatları</h3>
        <div className="flex gap-3 text-sm text-gray-500">
          <span>ID: <strong>{anomaly.patientId}</strong></span>
          <span>Tarix: <strong>{anomaly.date}</strong></span>
          <span>Rapor: <strong>{anomaly.reportId}</strong></span>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Diaqnoz (Həkimin rəyi)</label>
        <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded text-gray-800">
          {anomaly.diagnosis || <span className="text-gray-400 italic">Boş</span>}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Açıqlama</label>
        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded text-gray-800">
          {anomaly.explanation || <span className="text-gray-400 italic">Boş</span>}
        </div>
      </div>
    </div>
  );
}
