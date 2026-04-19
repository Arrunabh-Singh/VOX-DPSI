import { useState, useRef } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function FileUpload({ onUpload, label = 'Attach File' }) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef()

  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setFileName(file.name)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUpload(res.data.url)
      toast.success('File uploaded successfully')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
      setFileName('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl text-sm transition-all disabled:opacity-50 w-full"
        style={{ borderColor: '#D1FAE5', color: '#4A7C5C', background: 'rgba(255,255,255,0.5)' }}
        onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = '#1B4D2B'; e.currentTarget.style.color = '#1B4D2B' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1FAE5'; e.currentTarget.style.color = '#4A7C5C' }}
      >
        {uploading ? (
          <>
            <span className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            Uploading...
          </>
        ) : (
          <>
            <span>📎</span>
            {fileName || label}
          </>
        )}
      </button>
      {fileName && !uploading && (
        <p className="text-xs text-green-600 mt-1">✓ {fileName}</p>
      )}
    </div>
  )
}
