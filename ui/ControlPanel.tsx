import React, { useState } from 'react';
import { Camera, Copy, Download, Eye, FastForward, Guitar, Pause, Play, RotateCcw, Save, Settings, Sparkles, Trash2 } from 'lucide-react';
import { CameraConfig, CameraSnapshot, HighwayConfig, SongMeta, VisualSettings } from '../types';

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
  visuals: VisualSettings;
  onVisualsChange: (visuals: VisualSettings) => void;
}

const toYamlCameraConfig = (config: CameraConfig, indent = '      '): string => {
  const optionalLines = [
    config.rotationEuler ? `${indent}rotationEuler: [${config.rotationEuler.join(', ')}]` : '',
    config.damping !== undefined ? `${indent}damping: ${config.damping}` : '',
    config.transitionMs !== undefined ? `${indent}transitionMs: ${config.transitionMs}` : '',
  ].filter(Boolean);

  return [
    `${indent}position: [${config.position.join(', ')}]`,
    `${indent}target: [${config.target.join(', ')}]`,
    `${indent}fov: ${config.fov}`,
    `${indent}near: ${config.near}`,
    `${indent}far: ${config.far}`,
    ...optionalLines,
  ].join('\n');
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  }
};

const panelClass = 'bg-slate-950/55 backdrop-blur-xl p-4 rounded-2xl border border-cyan-400/20 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]';

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
  visuals,
  onVisualsChange,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const handleChange = <K extends keyof HighwayConfig>(key: K, value: HighwayConfig[K]) => onConfigChange({ ...config, [key]: value });
  const handleMeta = <K extends keyof SongMeta>(key: K, value: SongMeta[K]) => onSongMetaChange({ ...songMeta, [key]: value });
  const handleVisual = <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) => onVisualsChange({ ...visuals, [key]: value });

  const updateFretRange = (nextMinRaw: number, nextMaxRaw: number) => {
    const nextMin = Math.max(1, Math.min(24, Math.round(nextMinRaw)));
    const nextMax = Math.max(1, Math.min(24, Math.round(nextMaxRaw)));
    onConfigChange({ ...config, minFret: Math.min(nextMin, nextMax), maxFret: Math.max(nextMin, nextMax) });
  };

  const updateCameraField = <K extends keyof CameraConfig>(key: K, value: CameraConfig[K]) => onCameraConfigChange({ ...cameraConfig, [key]: value });

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

  const copySnapshotsBlock = async () => {
    if (!cameraSnapshots.length) {
      setClipboardMessage('No snapshots to copy');
      return;
    }

    const body = cameraSnapshots.map((snapshot) => `    ${snapshot.name}:\n${toYamlCameraConfig(snapshot.config, '      ')}`).join('\n');
    const payload = `camera:\n  snapshots:\n${body}`;
    const ok = await copyToClipboard(payload);
    setClipboardMessage(ok ? 'Copied snapshots YAML' : 'Clipboard unavailable');
  };

  const copySelectedSnapshotRef = async () => {
    const selected = cameraSnapshots[selectedSnapshotIndex];
    if (!selected) {
      setClipboardMessage('Select a snapshot first');
      return;
    }

    const payload = `# cameraSnapshot: ${selected.name}`;
    const ok = await copyToClipboard(payload);
    setClipboardMessage(ok ? `Copied ${selected.name} reference` : 'Clipboard unavailable');
  };

  return (
    <div className="absolute top-4 left-4 z-20 w-[350px] max-h-[92vh] overflow-y-auto pr-1 space-y-3">
      <div className={panelClass}>
        <div className="flex items-center gap-2 text-cyan-200 mb-3 text-sm uppercase tracking-widest"><Sparkles size={14} /> Performance</div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onTogglePlay} className="p-2 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/25 flex items-center justify-center gap-1">{isPlaying ? <Pause size={14} /> : <Play size={14} />}{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={onReset} className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/25 flex items-center justify-center gap-1"><RotateCcw size={14} />Reset</button>
          <button onClick={onOpenImport} className="p-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/35 border border-violet-400/25 flex items-center justify-center gap-1"><Download size={14} />Import</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <input className="bg-slate-900/90 rounded-lg p-2" value={songMeta.title ?? ''} onChange={(e) => handleMeta('title', e.target.value)} placeholder="Title" />
          <input className="bg-slate-900/90 rounded-lg p-2" value={songMeta.artist ?? ''} onChange={(e) => handleMeta('artist', e.target.value)} placeholder="Artist" />
          <input className="bg-slate-900/90 rounded-lg p-2" type="number" value={songMeta.bpm} onChange={(e) => handleMeta('bpm', Number(e.target.value))} placeholder="BPM" />
          <input className="bg-slate-900/90 rounded-lg p-2" type="number" value={songMeta.playbackDelayMs} onChange={(e) => handleMeta('playbackDelayMs', Number(e.target.value))} placeholder="Delay ms" />
        </div>
      </div>

      <div className={panelClass}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-cyan-200 flex items-center gap-2"><Camera size={14} /> Camera</h2>
        <label className="flex items-center gap-2 text-xs mb-2"><input type="checkbox" checked={lockScriptedCamera} onChange={(e) => onLockScriptedCameraChange(e.target.checked)} /> Lock scripted camera</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input className="bg-slate-900/90 rounded-lg p-2" type="number" step="0.1" value={cameraConfig.fov} onChange={(e) => updateCameraField('fov', Number(e.target.value))} placeholder="FOV" />
          <input className="bg-slate-900/90 rounded-lg p-2" type="number" step="0.1" value={cameraConfig.near} onChange={(e) => updateCameraField('near', Number(e.target.value))} placeholder="Near" />
          <input className="bg-slate-900/90 rounded-lg p-2" type="number" step="1" value={cameraConfig.far} onChange={(e) => updateCameraField('far', Number(e.target.value))} placeholder="Far" />
          <input className="bg-slate-900/90 rounded-lg p-2" type="number" min={500} max={2000} step="50" value={cameraConfig.transitionMs ?? 600} onChange={(e) => updateCameraField('transitionMs', Number(e.target.value))} placeholder="Transition ms" />
        </div>



        <div className="mt-3 space-y-2 text-xs">
          <input className="w-full bg-slate-900/90 rounded-lg p-2" value={snapshotName} placeholder="Snapshot name" onChange={(e) => setSnapshotName(e.target.value)} />
          <button onClick={saveSnapshot} className="w-full p-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/45 flex items-center justify-center gap-1"><Save size={12} /> Save Snapshot</button>
          <select className="w-full bg-slate-900/90 rounded-lg p-2" value={selectedSnapshotIndex} onChange={(e) => setSelectedSnapshotIndex(Number(e.target.value))}>
            {cameraSnapshots.map((snapshot, index) => <option key={`${snapshot.name}-${index}`} value={index}>{snapshot.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={applySnapshot} className="p-2 rounded-lg bg-blue-700/50 hover:bg-blue-700/75">Apply Snapshot</button>
            <button onClick={deleteSnapshot} className="p-2 rounded-lg bg-red-700/50 hover:bg-red-700/75 flex items-center justify-center gap-1"><Trash2 size={12} /> Delete</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copySnapshotsBlock} className="p-2 rounded-lg bg-indigo-700/50 hover:bg-indigo-700/75 flex items-center justify-center gap-1"><Copy size={12} /> Copy YAML</button>
            <button onClick={copySelectedSnapshotRef} className="p-2 rounded-lg bg-slate-700/70 hover:bg-slate-600">Copy Ref</button>
          </div>
          {clipboardMessage && <div className="text-[11px] text-emerald-300">{clipboardMessage}</div>}
        </div>
      </div>

      <div className={panelClass}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-cyan-200 flex items-center gap-2"><Settings size={14} /> Settings</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-1"><FastForward size={12} />Speed</span><span className="text-gray-300">{config.speed}</span></div>
            <input type="range" min="5" max="50" step="1" value={config.speed} onChange={(e) => handleChange('speed', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-1"><Guitar size={12} />Neck Width</span><span className="text-gray-300">{config.stringSpacing.toFixed(2)}</span></div>
            <input type="range" min="0.6" max="1.8" step="0.05" value={config.stringSpacing} onChange={(e) => {
              const spacing = Number(e.target.value);
              onConfigChange({ ...config, stringSpacing: spacing, laneHeight: spacing * 6 });
            }} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-1"><Eye size={12} />View Dist</span><span className="text-gray-300">{config.viewDistance}</span></div>
            <input type="range" min="50" max="300" step="10" value={config.viewDistance} onChange={(e) => handleChange('viewDistance', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between"><span>Fret Focus</span><button onClick={() => updateFretRange(1, 24)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Reset 1-24</button></div>
            <div className="grid grid-cols-2 gap-2">
              <input className="bg-slate-900/90 rounded-lg p-2" type="number" min={1} max={24} value={config.minFret ?? 1} onChange={(e) => updateFretRange(Number(e.target.value), config.maxFret ?? 24)} placeholder="Min fret" />
              <input className="bg-slate-900/90 rounded-lg p-2" type="number" min={1} max={24} value={config.maxFret ?? 24} onChange={(e) => updateFretRange(config.minFret ?? 1, Number(e.target.value))} placeholder="Max fret" />
            </div>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-cyan-200 flex items-center gap-2"><Sparkles size={14} /> Visual FX</h2>
        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between">Quality<select value={visuals.visualQuality} onChange={(e) => handleVisual('visualQuality', e.target.value as VisualSettings['visualQuality'])} className="bg-slate-900/90 rounded p-1"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
          {(
            [
              ['enableHighwayEffects', 'Highway effects'],
              ['enableNoteEffects', 'Note glow + hit FX'],
              ['enableParticles', 'Particles'],
              ['enableBackground', 'Animated background'],
              ['enablePostProcessing', 'Post processing'],
              ['enableCameraMotion', 'Cinematic camera'],
              ['enableTempoReactiveLights', 'Tempo reactive lighting'],
            ] as Array<[keyof VisualSettings, string]>
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded bg-slate-900/45 px-2 py-1">
              <span>{label}</span>
              <input type="checkbox" checked={Boolean(visuals[key])} onChange={(e) => handleVisual(key, e.target.checked as VisualSettings[keyof VisualSettings])} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
