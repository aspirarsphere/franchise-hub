export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-cream-dark flex items-center justify-center mb-4">
          <Icon size={28} className="text-gold" />
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {message && <p className="text-sm text-gray-500 font-body max-w-xs leading-relaxed">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
