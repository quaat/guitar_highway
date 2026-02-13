import {
  CameraConfig,
  ParseDiagnostic,
  ParseError,
  PitchName,
  TabxBar,
  TabxCameraEvent,
  TabxCameraPartialConfig,
  TabxCameraTimeline,
  TabxMeta,
  TabxNoteCell,
  TabxSection,
  TabxSong,
  TabxTempoEvent,
} from './types';

const DEFAULT_META: TabxMeta = {
  bpm: 120,
  playbackDelayMs: 0,
  timeSig: { num: 4, den: 4 },
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  capo: 0,
  resolution: 16,
};

const TABX_V1 = 'TABX 1';
const TABX_V2 = 'TABX 2';
const STRING_ALIAS_MAP: Record<string, string> = { e: 'e', B: 'B', b: 'B', H: 'B', h: 'B', G: 'G', g: 'G', D: 'D', d: 'D', A: 'A', a: 'A', E: 'E' };
const EXPECTED_STRING_ORDER = ['e', 'B', 'G', 'D', 'A', 'E'];
const TECHNIQUE_TOKENS = ['PM', 'TP', 'tr', 'h', 'p', 't', 'b', 'r', 's', 'S', '/', '\\', '~', '=', '*', 'M', 'x'];
const CAMERA_KEYS = new Set(['position', 'target', 'fov', 'near', 'far', 'rotationEuler', 'damping', 'transitionMs']);

const stripInlineComment = (line: string): string => {
  const idx = line.indexOf('#');
  return idx >= 0 ? line.slice(0, idx).trimEnd() : line;
};

const isEmptyOrComment = (line: string): boolean => stripInlineComment(line).trim().length === 0;
const isKeywordLine = (line: string): boolean => /^\s*[A-Za-z][\w-]*:\s*/.test(line);

const parseNumberTuple = (value: string, expectedLength: number): number[] | undefined => {
  const tupleMatch = value.match(/^\[(.*)\]$/);
  if (!tupleMatch) return undefined;
  const parts = tupleMatch[1].split(',').map((part) => Number(part.trim()));
  if (parts.length !== expectedLength || parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts;
};

const parseAt = (value: string): { bar: number; slot: number } | undefined => {
  const match = value.match(/^\{\s*bar:\s*(-?\d+)\s*,\s*slot:\s*(-?\d+)\s*\}$/);
  if (!match) return undefined;
  return { bar: Number(match[1]), slot: Number(match[2]) };
};

const parseCameraValue = (key: string, rawValue: string): number | [number, number, number] | undefined => {
  if (key === 'position' || key === 'target' || key === 'rotationEuler') {
    const vec = parseNumberTuple(rawValue, 3);
    return vec ? [vec[0], vec[1], vec[2]] : undefined;
  }
  const n = Number(rawValue);
  return Number.isFinite(n) ? n : undefined;
};

const parseMetaBlock = (lines: string[], startAt: number, diagnostics: ParseDiagnostic[]): { meta: TabxMeta; i: number } => {
  const meta: TabxMeta = { ...DEFAULT_META };
  let i = startAt;

  if (stripInlineComment(lines[i] ?? '').trim() !== 'meta:') {
    return { meta, i };
  }
  i += 1;

  const addError = (line: number, column: number, message: string) => diagnostics.push({ severity: 'error', message, line, column, contextLine: lines[line - 1] ?? '' });

  while (i < lines.length) {
    const raw = stripInlineComment(lines[i]);
    if (raw.trim().length === 0) {
      i += 1;
      continue;
    }
    if (!raw.startsWith('  ')) break;

    const content = raw.slice(2);
    const colonIdx = content.indexOf(':');
    if (colonIdx < 1) {
      addError(i + 1, 3, 'Invalid meta line. Expected "key: value".');
      i += 1;
      continue;
    }

    const key = content.slice(0, colonIdx).trim();
    const value = content.slice(colonIdx + 1).trim();
    if (key === 'title' || key === 'artist' || key === 'backingtrack') {
      (meta as any)[key] = value;
    } else if (key === 'bpm' || key === 'capo' || key === 'resolution' || key === 'playbackDelayMs') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) addError(i + 1, colonIdx + 4, `${key} must be an integer.`);
      else (meta as any)[key] = parsed;
    } else if (key === 'time') {
      const m = value.match(/^(\d+)\/(\d+)$/);
      if (!m) addError(i + 1, colonIdx + 4, 'time must be in "num/den" format, e.g. 4/4.');
      else meta.timeSig = { num: Number(m[1]), den: Number(m[2]) };
    } else if (key === 'tuning') {
      const pitches = value.split(/\s+/).filter(Boolean) as PitchName[];
      if (pitches.length !== 6) addError(i + 1, colonIdx + 4, 'tuning must contain exactly 6 pitches (low-to-high).');
      else meta.tuning = pitches;
    }

    i += 1;
  }

  return { meta, i };
};

const parseCameraBlock = (lines: string[], startAt: number, diagnostics: ParseDiagnostic[]): { camera?: TabxCameraTimeline; i: number } => {
  let i = startAt;
  if (stripInlineComment(lines[i] ?? '').trim() !== 'camera:') return { i };
  i += 1;

  const addError = (line: number, column: number, message: string) => diagnostics.push({ severity: 'error', message, line, column, contextLine: lines[line - 1] ?? '' });
  const snapshots: Record<string, CameraConfig> = {};
  let defaults: CameraConfig | undefined;
  let events: TabxCameraEvent[] | undefined;

  const parseSnapshotReference = (rawValue: string): CameraConfig | undefined => {
    const snapshot = snapshots[rawValue];
    return snapshot ? { ...snapshot } : undefined;
  };

  const parseCameraLines = (
    lineMatcher: RegExp,
    base: TabxCameraPartialConfig = {},
  ): { config: TabxCameraPartialConfig; nextIndex: number } => {
    const config: TabxCameraPartialConfig = { ...base };
    let j = i;
    while (j < lines.length) {
      const contentRow = stripInlineComment(lines[j]);
      const contentTrimmed = contentRow.trim();
      if (!contentTrimmed) {
        j += 1;
        continue;
      }
      const fieldMatch = contentRow.match(lineMatcher);
      if (!fieldMatch) break;
      const [, key, rawValue] = fieldMatch;
      if (key === 'snapshot') {
        const referenced = parseSnapshotReference(rawValue.trim());
        if (!referenced) {
          addError(j + 1, 1, `Unknown camera snapshot "${rawValue.trim()}".`);
        } else {
          Object.assign(config, referenced);
        }
        j += 1;
        continue;
      }
      if (!CAMERA_KEYS.has(key)) {
        addError(j + 1, 1, `Unsupported camera key "${key}".`);
        j += 1;
        continue;
      }
      const parsed = parseCameraValue(key, rawValue.trim());
      if (parsed === undefined) addError(j + 1, 1, `Invalid camera value for "${key}".`);
      else (config as any)[key] = parsed;
      j += 1;
    }
    return { config, nextIndex: j };
  };

  const toCameraConfig = (partial: TabxCameraPartialConfig, line: number, sectionLabel: string): CameraConfig | undefined => {
    if (!partial.position || !partial.target || partial.fov === undefined || partial.near === undefined || partial.far === undefined) {
      addError(line, 1, `${sectionLabel} must include position, target, fov, near, and far (directly or via snapshot).`);
      return undefined;
    }
    return partial as CameraConfig;
  };

  while (i < lines.length) {
    const row = stripInlineComment(lines[i]);
    const trimmed = row.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (!row.startsWith('  ')) break;

    if (trimmed === 'snapshots:') {
      i += 1;
      while (i < lines.length) {
        const snapshotRow = stripInlineComment(lines[i]);
        const snapshotTrimmed = snapshotRow.trim();
        if (!snapshotTrimmed) {
          i += 1;
          continue;
        }
        const nameMatch = snapshotRow.match(/^\s{4}([A-Za-z0-9_-]+)\s*:\s*$/);
        if (!nameMatch) break;

        const snapshotName = nameMatch[1];
        i += 1;
        const parsed = parseCameraLines(/^\s{6}([A-Za-z][\w]*)\s*:\s*(.+)$/);
        const snapshotConfig = toCameraConfig(parsed.config, i + 1, `camera.snapshots.${snapshotName}`);
        if (snapshotConfig) snapshots[snapshotName] = snapshotConfig;
        i = parsed.nextIndex;
      }
      continue;
    }

    if (trimmed === 'defaults:') {
      i += 1;
      const parsed = parseCameraLines(/^\s{4}([A-Za-z][\w]*)\s*:\s*(.+)$/);
      defaults = toCameraConfig(parsed.config, i + 1, 'camera.defaults');
      i = parsed.nextIndex;
      continue;
    }

    if (trimmed === 'events:') {
      i += 1;
      events = [];
      type PendingEvent = { line: number; at?: { bar: number; slot: number }; config: TabxCameraPartialConfig };
      let pending: PendingEvent | undefined;

      const finalize = () => {
        if (!pending) return;
        if (!pending.at) {
          addError(pending.line, 1, 'Camera event has malformed or missing "at". Expected: at: { bar: <int>, slot: <int> }.');
        } else if (pending.at.bar < 0 || pending.at.slot < 0) {
          addError(pending.line, 1, 'Camera event "at" must use non-negative bar/slot values.');
        } else if (Object.keys(pending.config).length === 0) {
          addError(pending.line, 1, 'Camera event must include at least one camera field or snapshot.');
        } else {
          events!.push({ at: pending.at, config: pending.config });
        }
        pending = undefined;
      };

      while (i < lines.length) {
        const eventRow = stripInlineComment(lines[i]);
        const eventTrimmed = eventRow.trim();
        if (!eventTrimmed) {
          i += 1;
          continue;
        }
        if (!eventRow.startsWith('    ')) break;

        const itemMatch = eventRow.match(/^\s{4}-\s*(.*)$/);
        if (itemMatch) {
          finalize();
          pending = { line: i + 1, config: {} };
          const inline = itemMatch[1].trim();
          if (inline.startsWith('at:')) pending.at = parseAt(inline.slice(3).trim());
          i += 1;
          continue;
        }

        if (!pending) {
          i += 1;
          continue;
        }

        const fieldMatch = eventRow.match(/^\s{6}([A-Za-z][\w]*)\s*:\s*(.+)$/);
        if (!fieldMatch) {
          i += 1;
          continue;
        }
        const [, key, rawValue] = fieldMatch;
        if (key === 'at') {
          pending.at = parseAt(rawValue.trim());
        } else if (key === 'snapshot') {
          const referenced = parseSnapshotReference(rawValue.trim());
          if (!referenced) addError(i + 1, 1, `Unknown camera snapshot "${rawValue.trim()}".`);
          else Object.assign(pending.config, referenced);
        } else if (CAMERA_KEYS.has(key)) {
          const parsed = parseCameraValue(key, rawValue.trim());
          if (parsed === undefined) addError(i + 1, 1, `Invalid camera event value for "${key}".`);
          else (pending.config as any)[key] = parsed;
        } else {
          addError(i + 1, 1, `Unsupported camera event key "${key}".`);
        }
        i += 1;
      }

      finalize();
      if (!events.length) events = undefined;
      continue;
    }

    addError(i + 1, 1, `Unsupported camera block key "${trimmed}".`);
    i += 1;
  }

  const hasSnapshots = Object.keys(snapshots).length > 0;
  return { camera: defaults || events || hasSnapshots ? { snapshots: hasSnapshots ? snapshots : undefined, defaults, events } : undefined, i };
};

const normalizeStringLabel = (label: string): string | undefined => STRING_ALIAS_MAP[label];

const tokenizeStringContent = (content: string, stringIndex: number): Array<TabxNoteCell & { bar: number }> => {
  const notes: Array<TabxNoteCell & { bar: number }> = [];
  let cursor = 0;
  let bar = 0;
  let idx = 0;
  let previousNote: (TabxNoteCell & { bar: number }) | undefined;

  const attachTechnique = (symbol: string, text?: string) => {
    if (!previousNote) return;
    previousNote.techniques = previousNote.techniques ?? [];
    previousNote.techniques.push({ symbol, text });
  };

  const startsWithTechnique = () => TECHNIQUE_TOKENS.find((token) => content.startsWith(token, idx));

  while (idx < content.length) {
    const ch = content[idx];
    if (ch === '|') { bar += 1; cursor = 0; idx += 1; continue; }
    if (ch === '-' || ch === ' ') { cursor += 1; idx += 1; continue; }

    const fretMatch = content.slice(idx).match(/^(\d{1,2})/);
    if (fretMatch) {
      const fret = Number(fretMatch[1]);
      const note: TabxNoteCell & { bar: number } = { stringIndex, col: cursor, fret, techniques: [], bar };
      notes.push(note);
      previousNote = note;
      cursor += fretMatch[1].length;
      idx += fretMatch[1].length;
      continue;
    }

    const technique = startsWithTechnique();
    if (technique) {
      if (technique === 'x') {
        const muted: TabxNoteCell & { bar: number } = { stringIndex, col: cursor, fret: 0, techniques: [{ symbol: 'x', text: 'muted' }], bar };
        notes.push(muted);
        previousNote = muted;
      } else {
        attachTechnique(technique);
      }
      cursor += technique.length;
      idx += technique.length;
      continue;
    }

    cursor += 1;
    idx += 1;
  }

  for (let j = 0; j < notes.length - 1; j += 1) {
    const cur = notes[j];
    const next = notes[j + 1];
    const connector = cur.techniques?.find((t) => ['h', 'p', 'b', 'r', '/', '\\', 's', 'S', 't'].includes(t.symbol));
    if (connector && cur.bar === next.bar) connector.connectsToCol = next.col;
  }

  return notes;
};

const assignSlots = (events: TabxNoteCell[], resolution: number): TabxNoteCell[] => {
  const uniqueCols = Array.from(new Set(events.map((e) => e.col))).sort((a, b) => a - b);
  const colToSlot = new Map<number, number>();
  if (uniqueCols.length === 0) return events;

  uniqueCols.forEach((col, idx) => {
    const slot = uniqueCols.length === 1 ? 0 : Math.round((idx / (uniqueCols.length - 1)) * Math.max(0, resolution - 1));
    colToSlot.set(col, slot);
  });

  return events.map((event) => ({ ...event, slot: colToSlot.get(event.col) ?? 0 }));
};

export const parseTabx2Ascii = (text: string): { song?: TabxSong; diagnostics: ParseDiagnostic[]; errors: ParseError[] } => {
  const lines = text.split(/\r?\n/);
  const diagnostics: ParseDiagnostic[] = [];
  const addError = (line: number, column: number, message: string) => diagnostics.push({ severity: 'error', message, line, column, contextLine: lines[line - 1] ?? '' });
  const addWarning = (line: number, column: number, message: string) => diagnostics.push({ severity: 'warning', message, line, column, contextLine: lines[line - 1] ?? '' });

  let i = 0;
  while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
  if (stripInlineComment(lines[i] ?? '').trim() !== TABX_V2) {
    addError(i + 1, 1, 'First non-empty line must be exactly "TABX 2".');
    return { diagnostics, errors: diagnostics.filter((d) => d.severity === 'error') };
  }
  i += 1;
  while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;

  const parsedMeta = parseMetaBlock(lines, i, diagnostics);
  const meta = parsedMeta.meta;
  i = parsedMeta.i;

  while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
  const parsedCamera = parseCameraBlock(lines, i, diagnostics);
  const camera = parsedCamera.camera;
  i = parsedCamera.i;

  const sections: TabxSection[] = [];
  while (i < lines.length) {
    while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
    if (i >= lines.length) break;

    const header = stripInlineComment(lines[i]).trim();
    if (!header.startsWith('tab:')) {
      addError(i + 1, 1, 'Expected "tab: <name>" block.');
      i += 1;
      continue;
    }
    const name = header.slice(4).trim() || `Section ${sections.length + 1}`;
    i += 1;

    const stringLines = new Map<string, string>();
    const sourceStartLine = i;
    while (i < lines.length) {
      const row = stripInlineComment(lines[i]);
      const trimmed = row.trim();
      if (!trimmed) {
        i += 1;
        if (i < lines.length && isKeywordLine(stripInlineComment(lines[i]).trim())) break;
        continue;
      }
      if (isKeywordLine(trimmed)) break;
      const match = row.match(/^\s*([A-Za-z])\|(.*)$/);
      if (!match) { i += 1; continue; }
      const normalized = normalizeStringLabel(match[1]);
      if (!normalized) { addWarning(i + 1, 1, `Ignoring unsupported string label "${match[1]}".`); i += 1; continue; }
      const previous = stringLines.get(normalized) ?? '';
      stringLines.set(normalized, `${previous}${match[2]}`);
      i += 1;
    }

    if (EXPECTED_STRING_ORDER.some((label) => !stringLines.has(label))) {
      addError(sourceStartLine + 1, 1, 'Tab block must include all six string lines: e B G D A E.');
      continue;
    }

    const perStringNotes = EXPECTED_STRING_ORDER.map((label, stringIndex) => tokenizeStringContent(stringLines.get(label) ?? '', stringIndex));
    const barCount = Math.max(1, ...perStringNotes.map((rows) => (rows.length ? Math.max(...rows.map((n) => n.bar + 1)) : 1)));

    let rhythmResolution: number | undefined;
    let rhythmBars: number[] | undefined;
    while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
    if (i < lines.length && stripInlineComment(lines[i]).trim() === 'rhythm:') {
      i += 1;
      rhythmResolution = 16;
      rhythmBars = [];
      while (i < lines.length) {
        const row = stripInlineComment(lines[i]);
        const trimmed = row.trim();
        if (!trimmed) { i += 1; continue; }
        if (/^\s*(tab:|meta:|rhythm:|tempo:|camera:)/.test(trimmed) && !trimmed.startsWith('bars:')) break;
        const resolutionMatch = row.match(/^\s*resolution:\s*(\d+)\s*$/);
        if (resolutionMatch) { rhythmResolution = Number(resolutionMatch[1]); i += 1; continue; }
        const barNumberItem = row.match(/^\s*-\s*(\d+)\s*$/);
        if (barNumberItem) { rhythmBars.push(Number(barNumberItem[1])); i += 1; continue; }
        if (/^\s*bars:\s*\[(.*)\]\s*$/.test(row)) {
          const inside = row.replace(/^\s*bars:\s*\[/, '').replace(/\]\s*$/, '');
          rhythmBars = inside.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
          i += 1;
          continue;
        }
        i += 1;
      }
    }

    const bars: TabxBar[] = [];
    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
      const events = perStringNotes.flatMap((rows) => rows.filter((n) => n.bar === barIndex).map(({ bar: _bar, ...event }) => event));
      const resolutionForBar = rhythmBars?.[barIndex] ?? rhythmResolution ?? meta.resolution;
      bars.push({ index: barIndex + 1, events: assignSlots(events, resolutionForBar), rhythmResolution: resolutionForBar });
    }

    if (!rhythmBars && !rhythmResolution) {
      addWarning(sourceStartLine + 1, 1, `Section "${name}" has no rhythm block. Timing is approximated from note-column groups and can sound uneven; add an explicit rhythm: block for deterministic eighth/16th-note timing.`);
    }

    let tempoEvents: TabxTempoEvent[] | undefined;
    while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
    if (i < lines.length && stripInlineComment(lines[i]).trim() === 'tempo:') {
      i += 1;
      tempoEvents = [];
      let pending: { at?: { bar: number; slot: number }; bpm?: number; line: number; column: number } | undefined;

      const finalizePending = () => {
        if (!pending) return;
        if (!pending.at) addError(pending.line, pending.column, 'Tempo event has malformed or missing "at". Expected: at: { bar: <int>, slot: <int> }.');
        else if (pending.at.bar < 0 || pending.at.slot < 0) addError(pending.line, pending.column, 'Tempo event "at" must use non-negative bar/slot values.');
        else if (pending.at.bar >= bars.length) addError(pending.line, pending.column, `Tempo event bar index ${pending.at.bar} is out of range for section "${name}" (${bars.length} bars).`);
        else {
          const barResolution = Math.max(1, bars[pending.at.bar].rhythmResolution ?? meta.resolution);
          if (pending.at.slot >= barResolution) addError(pending.line, pending.column, `Tempo event slot ${pending.at.slot} is out of range for bar ${pending.at.bar} (resolution ${barResolution}).`);
          else if (pending.bpm === undefined || pending.bpm <= 0) addError(pending.line, pending.column, 'Tempo event bpm must be a number greater than 0.');
          else tempoEvents!.push({ at: pending.at, bpm: pending.bpm });
        }
        pending = undefined;
      };

      while (i < lines.length) {
        const row = stripInlineComment(lines[i]);
        const trimmed = row.trim();
        if (!trimmed) { i += 1; continue; }
        if (/^\s*(tab:|meta:|rhythm:|tempo:|camera:)/.test(trimmed)) break;

        const itemMatch = row.match(/^\s*-\s*(.*)$/);
        if (itemMatch) {
          finalizePending();
          pending = { line: i + 1, column: 1 };
          const inline = itemMatch[1].trim();
          if (inline.startsWith('at:')) pending.at = parseAt(inline.slice(3).trim());
          else if (inline.startsWith('bpm:')) pending.bpm = Number(inline.slice(4).trim());
          i += 1;
          continue;
        }

        const atMatch = row.match(/^\s*at:\s*(.+)$/);
        if (atMatch && pending) { pending.at = parseAt(atMatch[1].trim()); i += 1; continue; }

        const bpmMatch = row.match(/^\s*bpm:\s*(.+)$/);
        if (bpmMatch && pending) { pending.bpm = Number(bpmMatch[1].trim()); i += 1; continue; }

        i += 1;
      }

      finalizePending();
      if (!tempoEvents.length) tempoEvents = undefined;
    }

    sections.push({ name, bars, tempoEvents });
  }

  if (!sections.length) addError(i + 1, 1, 'At least one tab block is required.');

  const errors = diagnostics.filter((d) => d.severity === 'error').map((d) => ({ message: d.message, line: d.line, column: d.column, contextLine: d.contextLine }));
  if (errors.length) return { diagnostics, errors };

  return { song: { meta, sections, camera }, diagnostics, errors: [] };
};

export const parseTabx = (text: string): { song?: TabxSong; errors: ParseError[] } => {
  const lines = text.split(/\r?\n/);
  const first = lines.find((line) => stripInlineComment(line).trim().length > 0);
  if (stripInlineComment(first ?? '').trim() === TABX_V2) {
    const parsed = parseTabx2Ascii(text);
    return { song: parsed.song, errors: parsed.errors };
  }

  const converted = text.replace(TABX_V1, TABX_V2).replace(/section:/g, 'tab:').replace(/^\|\d+\|$/gm, '');
  const parsed = parseTabx2Ascii(converted);
  return { song: parsed.song, errors: parsed.errors };
};
