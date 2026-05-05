import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button, Label } from "./index";

export async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(",");
      const mimeType = header.replace("data:", "").replace(";base64", "");
      resolve({ data, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({
  label, currentUrl, onUpload, maxSizeMb = 2, disabled,
  hint, round = true,
}: {
  label: string; currentUrl?: string | null; onUpload: (file: File) => void;
  maxSizeMb?: number; disabled?: boolean; hint?: string; round?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Too large. Maximum ${maxSizeMb}MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    onUpload(file);
  }

  const displayUrl = preview || currentUrl;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        <div
          className={`w-20 h-20 border-2 border-dashed border-[rgb(var(--border))] flex items-center justify-center bg-[rgb(var(--subtle))] overflow-hidden shrink-0 cursor-pointer hover:border-[rgb(var(--blue))] transition-colors ${round ? "rounded-full" : "rounded-xl"}`}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {displayUrl ? (
            <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <Upload size={20} className="text-[rgb(var(--ink-3))]" />
          )}
        </div>
        <div className="flex-1 py-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Upload size={12} /> Choose Image
          </Button>
          {hint && <p className="text-3xs text-[rgb(var(--ink-3))] mt-2">{hint}</p>}
          {error && <p className="text-3xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={disabled}
      />
    </div>
  );
}
