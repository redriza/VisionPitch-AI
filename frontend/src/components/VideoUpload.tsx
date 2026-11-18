"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, Film, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadVideo, UploadResponse } from "@/lib/api";
import ProgressBar from "./ProgressBar";

interface VideoUploadProps {
  onUploadComplete: (data: UploadResponse) => void;
}

const ACCEPTED = ".mp4,.avi,.mov,.mkv,.wmv,.flv,.webm";

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSuccess(false);

      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowed = ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm"];
      if (!ext || !allowed.includes(ext)) {
        setError(`Unsupported file type: .${ext}`);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const result = await uploadVideo(file, setUploadProgress);
        setSuccess(true);
        onUploadComplete(result);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`scan group relative cursor-pointer overflow-hidden rounded-2xl p-10 text-center transition-all duration-300 sm:p-14
        ${
          dragging
            ? "border border-cyan-300 bg-cyan-400/10 shadow-[0_0_50px_-10px_rgba(34,211,238,0.6)]"
            : "border border-dashed border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.06),rgba(59,130,246,0.04))] hover:border-cyan-300/60 hover:shadow-[0_0_40px_-12px_rgba(34,211,238,0.5)]"
        }`}
    >
      <div className="hud-corners" />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploading ? (
        <div className="relative z-10 space-y-4">
          <Film className="mx-auto h-11 w-11 animate-pulse text-cyan-300" />
          <p className="text-slate-200">Uploading match footage…</p>
          <ProgressBar progress={uploadProgress} stage="Uploading" className="mx-auto max-w-sm" />
        </div>
      ) : success ? (
        <div className="relative z-10 space-y-3">
          <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-400" />
          <p className="font-medium text-emerald-300">Upload complete — analysis started</p>
        </div>
      ) : (
        <div className="relative z-10 space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_30px_-6px_rgba(34,211,238,0.6)] transition-transform group-hover:-translate-y-1">
            <UploadCloud className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-white">Drop a football match video to analyse</p>
          <p className="text-sm text-slate-400">
            or <span className="text-cyan-300 underline underline-offset-4">browse files</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {["MP4", "AVI", "MOV", "MKV", "WMV", "FLV", "WEBM"].map((f) => (
              <span key={f} className="num rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="relative z-10 mt-5 flex items-center justify-center gap-2 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
