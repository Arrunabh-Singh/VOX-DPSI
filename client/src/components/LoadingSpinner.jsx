export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#003366', borderTopColor: 'transparent' }} />
      <p className="text-sm font-medium" style={{ color: '#336699' }}>{message}</p>
    </div>
  )
}
