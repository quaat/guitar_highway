import React, { useState, useMemo } from 'react';
import Scene from './render/Scene';
import ControlPanel from './ui/ControlPanel';
import { usePlayback } from './state/usePlayback';
import { DEFAULT_HIGHWAY_CONFIG } from './constants';
import { generateDemoSong } from './domain/generator';
import { HighwayConfig } from './types';

const App: React.FC = () => {
  // Config State
  const [config, setConfig] = useState<HighwayConfig>(DEFAULT_HIGHWAY_CONFIG);

  // Playback State (Custom Hook)
  const { isPlaying, playheadRef, togglePlay, reset } = usePlayback();

  // Load Song Data
  // In a real app, this would be `useEffect` fetching data.
  const notes = useMemo(() => generateDemoSong(), []);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene 
          notes={notes} 
          playheadRef={playheadRef} 
          config={config} 
        />
      </div>

      {/* UI Overlay Layer */}
      <ControlPanel
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onReset={reset}
        config={config}
        onConfigChange={setConfig}
        playheadTime={0} // We don't stream time to UI to save renders
      />

    </div>
  );
};

export default App;
