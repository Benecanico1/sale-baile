import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FlyerUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export const FlyerUploader: React.FC<FlyerUploaderProps> = ({ value, onChange }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato inválido. Por favor sube un archivo JPG, PNG o WebP.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxWidth = 960;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            onChange(compressed);
          } else {
            onChange(rawDataUrl);
          }
        };
        img.onerror = () => onChange(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Error compressing image:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
        Flyer del Evento (JPG, PNG, WebP) <span className="text-dance-crimson">*</span>
      </label>

      {value ? (
        <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden border border-dark-700 bg-dark-950 shadow-xl group">
          <img src={value} alt="Vista previa flyer" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-2 bg-dark-900/90 text-red-400 hover:text-white rounded-full border border-red-500/30 shadow-md transition-colors"
            title="Quitar imagen"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 p-2 bg-dark-950/80 backdrop-blur-md rounded-xl text-center text-[11px] text-emerald-400 font-semibold border border-emerald-500/20 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Flyer cargado correctamente
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-dance-crimson bg-dance-crimson/10'
              : 'border-dark-700 hover:border-dance-orange/60 bg-dark-850/50 hover:bg-dark-850'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dance-crimson">
            <Upload className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Haz clic para subir o arrastra tu flyer aquí
            </p>
            <p className="text-xs text-slate-400">
              Formato vertical recomendado (3:4 o 4:5). Máximo 5 MB.
            </p>
          </div>

          <span className="px-3 py-1 bg-dark-800 text-slate-300 text-[11px] font-medium rounded-xl border border-dark-700">
            Elegir archivo
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
