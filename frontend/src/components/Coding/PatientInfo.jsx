export default function PatientInfo({ anomaly, onReportError }) {
  if (!anomaly) return null;

  return (
    <div className="bg-white border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Xəstə Məlumatları</h3>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-sm text-gray-500">
            <span>ID: <strong>{anomaly.patientId}</strong></span>
            <span>Tarix: <strong>{anomaly.date}</strong></span>
            <span>Rapor: <strong>{anomaly.reportId}</strong></span>
          </div>
          {onReportError && (
            <button
              onClick={onReportError}
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 border border-amber-200 rounded px-2 py-1 hover:bg-amber-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Xəta bildir
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-sm font-medium text-gray-500 italic">Dr.Azərin Anormal tapıntıları</p>
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
