'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Plus, StopCircle, Trees, GripHorizontal, ChevronRight } from 'lucide-react';
import { Language, Tag as TagType, TimerMode, Tree } from '../types';
import { TRANSLATIONS, DEFAULT_TAGS } from '../constants';
import ForestModal from './ForestModal';

interface RightSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  lang: Language;
  onStatusChange: (status: 'focus' | 'break' | 'idle') => void;
  onStudyMinutesIncrement?: (minutes: number) => void;
}

/**
 * IMPORTANT (Next.js SSR):
 * Do NOT create `new Audio()` at module top-level.
 * It will run during SSR and crash with "Audio is not defined".
 * We only create Audio objects inside `useEffect` (browser only).
 */
type SoundKey = 'notification' | 'start' | 'switch';

const SOUND_EFFECT_URLS: Record<SoundKey, string> = {
  notification: '/sfx/notification.wav',
  start: '/sfx/select.wav',
  switch: '/sfx/switch.wav'
};

const STOPWATCH_LIMIT_MINUTES = 120;
const STOPWATCH_LIMIT_SECONDS = STOPWATCH_LIMIT_MINUTES * 60;
const TREE_BLOCK_MINUTES = 25;

// Random Morandi Colors Palette
const MORANDI_COLORS = [
  '#E0E5DF', '#D2D0C8', '#C6C0B5', '#B8B3AC', '#A4A099',
  '#C9C0D3', '#B8C6D9', '#A8C0C0', '#CAD3C8', '#D8E0D8',
  '#E6DCD3', '#D3C6BC', '#C0B3A8', '#E6C6C6', '#D9B3B3',
  '#B4C6D0', '#A8B0C0', '#C3B8D8', '#D8C3C3', '#E0D8C3'
];

const getRandomMorandi = () => MORANDI_COLORS[Math.floor(Math.random() * MORANDI_COLORS.length)];

const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  toggleSidebar,
  lang,
  onStatusChange,
  onStudyMinutesIncrement
}) => {
  const t = TRANSLATIONS[lang];

  // ---- Audio (browser-only) ----
  const audioRef = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const makeAudio = (url: string) => {
      const a = new Audio(url);
      a.load();
      a.volume = 0.5;
      return a;
    };

    audioRef.current = {
      notification: makeAudio(SOUND_EFFECT_URLS.notification),
      start: makeAudio(SOUND_EFFECT_URLS.start),
      switch: makeAudio(SOUND_EFFECT_URLS.switch)
    };
  }, []);

  const playSound = (key: SoundKey) => {
    const audio = audioRef.current[key];
    if (!audio) return;

    try {
      audio.currentTime = 0;
      void audio.play().catch((e) => console.warn('Audio play prevented:', e));
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  // Timer State
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState({ focus: 25, shortBreak: 5, longBreak: 15 });
  const [stopwatchTime, setStopwatchTime] = useState(0);

  // Data State
  const [tags, setTags] = useState<TagType[]>(() =>
    DEFAULT_TAGS.map(tag => ({ ...tag, color: getRandomMorandi() }))
  );
  const [selectedTag, setSelectedTag] = useState<string>(DEFAULT_TAGS[0].id);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [stats, setStats] = useState({ study: 0, work: 0, reading: 0 });
  const [showForest, setShowForest] = useState(false);

  // Drag State for Mini Timer
  const [timerPos, setTimerPos] = useState({ x: 0, y: 100 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTimerPos({ x: Math.max(0, window.innerWidth - 150), y: 100 });
  }, []);

  // Refs for stable callbacks to prevent Interval resetting
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const recordTime = useCallback((minutes: number) => {
    const tag = tags.find(t => t.id === selectedTag);
    if (tag) {
      setStats(prev => {
        const key = tag.name.toLowerCase() as keyof typeof stats;
        if (prev[key] !== undefined) {
          return { ...prev, [key]: prev[key] + minutes };
        }
        return { ...prev, study: prev.study + minutes };
      });
    }

    onStudyMinutesIncrement?.(minutes);
  }, [tags, selectedTag, onStudyMinutesIncrement]);

  const plantTreesByMinutes = useCallback((minutesTotal: number) => {
    const count = Math.floor(minutesTotal / TREE_BLOCK_MINUTES);
    if (count <= 0) return;

    const now = Date.now();
    const batch: Tree[] = Array.from({ length: count }).map((_, i) => ({
      id: `${now}-${i}`,
      type: Math.random() > 0.7 ? 'oak' : 'pine',
      plantedAt: now,
      duration: TREE_BLOCK_MINUTES
    }));

    setTrees(prev => [...prev, ...batch]);
  }, []);

  // --- TRANSITION LOGIC ---
  const transitionToNextPhase = useCallback((fromMode: TimerMode) => {
    setIsActive(false);
    playSound('notification');

    if (fromMode === 'focus' || fromMode === 'stopwatch') {
      setMode('shortBreak');
      setTimeLeft(duration.shortBreak * 60);
      if (fromMode === 'stopwatch') setStopwatchTime(0);
      return;
    }

    // break -> stopwatch
    setMode('stopwatch');
    setStopwatchTime(0);
  }, [duration.shortBreak]);

  const handleTimerComplete = useCallback(() => {
    if (mode === 'focus') {
      const minutesCompleted = duration.focus;
      if (minutesCompleted > 0) recordTime(minutesCompleted);
      plantTreesByMinutes(minutesCompleted);
    }

    if (mode === 'stopwatch') {
      const minutesCompleted = STOPWATCH_LIMIT_MINUTES;
      if (minutesCompleted > 0) recordTime(minutesCompleted);
      plantTreesByMinutes(minutesCompleted);
      setStopwatchTime(0);
    }

    transitionToNextPhase(mode);
  }, [mode, duration.focus, recordTime, plantTreesByMinutes, transitionToNextPhase]);

  const handleTimerCompleteRef = useRef(handleTimerComplete);
  useEffect(() => { handleTimerCompleteRef.current = handleTimerComplete; }, [handleTimerComplete]);

  // --- TIMER TICK ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isActive) {
      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          setStopwatchTime(prev => {
            const next = prev + 1;
            if (next >= STOPWATCH_LIMIT_SECONDS) {
              if (interval) clearInterval(interval);
              setTimeout(() => handleTimerCompleteRef.current(), 0);
              return STOPWATCH_LIMIT_SECONDS;
            }
            return next;
          });
        } else {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (interval) clearInterval(interval);
              setTimeout(() => handleTimerCompleteRef.current(), 0);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (mode === 'focus' || mode === 'stopwatch') onStatusChangeRef.current('idle');
    }

    if (isActive) {
      onStatusChangeRef.current(mode === 'focus' || mode === 'stopwatch' ? 'focus' : 'break');
    }

    return () => { if (interval) clearInterval(interval); };
  }, [isActive, mode]);

  // --- DRAG HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - timerPos.x, y: e.clientY - timerPos.y };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    setTimerPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- CONTROLS ---
  const toggleTimer = () => {
    if (!isActive) playSound('start');
    else playSound('switch');
    setIsActive(!isActive);
  };

  const endTimer = () => {
    setIsActive(false);

    if (mode === 'stopwatch') {
      const minutes = Math.floor(stopwatchTime / 60);
      if (minutes > 0) recordTime(minutes);
      plantTreesByMinutes(minutes);
      setStopwatchTime(0);
      transitionToNextPhase('stopwatch');
      return;
    }

    if (mode === 'focus') {
      const secondsSpent = duration.focus * 60 - timeLeft;
      const minutesSpent = Math.floor(Math.max(0, secondsSpent) / 60);
      if (minutesSpent > 0) recordTime(minutesSpent);
      plantTreesByMinutes(minutesSpent);
      transitionToNextPhase('focus');
      return;
    }

    transitionToNextPhase(mode);
  };

  const resetTimer = () => {
    setIsActive(false);
    playSound('switch');
    if (mode === 'stopwatch') setStopwatchTime(0);
    else setTimeLeft((mode === 'focus' ? duration.focus : mode === 'shortBreak' ? duration.shortBreak : duration.longBreak) * 60);
  };

  const changeMode = (newMode: TimerMode) => {
    setIsActive(false);
    playSound('switch');
    setMode(newMode);
    if (newMode === 'stopwatch') setStopwatchTime(0);
    else if (newMode === 'focus') setTimeLeft(duration.focus * 60);
    else if (newMode === 'shortBreak') setTimeLeft(duration.shortBreak * 60);
    else setTimeLeft(duration.longBreak * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const radius = 120;
  const circumference = 2 * Math.PI * radius;

  const totalTime =
    mode === 'stopwatch'
      ? STOPWATCH_LIMIT_SECONDS
      : mode === 'focus'
        ? duration.focus * 60
        : mode === 'shortBreak'
          ? duration.shortBreak * 60
          : duration.longBreak * 60;

  const progress =
    totalTime > 0
      ? (mode === 'stopwatch'
        ? Math.min(stopwatchTime / STOPWATCH_LIMIT_SECONDS, 1)
        : timeLeft / totalTime)
      : 0;

  const currentTagName = tags.find(t => t.id === selectedTag)?.name || 'Study';

  const handleAddTag = () => {
    if (newTagInput) {
      setTags([...tags, { id: Date.now().toString(), name: newTagInput, color: getRandomMorandi() }]);
      setNewTagInput('');
    }
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
    if (selectedTag === id && tags.length > 0) setSelectedTag(tags[0].id);
  };

  return (
    <>
      <ForestModal isOpen={showForest} onClose={() => setShowForest(false)} trees={trees} stats={stats} />

      {/* Floating Mini Timer */}
      {!isOpen && (
        <div
          className="fixed z-50 cursor-move"
          style={{ left: timerPos.x, top: timerPos.y }}
          onMouseDown={handleMouseDown}
          onDoubleClick={toggleSidebar}
        >
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl p-3 rounded-[2rem] shadow-2xl hover:scale-105 transition-all flex flex-col items-center gap-0 border border-gray-200 dark:border-white/10 group select-none min-w-[130px]">
            <div className="flex w-full justify-between items-start px-1">
              <GripHorizontal className="w-3 h-3 text-gray-400" />
              <button
                onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                className="text-gray-400 hover:text-black dark:hover:text-white"
              >
                <ChevronRight className="w-3 h-3 transform rotate-180" />
              </button>
            </div>
            <span className="text-3xl font-numeric font-medium text-black dark:text-white tracking-wider mt-1">
              {mode === 'stopwatch' ? formatTime(stopwatchTime) : formatTime(timeLeft)}
            </span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mb-1 max-w-[100px] truncate">
              {currentTagName}
            </span>
          </div>
        </div>
      )}

      {/* Main Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-[360px] bg-white dark:bg-[#1C1C1E] shadow-xl z-30 flex flex-col transition-transform duration-300 ease-in-out border-l border-gray-100 dark:border-white/5 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full relative">

          {/* Header / Mode Switcher */}
          <div className="p-6 pt-8 pb-4">
            <div className="flex items-center mb-6 relative">
              <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full absolute left-0">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
              <h2 className="text-xl font-bold text-black dark:text-white ml-10">番茄钟</h2>
            </div>

            <div className="flex bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-xl w-full">
              <button onClick={() => changeMode('stopwatch')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${mode === 'stopwatch' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{t.stopwatch}</button>
              <button onClick={() => changeMode('focus')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${mode === 'focus' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{t.focus}</button>
              <button onClick={() => changeMode('shortBreak')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${mode === 'shortBreak' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{t.shortBreak}</button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="flex-1 flex flex-col items-center justify-start pt-4">
            <div className="relative w-72 h-72 grid place-items-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 288 288">
                <circle
                  cx="144"
                  cy="144"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={12}
                  fill="transparent"
                  className="text-gray-100 dark:text-white/5"
                />
                <circle
                  cx="144"
                  cy="144"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={18}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-linear ${
                    mode === 'stopwatch' ? 'text-blue-500' :
                    mode === 'focus' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}
                />
              </svg>

              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-7xl font-numeric font-bold text-black dark:text-white tracking-tight">
                    {mode === 'stopwatch' ? formatTime(stopwatchTime) : formatTime(timeLeft)}
                  </span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-2">
                    {isActive ? (mode === 'shortBreak' ? 'Resting' : 'Running') : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-6 mt-8 mb-8">
              {!isActive ? (
                <>
                  <button
                    onClick={toggleTimer}
                    className="w-40 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center gap-2 font-bold shadow-xl hover:scale-105 transition-transform"
                  >
                    <Play className="fill-current w-5 h-5" /> {t.start}
                  </button>
                  <button
                    onClick={resetTimer}
                    className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white font-medium transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" /> {t.reset}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleTimer}
                    className="w-40 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center gap-2 font-bold shadow-xl hover:scale-105 transition-transform"
                  >
                    <StopCircle className="fill-current w-5 h-5" /> {t.pause}
                  </button>
                  <button
                    onClick={endTimer}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    <StopCircle className="w-5 h-5" /> {t.end}
                  </button>
                </>
              )}
            </div>

            {/* Tags Section */}
            <div className="w-full px-8">
              <p className="text-xs font-medium text-gray-400 mb-3">当前标签</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    style={{ backgroundColor: tag.color }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold text-gray-800 transition-all border-2 ${
                      selectedTag === tag.id
                      ? 'border-black/50 dark:border-white/50 scale-105 shadow-md'
                      : 'border-transparent hover:brightness-95'
                    }`}
                  >
                    {tag.name}
                    {selectedTag === tag.id && (
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }}
                        className="ml-2 text-gray-600 hover:text-red-500"
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const name = prompt("New Tag Name:");
                    if (name) { setTags([...tags, { id: Date.now().toString(), name, color: getRandomMorandi() }]); }
                  }}
                  className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Forest Button */}
          <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-50 dark:border-white/5">
            <button
              onClick={() => setShowForest(true)}
              className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl font-bold shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Trees className="w-5 h-5" />
              查看我的森林 & 统计
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default RightSidebar;
