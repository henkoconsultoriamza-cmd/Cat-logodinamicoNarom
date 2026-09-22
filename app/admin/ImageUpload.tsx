"use client";
import { useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  token: string;
  folder?: string;
  hint?: string;
}

export default function ImageUpload({ value, onChange, token, folder = "products", hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const json = await res.json();
    setUploading(false);
    if (json.error) { setError(json.error); return; }
    onChange(json.url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Preview */}
      {value && (
        <div style={{ width: "100%", height: 120, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={value} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}

      {/* URL input */}
      <input
        style={{ height: 40, borderRadius: 8, border: "1.5px solid #e2e8f0", padding: "0 12px", fontSize: 14, color: "#0f172a", outline: "none", background: "#fff", width: "100%", fontFamily: "inherit" }}
        value={value}
        placeholder="https://… o /products/nombre.jpg"
        onChange={e => onChange(e.target.value)}
      />

      {/* Upload button */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ height: 36, padding: "0 14px", borderRadius: 8, background: uploading ? "#e2e8f0" : "#02152C", color: uploading ? "#94a3b8" : "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          {uploading ? "Subiendo…" : "📁 Subir imagen"}
        </button>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>
          {hint ?? "JPG, PNG o WebP · Máx. 2 MB · 800×800 px recomendado"}
        </span>
      </div>

      {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
