import React, { useEffect, useMemo, useState } from 'react';
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
  timeSig: { num: 4, den: 4 },
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  capo: 0,
  resolution: 16,
};

const audioDevice = new WebAudioOutputDevice();

const toTabxSongMeta = (meta: SongMeta, fallback: TabxSong['meta']): TabxSong['meta'] => ({
  ...fallback,
  ...meta,
  tuning: meta.tuning.length === 6 ? (meta.tuning as TabxSong['meta']['tuning']) : fallback.tuning,
});

const App: React.FC = () => {
  const [config, setConfig] = useState<HighwayConfig>(DEFAULT_HIGHWAY_CONFIG);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [songMeta, setSongMeta] = useState<SongMeta>(DEFAULT_META);
  const [importedSong, setImportedSong] = useState<TabxSong | null>(null);

  const { isPlaying, playheadRef, togglePlay, reset, resetToken } = usePlayback();
  const [notes, setNotes] = useState<NoteEvent[]>(() => generateDemoSong());

  useNoteScheduler({ notes, isPlaying, playheadRef, outputDevice: audioDevice, resetToken });

  const handleImport = (song: TabxSong, converted: ConvertedSong) => {
    setSongMeta({
      title: song.meta.title,
      artist: song.meta.artist,
      bpm: song.meta.bpm,
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
        onTogglePlay={togglePlay}
        onReset={reset}
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
