import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Music2, RefreshCw } from 'lucide-react';
import {
  DEFAULT_LIBRARY_URL,
  fetchSongLibrary,
  formatDuration,
  SongDurationCache,
  SongLibraryEntry,
} from '../services/songLibrary';

interface SongCollectionMenuProps {
  isVisible: boolean;
  onSelectSong: (song: SongLibraryEntry) => Promise<void>;
  onOpenManualImport: () => void;
  onClose: () => void;
}

type LoadState = 'idle' | 'loading' | 'error';
const STORAGE_KEY = 'guitar-highway-library-url';
const durationCache = new SongDurationCache();

const placeholderCover = (
  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center text-cyan-200/65">
    <Music2 size={28} />
    <span className="text-[10px] mt-1 uppercase tracking-wider">No Cover</span>
  </div>
);

const SongCollectionMenu: React.FC<SongCollectionMenuProps> = ({ isVisible, onSelectSong, onOpenManualImport, onClose }) => {
  const [libraryUrl, setLibraryUrl] = useState(() => window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LIBRARY_URL);
  const [songs, setSongs] = useState<SongLibraryEntry[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [brokenCoverIds, setBrokenCoverIds] = useState<Record<string, boolean>>({});

  const highlightedSong = songs[highlightedIndex] ?? null;

  const loadLibrary = async () => {
    setLoadState('loading');
    setError(null);
    try {
      const result = await fetchSongLibrary(libraryUrl);
      if (result.skipped > 0) {
        console.warn(`Skipped ${result.skipped} invalid library entries.`);
      }
      setSongs(result.songs);
      setHighlightedIndex(0);
      setLoadState('idle');
    } catch (nextError) {
      setSongs([]);
      setLoadState('error');
      setError(nextError instanceof Error ? nextError.message : 'Failed to load songs');
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    void loadLibrary();
  }, [isVisible]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, libraryUrl);
  }, [libraryUrl]);

  useEffect(() => {
    if (!highlightedSong || durations[highlightedSong.audio]) return;
    void durationCache.getDuration(highlightedSong.audio).then((duration) => {
      setDurations((current) => ({ ...current, [highlightedSong.audio]: formatDuration(duration) }));
    });
  }, [highlightedSong, durations]);

  useEffect(() => {
    if (!isVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!songs.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((current) => Math.min(songs.length - 1, current + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((current) => Math.max(0, current - 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected = songs[highlightedIndex];
        if (selected) {
          setLoadingSongId(selected.id);
          void onSelectSong(selected).finally(() => setLoadingSongId(null));
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVisible, songs, highlightedIndex, onSelectSong, onClose]);

  const selectSong = async (song: SongLibraryEntry) => {
    setLoadingSongId(song.id);
    try {
      await onSelectSong(song);
    } finally {
      setLoadingSongId(null);
    }
  };

  const statusBody = useMemo(() => {
    if (loadState === 'loading') {
      return (
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      );
    }

    if (loadState === 'error') {
      return (
        <div className="p-6 text-center text-slate-200">
          <AlertCircle size={28} className="mx-auto mb-2 text-rose-300" />
          <div className="font-medium">Could not load song collection</div>
          <div className="text-sm text-slate-400 mt-1 mb-4">{error ?? 'Unknown error'}</div>
          <button onClick={loadLibrary} className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/35 inline-flex items-center gap-2"><RefreshCw size={14} /> Retry</button>
        </div>
      );
    }

    if (!songs.length) {
      return <div className="p-6 text-slate-300">No songs found. Verify your Library URL.</div>;
    }

    return songs.map((song, index) => {
      const isHighlighted = index === highlightedIndex;
      return (
        <button
          key={song.id}
          onMouseEnter={() => setHighlightedIndex(index)}
          onFocus={() => setHighlightedIndex(index)}
          onClick={() => void selectSong(song)}
          className={`w-full text-left p-2 rounded-xl border transition-all mb-2 ${isHighlighted ? 'bg-cyan-500/20 border-cyan-300/55 shadow-[0_0_16px_rgba(34,211,238,0.2)] scale-[1.01]' : 'bg-slate-900/55 border-slate-700/50 hover:border-cyan-600/40'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 overflow-hidden rounded-md border border-slate-600 bg-slate-900 shrink-0">
              {song.cover && !brokenCoverIds[song.id] ? <img src={song.cover} alt={song.title} loading="lazy" className="w-full h-full object-cover" onError={() => setBrokenCoverIds((current) => ({ ...current, [song.id]: true }))} /> : placeholderCover}
            </div>
            <div className="min-w-0">
              <div className="text-slate-100 font-semibold truncate">{song.title}</div>
              <div className="text-sm text-slate-400 truncate">{song.artist ?? 'Unknown Artist'}</div>
            </div>
          </div>
        </button>
      );
    });
  }, [loadState, songs, highlightedIndex, error]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md p-5 text-white">
      <div className="h-full w-full rounded-2xl border border-cyan-500/20 bg-black/35 flex overflow-hidden">
        <div className="w-[38%] min-w-[340px] border-r border-cyan-500/15 flex flex-col">
          <div className="p-4 border-b border-cyan-500/15">
            <h1 className="text-2xl font-bold text-cyan-200">Song Collection</h1>
            <p className="text-sm text-slate-400 mt-1">Browse and launch songs from your online library.</p>
            <div className="mt-3">
              <label className="text-xs uppercase tracking-widest text-slate-500">Library URL</label>
              <div className="flex gap-2 mt-1">
                <input value={libraryUrl} onChange={(event) => setLibraryUrl(event.target.value)} className="flex-1 rounded-lg bg-slate-900/90 border border-slate-700 px-2 py-2 text-sm" />
                <button onClick={() => void loadLibrary()} className="px-3 rounded-lg bg-cyan-500/25 border border-cyan-400/30 hover:bg-cyan-500/40">Load</button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">{statusBody}</div>
          <div className="p-3 border-t border-cyan-500/15 flex gap-2">
            <button onClick={onOpenManualImport} className="flex-1 py-2 rounded-lg bg-violet-500/25 border border-violet-300/30 hover:bg-violet-500/35">Manual Import</button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700/80 hover:bg-slate-600">Close</button>
          </div>
        </div>

        <div className="flex-1 p-8 flex items-center justify-center">
          {highlightedSong ? (
            <div className="w-full max-w-3xl bg-slate-900/55 border border-slate-700/70 rounded-2xl p-6 grid grid-cols-[280px_1fr] gap-8">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-600 bg-slate-900">
                {highlightedSong.cover && !brokenCoverIds[highlightedSong.id] ? <img src={highlightedSong.cover} alt={highlightedSong.title} className="w-full h-full object-cover" onError={() => setBrokenCoverIds((current) => ({ ...current, [highlightedSong.id]: true }))} /> : placeholderCover}
              </div>
              <div>
                <div className="text-cyan-200 text-4xl font-bold leading-tight">{highlightedSong.title}</div>
                <div className="mt-2 text-2xl text-slate-300">{highlightedSong.artist ?? 'Unknown Artist'}</div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-black/35 rounded-lg border border-slate-700 p-3"><div className="text-slate-500 uppercase text-xs">Length</div><div className="font-semibold mt-1">{durations[highlightedSong.audio] ?? '–:––'}</div></div>
                  <div className="bg-black/35 rounded-lg border border-slate-700 p-3"><div className="text-slate-500 uppercase text-xs">Year</div><div className="font-semibold mt-1">{highlightedSong.year ?? 'Unknown'}</div></div>
                  <div className="bg-black/35 rounded-lg border border-slate-700 p-3"><div className="text-slate-500 uppercase text-xs">Tuning</div><div className="font-semibold mt-1">{highlightedSong.tuning ?? 'Unknown'}</div></div>
                </div>
                <button onClick={() => void selectSong(highlightedSong)} disabled={loadingSongId === highlightedSong.id} className="mt-8 px-6 py-3 rounded-lg bg-cyan-500/25 border border-cyan-300/45 hover:bg-cyan-500/35 text-lg font-semibold inline-flex items-center gap-2 disabled:opacity-60">
                  {loadingSongId === highlightedSong.id ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loadingSongId === highlightedSong.id ? 'Loading Song...' : 'Play Song'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">Select a song to preview details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongCollectionMenu;
