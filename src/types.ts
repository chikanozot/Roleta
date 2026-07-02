/**
 * Types for the Guild Manager application
 */

export type UserRole = 'Administrador' | 'Líder' | string;

export interface User {
  id: string;
  username: string;
  password?: string; // Optional on client side for security
  role: UserRole;
  active: boolean;
  createdAt: string;
  isMaster?: boolean;
}

export interface GoalHistoryItem {
  id: string;
  goal: string; // e.g., "250+", "350+", "450+", "500+", etc.
  date: string;
  time: string;
  byUser: string;
}

export interface Maker {
  id: string;
  name: string; // Must be unique across all makers and mains
  levelGoals: GoalHistoryItem[];
  createdAt: string;
}

export interface Warning {
  id: string;
  reason: string;
  date: string;
  time: string;
  byLeader: string;
  removed: boolean;
  removedBy?: string;
  removedDate?: string;
  removedTime?: string;
}

export interface MemberAccess {
  sanguine: boolean;
  crypt: boolean;
  dragon: boolean; // Dragãozinho
  [key: string]: boolean; // Support future accesses dynamically
}

export interface Member {
  id: string;
  main: string; // Unique main character name
  tsNick: string;
  joinDate: string;
  responsibleLeader: string;
  status: 'Active' | 'Inactive';
  notes: string;
  access: MemberAccess;
  makers: Maker[];
  warnings: Warning[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryLog {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  username: string;
  action: string;
  details: string;
}

export interface GlobalGoals {
  sanguine: boolean;
  crypt: boolean;
  dragon: boolean;
  makerLevel: string; // e.g., "450+", "500+", or "none"
}

export interface DatabaseState {
  users: User[];
  members: Member[];
  history: HistoryLog[];
  accessTypes: { id: string; label: string }[];
  roles: string[];
  globalGoals?: GlobalGoals;
}
