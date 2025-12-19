import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Music, Trophy, Ban, Send, Bot, Moon, Sun, Languages, LogOut, Type, Play, Pause, ExternalLink, GripHorizontal, Sparkles } from 'lucide-react';
import { ChatMessage, User, Language, BlockedSite, Theme } from '../types';
import { TRANSLATIONS, LOFI_URLS } from '../constants';
import { askAiTutor } from '../services/aiClient';

interface LeftSidebarProps {
  lang: Language;
  theme: Theme;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onToggleNote: () => void;
  onLeaveRoom: () => void;
  users: User[];
  currentUser: User;
  roomName: string;
  socket?: any;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  lang, theme, onToggleTheme, onToggleLang, onToggleNote, onLeaveRoom,
  users, currentUser, roomName, socket
}) => {
  const t = TRANSLATIONS[lang];
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', senderId: 'ai', senderName: 'AI Tutor', text: lang === 'cn' ? '你好！我是你的AI助教。发送 @ai 向我提问！' : 'Hello! I am your AI Tutor. Type @ai to ask me!', timestamp: Date.now(), isAi: true }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const seenMsgIds = useRef<Set<string>>(new Set());

  // Blocker State
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [newSiteUrl, setNewSiteUrl] = useState('');

  // Media State
  const [videoUrl, setVideoUrl] = useState(LOFI_URLS[2].url); // Default Bilibili
  const [audioUrl, setAudioUrl] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [isMediaPlaying, setIsMediaPlaying] = useState(true);

  // Drag State for Floating Player - Updated default position to x:80 y:24
  const [mediaPos, setMediaPos] = useState({ x: 80, y: 24 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - mediaPos.x,
      y: e.clientY - mediaPos.y
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    setMediaPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };


  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const originalText = inputText;
    const isAiRequest = originalText.includes('@ai');
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      avatar: currentUser.avatar,
      text: originalText,
      timestamp: Date.now()
    };

    // Optimistic append (server will also broadcast; we de-dup by id)
    seenMsgIds.current.add(userMsg.id);
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    if (isAiRequest) {
        setIsAiLoading(true);
        // Remove @ai from prompt
        const prompt = originalText.replace('@ai', '').trim();
        const answer = await askAiTutor(prompt, lang);
        
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          senderId: 'ai',
          senderName: 'AI Tutor',
          text: answer,
          timestamp: Date.now(),
          isAi: true
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsAiLoading(false);
    } else {
        socket?.emit?.('chat:send', { roomId: roomName, message: userMsg });
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onMsg = (msg: ChatMessage) => {
      if (!msg?.id) return;
      if (seenMsgIds.current.has(msg.id)) return;
      seenMsgIds.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
    };

    socket.on('chat:message', onMsg);
    return () => {
      socket.off('chat:message', onMsg);
    };
  }, [socket, roomName]);

  const addAiTag = () => {
    if (!inputText.includes('@ai')) {
      setInputText(prev => `@ai ${prev}`);
    }
  };

  useEffect(() => {
    if (activeSection === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSection]);

  const handleAddBlockedSite = () => {
    if (newSiteUrl) {
      setBlockedSites([...blockedSites, { id: Date.now().toString(), url: newSiteUrl }]);
      setNewSiteUrl('');
    }
  };

  // Helper to process URL or Embed Code
  const processMediaInput = (input: string) => {
    if (!input) return '';
    
    // Check if it's an iframe code
    if (input.includes('<iframe')) {
        const srcMatch = input.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
            return srcMatch[1];
        }
    }

    // Basic YouTube conversion
    if (input.includes('youtube.com/watch?v=')) {
        return input.replace('watch?v=', 'embed/');
    }
    if (input.includes('youtu.be/')) {
        return input.replace('youtu.be/', 'youtube.com/embed/');
    }

    return input;
  };

  const updateVideoSource = () => {
    if(!videoInput) return;
    const processedUrl = processMediaInput(videoInput);
    setVideoUrl(processedUrl);
    setVideoInput('');
    setIsMediaPlaying(true);
  }

  return (
    <div className="flex h-full z-20 transition-all duration-300 relative">
      
      {/* Navigation Rail (Always Visible) */}
      <div className="w-16 h-full border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] flex flex-col items-center py-6 gap-6 z-30">
        
        {/* Main Tabs */}
        <button 
          onClick={() => toggleSection('chat')}
          className={`p-2.5 rounded-xl transition-all ${activeSection === 'chat' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
          title={t.chat}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button 
          onClick={() => toggleSection('media')}
          className={`p-2.5 rounded-xl transition-all ${activeSection === 'media' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
          title={t.media}
        >
          <Music className="w-5 h-5" />
        </button>

        <button 
          onClick={() => toggleSection('leaderboard')}
          className={`p-2.5 rounded-xl transition-all ${activeSection === 'leaderboard' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
          title={t.leaderboard}
        >
          <Trophy className="w-5 h-5" />
        </button>

        <button 
          onClick={() => toggleSection('blocker')}
          className={`p-2.5 rounded-xl transition-all ${activeSection === 'blocker' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
          title={t.blocker}
        >
          <Ban className="w-5 h-5" />
        </button>

        <div className="flex-1" />

        {/* Bottom Controls */}
        <div className="flex flex-col gap-4 items-center mb-6">
           <button onClick={onToggleNote} className="p-2 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 transition-colors" title={t.note}>
             <Type className="w-5 h-5" />
           </button>

           <button onClick={onToggleLang} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors" title={t.language}>
             <Languages className="w-5 h-5" />
           </button>

           <button onClick={onToggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors" title={t.theme}>
             {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
           </button>

           <button onClick={onLeaveRoom} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Exit">
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Floating Media Controls (Visible when media tab closed but playing) */}
      {activeSection !== 'media' && isMediaPlaying && (
          <div 
            className="fixed z-50 animate-fade-in-up cursor-move"
            style={{ left: mediaPos.x, top: mediaPos.y }}
            onMouseDown={handleMouseDown}
          >
              <div className="bg-white dark:bg-[#1C1C1E] p-2 rounded-2xl flex items-center gap-2 border border-gray-100 dark:border-white/10 shadow-xl group select-none">
                  <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center text-white">
                     <Music className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex flex-col pr-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Now Playing</span>
                      <span className="text-xs font-semibold text-black dark:text-white w-20 truncate">Lofi/Music</span>
                  </div>
                   <div className="flex items-center border-l border-gray-100 dark:border-white/10 pl-2 ml-1">
                      <GripHorizontal className="w-3 h-3 text-gray-300 mr-1" />
                      <button onClick={(e) => { e.stopPropagation(); toggleSection('media'); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                   </div>
              </div>
          </div>
      )}

      {/* Expanded Content Drawer */}
      <div className={`h-full border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] transition-all duration-300 overflow-hidden flex flex-col shadow-2xl z-20 ${activeSection ? 'w-[320px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-10'}`}>
        
        {/* Room Header */}
        <div className="h-16 border-b border-gray-50 dark:border-white/5 flex items-center justify-between px-6 bg-white dark:bg-[#1C1C1E]">
           <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.roomId}</span>
           <span className="text-sm font-mono font-bold text-black dark:text-white bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg">{roomName}</span>
        </div>

        {/* Chat Content */}
        {activeSection === 'chat' && (
          <div className="flex flex-col flex-1 min-h-0 bg-gray-50/50 dark:bg-black/20">
            <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E]">
              <h2 className="font-bold text-black dark:text-white flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-blue-500" /> {t.chat}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.senderId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.isAi ? 'bg-purple-500' : 'bg-gray-200'} overflow-hidden shadow-sm`}>
                      {msg.isAi ? <Bot className="w-4 h-4 text-white" /> : <img src={msg.avatar || "https://picsum.photos/32/32"} alt={msg.senderName} />}
                    </div>
                    
                    <div className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'} max-w-[80%]`}>
                       <span className="text-[10px] text-gray-400 font-medium mb-1 px-1">
                          {msg.senderName}
                       </span>
                       <div className={`p-3 rounded-2xl text-sm shadow-sm border border-transparent ${
                        msg.senderId === currentUser.id 
                            ? 'bg-blue-500 text-white rounded-tr-none shadow-blue-500/20' 
                            : msg.isAi 
                            ? 'bg-white dark:bg-[#2C2C2E] border-purple-100 dark:border-purple-500/20 text-gray-800 dark:text-gray-100 rounded-tl-none'
                            : 'bg-white dark:bg-[#2C2C2E] text-gray-800 dark:text-gray-100 rounded-tl-none border-gray-100 dark:border-white/5'
                        }`}>
                        {msg.text}
                       </div>
                    </div>
                  </div>
                ))}
                {isAiLoading && <div className="text-xs text-gray-400 text-center animate-pulse">AI thinking...</div>}
                <div ref={chatEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex flex-col gap-2">
                <div className="flex px-1">
                   <button 
                    onClick={addAiTag}
                    className="text-xs flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md hover:bg-purple-100 transition-colors"
                   >
                     <Sparkles className="w-3 h-3" /> @ai
                   </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={t.placeholderMessage}
                    className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[#3A3A3C] transition-all dark:text-white placeholder-gray-400"
                  />
                  <button onClick={handleSendMessage} className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Media Content */}
        <div className={`flex flex-col flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50/50 dark:bg-black/20 ${activeSection === 'media' ? 'block' : 'hidden'}`}>
             <div className="flex items-center gap-2 mb-2">
                <Music className="w-6 h-6 text-pink-500" />
                <h2 className="font-bold text-lg text-black dark:text-white">{t.media}</h2>
             </div>
             
             {/* Video Player */}
             <div className="space-y-3 p-4 bg-white dark:bg-[#2C2C2E] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visual Ambience</label>
               <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-inner">
                  <iframe 
                    className="absolute inset-0 w-full h-full"
                    src={videoUrl} 
                    title="Video player" 
                    frameBorder="no"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
               </div>
               <div className="flex gap-2">
                 <input 
                    className="flex-1 text-xs bg-gray-100 dark:bg-[#3A3A3C] rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-pink-500/20 dark:text-white"
                    placeholder={t.enterUrl}
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                 />
                 <button onClick={updateVideoSource} className="text-xs bg-black text-white px-3 py-2 rounded-lg font-bold">{t.add}</button>
               </div>
               <p className="text-[10px] text-gray-400">Supports URL or &lt;iframe&gt; code</p>
             </div>

             {/* Audio Player */}
             <div className="space-y-3 p-4 bg-white dark:bg-[#2C2C2E] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Music Stream</label>
                <div className="rounded-2xl bg-gray-50 dark:bg-[#3A3A3C] p-4 flex items-center justify-center min-h-[100px] border border-dashed border-gray-200 dark:border-white/10">
                   {audioUrl ? (
                      <iframe src={audioUrl} width="100%" height="80" frameBorder="0" allowTransparency={true} allow="encrypted-media"></iframe>
                   ) : (
                      <span className="text-xs text-gray-400 font-medium">No Audio Source Selected</span>
                   )}
                </div>
                 <div className="flex gap-2">
                 <input 
                    className="flex-1 text-xs bg-gray-100 dark:bg-[#3A3A3C] rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-pink-500/20 dark:text-white"
                    placeholder={t.enterUrl}
                    onChange={(e) => {
                        setAudioUrl(processMediaInput(e.target.value));
                        setIsMediaPlaying(true);
                    }}
                 />
               </div>
             </div>
        </div>


        {/* Leaderboard Content */}
        {activeSection === 'leaderboard' && (
           <div className="flex flex-col flex-1 p-6 overflow-y-auto bg-gray-50/50 dark:bg-black/20">
              <h2 className="font-bold text-lg text-black dark:text-white mb-6 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> {t.leaderboard}
              </h2>
               <div className="space-y-3">
              {[...users, currentUser].sort((a,b) => b.studyTimeMinutes - a.studyTimeMinutes).map((u, index) => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-sm border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-black w-6 text-center ${index < 3 ? 'text-yellow-500' : 'text-gray-300'}`}>{index + 1}</span>
                    <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full border-2 border-white dark:border-[#3A3A3C] shadow-sm" />
                    <div>
                      <p className="text-sm font-bold text-black dark:text-white leading-tight">{u.isSelf ? `${u.name} (You)` : u.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md inline-block mt-1 font-medium ${
                        u.status === 'focus' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        u.status === 'break' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {u.status === 'focus' ? t.studying : u.status === 'break' ? t.resting : t.idle}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{u.studyTimeMinutes}m</span>
                </div>
              ))}
            </div>
           </div>
        )}

        {/* Blocker Content */}
        {activeSection === 'blocker' && (
           <div className="flex flex-col flex-1 p-6 overflow-y-auto bg-gray-50/50 dark:bg-black/20">
              <h2 className="font-bold text-lg text-black dark:text-white mb-6 flex items-center gap-2">
                <Ban className="w-6 h-6 text-red-500" /> {t.blocker}
              </h2>
              <div className="flex gap-2 mb-6">
                  <input 
                    className="flex-1 bg-white dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-3 text-sm dark:text-white focus:ring-2 focus:ring-red-500/20 shadow-sm"
                    placeholder={t.blockSitePlaceholder}
                    value={newSiteUrl}
                    onChange={(e) => setNewSiteUrl(e.target.value)}
                  />
                  <button onClick={handleAddBlockedSite} className="bg-black dark:bg-white text-white dark:text-black rounded-xl px-4 font-bold text-xl shadow-lg">+</button>
                </div>
                <div className="space-y-3">
                  {blockedSites.map(site => (
                    <div key={site.id} className="flex justify-between items-center bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[180px]">{site.url}</span>
                      <button onClick={() => setBlockedSites(blockedSites.filter(s => s.id !== site.id))} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                        <span className="text-xs font-bold">✕</span>
                      </button>
                    </div>
                  ))}
                  {blockedSites.length === 0 && (
                      <div className="text-center py-10 opacity-50">
                          <Ban className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs text-gray-400">No blocked sites configured.</p>
                      </div>
                  )}
                </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;