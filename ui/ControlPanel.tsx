import React from 'react';
import { HighwayConfig } from '../types';
import { Play, Pause, RotateCcw, Settings, Eye, FastForward } from 'lucide-react';

interface ControlPanelProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  config: HighwayConfig;
  onConfigChange: (newConfig: HighwayConfig) => void;
  playheadTime: number; // passed just for display if needed, though high freq update might be laggy
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  config,
  onConfigChange,
}) => {
  const handleChange = (key: keyof HighwayConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-72">
      {/* Playback Controls */}
      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400">Playback</h2>
        <div className="flex gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-all ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Highway Config */}
      <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400 flex items-center gap-2">
          <Settings size={14} /> Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1"><FastForward size={12}/> Speed</span>
              <span className="text-gray-400">{config.speed}</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={config.speed}
              onChange={(e) => handleChange('speed', Number(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1"><Eye size={12}/> View Dist</span>
              <span className="text-gray-400">{config.viewDistance}</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={config.viewDistance}
              onChange={(e) => handleChange('viewDistance', Number(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Fret Spacing</span>
              <span className="text-gray-400">{config.fretSpacing.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={config.fretSpacing}
              onChange={(e) => handleChange('fretSpacing', Number(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          
           <div>
            <div className="flex justify-between text-xs mb-1">
              <span>String Spacing</span>
              <span className="text-gray-400">{config.stringSpacing.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.stringSpacing}
              onChange={(e) => handleChange('stringSpacing', Number(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-black/60 p-3 rounded-lg text-xs text-gray-500">
        <p>Left/Right click to rotate</p>
        <p>Scroll to zoom</p>
        <p>Right-click drag to pan</p>
      </div>
    </div>
  );
};

export default ControlPanel;
