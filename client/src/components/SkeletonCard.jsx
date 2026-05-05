export default function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4" style={{ border: '1px solid rgba(45,92,38,0.06)' }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-6 w-24 rounded-full" />
      </div>
      <div className="skeleton h-4 w-28 mb-3 rounded-full" />
      <div className="skeleton h-3 w-full mb-2" />
      <div className="skeleton h-3 w-4/5 mb-4" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
