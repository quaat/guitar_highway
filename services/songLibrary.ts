import { convertTabxToEvents, ConvertedSong } from '../import/tabx/convertTabx';
import { parseTabx, parseTabx2Ascii } from '../import/tabx/parseTabx';
import { TabxSong } from '../import/tabx/types';

export const DEFAULT_LIBRARY_URL = 'http://localhost:8000/songs.json';
const DEFAULT_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;

export interface SongLibraryEntry {
  id: string;
  title: string;
  artist?: string;
  tuning?: string;
  year?: string;
  cover?: string;
  audio: string;
  notes?: string;
}

export interface ParsedLibraryResult {
  songs: SongLibraryEntry[];
  skipped: number;
}

export const formatDuration = (durationSec?: number | null): string => {
  if (durationSec === undefined || durationSec === null || !Number.isFinite(durationSec) || durationSec <= 0) return '–:––';
  const rounded = Math.round(durationSec);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parseSongLibraryPayload = (payload: unknown): ParsedLibraryResult => {
  if (!Array.isArray(payload)) return { songs: [], skipped: 0 };

  let skipped = 0;
  const songs = payload.flatMap((item, index) => {
    if (!item || typeof item !== 'object') {
      skipped += 1;
      return [];
    }

    const row = item as Record<string, unknown>;
    const title = asNonEmptyString(row.title);
    const audio = asNonEmptyString(row.audio);
    if (!title || !audio) {
      skipped += 1;
      return [];
    }

    return [{
      id: `${title}-${index}`,
      title,
      audio,
      artist: asNonEmptyString(row.artist),
      tuning: asNonEmptyString(row.tuning),
      year: asNonEmptyString(row.year),
      cover: asNonEmptyString(row.cover),
      notes: asNonEmptyString(row.notes),
    } satisfies SongLibraryEntry];
  });

  return { songs, skipped };
};

export const fetchSongLibrary = async (url: string, fetcher: typeof fetch = fetch): Promise<ParsedLibraryResult> => {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Could not load song library (${response.status})`);
  const json = await response.json();
  return parseSongLibraryPayload(json);
};

const buildFallbackSong = (entry: SongLibraryEntry): TabxSong => ({
  meta: {
    title: entry.title,
    artist: entry.artist,
    bpm: 120,
    backingtrack: entry.audio,
    playbackDelayMs: 0,
    timeSig: { num: 4, den: 4 },
    tuning: [...DEFAULT_TUNING],
    capo: 0,
    resolution: 16,
  },
  sections: [],
});

export const loadLibrarySong = async (entry: SongLibraryEntry, fetcher: typeof fetch = fetch): Promise<{ song: TabxSong; converted: ConvertedSong }> => {
  if (!entry.notes) {
    const fallbackSong = buildFallbackSong(entry);
    return { song: fallbackSong, converted: convertTabxToEvents(fallbackSong) };
  }

  const response = await fetcher(entry.notes);
  if (!response.ok) throw new Error(`Could not load notes (${response.status})`);
  const text = await response.text();

  const isV2 = text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() === 'TABX 2';
  const parsed = isV2 ? parseTabx2Ascii(text) : { ...parseTabx(text), diagnostics: [] };
  if (!parsed.song || parsed.errors.length > 0) {
    const first = parsed.errors[0]?.message ?? 'Unknown TABX parse error';
    throw new Error(`Failed to parse notes: ${first}`);
  }

  const song: TabxSong = {
    ...parsed.song,
    meta: {
      ...parsed.song.meta,
      title: entry.title ?? parsed.song.meta.title,
      artist: entry.artist ?? parsed.song.meta.artist,
      backingtrack: entry.audio,
    },
  };

  return { song, converted: convertTabxToEvents(song) };
};

export class SongDurationCache {
  private durations = new Map<string, number | null>();
  private inflight = new Map<string, Promise<number | null>>();

  async getDuration(url: string): Promise<number | null> {
    if (this.durations.has(url)) return this.durations.get(url) ?? null;
    if (this.inflight.has(url)) return this.inflight.get(url) ?? Promise.resolve(null);

    const pending = new Promise<number | null>((resolve) => {
      if (typeof Audio === 'undefined') {
        resolve(null);
        return;
      }

      const audio = new Audio();
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
      };
      const onLoaded = () => {
        cleanup();
        const value = Number.isFinite(audio.duration) ? audio.duration : null;
        this.durations.set(url, value);
        resolve(value);
      };
      const onError = () => {
        cleanup();
        this.durations.set(url, null);
        resolve(null);
      };

      audio.preload = 'metadata';
      audio.src = url;
      audio.addEventListener('loadedmetadata', onLoaded, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.load();
    }).finally(() => {
      this.inflight.delete(url);
    });

    this.inflight.set(url, pending);
    return pending;
  }
}
