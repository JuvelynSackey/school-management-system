import { useState } from 'react';

// Shared by every immediate-upload-on-select image field in the app (school
// logo, headteacher signature, a teacher's own signature) — same behavior
// throughout, just a different upload function, alt text, and fallback icon.
export default function ImageUploadField({
  imageUrl, alt, onUploaded, uploadFn, resultKey, label, fallbackIcon,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const result = await uploadFn(file);
      onUploaded(result[resultKey]);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to upload ${label.toLowerCase()}.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
      {imageUrl ? (
        <img src={imageUrl} alt={alt} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)' }} />
      ) : (
        <div className="profile-avatar" style={{ width: 64, height: 64, marginBottom: 0, borderRadius: 12 }}>
          {fallbackIcon}
        </div>
      )}
      <div>
        <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: 13, display: 'inline-block' }}>
          {isUploading ? 'Uploading…' : imageUrl ? `Replace ${label}` : `Upload ${label}`}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={isUploading} style={{ display: 'none' }} />
        </label>
        <p className="muted" style={{ fontSize: 11.5, margin: '6px 0 0' }}>JPEG, PNG, or WebP — up to 2MB.</p>
        {error && <p className="alert-error" style={{ padding: '4px 10px', margin: '6px 0 0', fontSize: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
