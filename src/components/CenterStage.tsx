import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, Maximize2, Minimize2, Radio, Loader2 } from 'lucide-react';
import { User } from '../types';

interface CenterStageProps {
  users: User[]; // other users
  currentUser: User;
  roomId: string;
  socket?: any;
  onToggleMic: () => void;
  onToggleCam: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const CenterStage: React.FC<CenterStageProps> = ({ users, currentUser, roomId, socket, onToggleMic, onToggleCam }) => {
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [noiseCancelEnabled, setNoiseCancelEnabled] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [localVideoReady, setLocalVideoReady] = useState(false);

  const remoteUser = users[0] || null; // 1:1 room

  const allUsers = useMemo(() => {
    return [...users, currentUser];
  }, [users, currentUser]);

  const focusedUser = focusedUserId ? allUsers.find(u => u.id === focusedUserId) : null;
  const gridUsers = focusedUserId ? allUsers.filter(u => u.id !== focusedUserId) : allUsers;

  const closePeerConnection = () => {
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    remoteIdRef.current = null;
    remoteStreamRef.current = new MediaStream();
    setRemoteReady(false);
  };

  const stopLocalTrack = (kind: 'audio' | 'video') => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    tracks.forEach(t => {
      try { t.stop(); } catch {}
      stream.removeTrack(t);
    });
  };

  const ensureLocalTrack = async (kind: 'audio' | 'video') => {
    // Request only what we need to keep permission prompts minimal.
    const constraints: MediaStreamConstraints = kind === 'audio'
      ? { audio: true, video: false }
      : { audio: false, video: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (!localStreamRef.current) localStreamRef.current = new MediaStream();

    const track = kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
    if (track) {
      localStreamRef.current.addTrack(track);
    }

    // Stop the temporary stream wrapper tracks we didn't move (defensive)
    stream.getTracks().forEach(t => {
      if (t !== track) {
        try { t.stop(); } catch {}
      }
    });

    return track || null;
  };

  const upsertSender = async (kind: 'audio' | 'video') => {
    const pc = pcRef.current;
    if (!pc) return;
    const stream = localStreamRef.current;
    if (!stream) return;

    const track = (kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]) || null;
    const sender = pc.getSenders().find(s => s.track?.kind === kind) || null;

    if (track) {
      if (sender) {
        await sender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    } else {
      // remove sender if track is gone
      if (sender) {
        try { pc.removeTrack(sender); } catch {}
      }
    }
  };

  const negotiate = async (toId: string) => {
    const pc = pcRef.current;
    if (!pc || !socket) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:signal', {
        roomId,
        to: toId,
        data: { type: 'offer', sdp: pc.localDescription }
      });
    } catch (e) {
      console.warn('Failed to negotiate', e);
    }
  };

  const ensurePeerConnection = (toId: string) => {
    if (pcRef.current && remoteIdRef.current === toId) return pcRef.current;

    closePeerConnection();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    remoteIdRef.current = toId;

    // Ensure we can receive even if local tracks are off.
    try {
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    } catch {
      // Older browsers might throw; not fatal.
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket) {
        socket.emit('webrtc:signal', {
          roomId,
          to: toId,
          data: { type: 'candidate', candidate: ev.candidate }
        });
      }
    };

    pc.ontrack = (ev) => {
      // Merge tracks into a single remote stream
      ev.streams?.[0]?.getTracks()?.forEach(t => {
        if (!remoteStreamRef.current.getTracks().some(x => x.id === t.id)) {
          remoteStreamRef.current.addTrack(t);
        }
      });
      if (ev.track && !remoteStreamRef.current.getTracks().some(x => x.id === ev.track.id)) {
        remoteStreamRef.current.addTrack(ev.track);
      }
      setRemoteReady(true);
    };

    // If we already have local tracks, attach them.
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        try { pc.addTrack(track, stream); } catch {}
      });
    }

    return pc;
  };

  // Socket signaling handler
  useEffect(() => {
    if (!socket) return;

    const onSignal = async ({ from, data }: any) => {
      if (!from || !data) return;
      const pc = ensurePeerConnection(from);

      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription(data.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            roomId,
            to: from,
            data: { type: 'answer', sdp: pc.localDescription }
          });
          return;
        }

        if (data.type === 'answer') {
          await pc.setRemoteDescription(data.sdp);
          return;
        }

        if (data.type === 'candidate' && data.candidate) {
          await pc.addIceCandidate(data.candidate);
        }
      } catch (e) {
        console.warn('Signal handling failed', e);
      }
    };

    socket.on('webrtc:signal', onSignal);
    return () => {
      socket.off('webrtc:signal', onSignal);
    };
  }, [socket, roomId]);

  // When the other user changes, (re)connect.
  useEffect(() => {
    if (!socket || !roomId) return;
    if (!remoteUser?.id) {
      closePeerConnection();
      return;
    }

    const toId = remoteUser.id;
    ensurePeerConnection(toId);

    // Deterministic initiator to avoid double-offer.
    const selfId = socket.id || currentUser.id;
    const initiator = String(selfId) < String(toId);

    // Give a small delay so both sides have listeners ready.
    const timer = setTimeout(() => {
      if (initiator) negotiate(toId);
    }, 150);

    return () => clearTimeout(timer);
  }, [remoteUser?.id, socket, roomId]);

  // Toggle mic/cam changes: update local tracks + renegotiate.
  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      try {
        // Mic
        if (currentUser.isMicOn) {
          const hasAudio = localStreamRef.current?.getAudioTracks()?.length;
          if (!hasAudio) {
            await ensureLocalTrack('audio');
          }
        } else {
          stopLocalTrack('audio');
        }

        // Cam
        if (currentUser.isCamOn) {
          const hasVideo = localStreamRef.current?.getVideoTracks()?.length;
          if (!hasVideo) {
            await ensureLocalTrack('video');
          }
        } else {
          stopLocalTrack('video');
        }

        if (cancelled) return;

        setLocalVideoReady(!!localStreamRef.current?.getVideoTracks()?.length);

        // Sync senders + renegotiate if connected.
        const remoteId = remoteIdRef.current;
        if (pcRef.current && remoteId) {
          await upsertSender('audio');
          await upsertSender('video');
          await negotiate(remoteId);
        }
      } catch (e) {
        console.warn('Failed to apply media state', e);
      }
    };

    apply();
    return () => { cancelled = true; };
  }, [currentUser.isMicOn, currentUser.isCamOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePeerConnection();
      try {
        localStreamRef.current?.getTracks()?.forEach(t => { try { t.stop(); } catch {} });
      } catch {}
      localStreamRef.current = null;
    };
  }, []);

  const attachLocal = (el: HTMLVideoElement | null) => {
    if (!el) return;
    if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  };

  const attachRemoteVideo = (el: HTMLVideoElement | null) => {
    if (!el) return;
    if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
    }
  };

  const attachRemoteAudio = (el: HTMLAudioElement | null) => {
    if (!el) return;
    if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
    }
  };

  const showSelfVideo = currentUser.isCamOn && localVideoReady;
  const showRemoteVideo = !!remoteUser && remoteUser.isCamOn && remoteReady && remoteStreamRef.current.getVideoTracks().length > 0;

  return (
    <div
      className="flex-1 relative bg-transparent flex flex-col p-4 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Always-mount audio sink so remote audio plays even when remote video is off */}
      <audio ref={attachRemoteAudio} autoPlay playsInline />

      {/* Grid Layout */}
      <div className={`flex-1 w-full h-full transition-all duration-500 ease-in-out ${focusedUserId ? 'flex flex-col gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr'}`}>
        {/* Focused User View */}
        {focusedUserId && focusedUser && (
          <div className="flex-1 w-full relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group animate-in fade-in zoom-in duration-300">
            {focusedUser.isSelf ? (
              showSelfVideo ? (
                <video ref={attachLocal} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  {currentUser.isCamOn ? <Loader2 className="w-8 h-8 text-white/50 animate-spin" /> : <img src={focusedUser.avatar} className="w-32 h-32 rounded-full opacity-50" alt="Avatar" />}
                </div>
              )
            ) : (
              showRemoteVideo ? (
                <video ref={attachRemoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
                  <img src={focusedUser.avatar} className="w-full h-full object-cover opacity-80 blur-sm absolute" alt="Blur BG" />
                  <img src={focusedUser.avatar} className="w-32 h-32 rounded-full relative z-10 shadow-xl" alt="Avatar" />
                </div>
              )
            )}

            {/* Controls Overlay for Focused View */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button onClick={() => setFocusedUserId(null)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur transition-colors" title="Minimize">
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md text-white font-medium">
              {focusedUser.name} {focusedUser.isSelf && "(You)"}
            </div>
          </div>
        )}

        {/* Grid Users */}
        <div className={`${focusedUserId ? 'h-32 flex gap-4 overflow-x-auto pb-2 px-1' : 'contents'}`}>
          {gridUsers.map(user => {
            const isRemote = !user.isSelf;
            const showVideo = isRemote ? showRemoteVideo : showSelfVideo;
            const attach = isRemote ? attachRemoteVideo : attachLocal;

            return (
              <div
                key={user.id}
                onDoubleClick={() => setFocusedUserId(user.id)}
                className={`relative bg-zinc-900 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10 transition-all cursor-pointer hover:ring-blue-500/50 group/card ${focusedUserId ? 'min-w-[200px] w-48' : 'w-full h-full'}`}
              >
                {showVideo ? (
                  <video
                    ref={attach as any}
                    autoPlay
                    playsInline
                    muted={!isRemote}
                    className={`w-full h-full object-cover ${!isRemote ? 'transform scale-x-[-1]' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    {user.isSelf && currentUser.isCamOn ? (
                      <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                    ) : (
                      <img src={user.avatar} className={`${focusedUserId ? 'w-16 h-16' : 'w-32 h-32'} rounded-full opacity-60`} alt="Avatar" />
                    )}
                  </div>
                )}

                {/* Maximize Button on Hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={() => setFocusedUserId(user.id)} className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-0.5 rounded text-xs text-white font-medium flex items-center gap-2 backdrop-blur">
                  <span>{user.name} {user.isSelf && "(You)"}</span>
                  {!user.isMicOn && <MicOff className="w-3 h-3 text-red-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Control Bar */}
      <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-6 transition-all duration-300 shadow-2xl ${hovered || focusedUserId ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
        <button
          onClick={onToggleMic}
          className={`p-3 rounded-full transition-colors ${currentUser.isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'}`}
          title={currentUser.isMicOn ? 'Mute' : 'Unmute'}
        >
          {currentUser.isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleCam}
          className={`p-3 rounded-full transition-colors ${currentUser.isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'}`}
          title={currentUser.isCamOn ? 'Camera Off' : 'Camera On'}
        >
          {currentUser.isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <div className="w-px h-8 bg-white/20"></div>

        <div className="flex items-center gap-2 group relative">
          <Volume2 className="w-5 h-5 text-gray-300" />
          <input type="range" className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
        </div>

        <button
          onClick={() => setNoiseCancelEnabled(!noiseCancelEnabled)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-2 ${noiseCancelEnabled ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30'}`}
        >
          <Radio className="w-3 h-3" />
          {noiseCancelEnabled ? 'Noise Cancel: On' : 'Noise Cancel: Off'}
        </button>
      </div>
    </div>
  );
};

export default CenterStage;
