export type Language = 'en' | 'cn';
export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  avatar: string;
  isSelf: boolean;
  isMicOn: boolean;
  isCamOn: boolean;
  status: 'focus' | 'break' | 'idle';
  studyTimeMinutes: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar?: string;
  text: string;
  timestamp: number;
  isAi?: boolean;
}

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak' | 'stopwatch';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Tree {
  id: string;
  type: 'pine' | 'oak' | 'shrub';
  plantedAt: number;
  duration: number;
}

export interface BlockedSite {
  id: string;
  url: string;
}
