import { create } from "zustand";
import type { Word, DashboardStats } from "./api";

interface AppState {
  seeded: boolean;
  seedCount: number;
  dueWords: Word[];
  stats: DashboardStats | null;
  currentWordIndex: number;
  setSeeded: (seeded: boolean, count?: number) => void;
  setDueWords: (words: Word[]) => void;
  setStats: (stats: DashboardStats) => void;
  advanceWord: () => void;
  resetSession: () => void;
}

export const useStore = create<AppState>((set) => ({
  seeded: false,
  seedCount: 0,
  dueWords: [],
  stats: null,
  currentWordIndex: 0,
  setSeeded: (seeded, count = 0) => set({ seeded, seedCount: count }),
  setDueWords: (dueWords) => set({ dueWords, currentWordIndex: 0 }),
  setStats: (stats) => set({ stats }),
  advanceWord: () =>
    set((s) => ({
      currentWordIndex: Math.min(s.currentWordIndex + 1, s.dueWords.length),
    })),
  resetSession: () => set({ currentWordIndex: 0, dueWords: [] }),
}));
