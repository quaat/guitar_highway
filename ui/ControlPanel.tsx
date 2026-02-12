import React from 'react';
import { Play, Pause, RotateCcw, Settings, FastForward, Eye, Download, Guitar } from 'lucide-react';
import { HighwayConfig, SongMeta } from '../types';

interface ControlPanelProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  config: HighwayConfig;
  onConfigChange: (newConfig: HighwayConfig) => void;
  playheadTime: number;
  onOpenImport: () => void;
  songMeta: SongMeta;
  onSongMetaChange: (meta: SongMeta) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  config,
  onConfigChange,
  onOpenImport,
  songMeta,
  onSongMetaChange,
}) => {
  const handleChange = <K extends keyof HighwayConfig>(key: K, value: HighwayConfig[K]) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleMeta = <K extends keyof SongMeta>(key: K, value: SongMeta[K]) => {
    onSongMetaChange({ ...songMeta, [key]: value });
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-80">
      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400">Playback</h2>
        <div className="flex gap-2 mb-2">
          <button onClick={onTogglePlay} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-all ${
            isPlaying ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'
          }`}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={onReset} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all" title="Reset">
            <RotateCcw size={18} />
          </button>
        </div>
        <button onClick={onOpenImport} className="w-full p-2 rounded bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center gap-2">
          <Download size={16} /> Import TABX
        </button>
      </div>

      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400">Song Metadata</h2>
        <div className="space-y-2 text-xs">
          <input className="w-full bg-gray-800 rounded p-2" placeholder="Title" value={songMeta.title ?? ''} onChange={(e) => handleMeta('title', e.target.value)} />
          <input className="w-full bg-gray-800 rounded p-2" placeholder="Artist" value={songMeta.artist ?? ''} onChange={(e) => handleMeta('artist', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-gray-800 rounded p-2" type="number" value={songMeta.bpm} onChange={(e) => handleMeta('bpm', Number(e.target.value))} />
            <input className="bg-gray-800 rounded p-2" type="number" value={songMeta.capo} onChange={(e) => handleMeta('capo', Number(e.target.value))} />
          </div>
          <input className="w-full bg-gray-800 rounded p-2" placeholder="time sig e.g. 4/4" value={`${songMeta.timeSig.num}/${songMeta.timeSig.den}`} onChange={(e) => {
            const m = e.target.value.match(/^(\d+)\/(\d+)$/);
            if (m) handleMeta('timeSig', { num: Number(m[1]), den: Number(m[2]) });
          }} />
          <input className="w-full bg-gray-800 rounded p-2" placeholder="tuning" value={songMeta.tuning.join(' ')} onChange={(e) => handleMeta('tuning', e.target.value.split(/\s+/).filter(Boolean))} />
        </div>
      </div>

      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400 flex items-center gap-2">
          <Settings size={14} /> Settings
        </h2>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1"><FastForward size={12} />Speed</span>
              <span className="text-gray-400">{config.speed}</span>
            </div>
            <input type="range" min="5" max="50" step="1" value={config.speed} onChange={(e) => handleChange('speed', Number(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1"><Guitar size={12} />Neck Width</span>
              <span className="text-gray-400">{config.stringSpacing.toFixed(2)}</span>
            </div>
            <input type="range" min="0.6" max="1.8" step="0.05" value={config.stringSpacing} onChange={(e) => {
              const spacing = Number(e.target.value);
              onConfigChange({ ...config, stringSpacing: spacing, laneHeight: spacing * 6 });
            }} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1"><Eye size={12} />View Dist</span>
              <span className="text-gray-400">{config.viewDistance}</span>
            </div>
            <input type="range" min="50" max="300" step="10" value={config.viewDistance} onChange={(e) => handleChange('viewDistance', Number(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
