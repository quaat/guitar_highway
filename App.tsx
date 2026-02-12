import React, { useEffect, useMemo, useRef, useState } from 'react';
import Scene from './render/Scene';
import ControlPanel from './ui/ControlPanel';
import { usePlayback } from './state/usePlayback';
import { DEFAULT_HIGHWAY_CONFIG } from './constants';
import { generateDemoSong } from './domain/generator';
import { HighwayConfig, NoteEvent, SongMeta } from './types';
import ImportTabxModal from './ui/ImportTabxModal';
import { TabxSong } from './import/tabx/types';
import { ConvertedSong, convertTabxToEvents } from './import/tabx/convertTabx';
import { WebAudioOutputDevice } from './audio/outputDevice';
import { useNoteScheduler } from './state/useNoteScheduler';

const DEFAULT_META: SongMeta = {
  title: 'Demo Song',
  artist: 'System',
  bpm: 120,
  backingtrack: undefined,
  playbackDelayMs: 0,
  timeSig: { num: 4, den: 4 },
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  capo: 0,
  resolution: 16,
};

const audioDevice = new WebAudioOutputDevice();
const SUPPORTED_BACKING_TRACK_EXTENSIONS = ['.webm', '.m4a'];

const toTabxSongMeta = (meta: SongMeta, fallback: TabxSong['meta']): TabxSong['meta'] => ({
  ...fallback,
  ...meta,
  tuning: meta.tuning.length === 6 ? (meta.tuning as TabxSong['meta']['tuning']) : fallback.tuning,
});

const isSupportedBackingTrack = (path?: string): boolean => {
  if (!path) return false;
  const lower = path.toLowerCase();
  return SUPPORTED_BACKING_TRACK_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const App: React.FC = () => {
  const [config, setConfig] = useState<HighwayConfig>(DEFAULT_HIGHWAY_CONFIG);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [songMeta, setSongMeta] = useState<SongMeta>(DEFAULT_META);
  const [importedSong, setImportedSong] = useState<TabxSong | null>(null);

  const { isPlaying, playheadRef, togglePlay, reset, resetToken } = usePlayback();
  const [notes, setNotes] = useState<NoteEvent[]>(() => generateDemoSong());
  const backingTrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const delayedAudioStartRef = useRef<number>();

  useNoteScheduler({ notes, isPlaying, playheadRef, outputDevice: audioDevice, resetToken });

  const clearPendingAudioStart = () => {
    if (delayedAudioStartRef.current) {
      window.clearTimeout(delayedAudioStartRef.current);
      delayedAudioStartRef.current = undefined;
    }
  };

  useEffect(() => {
    const existing = backingTrackAudioRef.current;
    if (existing) {
      existing.pause();
      existing.src = '';
      backingTrackAudioRef.current = null;
    }

    if (!isSupportedBackingTrack(songMeta.backingtrack)) {
      return;
    }

    const audio = new Audio(songMeta.backingtrack);
    audio.preload = 'auto';
    audio.load();
    backingTrackAudioRef.current = audio;

    return () => {
      clearPendingAudioStart();
      audio.pause();
      audio.src = '';
      if (backingTrackAudioRef.current === audio) {
        backingTrackAudioRef.current = null;
      }
    };
  }, [songMeta.backingtrack]);

  const handleImport = (song: TabxSong, converted: ConvertedSong) => {
    setSongMeta({
      title: song.meta.title,
      artist: song.meta.artist,
      bpm: song.meta.bpm,
      backingtrack: song.meta.backingtrack,
      playbackDelayMs: song.meta.playbackDelayMs,
      timeSig: song.meta.timeSig,
      tuning: song.meta.tuning,
      capo: song.meta.capo,
      resolution: song.meta.resolution,
    });
    setImportedSong(song);
    setNotes(converted.notes);
    reset();
  };

  useEffect(() => {
    if (!importedSong) return;
    const updated: TabxSong = { ...importedSong, meta: toTabxSongMeta(songMeta, importedSong.meta) };
    setNotes(convertTabxToEvents(updated).notes);
  }, [songMeta, importedSong]);

  const handleTogglePlay = () => {
    const audio = backingTrackAudioRef.current;

    if (isPlaying) {
      clearPendingAudioStart();
      if (audio) {
        audio.pause();
      }
      togglePlay();
      return;
    }

    togglePlay();

    if (!audio) return;

    const delayMs = Math.max(0, songMeta.playbackDelayMs || 0);
    delayedAudioStartRef.current = window.setTimeout(() => {
      delayedAudioStartRef.current = undefined;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // keep note visualization active even if browser blocks audio playback
      });
    }, delayMs);
  };

  const handleReset = () => {
    clearPendingAudioStart();
    reset();
    const audio = backingTrackAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const subtitle = useMemo(() => `${songMeta.artist ?? 'Unknown'} • ${songMeta.bpm} BPM`, [songMeta]);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Scene notes={notes} playheadRef={playheadRef} config={config} />
      </div>

      <div className="absolute top-4 right-4 z-10 bg-black/70 px-3 py-2 rounded text-white text-sm border border-white/10">
        <div className="font-semibold">{songMeta.title ?? 'Untitled'}</div>
        <div className="text-gray-300 text-xs">{subtitle}</div>
      </div>

      <ControlPanel
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        config={config}
        onConfigChange={setConfig}
        playheadTime={0}
        onOpenImport={() => setIsImportOpen(true)}
        songMeta={songMeta}
        onSongMetaChange={setSongMeta}
      />

      <ImportTabxModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleImport} />
    </div>
  );
};

export default App;
