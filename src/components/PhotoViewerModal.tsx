import React from 'react';
import { X } from 'lucide-react';

interface Props {
  photoUrl: string;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<Props> = ({ photoUrl, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-full max-h-[75vh] flex items-center justify-center bg-black overflow-hidden">
          <img
            src={photoUrl}
            alt="Исходная фотография блюда"
            className="w-full h-auto object-contain max-h-[75vh]"
          />
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            📸 Исходная фотография блюда, сохранённая из сообщения Telegram
          </p>
        </div>
      </div>
    </div>
  );
};
