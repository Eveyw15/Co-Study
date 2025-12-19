import React, { useState } from 'react';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';
import { Lock, User, Hash, Moon, Sun, Languages, Loader2 } from 'lucide-react';

interface RoomLoginProps {
  onAuth: (payload: { name: string; roomId: string; password: string; isCreating: boolean }) => Promise<{ ok: boolean; errorKey?: string }>; 
  lang: Language;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  theme: 'light' | 'dark';
}

const RoomLogin: React.FC<RoomLoginProps> = ({ onAuth, lang, onToggleTheme, onToggleLang, theme }) => {
  const t = TRANSLATIONS[lang];
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await onAuth({ name, roomId, password, isCreating });
    if (!result.ok) {
      const key = result.errorKey as keyof typeof t;
      setError((t as any)[key] || t.loginError);
      setLoading(false);
      return;
    }

    // Success; App will switch to room view
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F7] dark:bg-[#000000] transition-colors duration-300 font-sans">
      <div className="w-full max-w-[420px] p-6">
        
        {/* Card Container */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-2xl p-8 flex flex-col items-center relative overflow-hidden">
          
          <h1 className="text-3xl font-bold text-black dark:text-white mb-8 tracking-tight">Co-Study Flow</h1>

          {/* Segmented Control */}
          <div className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-xl flex mb-8">
            <button 
              onClick={() => { setIsCreating(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${!isCreating ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              {t.join}
            </button>
            <button 
              onClick={() => { setIsCreating(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${isCreating ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              {t.create}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none rounded-xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:bg-gray-200 dark:focus:bg-[#3A3A3C] transition-colors"
                placeholder="Nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none rounded-xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:bg-gray-200 dark:focus:bg-[#3A3A3C] transition-colors"
                placeholder={t.roomId}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none rounded-xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:bg-gray-200 dark:focus:bg-[#3A3A3C] transition-colors"
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs text-center font-medium py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isCreating ? 'Create' : 'Join')}
            </button>
          </form>

          {/* Footer Toggles */}
          <div className="mt-8 flex items-center gap-4">
             <button onClick={onToggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors text-gray-600 dark:text-white">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
             </button>
             <button onClick={onToggleLang} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors text-xs font-bold text-gray-600 dark:text-white">
                {lang === 'cn' ? 'ZH' : 'EN'}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RoomLogin;