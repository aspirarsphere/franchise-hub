export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl fade-in p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-500 font-body mb-6 leading-relaxed">{message}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-body font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-xl font-body font-semibold text-sm text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-maroon hover:bg-maroon-dark'
            }`}
            style={!danger ? { backgroundColor: '#700000' } : {}}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
