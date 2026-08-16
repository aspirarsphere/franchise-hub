export default function Spinner({ size = 32, className = '' }) {
  return (
    <div
      className={`rounded-full border-4 border-cream-dark border-t-maroon animate-spin ${className}`}
      style={{ width: size, height: size, borderTopColor: '#700000', borderColor: '#e5e0d8' }}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 bg-cream flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={48} />
        <p className="text-gold font-body text-sm tracking-widest uppercase">Loading…</p>
      </div>
    </div>
  )
}
