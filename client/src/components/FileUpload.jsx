import { useState, useRef } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function FileUpload({ onUpload, label = 'Attach File' }) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
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
      const msg = err.response?.data?.error || 'Upload failed — check Supabase Storage bucket'
      toast.error(msg)
      setError(msg)
      setFileName('')
      if (inputRef.current) inputRef.current.value = ''
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
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[#2d5c26] hover:text-[#2d5c26] transition-all disabled:opacity-50"
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
      {fileName && !uploading && !error && (
        <p className="text-xs text-green-600 mt-1">✓ {fileName}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">⚠ {error} <button type="button" onClick={() => { setError(''); if (inputRef.current) inputRef.current.value = '' }} className="underline ml-1">Try again</button></p>
      )}
    </div>
  )
}
