/**
 * Reusable confirmation modal.
 * Props:
 *   message  – text to show (e.g. "LD27.0Y kodu seçmək istəyirsiniz?")
 *   onConfirm – called when user clicks Bəli
 *   onCancel  – called when user clicks Xeyr or clicks backdrop
 */
export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-800 text-sm leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            Xeyr
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Bəli
          </button>
        </div>
      </div>
    </div>
  );
}
