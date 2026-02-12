import React, { useMemo, useState } from 'react';
import { parseTabx, parseTabx2Ascii } from '../import/tabx/parseTabx';
import { tabxSongToEvents } from '../import/tabx/convertTabx';
import { ParseDiagnostic, ParseError, TabxSong } from '../import/tabx/types';

interface ImportTabxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (song: TabxSong, notes: ReturnType<typeof tabxSongToEvents>) => void;
}

const DEFAULT_TEXT = `TABX 2

meta:
  title: Example
  bpm: 120
  time: 4/4
  tuning: E2 A2 D3 G3 B3 E4
  capo: 0

tab: Intro
e|-----0------|-----0------|
B|-----1------|-----1------|
G|-----0------|-----0------|
D|-----2------|-----2------|
A|-----3------|-----3------|
E|------------|------------|

rhythm:
  resolution: 16
  bars: [16, 16]
`;

const ImportTabxModal: React.FC<ImportTabxModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [warnings, setWarnings] = useState<ParseDiagnostic[]>([]);
  const [preview, setPreview] = useState<{ title?: string; bpm: number; sections: number; bars: number; notes: number }>();
  const [parsedSong, setParsedSong] = useState<TabxSong>();

  const errorText = useMemo(() => errors.slice(0, 10), [errors]);
  const warningText = useMemo(() => warnings.slice(0, 10), [warnings]);

  if (!isOpen) return null;

  const parse = () => {
    const isV2 = text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() === 'TABX 2';
    const result = isV2 ? parseTabx2Ascii(text) : { ...parseTabx(text), diagnostics: [] };
    setErrors(result.errors);
    setWarnings((result.diagnostics ?? []).filter((d) => d.severity === 'warning'));

    if (result.song) {
      const converted = tabxSongToEvents(result.song);
      setParsedSong(result.song);
      setPreview({
        title: result.song.meta.title,
        bpm: result.song.meta.bpm,
        sections: result.song.sections.length,
        bars: converted.totalBars,
        notes: converted.totalNotes,
      });
    } else {
      setParsedSong(undefined);
      setPreview(undefined);
    }
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const next = await file.text();
    setText(next);
  };

  const confirmImport = () => {
    if (!parsedSong) return;
    onImport(parsedSong, tabxSongToEvents(parsedSong));
    onClose();
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-gray-900 border border-white/10 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Import TABX</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">Close</button>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <input type="file" accept=".txt,.tab,.tabx" onChange={onPickFile} className="mb-2 block w-full text-sm" />
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-72 bg-black/40 border border-white/20 rounded p-2 font-mono text-xs" />
            <div className="mt-2 flex gap-2">
              <button onClick={parse} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">Parse</button>
              <button onClick={confirmImport} disabled={!parsedSong} className="px-3 py-2 rounded bg-green-600 disabled:bg-gray-700">Load Song</button>
            </div>
          </div>
          <div className="w-80 bg-black/30 border border-white/10 rounded p-3 text-sm">
            <h4 className="font-semibold mb-2">Parse result</h4>
            {preview && (
              <ul className="mb-3 space-y-1 text-gray-200">
                <li>Title: {preview.title ?? '(untitled)'}</li>
                <li>BPM: {preview.bpm}</li>
                <li>Sections: {preview.sections}</li>
                <li>Total bars: {preview.bars}</li>
                <li>Total notes: {preview.notes}</li>
              </ul>
            )}
            {warningText.length > 0 && (
              <ul className="space-y-2 max-h-28 overflow-auto text-xs text-yellow-300 mb-3">
                {warningText.map((warn, idx) => (
                  <li key={`${warn.line}-${idx}`}>
                    L{warn.line}:C{warn.column} {warn.message}
                  </li>
                ))}
              </ul>
            )}
            {errorText.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-auto text-xs text-red-300">
                {errorText.map((err, idx) => (
                  <li key={`${err.line}-${idx}`}>
                    L{err.line}:C{err.column} {err.message}
                    <div className="text-red-200/70">{err.contextLine}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-green-300 text-xs">No parse errors.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportTabxModal;
