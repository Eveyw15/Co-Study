import React, { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Download, Type } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface StickyNoteProps {
  lang: Language;
  onClose: () => void;
}

const COLORS = [
    { bg: 'bg-yellow-100 dark:bg-yellow-900/90', header: 'bg-yellow-200 dark:bg-yellow-800', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-900 dark:text-yellow-100', name: 'Yellow' },
    { bg: 'bg-blue-100 dark:bg-blue-900/90', header: 'bg-blue-200 dark:bg-blue-800', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100', name: 'Blue' },
    { bg: 'bg-green-100 dark:bg-green-900/90', header: 'bg-green-200 dark:bg-green-800', border: 'border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-100', name: 'Green' },
    { bg: 'bg-pink-100 dark:bg-pink-900/90', header: 'bg-pink-200 dark:bg-pink-800', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-900 dark:text-pink-100', name: 'Pink' },
    { bg: 'bg-gray-100 dark:bg-gray-800/90', header: 'bg-gray-200 dark:bg-gray-700', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-900 dark:text-gray-100', name: 'Gray' },
];

const StickyNote: React.FC<StickyNoteProps> = ({ lang, onClose }) => {
  const t = TRANSLATIONS[lang];
  const [content, setContent] = useState(() => localStorage.getItem('focusflow_note') || "# My Notes\n\n- Task 1\n- Task 2");
  const [colorIndex, setColorIndex] = useState(() => parseInt(localStorage.getItem('focusflow_note_color') || '0'));
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ w: 300, h: 400 });
  
  const noteRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem('focusflow_note', content);
  }, [content]);

  useEffect(() => {
    localStorage.setItem('focusflow_note_color', colorIndex.toString());
  }, [colorIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) return;
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleExport = (type: 'txt' | 'md' | 'doc') => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const theme = COLORS[colorIndex];

  return (
    <div 
      ref={noteRef}
      className={`fixed z-50 ${theme.bg} shadow-2xl rounded-lg border ${theme.border} flex flex-col overflow-hidden backdrop-blur-md transition-colors duration-300`}
      style={{ 
        left: position.x, 
        top: position.y, 
        width: isMinimized ? 200 : size.w, 
        height: isMinimized ? 40 : size.h,
        transition: isDragging.current ? 'none' : 'width 0.2s, height 0.2s, background-color 0.3s'
      }}
    >
      {/* Header */}
      <div 
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setIsMinimized(!isMinimized)}
        className={`h-10 ${theme.header} flex items-center justify-between px-3 cursor-move select-none transition-colors duration-300`}
      >
        <span className={`font-semibold text-xs ${theme.text} flex items-center gap-2`}>
          <Type className="w-3 h-3" /> {t.note}
        </span>
        
        <div className="flex items-center gap-2 no-drag">
           {/* Color Picker */}
           {!isMinimized && (
               <div className="flex gap-1 mr-2">
                   {COLORS.map((c, idx) => (
                       <button 
                        key={c.name} 
                        onClick={() => setColorIndex(idx)}
                        className={`w-3 h-3 rounded-full border border-black/10 hover:scale-125 transition-transform ${c.bg.split(' ')[0]} ${colorIndex === idx ? 'ring-1 ring-offset-1 ring-gray-400' : ''}`}
                        title={c.name}
                       />
                   ))}
               </div>
           )}

           <button onClick={() => handleExport('md')} className={`p-1 hover:bg-black/10 rounded ${theme.text}`} title="Download MD">
             <Download className="w-3 h-3" />
           </button>
           <button onClick={() => setIsMinimized(!isMinimized)} className={`p-1 hover:bg-black/10 rounded ${theme.text}`}>
             {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
           </button>
           <button onClick={onClose} className={`p-1 hover:bg-red-400 hover:text-white rounded ${theme.text}`}>
             <X className="w-3 h-3" />
           </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`flex-1 resize-none bg-transparent p-3 outline-none text-sm font-mono ${theme.text.replace('text-', 'placeholder-').replace('900', '400')} ${theme.text}`}
            placeholder="Type your notes here (Markdown supported)..."
          />
          {/* Resize Handle */}
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = size.w;
              const startH = size.h;
              
              const onMove = (mv: MouseEvent) => {
                setSize({
                  w: Math.max(200, startW + (mv.clientX - startX)),
                  h: Math.max(150, startH + (mv.clientY - startY))
                });
              };
              
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          >
             <svg viewBox="0 0 10 10" className={`w-full h-full opacity-50 ${theme.text}`}><path d="M10 10L10 0L0 10Z" fill="currentColor"/></svg>
          </div>
        </>
      )}
    </div>
  );
};

export default StickyNote;