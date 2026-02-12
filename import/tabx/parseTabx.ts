import { ParseError, PitchName, TabxBar, TabxMeta, TabxNoteCell, TabxSection, TabxSong } from './types';

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const;
const SUPPORTED_META_KEYS = new Set(['title', 'artist', 'bpm', 'time', 'tuning', 'capo', 'resolution']);

const DEFAULT_META: TabxMeta = {
  bpm: 120,
  timeSig: { num: 4, den: 4 },
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  capo: 0,
  resolution: 16,
};

const stripInlineComment = (line: string): string => {
  const idx = line.indexOf('#');
  return idx >= 0 ? line.slice(0, idx).trimEnd() : line;
};

const isEmptyOrComment = (line: string): boolean => stripInlineComment(line).trim().length === 0;

export const parseTabx = (text: string): { song?: TabxSong; errors: ParseError[] } => {
  const lines = text.split(/\r?\n/);
  const errors: ParseError[] = [];
  let i = 0;

  const addError = (line: number, column: number, message: string) => {
    errors.push({ message, line, column, contextLine: lines[line - 1] ?? '' });
  };

  const skipEmpty = () => {
    while (i < lines.length && isEmptyOrComment(lines[i])) i += 1;
  };

  skipEmpty();
  if (i >= lines.length || stripInlineComment(lines[i]).trim() !== 'TABX 1') {
    addError(i + 1, 1, 'First non-empty line must be exactly "TABX 1".');
    return { errors };
  }
  i += 1;

  const meta: TabxMeta = { ...DEFAULT_META };

  skipEmpty();
  if (i < lines.length && stripInlineComment(lines[i]).trim() === 'meta:') {
    i += 1;
    while (i < lines.length) {
      const raw = lines[i];
      const noComment = stripInlineComment(raw);
      if (noComment.trim().length === 0) {
        i += 1;
        continue;
      }
      if (!noComment.startsWith('  ')) {
        if (/^\s+/.test(noComment)) {
          addError(i + 1, 1, 'Meta fields must be indented with exactly 2 spaces.');
          i += 1;
          continue;
        }
        break;
      }
      if (noComment.startsWith('   ')) {
        addError(i + 1, 1, 'Meta fields must be indented with exactly 2 spaces.');
        i += 1;
        continue;
      }
      const metaLine = noComment.slice(2);
      const colonIdx = metaLine.indexOf(':');
      if (colonIdx <= 0) {
        addError(i + 1, 3, 'Invalid meta line. Expected "key: value".');
        i += 1;
        continue;
      }
      const key = metaLine.slice(0, colonIdx).trim();
      const value = metaLine.slice(colonIdx + 1).trim();
      if (!SUPPORTED_META_KEYS.has(key)) {
        addError(i + 1, 3, `Unsupported meta key "${key}".`);
        i += 1;
        continue;
      }

      if (key === 'title' || key === 'artist') {
        (meta as any)[key] = value;
      } else if (key === 'bpm' || key === 'capo' || key === 'resolution') {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
          addError(i + 1, colonIdx + 4, `${key} must be an integer.`);
        } else if (key === 'bpm' && parsed <= 0) {
          addError(i + 1, colonIdx + 4, 'bpm must be > 0.');
        } else if (key === 'capo' && parsed < 0) {
          addError(i + 1, colonIdx + 4, 'capo must be >= 0.');
        } else if (key === 'resolution' && parsed !== 16) {
          addError(i + 1, colonIdx + 4, 'Only resolution 16 is supported in TABX v1.');
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
  }

  const sections: TabxSection[] = [];
  while (i < lines.length) {
    skipEmpty();
    if (i >= lines.length) break;

    const sectionLine = stripInlineComment(lines[i]).trim();
    if (!sectionLine.startsWith('section:')) {
      addError(i + 1, 1, 'Expected "section: <name>".');
      i += 1;
      continue;
    }
    const name = sectionLine.slice('section:'.length).trim();
    if (!name) {
      addError(i + 1, 1, 'Section name is required.');
      i += 1;
      continue;
    }
    i += 1;

    const bars: TabxBar[] = [];
    let expectedBar = 1;

    while (i < lines.length) {
      skipEmpty();
      if (i >= lines.length) break;
      const maybeNextSection = stripInlineComment(lines[i]).trim();
      if (maybeNextSection.startsWith('section:')) break;

      const marker = maybeNextSection.match(/^\|(\d+)\|$/);
      if (!marker) {
        addError(i + 1, 1, 'Expected bar marker line "|<barNumber>|".');
        i += 1;
        continue;
      }
      const barIndex = Number(marker[1]);
      if (barIndex !== expectedBar) {
        addError(i + 1, 1, `Bar number ${barIndex} is out of sequence. Expected ${expectedBar}.`);
        expectedBar = barIndex;
      }
      i += 1;

      const stringRows: string[] = [];
      for (let s = 0; s < 6; s += 1) {
        if (i >= lines.length) {
          addError(i, 1, 'Unexpected end of file while reading bar strings.');
          break;
        }
        const row = stripInlineComment(lines[i]);
        const expected = STRING_LABELS[s];
        if (!row.startsWith(`${expected}|`)) {
          addError(i + 1, 1, `Expected string line "${expected}|...".`);
        }
        stringRows.push(row.slice(2));
        i += 1;
      }

      if (stringRows.length !== 6) break;
      const widths = stringRows.map((row) => parseGridRow(row, i - 5, addError));
      const firstWidth = widths[0].cols;
      if (widths.some((w) => w.cols !== firstWidth)) {
        addError(i, 1, 'All six string rows in a bar must have the same number of columns.');
      }
      if (firstWidth !== meta.resolution) {
        addError(i, 1, `Bar grid must resolve to exactly ${meta.resolution} columns.`);
      }

      const events: TabxNoteCell[] = [];
      widths.forEach((rowResult, stringIndex) => {
        rowResult.notes.forEach((note) => {
          events.push({ stringIndex, col: note.col, fret: note.fret });
        });
      });

      bars.push({ index: barIndex, events });
      expectedBar = barIndex + 1;
    }

    sections.push({ name, bars });
  }

  if (sections.length === 0) {
    addError(i + 1, 1, 'At least one section is required.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    song: {
      meta,
      sections,
    },
    errors,
  };
};

const parseGridRow = (
  row: string,
  lineNumber: number,
  addError: (line: number, column: number, message: string) => void,
): { cols: number; notes: Array<{ col: number; fret: number }> } => {
  const notes: Array<{ col: number; fret: number }> = [];
  let col = 0;

  for (let idx = 0; idx < row.length; ) {
    const ch = row[idx];
    if (ch === '-') {
      col += 1;
      idx += 1;
      continue;
    }

    if (ch === '|') {
      idx += 1;
      continue;
    }

    if (/\d/.test(ch)) {
      notes.push({ col, fret: Number(ch) });
      col += 1;
      idx += 1;
      continue;
    }

    if (ch === '[') {
      const close = row.indexOf(']', idx + 1);
      if (close === -1) {
        addError(lineNumber, idx + 3, 'Unclosed bracketed fret value.');
        idx += 1;
        continue;
      }
      const fretText = row.slice(idx + 1, close);
      if (!/^\d{2}$/.test(fretText)) {
        addError(lineNumber, idx + 3, 'Bracketed fret must have exactly 2 digits, e.g. [10].');
      } else {
        const fret = Number(fretText);
        if (fret < 10 || fret > 24) {
          addError(lineNumber, idx + 3, 'Bracketed fret must be between 10 and 24.');
        } else {
          notes.push({ col, fret });
        }
      }
      col += 1;
      idx = close + 1;
      continue;
    }

    addError(lineNumber, idx + 3, `Invalid grid character "${ch}".`);
    idx += 1;
  }

  return { cols: col, notes };
};
