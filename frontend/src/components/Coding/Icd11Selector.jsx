import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import EctSelector from './EctSelector';

// Set to false to hide the local JSON tree browse tab
const BROWSE_ENABLED = false;

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

// Recursive tree node (used only when BROWSE_ENABLED)
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
          if (isLeaf && node.Code) onAdd(node);
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

export default function Icd11Selector({ value = [], onChange, onReportIcdError, anomalyId, onSaved }) {
  // Start on search tab (ECT); browse tab only if BROWSE_ENABLED
  const [tab, setTab] = useState(BROWSE_ENABLED ? 'browse' : 'search');
  const [tree, setTree] = useState(null);
  const [treeError, setTreeError] = useState(false);

  // Load tree only when browse is enabled
  useEffect(() => {
    if (!BROWSE_ENABLED) return;
    loadIcd11Tree()
      .then(setTree)
      .catch(() => setTreeError(true));
  }, []);

  const addCode = useCallback((entry) => {
    if (!entry.Code || !onChange) return;
    const already = value.some((c) => c.icd11Code === entry.Code);
    if (already) return;
    onChange([...value, {
      icd11Code: entry.Code,
      icd11Title: entry.Title,
      entityId: (entry.Id && /^\d+$/.test(String(entry.Id))) ? String(entry.Id) : null,
      source: 'tree',
      postcoordination: [],
      hasUnfilledRequired: false,
    }]);
  }, [value, onChange]);

  return (
    <div className="bg-white border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          ICD-11 Diaqnozu <span className="text-red-500">*</span>
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

      {/* Tabs — browse tab only rendered when BROWSE_ENABLED */}
      <div className="flex border-b">
        {BROWSE_ENABLED && (
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
        )}
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('search')}
        >
          ICD-11 Axtarış
        </button>
      </div>

      {/* Browse tab — only shown when BROWSE_ENABLED */}
      {BROWSE_ENABLED && tab === 'browse' && (
        <div className="max-h-72 overflow-y-auto border rounded">
          {treeError ? (
            <p className="text-center text-red-500 py-6 text-sm">ICD-11 verilənləri yüklənmədi</p>
          ) : !tree ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blue-400" />
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

      {/* Search tab — WHO ECT widget */}
      {tab === 'search' && (
        <EctSelector anomalyId={anomalyId} onSaved={onSaved} />
      )}
    </div>
  );
}
