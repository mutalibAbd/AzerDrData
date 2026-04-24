import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronRight, ChevronDown, X, Loader, AlertCircle, Info } from 'lucide-react';
import api from '../../services/api';
import Icd11DetailsModal from './Icd11DetailsModal';

// Module-level cache — loaded once per session
let icd11TreeCache = null;
let icd11TreeLoading = null;

async function loadIcd11Tree() {
  if (icd11TreeCache) return icd11TreeCache;
  if (icd11TreeLoading) return icd11TreeLoading;
  icd11TreeLoading = fetch('/icd11_en.json')
    .then((r) => r.json())
    .then((data) => { icd11TreeCache = data; return data; });
  return icd11TreeLoading;
}

// Recursive tree node
function TreeNode({ node, onAdd, selectedCodes }) {
  const [open, setOpen] = useState(false);
  const isLeaf = !node.Children || node.Children.length === 0;
  const isSelected = selectedCodes.some((c) => c.icd11Code === node.Code);

  return (
    <div className="text-sm">
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        onClick={() => {
          if (!isLeaf) setOpen((o) => !o);
          if (node.Code) onAdd(node);
        }}
      >
        {!isLeaf ? (
          open ? (
            <ChevronDown size={14} className="text-gray-400 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
          )
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        {node.Code && (
          <span className="font-mono text-xs text-blue-700 shrink-0">{node.Code}</span>
        )}
        <span className={`${node.Code ? 'text-gray-700' : 'font-semibold text-gray-800'} leading-snug`}>
          {node.Title}
        </span>
        {isSelected && (
          <span className="ml-auto shrink-0 text-xs text-green-600 font-medium">✓</span>
        )}
      </div>
      {open && node.Children && (
        <div className="ml-4 border-l border-gray-200 pl-1">
          {node.Children.map((child) => (
            <TreeNode
              key={child.Id ?? child.Code ?? child.Title}
              node={child}
              onAdd={onAdd}
              selectedCodes={selectedCodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Icd11Selector({ value = [], onChange, onReportIcdError }) {
  const [tab, setTab] = useState('browse');
  const [tree, setTree] = useState(null);
  const [treeError, setTreeError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const debounceRef = useRef(null);

  // Load local tree on mount
  useEffect(() => {
    loadIcd11Tree()
      .then(setTree)
      .catch(() => setTreeError(true));
  }, []);

  // Debounced WHO API search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchError(false);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/icd11/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(data ?? []);
      } catch {
        setSearchError(true);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  const addCode = useCallback((entry) => {
    if (!entry.Code) return; // category nodes without a code
    const already = value.some((c) => c.icd11Code === entry.Code);
    if (already) return;
    onChange([
      ...value,
      { icd11Code: entry.Code, icd11Title: entry.Title, entityId: entry.Id ?? null, source: 'tree' },
    ]);
  }, [value, onChange]);

  const addSearchResult = useCallback((result) => {
    const already = value.some((c) => c.icd11Code === result.code);
    if (already) return;
    onChange([
      ...value,
      { icd11Code: result.code, icd11Title: result.title, entityId: result.entityId ?? null, source: 'search' },
    ]);
  }, [value, onChange]);

  const removeCode = useCallback((code) => {
    onChange(value.filter((c) => c.icd11Code !== code));
  }, [value, onChange]);

  return (
    <>
    <div className="bg-white border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          ICD-11 Kodları <span className="text-red-500">*</span>
        </h3>
        {onReportIcdError && (
          <button
            onClick={onReportIcdError}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700"
            title="Anomaliyada xəta bildir"
          >
            <AlertCircle size={14} /> Xəta bildir
          </button>
        )}
      </div>

      {/* Selected codes */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((c) => (
            <span
              key={c.icd11Code}
              className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full"
            >
              <span className="font-mono font-semibold">{c.icd11Code}</span>
              <span className="text-blue-600 max-w-[180px] truncate" title={c.icd11Title}>
                {c.icd11Title}
              </span>
              <button
                onClick={() => removeCode(c.icd11Code)}
                className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                aria-label={`${c.icd11Code} kodunu sil`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'browse'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('browse')}
        >
          Bax (Ch.18 / Ch.20)
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('search')}
        >
          <span className="flex items-center gap-1">
            <Search size={13} /> Axtar (WHO API)
          </span>
        </button>
      </div>

      {/* Browse tab */}
      {tab === 'browse' && (
        <div className="max-h-72 overflow-y-auto border rounded">
          {treeError ? (
            <p className="text-center text-red-500 py-6 text-sm">ICD-11 verilənləri yüklənmədi</p>
          ) : !tree ? (
            <div className="flex justify-center py-6">
              <Loader size={20} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="p-1">
              {tree.map((chapter) => (
                <TreeNode
                  key={chapter.Id ?? chapter.Code}
                  node={chapter}
                  onAdd={addCode}
                  selectedCodes={value}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <div className="space-y-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Minimum 2 hərf daxil edin..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto border rounded">
            {searching ? (
              <div className="flex justify-center py-6">
                <Loader size={20} className="animate-spin text-blue-400" />
              </div>
            ) : searchError ? (
              <p className="text-center text-red-500 py-4 text-sm">Axtarış xətası. Yenidən cəhd edin.</p>
            ) : searchResults.length === 0 && searchQuery.trim().length >= 2 ? (
              <p className="text-center text-gray-400 py-4 text-sm">Nəticə tapılmadı</p>
            ) : (
              <div className="divide-y">
                {searchResults.map((r, i) => {
                  const isSelected = value.some((c) => c.icd11Code === r.code);
                  return (
                    <div
                      key={r.code ?? i}
                      className={`px-3 py-2 text-sm flex items-start gap-2 ${
                        isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-mono text-xs text-blue-700 shrink-0 mt-0.5">{r.code}</span>
                      <span className="text-gray-700 leading-snug flex-1">{r.title}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {r.entityId && /^\d+$/.test(r.entityId) && (
                          <button
                            onClick={() => setDetailItem(r)}
                            className={`p-1 rounded transition-colors ${
                              r.hasPostcoordination
                                ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={
                              r.hasPostcoordination
                                ? 'Postkoordinasiya tələb olunur — ətraflı məlumat'
                                : 'Ətraflı məlumat'
                            }
                            aria-label={`${r.code} kodu haqqında ətraflı`}
                          >
                            <Info size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => addSearchResult(r)}
                          disabled={isSelected}
                          className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                            isSelected
                              ? 'text-green-600 cursor-default'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          aria-label={isSelected ? 'Artıq seçilib' : `${r.code} kodunu əlavə et`}
                        >
                          {isSelected ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {detailItem && (
      <Icd11DetailsModal
        entityId={detailItem.entityId}
        code={detailItem.code}
        title={detailItem.title}
        onClose={() => setDetailItem(null)}
      />
    )}
  </>
  );
}
