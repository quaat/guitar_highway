import React, { useState } from 'react';
import { Camera, Download, Eye, FastForward, Guitar, Pause, Play, RotateCcw, Save, Settings, Trash2 } from 'lucide-react';
import { CameraConfig, CameraSnapshot, HighwayConfig, SongMeta } from '../types';

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
  cameraConfig: CameraConfig;
  onCameraConfigChange: (cameraConfig: CameraConfig) => void;
  cameraSnapshots: CameraSnapshot[];
  onCameraSnapshotsChange: (snapshots: CameraSnapshot[]) => void;
  lockScriptedCamera: boolean;
  onLockScriptedCameraChange: (locked: boolean) => void;
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
  cameraConfig,
  onCameraConfigChange,
  cameraSnapshots,
  onCameraSnapshotsChange,
  lockScriptedCamera,
  onLockScriptedCameraChange,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);

  const handleChange = <K extends keyof HighwayConfig>(key: K, value: HighwayConfig[K]) => onConfigChange({ ...config, [key]: value });
  const handleMeta = <K extends keyof SongMeta>(key: K, value: SongMeta[K]) => onSongMetaChange({ ...songMeta, [key]: value });

  const updateCameraField = <K extends keyof CameraConfig>(key: K, value: CameraConfig[K]) => {
    onCameraConfigChange({ ...cameraConfig, [key]: value });
  };

  const updateVectorField = (key: 'position' | 'target' | 'rotationEuler', idx: number, value: number) => {
    const source = cameraConfig[key] ?? [0, 0, 0];
    const next: [number, number, number] = [...source] as [number, number, number];
    next[idx] = value;
    updateCameraField(key, next as CameraConfig[typeof key]);
  };

  const saveSnapshot = () => {
    const name = snapshotName.trim() || `Snapshot ${cameraSnapshots.length + 1}`;
    onCameraSnapshotsChange([...cameraSnapshots, { name, config: cameraConfig }]);
    setSnapshotName('');
    setSelectedSnapshotIndex(cameraSnapshots.length);
  };

  const applySnapshot = () => {
    const selected = cameraSnapshots[selectedSnapshotIndex];
    if (selected) onCameraConfigChange(selected.config);
  };

  const deleteSnapshot = () => {
    if (!cameraSnapshots[selectedSnapshotIndex]) return;
    const next = cameraSnapshots.filter((_, i) => i !== selectedSnapshotIndex);
    onCameraSnapshotsChange(next);
    setSelectedSnapshotIndex(Math.max(0, selectedSnapshotIndex - 1));
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-80 max-h-[95vh] overflow-y-auto pr-1">
      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400">Playback</h2>
        <div className="flex gap-2 mb-2">
          <button onClick={onTogglePlay} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-all ${isPlaying ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
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
        </div>
      </div>

      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400 flex items-center gap-2">
          <Camera size={14} /> Camera
        </h2>
        <label className="flex items-center gap-2 text-xs mb-2"><input type="checkbox" checked={lockScriptedCamera} onChange={(e) => onLockScriptedCameraChange(e.target.checked)} /> Lock to scripted camera</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input className="bg-gray-800 rounded p-2" type="number" step="0.1" value={cameraConfig.fov} onChange={(e) => updateCameraField('fov', Number(e.target.value))} placeholder="FOV" />
          <input className="bg-gray-800 rounded p-2" type="number" step="0.1" value={cameraConfig.near} onChange={(e) => updateCameraField('near', Number(e.target.value))} placeholder="Near" />
          <input className="bg-gray-800 rounded p-2" type="number" step="1" value={cameraConfig.far} onChange={(e) => updateCameraField('far', Number(e.target.value))} placeholder="Far" />
          <input className="bg-gray-800 rounded p-2" type="number" step="10" value={cameraConfig.transitionMs ?? 600} onChange={(e) => updateCameraField('transitionMs', Number(e.target.value))} placeholder="Transition ms" />
        </div>
        {(['position', 'target', 'rotationEuler'] as const).map((vecKey) => (
          <div key={vecKey} className="mt-2">
            <div className="text-xs text-gray-300 mb-1">{vecKey}</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[0, 1, 2].map((idx) => (
                <input
                  key={`${vecKey}-${idx}`}
                  className="bg-gray-800 rounded p-2"
                  type="number"
                  step="0.1"
                  value={(cameraConfig[vecKey] ?? [0, 0, 0])[idx]}
                  onChange={(e) => updateVectorField(vecKey, idx, Number(e.target.value))}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-3 space-y-2 text-xs">
          <input className="w-full bg-gray-800 rounded p-2" value={snapshotName} placeholder="Snapshot name" onChange={(e) => setSnapshotName(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={saveSnapshot} className="flex-1 p-2 rounded bg-green-700 hover:bg-green-600 flex items-center justify-center gap-1"><Save size={12} /> Save Snapshot</button>
          </div>
          <select className="w-full bg-gray-800 rounded p-2" value={selectedSnapshotIndex} onChange={(e) => setSelectedSnapshotIndex(Number(e.target.value))}>
            {cameraSnapshots.map((snapshot, index) => <option key={`${snapshot.name}-${index}`} value={index}>{snapshot.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={applySnapshot} className="p-2 rounded bg-blue-700 hover:bg-blue-600">Apply Snapshot</button>
            <button onClick={deleteSnapshot} className="p-2 rounded bg-red-700 hover:bg-red-600 flex items-center justify-center gap-1"><Trash2 size={12} /> Delete</button>
          </div>
        </div>
      </div>

      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400 flex items-center gap-2"><Settings size={14} /> Settings</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-1"><FastForward size={12} />Speed</span><span className="text-gray-400">{config.speed}</span></div>
            <input type="range" min="5" max="50" step="1" value={config.speed} onChange={(e) => handleChange('speed', Number(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-1"><Guitar size={12} />Neck Width</span><span className="text-gray-400">{config.stringSpacing.toFixed(2)}</span></div>
            <input type="range" min="0.6" max="1.8" step="0.05" value={config.stringSpacing} onChange={(e) => {
              const spacing = Number(e.target.value);
              onConfigChange({ ...config, stringSpacing: spacing, laneHeight: spacing * 6 });
            }} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-1"><Eye size={12} />View Dist</span><span className="text-gray-400">{config.viewDistance}</span></div>
            <input type="range" min="50" max="300" step="10" value={config.viewDistance} onChange={(e) => handleChange('viewDistance', Number(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
