import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function IcdSelector({ value, onChange, onReportIcdError }) {
  const [rubrikas, setRubrikas] = useState([]);
  const [bashliqlar, setBashliqlar] = useState([]);
  const [diaqnozlar, setDiaqnozlar] = useState([]);
  const [qeydler, setQeydler] = useState([]);

  const [selectedRubrika, setSelectedRubrika] = useState(null);
  const [selectedBashliq, setSelectedBashliq] = useState(null);
  const [selectedDiaqnoz, setSelectedDiaqnoz] = useState(null);
  // Multi-select: { parentId: { parent, children: [child, ...] } }
  const [checkedQeydler, setCheckedQeydler] = useState({});

  useEffect(() => {
    api.get('/icd/rubrikas').then(({ data }) => setRubrikas(data));
  }, []);

  useEffect(() => {
    if (selectedRubrika) {
      api.get(`/icd/rubrikas/${selectedRubrika.id}/bashliqlar`).then(({ data }) => {
        setBashliqlar(data);
        setSelectedBashliq(null);
        setDiaqnozlar([]);
        setSelectedDiaqnoz(null);
        setQeydler([]);
        setCheckedQeydler({});
      });
    } else {
      setBashliqlar([]);
      setSelectedBashliq(null);
      setDiaqnozlar([]);
      setSelectedDiaqnoz(null);
      setQeydler([]);
      setCheckedQeydler({});
    }
  }, [selectedRubrika]);

  useEffect(() => {
    if (selectedBashliq) {
      api.get(`/icd/bashliqlar/${selectedBashliq.id}/diaqnozlar`).then(({ data }) => {
        setDiaqnozlar(data);
        setSelectedDiaqnoz(null);
        setQeydler([]);
        setCheckedQeydler({});
      });
    } else {
      setDiaqnozlar([]);
      setSelectedDiaqnoz(null);
      setQeydler([]);
      setCheckedQeydler({});
    }
  }, [selectedBashliq]);

  useEffect(() => {
    if (selectedDiaqnoz) {
      api.get(`/icd/diaqnozlar/${selectedDiaqnoz.id}/qeydler`).then(({ data }) => {
        setQeydler(data);
        setCheckedQeydler({});
      });
    } else {
      setQeydler([]);
      setCheckedQeydler({});
    }
  }, [selectedDiaqnoz]);

  const toggleParent = (qeyd) => {
    setCheckedQeydler((prev) => {
      const next = { ...prev };
      if (next[qeyd.id]) {
        delete next[qeyd.id];
      } else {
        next[qeyd.id] = { parent: qeyd, children: [] };
      }
      return next;
    });
  };

  const toggleChild = (parent, child) => {
    setCheckedQeydler((prev) => {
      const next = { ...prev };
      if (!next[parent.id]) {
        next[parent.id] = { parent, children: [child] };
      } else {
        const children = [...next[parent.id].children];
        const idx = children.findIndex((c) => c.id === child.id);
        if (idx >= 0) {
          children.splice(idx, 1);
          if (children.length === 0 && !next[parent.id].parentChecked) {
            // Keep parent entry if parent itself was checked
          }
        } else {
          children.push(child);
        }
        next[parent.id] = { ...next[parent.id], children };
      }
      return next;
    });
  };

  // Build comma-separated qeyd name from multi-select
  const buildQeydName = () => {
    const entries = Object.values(checkedQeydler);
    if (entries.length === 0) return null;

    const parts = entries.map((entry) => {
      const parentName = entry.parent.name.replace(/:$/, '').trim();
      if (entry.children.length > 0) {
        const childNames = entry.children.map((c) => c.name).join(', ');
        return `${parentName}: ${childNames}`;
      }
      return parentName;
    });

    return parts.join(' | ');
  };

  useEffect(() => {
    onChange({
      rubrikaCode: selectedRubrika?.code || '',
      rubrikaName: selectedRubrika?.name || '',
      bashliqCode: selectedBashliq?.code || '',
      bashliqName: selectedBashliq?.name || '',
      diaqnozCode: selectedDiaqnoz?.code || '',
      diaqnozName: selectedDiaqnoz?.name || '',
      icdQeydName: buildQeydName(),
    });
  }, [selectedRubrika, selectedBashliq, selectedDiaqnoz, checkedQeydler]);

  // Reset when value is cleared externally
  useEffect(() => {
    if (!value?.rubrikaCode) {
      setSelectedRubrika(null);
      setSelectedBashliq(null);
      setSelectedDiaqnoz(null);
      setCheckedQeydler({});
    }
  }, [value?.rubrikaCode]);

  return (
    <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-sky-50 px-5 py-3 border-b border-blue-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">ICD-10 Kodlama</h3>
        {onReportIcdError && (
          <button
            onClick={onReportIcdError}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded px-2 py-1 hover:bg-purple-50"
          >
            <AlertTriangle size={14} />
            ICD xətası bildir
          </button>
        )}
      </div>

      <div className="bg-gradient-to-b from-sky-50/40 to-white px-5 py-4 space-y-4">
        {/* Rubrika */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            1. Rubrika (Kod aralığı)
          </label>
          <select
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={selectedRubrika?.id || ''}
            onChange={(e) => {
              const r = rubrikas.find((x) => x.id === Number(e.target.value));
              setSelectedRubrika(r || null);
            }}
          >
            <option value="">-- Rubrika seçin --</option>
            {rubrikas.map((r) => (
              <option key={r.id} value={r.id}>{r.code}</option>
            ))}
          </select>
        </div>

        {/* Bashliq */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            2. Başlıq
          </label>
          <select
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            disabled={!selectedRubrika}
            value={selectedBashliq?.id || ''}
            onChange={(e) => {
              const b = bashliqlar.find((x) => x.id === Number(e.target.value));
              setSelectedBashliq(b || null);
            }}
          >
            <option value="">-- Başlıq seçin --</option>
            {bashliqlar.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Diaqnoz */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            3. Diaqnoz
          </label>
          <select
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            disabled={!selectedBashliq}
            value={selectedDiaqnoz?.id || ''}
            onChange={(e) => {
              const d = diaqnozlar.find((x) => x.id === Number(e.target.value));
              setSelectedDiaqnoz(d || null);
            }}
          >
            <option value="">-- Diaqnoz seçin --</option>
            {diaqnozlar.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Qeydlər - Multi-select checkbox tree */}
        {selectedDiaqnoz && qeydler.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              4. Qeydlər (çoxlu seçim)
            </label>
            <div className="mt-1 border border-gray-200 rounded-md bg-white max-h-60 overflow-y-auto">
              {qeydler.map((q) => {
                const isChecked = !!checkedQeydler[q.id];
                const hasChildren = q.children?.length > 0;
                return (
                  <div key={q.id} className="border-b border-gray-100 last:border-0">
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleParent(q)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isChecked ? 'font-medium text-blue-800' : 'text-gray-700'}`}>
                        {q.name}
                      </span>
                    </label>
                    {/* Children (level 5) */}
                    {isChecked && hasChildren && (
                      <div className="pl-8 pb-2 space-y-1">
                        {q.children.map((child) => {
                          const childChecked = checkedQeydler[q.id]?.children?.some((c) => c.id === child.id);
                          return (
                            <label key={child.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-indigo-50 rounded">
                              <input
                                type="checkbox"
                                checked={!!childChecked}
                                onChange={() => toggleChild(q, child)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={`text-xs ${childChecked ? 'font-medium text-indigo-700' : 'text-gray-600'}`}>
                                {child.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection summary */}
        {selectedDiaqnoz && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            <strong>Seçildi:</strong> {selectedDiaqnoz.name}
            {Object.keys(checkedQeydler).length > 0 && (
              <span className="text-green-700 ml-1">→ {buildQeydName()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
