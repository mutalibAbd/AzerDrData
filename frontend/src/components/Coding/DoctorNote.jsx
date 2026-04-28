import { NotebookPen } from 'lucide-react';

/**
 * Doctor note section — always editable.
 * Note is included in the Növbəti save payload (not saved independently).
 *
 * Props:
 *   note      – current note text (controlled from parent)
 *   onChange  – (text) => void
 */
export default function DoctorNote({ note, onChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <NotebookPen size={16} className="text-slate-500" />
          Həkim Notu
        </h3>
      </div>
      <div className="p-3">
        <textarea
          value={note}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder="Diaqnoz haqqında qeyd yazın..."
          className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">Not "Növbəti" düyməsi ilə birlikdə saxlanılır</p>
      </div>
    </div>
  );
}
