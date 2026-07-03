import { invoke } from "@tauri-apps/api/core";

export interface Word {
  id: number;
  word: string;
  rank: number;
  tier: number;
  due_date: string | null;
}

export interface WordSense {
  id: number;
  part_of_speech: string;
  definition: string;
  example_sentence: string;
  register: string;
}

export interface WordDetail {
  id: number;
  word: string;
  rank: number;
  tier: number;
  ease: number;
  interval: number;
  reviews: number;
  lapses: number;
  senses: WordSense[];
}

export interface DashboardStats {
  total_words: number;
  due_today: number;
  mastered: number;
  learning: number;
  weak: number;
  streak: number;
}

export interface WeakWord {
  id: number;
  word: string;
  tier: number;
  lapses: number;
  accuracy: number;
}

export async function getDueWords(count = 10): Promise<Word[]> {
  return invoke("get_due_words", { count });
}

export async function getWordDetail(wordId: number): Promise<WordDetail> {
  return invoke("get_word_detail", { wordId });
}

export async function searchWords(query: string, limit?: number, offset?: number): Promise<Word[]> {
  return invoke("search_words", { query, limit, offset });
}

export async function recordReview(wordId: number, rating: number, elapsedMs = 0): Promise<void> {
  return invoke("record_review", { wordId, rating, elapsedMs });
}

export async function getStats(): Promise<DashboardStats> {
  return invoke("get_stats");
}

export async function getWeakWords(): Promise<WeakWord[]> {
  return invoke("get_weak_words");
}

export async function seedWordList(): Promise<number> {
  return invoke("seed_word_list");
}

export async function seedWordSenses(): Promise<number> {
  return invoke("seed_word_senses");
}

export async function addConfusionPair(wordId1: number, wordId2: number, notes = ""): Promise<void> {
  return invoke("add_confusion_pair", { wordId1, wordId2, notes });
}

export interface BackupInfo {
  filename: string;
  size_bytes: number;
  created_at: string;
}

export async function backupDatabase(): Promise<BackupInfo> {
  return invoke("backup_database");
}

export async function getBackups(): Promise<BackupInfo[]> {
  return invoke("get_backups");
}
