import {
  ParseDiagnostic,
  ParseError,
  PitchName,
  TabxBar,
  TabxMeta,
  TabxNoteCell,
  TabxSection,
  TabxSong,
  TabxTechnique,
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
const STRING_ALIAS_MAP: Record<string, string> = {
  e: 'e',
  B: 'B',
  b: 'B',
  H: 'B',
  h: 'B',
  G: 'G',
  g: 'G',
  D: 'D',
  d: 'D',
  A: 'A',
  a: 'A',
  E: 'E',
};
const EXPECTED_STRING_ORDER = ['e', 'B', 'G', 'D', 'A', 'E'];
const TECHNIQUE_TOKENS = ['PM', 'TP', 'tr', 'h', 'p', 't', 'b', 'r', 's', 'S', '/', '\\', '~', '=', '*', 'M', 'x'];

const stripInlineComment = (line: string): string => {
  const idx = line.indexOf('#');
  return idx >= 0 ? line.slice(0, idx).trimEnd() : line;
};

const isEmptyOrComment = (line: string): boolean => stripInlineComment(line).trim().length === 0;
const isKeywordLine = (line: string): boolean => /^\s*[A-Za-z][\w-]*:\s*/.test(line);

const parseMetaBlock = (lines: string[], startAt: number, diagnostics: ParseDiagnostic[]): { meta: TabxMeta; i: number } => {
  const meta: TabxMeta = { ...DEFAULT_META };
  let i = startAt;

  if (stripInlineComment(lines[i] ?? '').trim() !== 'meta:') {
    return { meta, i };
  }
  i += 1;

  const addError = (line: number, column: number, message: string) => {
    diagnostics.push({ severity: 'error', message, line, column, contextLine: lines[line - 1] ?? '' });
  };

  while (i < lines.length) {
    const raw = stripInlineComment(lines[i]);
    if (raw.trim().length === 0) {
      i += 1;
      continue;
    }
    if (!raw.startsWith('  ')) {
      break;
    }

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
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        addError(i + 1, colonIdx + 4, `${key} must be an integer.`);
      } else {
        (meta as any)[key] = parsed;
      }
    } else if (key === 'time') {
      const m = value.match(/^(\d+)\/(\d+)$/);
      if (!m) {
        addError(i + 1, colonIdx + 4, 'time must be in "num/den" format, e.g. 4/4.');
      } else {
        meta.timeSig = { num: Number(m[1]), den: Number(m[2]) };
      }
    } else if (key === 'tuning') {
      const pitches = value.split(/\s+/).filter(Boolean) as PitchName[];
      if (pitches.length !== 6) {
        addError(i + 1, colonIdx + 4, 'tuning must contain exactly 6 pitches (low-to-high).');
      } else {
        meta.tuning = pitches;
      }
    }

    i += 1;
  }

  return { meta, i };
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
    if (ch === '|') {
      bar += 1;
      cursor = 0;
      idx += 1;
      continue;
    }
    if (ch === '-' || ch === ' ') {
      cursor += 1;
      idx += 1;
      continue;
    }

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
        const muted: TabxNoteCell & { bar: number } = {
          stringIndex,
          col: cursor,
          fret: 0,
          techniques: [{ symbol: 'x', text: 'muted' }],
          bar,
        };
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
    if (connector && cur.bar === next.bar) {
      connector.connectsToCol = next.col;
    }
  }

  return notes;
};

const assignSlots = (
  events: TabxNoteCell[],
  resolution: number,
): TabxNoteCell[] => {
  const uniqueCols = Array.from(new Set(events.map((e) => e.col))).sort((a, b) => a - b);
  const colToSlot = new Map<number, number>();
  if (uniqueCols.length === 0) return events;

  uniqueCols.forEach((col, idx) => {
    const slot = uniqueCols.length === 1 ? 0 : Math.round((idx / (uniqueCols.length - 1)) * Math.max(0, resolution - 1));
    colToSlot.set(col, slot);
  });

  return events.map((event) => ({ ...event, slot: colToSlot.get(event.col) ?? 0 }));
};

const parseTempoAt = (value: string): { bar: number; slot: number } | undefined => {
  const match = value.match(/^\{\s*bar:\s*(-?\d+)\s*,\s*slot:\s*(-?\d+)\s*\}$/);
  if (!match) return undefined;
  return { bar: Number(match[1]), slot: Number(match[2]) };
};

export const parseTabx2Ascii = (text: string): { song?: TabxSong; diagnostics: ParseDiagnostic[]; errors: ParseError[] } => {
  const lines = text.split(/\r?\n/);
  const diagnostics: ParseDiagnostic[] = [];
  const addError = (line: number, column: number, message: string) => {
    diagnostics.push({ severity: 'error', message, line, column, contextLine: lines[line - 1] ?? '' });
  };
  const addWarning = (line: number, column: number, message: string) => {
    diagnostics.push({ severity: 'warning', message, line, column, contextLine: lines[line - 1] ?? '' });
  };

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
        if (i < lines.length && isKeywordLine(stripInlineComment(lines[i]).trim())) {
          break;
        }
        continue;
      }
      if (isKeywordLine(trimmed)) break;
      const match = row.match(/^\s*([A-Za-z])\|(.*)$/);
      if (!match) {
        i += 1;
        continue;
      }
      const normalized = normalizeStringLabel(match[1]);
      if (!normalized) {
        addWarning(i + 1, 1, `Ignoring unsupported string label "${match[1]}".`);
        i += 1;
        continue;
      }
      const previous = stringLines.get(normalized) ?? "";
      stringLines.set(normalized, `${previous}${match[2]}`);
      i += 1;
    }

    if (EXPECTED_STRING_ORDER.some((label) => !stringLines.has(label))) {
      addError(sourceStartLine + 1, 1, 'Tab block must include all six string lines: e B G D A E.');
      continue;
    }

    const perStringNotes = EXPECTED_STRING_ORDER.map((label, stringIndex) => tokenizeStringContent(stringLines.get(label) ?? '', stringIndex));
    const barCount = Math.max(
      1,
      ...perStringNotes.map((rows) => (rows.length ? Math.max(...rows.map((n) => n.bar + 1)) : 1)),
    );

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
        if (!trimmed) {
          i += 1;
          continue;
        }
        if (/^\s*(tab:|meta:|rhythm:|tempo:)/.test(trimmed) && !trimmed.startsWith('bars:')) break;
        const resolutionMatch = row.match(/^\s*resolution:\s*(\d+)\s*$/);
        if (resolutionMatch) {
          rhythmResolution = Number(resolutionMatch[1]);
          i += 1;
          continue;
        }
        const barNumberItem = row.match(/^\s*-\s*(\d+)\s*$/);
        if (barNumberItem) {
          rhythmBars.push(Number(barNumberItem[1]));
          i += 1;
          continue;
        }
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
      const events = perStringNotes
        .flatMap((rows) => rows.filter((n) => n.bar === barIndex).map(({ bar: _bar, ...event }) => event));

      const resolutionForBar = rhythmBars?.[barIndex] ?? rhythmResolution ?? meta.resolution;
      const eventsWithSlots = assignSlots(events, resolutionForBar);
      bars.push({
        index: barIndex + 1,
        events: eventsWithSlots,
        rhythmResolution: resolutionForBar,
      });
    }

    if (!rhythmBars && !rhythmResolution) {
      addWarning(sourceStartLine + 1, 1, `Section "${name}" has no rhythm block. Timing is approximated from note-column groups and can sound uneven; add an explicit rhythm: block for deterministic eighth/16th-note timing.`);
    }

    let tempoEvents: TabxTempoEvent[] | undefined;
    while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
    if (i < lines.length && stripInlineComment(lines[i]).trim() === 'tempo:') {
      i += 1;
      tempoEvents = [];
      type PendingTempo = {
        at?: { bar: number; slot: number };
        bpm?: number;
        line: number;
        column: number;
      };
      let pending: PendingTempo | undefined;

      const finalizePending = () => {
        if (!pending) return;
        if (!pending.at) {
          addError(pending.line, pending.column, 'Tempo event has malformed or missing "at". Expected: at: { bar: <int>, slot: <int> }.');
          pending = undefined;
          return;
        }
        if (pending.at.bar < 0 || pending.at.slot < 0) {
          addError(pending.line, pending.column, 'Tempo event "at" must use non-negative bar/slot values.');
          pending = undefined;
          return;
        }
        if (pending.at.bar >= bars.length) {
          addError(pending.line, pending.column, `Tempo event bar index ${pending.at.bar} is out of range for section "${name}" (${bars.length} bars).`);
          pending = undefined;
          return;
        }
        const barResolution = Math.max(1, bars[pending.at.bar].rhythmResolution ?? meta.resolution);
        if (pending.at.slot >= barResolution) {
          addError(
            pending.line,
            pending.column,
            `Tempo event slot ${pending.at.slot} is out of range for bar ${pending.at.bar} (resolution ${barResolution}).`,
          );
          pending = undefined;
          return;
        }
        if (pending.bpm === undefined || pending.bpm <= 0) {
          addError(pending.line, pending.column, 'Tempo event bpm must be a number greater than 0.');
          pending = undefined;
          return;
        }
        tempoEvents!.push({ at: pending.at, bpm: pending.bpm });
        pending = undefined;
      };

      while (i < lines.length) {
        const row = stripInlineComment(lines[i]);
        const trimmed = row.trim();
        if (!trimmed) {
          i += 1;
          continue;
        }
        if (/^\s*(tab:|meta:|rhythm:|tempo:)/.test(trimmed)) break;

        const itemMatch = row.match(/^\s*-\s*(.*)$/);
        if (itemMatch) {
          finalizePending();
          pending = { line: i + 1, column: 1 };
          const inline = itemMatch[1].trim();
          if (inline.startsWith('at:')) {
            pending.at = parseTempoAt(inline.slice(3).trim());
          } else if (inline.startsWith('bpm:')) {
            pending.bpm = Number(inline.slice(4).trim());
          }
          i += 1;
          continue;
        }

        const atMatch = row.match(/^\s*at:\s*(.+)$/);
        if (atMatch && pending) {
          pending.at = parseTempoAt(atMatch[1].trim());
          i += 1;
          continue;
        }

        const bpmMatch = row.match(/^\s*bpm:\s*(.+)$/);
        if (bpmMatch && pending) {
          pending.bpm = Number(bpmMatch[1].trim());
          i += 1;
          continue;
        }

        i += 1;
      }

      finalizePending();
      if (!tempoEvents.length) tempoEvents = undefined;
    }

    sections.push({ name, bars, tempoEvents });
  }

  if (!sections.length) {
    addError(i + 1, 1, 'At least one tab block is required.');
  }

  const errors = diagnostics.filter((d) => d.severity === 'error').map((d) => ({
    message: d.message,
    line: d.line,
    column: d.column,
    contextLine: d.contextLine,
  }));

  if (errors.length) {
    return { diagnostics, errors };
  }

  return { song: { meta, sections }, diagnostics, errors: [] };
};

export const parseTabx = (text: string): { song?: TabxSong; errors: ParseError[] } => {
  const lines = text.split(/\r?\n/);
  const first = lines.find((line) => stripInlineComment(line).trim().length > 0);
  if (stripInlineComment(first ?? '').trim() === TABX_V2) {
    const parsed = parseTabx2Ascii(text);
    return { song: parsed.song, errors: parsed.errors };
  }

  // Legacy TABX 1 fallback: a strict subset with one section/bar marker style.
  const converted = text.replace(TABX_V1, TABX_V2).replace(/section:/g, 'tab:').replace(/^\|\d+\|$/gm, '');
  const parsed = parseTabx2Ascii(converted);
  return { song: parsed.song, errors: parsed.errors };
};
