import React, { useEffect, useState } from 'react'
import { IMAGE_POSITION_OPTIONS } from '../lib/communityData'
import { getImageUrl, uploadImage } from '../lib/storageImages'

export default function ImageUploadField({
  label,
  bucket,
  pathPrefix,
  value,
  position = 'center center',
  onUploaded,
  onPositionChange,
  disabled = false,
  compact = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const previewUrl = getImageUrl(value, bucket)

  useEffect(() => {
    setPreviewFailed(false)
  }, [value])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const result = await uploadImage({ bucket, pathPrefix, file })
      onUploaded(result.publicUrl, result)
    } catch (uploadError) {
      setError(uploadError?.message || 'Upload gambar gagal. Cek bucket/policy Supabase Storage.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className={`image-upload-field ${compact ? 'compact' : ''}`}>
      <label>
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
      </label>

      {previewUrl && !previewFailed && (
        <div className="image-upload-preview">
          <img src={previewUrl} alt={label} style={{ objectPosition: position }} onError={() => setPreviewFailed(true)} />
        </div>
      )}

      {value && !previewUrl && (
        <div className="image-upload-placeholder">URL/path gambar belum valid.</div>
      )}

      {previewUrl && previewFailed && (
        <div className="image-upload-placeholder">Preview gambar belum bisa ditampilkan. Cek bucket/policy Storage.</div>
      )}

      {onPositionChange && (
        <label className="image-position-control">
          Posisi Foto
          <select value={position} onChange={(event) => onPositionChange(event.target.value)} disabled={disabled}>
            {IMAGE_POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      {uploading && <div className="inline-info">Mengupload gambar...</div>}
      {error && <div className="inline-error">{error}</div>}
    </div>
  )
}
