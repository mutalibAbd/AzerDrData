import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, X, Search, BookOpen } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
// api import kept for production WHO token fetching
import api from '../../services/api';

// ECT loaded via <script src="/icd11ect.js"> in index.html
// window.ECT = { Settings, Handler } — static methods are on Handler
const getHandler = () => window.ECT?.Handler;

// ECT and EB use separate INOs to avoid cross-binding interference.
// bind("1") → only initializes ctw-input + ctw-window elements (ECT)
// bind(currentEbIno) → only initializes ctw-eb-window element (EB), called lazily.
// currentEbIno changes with each ebGeneration so each bind() call uses a fresh INO,
// avoiding the issue where bind() silently skips already-registered INOs.
const ECT_INO = '1';
const EB_INO_BASE = 2; // generation 0 → "2", 1 → "3", ...
const LS_MODE_KEY = 'icd11_coding_mode';

/**
 * WHO ECT (Embedded Classification Tool) + Embedded Browser (EB) wrapper.
 * Toggle between "Hızlı Arama" (ECT) and "Detaylı Tarayıcı" (EB) modes.
 * Selection is LOCAL ONLY — no DB save here.
 * Parent (CodingWorkspace) saves to DB when doctor clicks "Növbəti".
 */
export default function EctSelector({ anomalyId, onSelected, onCleared }) {
  const [selectedCode, setSelectedCode] = useState(null); // { code, title }
  const [pendingEntity, setPendingEntity] = useState(null); // waiting for confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [codingMode, setCodingMode] = useState(
    () => localStorage.getItem(LS_MODE_KEY) || 'coding'
  );
  // showEB: once true, EB div stays in DOM (CSS-toggled). Never goes false.
  const [showEB, setShowEB] = useState(false);
  // ebGeneration: incremented on anomaly change to force EB div remount at ICD-11 root.
  // Each generation uses a unique INO so bind() always sees a fresh, unregistered INO.
  const [ebGeneration, setEbGeneration] = useState(0);

  const accessTokenRef = useRef(null);   // reserved for future production WHO token
  const ebBoundRef = useRef(false);      // true after bind(currentEbIno) called
  const ebNeedsResetRef = useRef(false); // true when anomaly changed while EB was hidden

  // Derived from ebGeneration — used in both JSX (data-ctw-ino) and effects (bind call)
  const currentEbIno = String(EB_INO_BASE + ebGeneration);

  const handleModeChange = (mode) => {
    setCodingMode(mode);
    localStorage.setItem(LS_MODE_KEY, mode);
    if (mode === 'browser') {
      setShowEB(true);
      // Deferred reset: anomaly changed while EB was hidden in coding mode
      if (ebNeedsResetRef.current) {
        ebNeedsResetRef.current = false;
        ebBoundRef.current = false;
        setEbGeneration(g => g + 1); // new INO → remount → fresh widget
      }
    }
  };

  const handleConfirmSelect = () => {
    const entity = pendingEntity;
    setPendingEntity(null);
    setSelectedCode({ code: entity.code, title: entity.title ?? entity.selectedText });
    onSelected?.(entity);
    toast('Kod seçildi. Saxlamaq üçün "Növbəti"yə basın', { icon: '💾' });
    getHandler()?.clear(ECT_INO);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedCode(null);
    onCleared?.();
  };

  // Reset local state when parent signals a new anomaly
  const clearSelection = () => {
    setSelectedCode(null);
    setPendingEntity(null);
    setShowDeleteConfirm(false);
  };

  // Reset local state when anomaly changes (new report loaded)
  useEffect(() => {
    clearSelection();
    getHandler()?.clear(ECT_INO);
    if (ebBoundRef.current) {
      ebBoundRef.current = false;
      if (codingMode === 'browser') {
        // EB is visible: remount immediately with new INO → widget resets to ICD-11 root
        setEbGeneration(g => g + 1);
      } else {
        // EB is hidden: defer remount until user switches to browser mode
        ebNeedsResetRef.current = true;
      }
    }
  }, [anomalyId]); // eslint-disable-line react-hooks/exhaustive-deps -- codingMode intentionally read at call time

  useEffect(() => {
    return () => {
      // cleanup on unmount
      clearSelection();
    };
  }, []);

  useEffect(() => {
    const initEct = async () => {
      // Fetch initial WHO token from backend (cached 55 min server-side)
      let initialToken = null;
      try {
        const res = await api.get('/api/icd/token');
        initialToken = res.data.access_token;
        accessTokenRef.current = initialToken;
      } catch (err) {
        console.error('ICD-11 token fetch failed, falling back to test server', err);
      }

      const useProduction = !!initialToken;

      const settings = useProduction
        ? {
            apiServerUrl: 'https://id.who.int/icd',
            apiSecured: true,
            icdLinearization: 'mms',
            language: 'en',
            autoBind: false,
            wordsAvailable: false,
            sourceApp: 'RadVision',
            getNewTokenFunction: (_oldToken, callback) => {
              api.get('/api/icd/token')
                .then(r => callback(r.data.access_token))
                .catch(() => callback(accessTokenRef.current ?? ''));
            },
          }
        : {
            // Fallback: Azure developer test server (no auth required)
            apiServerUrl: 'https://icd11restapi-developer-test.azurewebsites.net',
            apiSecured: false,
            icdLinearization: 'mms',
            language: 'en',
            autoBind: false,
          };

      const callbacks = {
        selectedEntityFunction: (selectedEntity) => {
          setPendingEntity(selectedEntity);
          getHandler()?.clear(ECT_INO);
        },
      };

      getHandler().configure(settings, callbacks);
      getHandler().bind(ECT_INO);

      // Widget internal DOM fix
      setTimeout(() => {
        const ctwWindow = document.querySelector(`.ctw-window[data-ctw-ino="${ECT_INO}"]`);
        if (!ctwWindow) return;
        ctwWindow.style.overflowX = 'auto';
        const inner = ctwWindow.parentElement;
        if (inner) {
          inner.style.width = '100%';
          inner.style.maxWidth = '100%';
          inner.style.overflowX = 'auto';
        }
      }, 500);

      // If saved mode is 'browser', mount EB div now (token is ready in ref)
      if (localStorage.getItem(LS_MODE_KEY) === 'browser') {
        setShowEB(true);
      }
    };

    initEct();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- configure once

  // Lazy-init EB: bind after showEB=true (first browser switch) or ebGeneration changes
  // (remount after anomaly reset). Guard with ebBoundRef so bind is called exactly once
  // per generation. currentEbIno changes each generation → always a fresh, unregistered INO.
  useEffect(() => {
    if (!showEB || ebBoundRef.current) return;
    getHandler()?.bind(currentEbIno);
    ebBoundRef.current = true;
  }, [showEB, ebGeneration]); // eslint-disable-line react-hooks/exhaustive-deps -- currentEbIno derived from ebGeneration

  return (
    <div className="space-y-2 w-full min-w-0">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
        <button
          onClick={() => handleModeChange('coding')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 transition-colors ${
            codingMode === 'coding'
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Search size={13} />
          Hızlı Arama
        </button>
        <button
          onClick={() => handleModeChange('browser')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 transition-colors ${
            codingMode === 'browser'
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <BookOpen size={13} />
          Detaylı Tarayıcı
        </button>
      </div>

      {/* Locally selected code banner (not yet saved to DB) */}
      {selectedCode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm">
          <CheckCircle size={14} className="text-amber-600 shrink-0" />
          <span className="font-mono text-amber-700 font-semibold">{selectedCode.code}</span>
          <span className="text-amber-700 truncate flex-1">{selectedCode.title}</span>
          <span className="text-xs text-amber-500 shrink-0">saxlanılmayıb</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto shrink-0 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
            title="Seçimi ləğv et"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ECT (Hızlı Arama) — shown when codingMode === 'coding' */}
      <div style={{ display: codingMode === 'coding' ? 'block' : 'none', overflowX: 'auto', width: '100%' }}>
        <input
          type="text"
          className="ctw-input w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
          autoComplete="off"
          data-ctw-ino={ECT_INO}
          placeholder="ICD-11 diaqnoz axtar..."
        />
        <div className="ctw-window" data-ctw-ino={ECT_INO} />
      </div>

      {/* EB (Detaylı Tarayıcı) — only rendered after first browser switch, then CSS-toggled.
          key={ebGeneration} forces DOM remount on reset; currentEbIno gives each generation
          a fresh INO so bind() always initializes from the ICD-11 tree root. */}
      {showEB && (
        <div key={ebGeneration} style={{ display: codingMode === 'browser' ? 'block' : 'none', overflowX: 'auto', width: '100%' }}>
          <div className="ctw-eb-window" data-ctw-ino={currentEbIno} />
        </div>
      )}

      {/* Confirm: select code */}
      {pendingEntity && (
        <ConfirmDialog
          message={`"${pendingEntity.code} – ${pendingEntity.title ?? pendingEntity.selectedText}" kodunu seçmək istəyirsiniz?`}
          onConfirm={handleConfirmSelect}
          onCancel={() => setPendingEntity(null)}
        />
      )}

      {/* Confirm: cancel selection */}
      {showDeleteConfirm && selectedCode && (
        <ConfirmDialog
          message={`"${selectedCode.code} – ${selectedCode.title}" seçimini ləğv etmək istəyirsiniz?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

