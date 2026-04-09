import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function IcdSelector({ value, onChange }) {
  const [rubrikas, setRubrikas] = useState([]);
  const [bashliqlar, setBashliqlar] = useState([]);
  const [diaqnozlar, setDiaqnozlar] = useState([]);

  const [selectedRubrika, setSelectedRubrika] = useState(null);
  const [selectedBashliq, setSelectedBashliq] = useState(null);
  const [selectedDiaqnoz, setSelectedDiaqnoz] = useState(null);

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
      });
    } else {
      setBashliqlar([]);
      setSelectedBashliq(null);
      setDiaqnozlar([]);
      setSelectedDiaqnoz(null);
    }
  }, [selectedRubrika]);

  useEffect(() => {
    if (selectedBashliq) {
      api.get(`/icd/bashliqlar/${selectedBashliq.id}/diaqnozlar`).then(({ data }) => {
        setDiaqnozlar(data);
        setSelectedDiaqnoz(null);
      });
    } else {
      setDiaqnozlar([]);
      setSelectedDiaqnoz(null);
    }
  }, [selectedBashliq]);

  useEffect(() => {
    onChange({
      rubrikaCode: selectedRubrika?.code || '',
      rubrikaName: selectedRubrika?.name || '',
      bashliqCode: selectedBashliq?.code || '',
      bashliqName: selectedBashliq?.name || '',
      diaqnozCode: selectedDiaqnoz?.code || '',
      diaqnozName: selectedDiaqnoz?.name || '',
    });
  }, [selectedRubrika, selectedBashliq, selectedDiaqnoz]);

  // Reset when value is cleared externally
  useEffect(() => {
    if (!value?.rubrikaCode) {
      setSelectedRubrika(null);
      setSelectedBashliq(null);
      setSelectedDiaqnoz(null);
    }
  }, [value?.rubrikaCode]);

  return (
    <div className="bg-white border rounded-lg p-5 space-y-4">
      <h3 className="font-semibold text-gray-800">ICD-10 Kodlama</h3>

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
            <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
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
            <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
          ))}
        </select>
      </div>

      {selectedDiaqnoz && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <strong>Seçildi:</strong> {selectedDiaqnoz.code} - {selectedDiaqnoz.name}
        </div>
      )}
    </div>
  );
}
