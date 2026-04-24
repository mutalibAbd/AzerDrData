import { useState, useEffect } from 'react';
import { X, Loader, AlertTriangle, Info } from 'lucide-react';
import api from '../../services/api';

function PostcoordSection({ axes, required }) {
  if (!axes?.length) return null;
  return (
    <section>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${
        required ? 'text-red-600' : 'text-yellow-600'
      }`}>
        {required ? <AlertTriangle size={12} /> : <Info size={12} />}
        {required ? 'Məcburi postkoordinasiya' : 'İxtiyari postkoordinasiya'}
      </h3>
      <div className="space-y-2">
        {axes.map((axis, i) => (
          <div key={i} className={`rounded-lg p-3 text-sm ${
            required ? 'bg-red-50 border border-red-100' : 'bg-yellow-50 border border-yellow-100'
          }`}>
            <p className={`font-medium mb-1 ${required ? 'text-red-700' : 'text-yellow-700'}`}>
              {axis.axisName}
            </p>
            {axis.allowedValues?.length > 0 && (
              <ul className="space-y-0.5 mt-1.5">
                {axis.allowedValues.slice(0, 8).map((val, j) => (
                  <li key={j} className="text-gray-600 text-xs flex items-start gap-1.5">
                    <span className={`shrink-0 mt-0.5 ${required ? 'text-red-400' : 'text-yellow-500'}`}>•</span>
                    {val}
                  </li>
                ))}
                {axis.allowedValues.length > 8 && (
                  <li className="text-gray-400 text-xs italic">
                    +{axis.allowedValues.length - 8} digər...
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Icd11DetailsModal({ entityId, code, title, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setDetails(null);
    api.get(`/icd11/entity/${entityId}`)
      .then(({ data }) => setDetails(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [entityId]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const hasRequiredPostcoord = details?.requiredAxes?.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-start justify-between p-5 border-b ${
          hasRequiredPostcoord ? 'border-red-100 bg-red-50/40' : ''
        }`}>
          <div>
            <span className="font-mono text-sm text-blue-700 font-semibold">{code}</span>
            {hasRequiredPostcoord && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 font-medium bg-red-100 px-1.5 py-0.5 rounded">
                <AlertTriangle size={10} /> Məcburi postkoordinasiya
              </span>
            )}
            <h2 className="font-semibold text-gray-800 mt-0.5 leading-snug">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Bağla"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader size={24} className="animate-spin text-blue-400" />
            </div>
          )}
          {error && (
            <p className="text-center text-red-500 text-sm py-4">Məlumat yüklənmədi</p>
          )}
          {details && (
            <>
              <PostcoordSection axes={details.requiredAxes} required={true} />

              {details.description && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Təsvir</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{details.description}</p>
                </section>
              )}

              {details.exclusions?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">İstisnalar</h3>
                  <ul className="space-y-1">
                    {details.exclusions.map((exc, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-400 shrink-0 mt-0.5 font-bold">–</span>
                        {exc}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {details.codedElsewhere?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Başqa yerdə kodlanır</h3>
                  <ul className="space-y-1">
                    {details.codedElsewhere.map((ce, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                        {ce}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <PostcoordSection axes={details.optionalAxes} required={false} />

              {!details.description &&
                !details.exclusions?.length &&
                !details.codedElsewhere?.length &&
                !details.requiredAxes?.length &&
                !details.optionalAxes?.length && (
                  <p className="text-center text-gray-400 text-sm py-4">Əlavə məlumat mövcud deyil</p>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
