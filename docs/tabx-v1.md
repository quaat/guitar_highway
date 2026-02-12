# TABX v1 (strict ASCII guitar tab import)

TABX is a strict, parser-friendly guitar tab format for this app.

## File layout
1. First non-empty line: `TABX 1`.
2. Optional `meta:` block with **exactly two-space** indented `key: value` lines.
3. One or more `section: <name>` blocks.
4. Each section contains bar markers (`|1|`, `|2|`, ...) and each bar has **exactly six** string rows in this order:
   - `e|`, `B|`, `G|`, `D|`, `A|`, `E|`

## Grid rules
- `-` = empty cell.
- `0..9` = single-digit fret.
- Multi-digit frets must be bracketed and two-digit, e.g. `[10]`, `[12]`, `[24]`.
- Grid resolves to `resolution` columns (v1 enforces `16`).

## Supported metadata keys
- `title`, `artist`
- `bpm` (integer > 0)
- `time` (`num/den`)
- `tuning` (6 pitch names, low->high, e.g. `E2 A2 D3 G3 B3 E4`)
- `capo` (integer >= 0)
- `resolution` (must be `16` in v1)

## Timing map
For bar `b` and column `c`:

`timeSec = sectionStart + (b-1)*barDuration + c*(barDuration/resolution)`

where:
- `beatDuration = 60 / bpm`
- `barDuration = beatDuration * timeSig.num * (4 / timeSig.den)`

## String index convention in parser
`TabxNoteCell.stringIndex` uses **high-to-low order**:
- `0 = high e`, `5 = low E`
