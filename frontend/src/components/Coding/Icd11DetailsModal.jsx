import { useState, useEffect, useRef } from 'react';
import { X, Loader, AlertTriangle, Info, Search } from 'lucide-react';
import api from '../../services/api';

// Per-axis interactive search component
function AxisSearchField({ axis, draftValue, onSelect, onRemove }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/icd11/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const c = axis.required
    ? { bg: 'bg-red-50', border: 'border-red-100', title: 'text-red-700', ring: 'focus:ring-red-200' }
    : { bg: 'bg-yellow-50', border: 'border-yellow-100', title: 'text-yellow-700', ring: 'focus:ring-yellow-200' };

  return (
    <div className={`rounded-lg p-3 text-sm ${c.bg} border ${c.border}`}>
      <p className={`font-medium mb-2 flex items-center justify-between ${c.title}`}>
        <span>{axis.axisName}</span>
        {axis.required && <span className="text-xs font-normal opacity-60">məcburi</span>}
      </p>

      {draftValue ? (
        <div className="flex items-center justify-between bg-white border rounded-lg px-2.5 py-1.5 gap-2">
          <span className="font-mono text-xs text-blue-700 font-semibold shrink-0">{draftValue.icd11Code}</span>
          <span className="text-gray-700 text-xs leading-snug flex-1 line-clamp-1">{draftValue.icd11Title}</span>
          <button
            onClick={() => onRemove(axis.axisName)}
            className="text-gray-400 hover:text-red-500 shrink-0 transition-colors"
            aria-label="Postkoordinasiyanı sil"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`${axis.axisName} üçün axtarış...`}
              className={`w-full border border-gray-200 rounded-md pl-7 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${c.ring}`}
            />
          </div>
          {loading && <p className="text-xs text-gray-400 mt-1.5 pl-1">Axtarılır...</p>}
          {!loading && results.length > 0 && (
            <div className="mt-1.5 border rounded-md divide-y bg-white max-h-36 overflow-y-auto shadow-sm">
              {results.map(r => (
                <button
                  key={r.code}
                  onClick={() => { onSelect(axis.axisName, axis.required, r); setQuery(''); setResults([]); }}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2"
                >
                  <span className="font-mono text-blue-700 shrink-0">{r.code}</span>
                  <span className="text-gray-700 leading-snug">{r.title}</span>
                </button>
              ))}
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-gray-400 mt-1.5 pl-1">Nəticə tapılmadı</p>
          )}
        </div>
      )}
    </div>
  );
}

// Read-only axis section (when modal is informational only)
function AxisReadOnly({ axes, required }) {
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
            <p className={`font-medium ${required ? 'text-red-700' : 'text-yellow-700'}`}>{axis.axisName}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Icd11DetailsModal({
  entityId, code, title, onClose,
  // Interactive mode props (only provided when code is already in selected list)
  currentPostcoord = [],
  onSavePostcoord,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  // draft: { [axisName]: { axisName, required, icd11Code, icd11Title, entityId } }
  const [draft, setDraft] = useState(() => {
    const m = {};
    for (const pc of currentPostcoord) if (pc.axisName) m[pc.axisName] = pc;
    return m;
  });

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

  const handleSelect = (axisName, required, result) => {
    setDraft(prev => ({
      ...prev,
      [axisName]: {
        axisName,
        required,
        icd11Code: result.code,
        icd11Title: result.title,
        entityId: result.entityId && /^\d+$/.test(result.entityId) ? result.entityId : null,
      },
    }));
  };

  const handleRemove = (axisName) => {
    setDraft(prev => { const next = { ...prev }; delete next[axisName]; return next; });
  };

  const handleSave = () => {
    const postcoordArray = Object.values(draft);
    const allRequired = details?.requiredAxes ?? [];
    const hasUnfilledRequired = allRequired.some(a => !draft[a.axisName]);
    onSavePostcoord(postcoordArray, hasUnfilledRequired);
  };

  const hasRequiredPostcoord = details?.requiredAxes?.length > 0;
  const isInteractive = !!onSavePostcoord;
  const allAxes = [...(details?.requiredAxes ?? []), ...(details?.optionalAxes ?? [])];
  const hasAnyAxes = allAxes.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
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
              {/* Postcoordination axes */}
              {hasAnyAxes && (
                <section>
                  {isInteractive ? (
                    <>
                      {details.requiredAxes?.length > 0 && (
                        <>
                          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-red-600">
                            <AlertTriangle size={12} /> Məcburi postkoordinasiya
                          </h3>
                          <div className="space-y-2 mb-3">
                            {details.requiredAxes.map((axis, i) => (
                              <AxisSearchField
                                key={i}
                                axis={axis}
                                draftValue={draft[axis.axisName]}
                                onSelect={handleSelect}
                                onRemove={handleRemove}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      {details.optionalAxes?.length > 0 && (
                        <>
                          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-yellow-600">
                            <Info size={12} /> İxtiyari postkoordinasiya
                          </h3>
                          <div className="space-y-2">
                            {details.optionalAxes.map((axis, i) => (
                              <AxisSearchField
                                key={i}
                                axis={axis}
                                draftValue={draft[axis.axisName]}
                                onSelect={handleSelect}
                                onRemove={handleRemove}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <AxisReadOnly axes={details.requiredAxes} required={true} />
                      <AxisReadOnly axes={details.optionalAxes} required={false} />
                    </>
                  )}
                </section>
              )}

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

              {!details.description && !details.exclusions?.length && !details.codedElsewhere?.length && !hasAnyAxes && (
                <p className="text-center text-gray-400 text-sm py-4">Əlavə məlumat mövcud deyil</p>
              )}
            </>
          )}
        </div>

        {/* Footer — only in interactive mode */}
        {isInteractive && details && (
          <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between gap-3">
            {hasRequiredPostcoord && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle size={12} />
                {details.requiredAxes.every(a => draft[a.axisName])
                  ? 'Məcburi axislər tamamlandı ✓'
                  : 'Məcburi axisləri doldurun'}
              </p>
            )}
            {!hasRequiredPostcoord && <span />}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border rounded-md transition-colors"
              >
                Ləğv et
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Tətbiq et
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

