import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Language, Theme, User } from './types';
import { io } from 'socket.io-client';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import CenterStage from './components/CenterStage';
import RoomLogin from './components/RoomLogin';
import StickyNote from './components/StickyNote';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Language>('cn');
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomName, setRoomName] = useState('');

  // Realtime State
  const socketRef = useRef<any>(null);
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  
  // Layout State
  const [rightOpen, setRightOpen] = useState(true);
  const [showNote, setShowNote] = useState(false);

  // Current User State
  const [currentUser, setCurrentUser] = useState<User>({
    id: "",
    name: "",
    avatar: 'https://picsum.photos/100/100?random=99',
    isSelf: true,
    isMicOn: true,
    isCamOn: false,
    status: "idle",
    studyTimeMinutes: 0,
  });

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const serverUrl = useMemo(() => {
    // Next.js client env vars must be prefixed with NEXT_PUBLIC_*
    // If you run the custom Next.js server (included), Socket.IO runs on the same origin.
    // In that case, you can leave NEXT_PUBLIC_SERVER_URL empty.
    return (process.env.NEXT_PUBLIC_SERVER_URL || '').trim();
  }, []);

  const detachSocket = () => {
    try {
      if (socketRef.current && roomName) {
        socketRef.current.emit('room:leave', { roomId: roomName });
      }
      socketRef.current?.removeAllListeners?.();
      socketRef.current?.disconnect?.();
    } catch {
      // ignore
    }
    socketRef.current = null;
    setOtherUsers([]);
  };

  const handleAuth = async ({ name, roomId, password, isCreating }: { name: string; roomId: string; password: string; isCreating: boolean }) => {
    // Always reset any previous socket
    detachSocket();

    const avatar = `https://picsum.photos/100/100?random=${Math.floor(Math.random() * 1000)}`;
    const socket = io(serverUrl || undefined, {
      transports: ['websocket'],
      autoConnect: true,
    });
    socketRef.current = socket;

    // Subscribe early to avoid missing the first room:users broadcast.
    socket.on('room:users', (users: any[]) => {
      const selfId = socket.id;
      const others = (users || []).filter(u => u.id !== selfId).map(u => ({ ...u, isSelf: false }));
      setOtherUsers(others);
    });

    // Wait for connect or error
    const connected = await new Promise<boolean>((resolve) => {
      const onConnect = () => { cleanup(); resolve(true); };
      const onError = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };
      socket.on('connect', onConnect);
      socket.on('connect_error', onError);
      // safety timeout
      setTimeout(() => { cleanup(); resolve(false); }, 2500);
    });

    if (!connected) {
      detachSocket();
      return { ok: false, errorKey: 'loginError' };
    }

    const payload = { roomId, password, user: { name, avatar } };
    const event = isCreating ? 'room:create' : 'room:join';

    const result = await new Promise<any>((resolve) => {
      socket.emit(event, payload, (ack: any) => resolve(ack));
      setTimeout(() => resolve({ ok: false, errorKey: 'loginError' }), 2500);
    });

    if (!result?.ok) {
      detachSocket();
      return { ok: false, errorKey: result?.errorKey || 'loginError' };
    }

    // Enter room
    setCurrentUser(prev => ({
    ...prev,
    id: socket.id ?? prev.id,
    name,
    avatar: prev.avatar,
    isSelf: true,
    isMicOn: prev.isMicOn,
    isCamOn: prev.isCamOn,
    status: prev.status,
    studyTimeMinutes: prev.studyTimeMinutes,
  }));


    // Push initial self state
    socket.emit('user:update', {
      roomId,
      patch: {
        name,
        avatar,
        isMicOn: false,
        isCamOn: false,
        status: 'idle',
        studyTimeMinutes: 0,
      }
    });

    return { ok: true };
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(prev => prev === 'cn' ? 'en' : 'cn');
  const toggleNote = () => setShowNote(prev => !prev);

  if (!isInRoom) {
    return (
        <RoomLogin 
            onAuth={handleAuth}
            lang={lang} 
            theme={theme}
            onToggleTheme={toggleTheme}
            onToggleLang={toggleLang}
        />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F5F7] dark:bg-black font-sans text-gray-900 dark:text-white">
      {/* Sticky Note Component */}
      {showNote && <StickyNote lang={lang} onClose={() => setShowNote(false)} />}

      {/* Main Layout Grid */}
      <div className="relative z-10 flex w-full h-full">
        
        <LeftSidebar 
          lang={lang}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleLang={toggleLang}
          onToggleNote={toggleNote}
          onLeaveRoom={() => { detachSocket(); setIsInRoom(false); }}
          users={otherUsers}
          currentUser={currentUser}
          roomName={roomName}
          socket={socketRef.current}
        />

        <CenterStage 
          users={otherUsers}
          currentUser={currentUser}
          roomId={roomName}
          socket={socketRef.current}
          onToggleMic={() => {
            setCurrentUser(prev => {
              const next = { ...prev, isMicOn: !prev.isMicOn };
              socketRef.current?.emit?.('user:update', { roomId: roomName, patch: { isMicOn: next.isMicOn } });
              return next;
            });
          }}
          onToggleCam={() => {
            setCurrentUser(prev => {
              const next = { ...prev, isCamOn: !prev.isCamOn };
              socketRef.current?.emit?.('user:update', { roomId: roomName, patch: { isCamOn: next.isCamOn } });
              return next;
            });
          }}
        />

        <RightSidebar 
          isOpen={rightOpen} 
          toggleSidebar={() => setRightOpen(!rightOpen)}
          lang={lang}
          onStatusChange={(status) => {
            setCurrentUser(prev => {
              const next = { ...prev, status };
              socketRef.current?.emit?.('user:update', { roomId: roomName, patch: { status } });
              return next;
            });
          }}
          onStudyMinutesIncrement={(minutes) => {
            setCurrentUser(prev => {
              const next = { ...prev, studyTimeMinutes: prev.studyTimeMinutes + minutes };
              socketRef.current?.emit?.('user:update', { roomId: roomName, patch: { studyTimeMinutes: next.studyTimeMinutes } });
              return next;
            });
          }}
        />

      </div>
    </div>
  );
};

export default App;