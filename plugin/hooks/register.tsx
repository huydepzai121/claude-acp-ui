import { atom, read, update } from 'claude-code'
import type { BoxProps, ElementConstructor, EngineInterface, Register, RenderElement, TextProps, Timer } from 'claude-code'

import type { AgentRun, AgentStep, Band, Beat, Enhanced, FileChange, Footer, Git, Scene, Stats, Timing, ToolRuns } from '../types'
import type { SceneProps } from './scene'

type TextEl = ElementConstructor<TextProps>
type BoxEl = ElementConstructor<BoxProps>

// ---------------------------------------------------------------------------
// Themes. Every drawing reads the live palette `C` and syntax colors `SYN`;
// switching a theme copies another palette into them and redraws.

type Palette = {
  widget: string; snippet: string; running: string; pill: string; popup: string; track: string; frame: string; prompt: string; redDim: string
  text: string; soft: string; dim: string; faint: string; rule: string
  accent: string; green: string; red: string; blue: string; yellow: string; orange: string; violet: string; cyan: string
  addBg: string; delBg: string; tagBlueBg: string; tagBlueFg: string; tagYellowBg: string; tagYellowFg: string
}
type Syntax = { keyword: string; fn: string; string: string; number: string; comment: string; punct: string }
type Theme = { label: string; c: Palette; syn: Syntax }

const THEMES: Record<string, Theme> = {
  // spec-ade's dark tokens (UI.md), resolved to opaque hex for the terminal.
  'spec-ade': {
    label: 'spec-ade (mặc định, nền tối)',
    c: {
      widget: '#303135', snippet: '#27282B', running: '#1B2A40', pill: '#3A3B3F', popup: '#3A3B3F', track: '#55565A', frame: '#5B6B8C', prompt: '#C77DBA', redDim: '#B8626D',
      text: '#E0E1E4', soft: '#C3C5C9', dim: '#909192', faint: '#696A6B', rule: '#3A3A3A',
      accent: '#4B8DEC', green: '#69B090', red: '#F87C88', blue: '#71A3EF', yellow: '#E5BF8C', orange: '#E09B70', violet: '#AF9CFF', cyan: '#82D2CE',
      addBg: '#2C3B36', delBg: '#493135', tagBlueBg: '#10447F', tagBlueFg: '#D6E3F9', tagYellowBg: '#5C4014', tagYellowFg: '#F5DEC2',
    },
    syn: { keyword: '#AF9CFF', fn: '#87C3FF', string: '#E5BF8C', number: '#82D2CE', comment: '#696A6B', punct: '#9EA3A8' },
  },
  'tokyo-night': {
    label: 'Tokyo Night (nền tối xanh)',
    c: {
      widget: '#292E42', snippet: '#1F2335', running: '#23345C', pill: '#2F3549', popup: '#2F3549', track: '#3B4261', frame: '#4A5578', prompt: '#E0719F', redDim: '#B5586C',
      text: '#C0CAF5', soft: '#A9B1D6', dim: '#8189B0', faint: '#565F89', rule: '#2F3549',
      accent: '#7AA2F7', green: '#9ECE6A', red: '#F7768E', blue: '#7AA2F7', yellow: '#E0AF68', orange: '#FF9E64', violet: '#BB9AF7', cyan: '#7DCFFF',
      addBg: '#243B35', delBg: '#45283A', tagBlueBg: '#2A4B8D', tagBlueFg: '#D5E2FF', tagYellowBg: '#5A4320', tagYellowFg: '#F4DDB8',
    },
    syn: { keyword: '#BB9AF7', fn: '#7AA2F7', string: '#9ECE6A', number: '#FF9E64', comment: '#565F89', punct: '#89DDFF' },
  },
  dracula: {
    label: 'Dracula (nền tối tím)',
    c: {
      widget: '#44475A', snippet: '#343746', running: '#2E3A5C', pill: '#4A4D60', popup: '#4A4D60', track: '#5B5F78', frame: '#6272A4', prompt: '#FFB86C', redDim: '#C25B63',
      text: '#F8F8F2', soft: '#E2E2DC', dim: '#A6ACCD', faint: '#7A80A8', rule: '#44475A',
      accent: '#BD93F9', green: '#50FA7B', red: '#FF5555', blue: '#8BE9FD', yellow: '#F1FA8C', orange: '#FFB86C', violet: '#FF79C6', cyan: '#8BE9FD',
      addBg: '#2F4A3A', delBg: '#5A2E38', tagBlueBg: '#5A4A8A', tagBlueFg: '#F0E8FF', tagYellowBg: '#6A5A2A', tagYellowFg: '#FFF6C8',
    },
    syn: { keyword: '#FF79C6', fn: '#50FA7B', string: '#F1FA8C', number: '#BD93F9', comment: '#7A80A8', punct: '#E2E2DC' },
  },
  catppuccin: {
    label: 'Catppuccin Mocha (nền tối dịu)',
    c: {
      widget: '#313244', snippet: '#26273A', running: '#283457', pill: '#3B3D52', popup: '#3B3D52', track: '#585B70', frame: '#6B7396', prompt: '#F5C2E7', redDim: '#B96C82',
      text: '#CDD6F4', soft: '#BAC2DE', dim: '#9399B2', faint: '#6C7086', rule: '#313244',
      accent: '#89B4FA', green: '#A6E3A1', red: '#F38BA8', blue: '#89B4FA', yellow: '#F9E2AF', orange: '#FAB387', violet: '#CBA6F7', cyan: '#94E2D5',
      addBg: '#2E3F3A', delBg: '#4A2F3D', tagBlueBg: '#34507F', tagBlueFg: '#DCE7FF', tagYellowBg: '#5E5032', tagYellowFg: '#FBEFD2',
    },
    syn: { keyword: '#CBA6F7', fn: '#89B4FA', string: '#A6E3A1', number: '#FAB387', comment: '#6C7086', punct: '#9399B2' },
  },
  'github-light': {
    label: 'GitHub Light (cho terminal nền sáng)',
    c: {
      widget: '#EAEEF2', snippet: '#F3F4F6', running: '#DDF4FF', pill: '#E6EAEF', popup: '#E6EAEF', track: '#C9D1D9', frame: '#6E7B91', prompt: '#BF3989', redDim: '#A5343C',
      text: '#1F2328', soft: '#424A53', dim: '#59636E', faint: '#818B98', rule: '#D0D7DE',
      accent: '#0969DA', green: '#1A7F37', red: '#CF222E', blue: '#0969DA', yellow: '#9A6700', orange: '#BC4C00', violet: '#8250DF', cyan: '#1B7C83',
      addBg: '#DAFBE1', delBg: '#FFEBE9', tagBlueBg: '#DDF4FF', tagBlueFg: '#0550AE', tagYellowBg: '#FFF8C5', tagYellowFg: '#7D4E00',
    },
    syn: { keyword: '#CF222E', fn: '#8250DF', string: '#0A3069', number: '#0550AE', comment: '#6E7781', punct: '#424A53' },
  },
}
const DEFAULT_THEME = 'spec-ade'
const THEME_KEY = 'theme'

const C: Palette = { ...(THEMES[DEFAULT_THEME] as Theme).c }
const SYN: Syntax = { ...(THEMES[DEFAULT_THEME] as Theme).syn }

const applyTheme = (name: string): boolean => {
  const theme = THEMES[name]
  if (!theme) return false
  Object.assign(C, theme.c)
  Object.assign(SYN, theme.syn)
  return true
}

const DASH = 'acp-dash'
const DIFF_LINES = 10
const FOLD_OVER = 4
const FOLD_RUN = 4
const THINK_GAP_MS = 3000
const TEST_COMMAND = /\b(test|vitest|jest|pytest|playwright)\b/
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const RUN_TOOLS = new Set(['Bash', 'PowerShell'])
const DRAWN_TOOLS = new Set([
  'Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit',
  'Bash', 'PowerShell', 'Grep', 'Glob', 'WebFetch', 'WebSearch',
])
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
const LEVELS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

const KIND: Record<string, Beat> = {
  Read: 'read', NotebookRead: 'read', WebFetch: 'read',
  Grep: 'search', Glob: 'search', WebSearch: 'search',
  Edit: 'edit', Write: 'edit', MultiEdit: 'edit', NotebookEdit: 'edit',
  Bash: 'run', PowerShell: 'run',
}
const kindOf = (tool: string): Beat => KIND[tool] ?? 'other'

// Read per drawing, so a theme switch recolors them.
const ICON_GLYPH: Record<Beat, [string, keyof Palette]> = {
  read: ['◇', 'blue'], search: ['⌕', 'yellow'], edit: ['✎', 'orange'], run: ['❯', 'violet'], think: ['·', 'violet'], other: ['•', 'dim'],
}
const iconOf = (beat: Beat): { text: string; color: string } => {
  const [text, key] = ICON_GLYPH[beat]
  return { text, color: C[key] }
}
const BEAT_KEY: Record<Beat, keyof Palette> = {
  think: 'violet', read: 'blue', search: 'yellow', edit: 'orange', run: 'cyan', other: 'dim',
}
const beatColor = (beat: Beat): string => C[BEAT_KEY[beat]]
const BEAT_LABEL: Array<[Beat, string]> = [['think', 'nghĩ'], ['read', 'đọc'], ['search', 'tìm'], ['edit', 'sửa'], ['run', 'chạy']]

const git = atom({ plugin: 'acp-ui', key: 'git' } as const, null)
const band = atom({ plugin: 'acp-ui', key: 'band' } as const, null)
const footer = atom({ plugin: 'acp-ui', key: 'footer' } as const, null)
const stats = atom({ plugin: 'acp-ui', key: 'stats' } as const, { total: 0, tools: {} })
const timings = atom({ plugin: 'acp-ui', key: 'timings' } as const, {})
const expanded = atom({ plugin: 'acp-ui', key: 'expanded' } as const, {})
const toolRuns = atom({ plugin: 'acp-ui', key: 'toolRuns' } as const, { current: '', byId: {}, order: {} })
const beats = atom({ plugin: 'acp-ui', key: 'beats' } as const, [])
const activity = atom({ plugin: 'acp-ui', key: 'activity' } as const, {})
const agents = atom({ plugin: 'acp-ui', key: 'agents' } as const, {})
const agentByToolUse = atom({ plugin: 'acp-ui', key: 'agentByToolUse' } as const, {})
const enhanced = atom({ plugin: 'acp-ui', key: 'enhanced' } as const, { busy: false, text: null } as Enhanced)

const scene = atom({ plugin: 'acp-ui', key: 'scene' } as const, {
  enabled: true, bubble: '', turnTools: 0, playing: false, jumpSeq: 0, score: 0, best: 0,
} as Scene)
const SCENE_KEY = 'scene'
const BEST_KEY = 'nebug-best'
// Rows the scene Client draws: the bubble row plus the pixel grid's text rows
// (scene.tsx PX_ROWS / 2), so the whole cat fits in either mode.
const SCENE_ROWS = { scene: 6, game: 8 } as const

const RUN_KEEP = 200

// Calls whose row an expanded group draws with the result inline: no separate
// result block follows them, so their frame closes in the row itself.
const inlineRows = new Set<string>()

// The next call joins the open run, or starts one named after its own id.
// The oldest runs go once more than RUN_KEEP calls are kept.
function joinRun(runs: ToolRuns, id: string): ToolRuns {
  const current = runs.current !== '' ? runs.current : `run:${id}`
  let order = { ...runs.order, [current]: [...(runs.order[current] ?? []), id] }
  let kept = Object.values(order).reduce((n, ids) => n + ids.length, 0)
  for (const key of Object.keys(order)) {
    if (kept <= RUN_KEEP || key === current) break
    kept -= order[key]?.length ?? 0
    order = Object.fromEntries(Object.entries(order).filter(([k]) => k !== key))
  }
  const byId = Object.fromEntries(Object.entries(order).flatMap(([run, ids]) => ids.map(one => [one, run] as const)))

  return { current, byId, order }
}

const endRun = (runs: ToolRuns): ToolRuns => (runs.current === '' ? runs : { ...runs, current: '' })

const AGENT_TOOLS = new Set(['Agent', 'Task'])
// A tool another plugin or an MCP server provides: its result block closes the
// frame its call opens. The built-in ones this mod does not draw (a todo list,
// a plan) have no result block, so their row closes its own frame.
const isForeign = (tool: string): boolean => tool.startsWith('mcp__')
const isRunning = (run: AgentRun): boolean => run.endedAt === null
const firstLine = (text: string): string => lines(text.trim()).find(l => l.trim() !== '')?.trim() ?? ''

type Fields = Record<string, unknown>

const fields = (value: unknown): Fields =>
  typeof value === 'object' && value !== null ? (value as Fields) : {}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

const num = (value: unknown): number | null => (typeof value === 'number' ? value : null)

const lines = (text: string): string[] => (text === '' ? [] : text.replace(/\r\n/g, '\n').split('\n'))

const fileName = (path: string): string => path.split(/[\\/]/).slice(-3).join('/')

const seconds = (ms: number): string => (ms < 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`)

// The lines that differ once the shared head and tail are stripped.
function changedLines(before: string, after: string): { removed: string[]; added: string[] } {
  const a = lines(before)
  const b = lines(after)
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1

  return { removed: a.slice(head, a.length - tail), added: b.slice(head, b.length - tail) }
}

function editDiff(tool: string, input: Fields): { removed: string[]; added: string[] } {
  if (tool === 'Write') return { removed: [], added: lines(str(input.content)) }
  if (tool === 'MultiEdit' && Array.isArray(input.edits)) {
    return input.edits.map(fields).reduce<{ removed: string[]; added: string[] }>(
      (sum, one) => {
        const diff = changedLines(str(one.old_string), str(one.new_string))
        return { removed: [...sum.removed, ...diff.removed], added: [...sum.added, ...diff.added] }
      },
      { removed: [], added: [] },
    )
  }

  return changedLines(str(input.old_string), str(input.new_string))
}

// ---------------------------------------------------------------------------
// Drawing on a cell grid. A terminal Box paints no background, so every card
// row is one Text whose background runs the full width; the card's top and
// bottom edges are quadrant blocks, giving half a row of padding and corners
// cut by half a cell.

type Seg = { text: string; color?: string; bold?: boolean; bg?: string }

const cells = (text: string): number => [...text].length

const segCells = (segs: Seg[]): number => segs.reduce((n, s) => n + cells(s.text), 0)

const fit = (text: string, max: number): string =>
  cells(text) <= max ? text : `${[...text].slice(0, Math.max(0, max - 1)).join('')}…`

// Cuts a run of segments to `max` cells, ending in an ellipsis.
function fitSegs(segs: Seg[], max: number): Seg[] {
  if (segCells(segs) <= max) return segs
  const out: Seg[] = []
  let room = max - 1
  for (const s of segs) {
    if (room <= 0) break
    const taken = [...s.text].slice(0, room).join('')
    out.push({ ...s, text: taken })
    room -= cells(taken)
  }
  out.push({ text: '…', color: C.dim })

  return out
}

// A tool frame spans the terminal, less a cell each side.
const frameWidth = (columns: number | undefined): number => Math.max(40, (columns ?? 100) - 2)

function hardWrap(text: string, max: number): string[] {
  const chars = [...text]
  if (chars.length <= max) return [text]
  const rows: string[] = []
  for (let i = 0; i < chars.length; i += max) rows.push(chars.slice(i, i + max).join(''))
  return rows
}

// A bar `width` cells long, filled to `ratio` in eighths of a cell.
function smoothBar(ratio: number, width: number): { filled: string; empty: string } {
  const eighths = Math.round(Math.max(0, Math.min(1, ratio)) * width * 8)
  const full = Math.floor(eighths / 8)
  const part = EIGHTHS[eighths % 8] ?? ''
  const filled = '█'.repeat(full) + part

  return { filled, empty: '▁'.repeat(Math.max(0, width - cells(filled))) }
}

// ---------------------------------------------------------------------------
// Syntax highlighting: a small tokenizer good enough for one diff line of the
// common languages; no grammar, no state across lines.

const KEYWORDS = new Set((
  'const let var function return if else for while do switch case break continue new class extends ' +
  'import export from default async await try catch finally throw typeof instanceof in of this super ' +
  'null undefined true false void yield interface type enum implements public private protected static ' +
  'readonly as def elif pass lambda None True False self fn pub mut impl struct use mod match package ' +
  'func go defer chan select where with not and or is'
).split(' '))
const HASH_COMMENTS = /\.(py|sh|bash|zsh|ps1|ya?ml|toml|rb|r|conf|ini|env|dockerfile)$/i

function highlight(code: string, path: string): Seg[] {
  const rules: Array<[RegExp, string | null]> = [
    [HASH_COMMENTS.test(path) ? /#.*/y : /\/\/.*|\/\*.*?(?:\*\/|$)/y, SYN.comment],
    [/"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?/y, SYN.string],
    [/\d[\w.]*/y, SYN.number],
    [/[A-Za-z_$][\w$]*(?=\s*\()/y, SYN.fn],
    [/[A-Za-z_$][\w$]*/y, null],
    [/\s+/y, C.text],
    [/[^\sA-Za-z_$\d"'`#/]+|[#/]/y, SYN.punct],
  ]
  const out: Seg[] = []
  let i = 0
  while (i < code.length) {
    let matched = false
    for (const [re, color] of rules) {
      re.lastIndex = i
      const m = re.exec(code)
      if (m && m[0].length > 0) {
        const text = m[0]
        const c = color ?? (KEYWORDS.has(text) ? SYN.keyword : C.text)
        const last = out.at(-1)
        if (last && last.color === c) last.text += text
        else out.push({ text, color: c })
        i += text.length
        matched = true
        break
      }
    }
    if (!matched) {
      out.push({ text: code.charAt(i), color: C.text })
      i += 1
    }
  }

  return out
}

// ---------------------------------------------------------------------------

function paint(Text: TextEl, bg: string | undefined, width: number, segs: Seg[]): RenderElement {
  const used = 1 + segCells(segs)

  return (
    <Text backgroundColor={bg}>
      {' '}
      {segs.map(s => (
        <Text color={s.color} bold={s.bold} backgroundColor={s.bg ?? bg}>{s.text}</Text>
      ))}
      {' '.repeat(Math.max(0, width - used))}
    </Text>
  )
}

const edgeTop = (Text: TextEl, bg: string, width: number): RenderElement => (
  <Text color={bg}>{`▗${'▄'.repeat(Math.max(0, width - 2))}▖`}</Text>
)

const edgeBottom = (Text: TextEl, bg: string, width: number): RenderElement => (
  <Text color={bg}>{`▝${'▀'.repeat(Math.max(0, width - 2))}▘`}</Text>
)

function card(Box: BoxEl, Text: TextEl, bg: string, width: number, rows: RenderElement[], marginTop = 1): RenderElement {
  return (
    <Box flexDirection="column" marginTop={marginTop}>
      {edgeTop(Text, bg, width)}
      {rows}
      {edgeBottom(Text, bg, width)}
    </Box>
  )
}

function pill(Text: TextEl, bg: string, segs: Seg[]): RenderElement {
  return (
    <Text>
      <Text color={bg}>▐</Text>
      {segs.map(s => (
        <Text backgroundColor={bg} color={s.color} bold={s.bold}>{s.text}</Text>
      ))}
      <Text color={bg}>▌</Text>
    </Text>
  )
}

type Status = { isRunning: boolean; isErrored: boolean; isInterrupted?: boolean }

const statusOf = (s: Status): Seg =>
  s.isInterrupted ? { text: '■', color: C.faint }
  : s.isErrored ? { text: '✗', color: C.red }
  : s.isRunning ? { text: '◌', color: C.accent }
  : { text: '✓', color: C.green }

function target(tool: string, input: Fields): Seg[] {
  if (tool === 'Grep') {
    const where = str(input.path) ? [{ text: ` trong ${fileName(str(input.path))}`, color: C.text }] : []
    return [{ text: `"${str(input.pattern)}"`, color: C.yellow }, ...where]
  }
  if (RUN_TOOLS.has(tool)) return [{ text: str(input.command).split('\n')[0] ?? '', color: C.text }]
  const path = str(input.file_path) || str(input.notebook_path) || str(input.path)
  const text = path ? fileName(path) : str(input.pattern) || str(input.url) || str(input.query)

  return [{ text, color: C.text }]
}

function outputSummary(tool: string, output: unknown): Seg[] {
  const out = fields(output)
  if (tool === 'Read') {
    const count = num(fields(out.file).numLines)
    return count === null ? [] : [{ text: `${count} dòng`, color: C.dim }]
  }
  if (tool === 'Grep' || tool === 'Glob') {
    const count = num(out.numFiles) ?? (Array.isArray(out.filenames) ? out.filenames.length : null)
    return count === null ? [] : [{ text: `${count} file`, color: C.dim }]
  }
  if (RUN_TOOLS.has(tool)) {
    const all = `${str(out.stdout)}\n${str(out.stderr)}`
    const failed = /(\d+) failed/.exec(all)
    if (failed) return [{ text: `${failed[1]} failed`, color: C.red }]
    const passed = /(\d+) passed/.exec(all)
    if (passed) return [{ text: `${passed[1]} passed`, color: C.green }]
    const count = lines(str(out.stdout)).filter(l => l.trim() !== '').length
    return count === 0 ? [] : [{ text: `${count} dòng`, color: C.dim }]
  }

  return []
}

function summaryOf(tool: string, s: Status & { output?: unknown }): Seg[] {
  if (s.isInterrupted) return [{ text: 'Interrupted', color: C.faint }]
  if (s.isRunning) return [{ text: 'đang chạy', color: C.blue }]

  return outputSummary(tool, s.output)
}

// The right side of a row: the summary, then how long the call took.
function rowRight(tool: string, s: Status & { output?: unknown }, ms: number | null): Seg[] {
  const summary = summaryOf(tool, s)
  const took: Seg[] = !s.isRunning && ms !== null ? [{ text: seconds(ms), color: C.faint }] : []

  return summary.length > 0 && took.length > 0 ? [...summary, { text: ' · ', color: C.faint }, ...took] : [...summary, ...took]
}

// The last non-empty line a failed call printed: stderr, else stdout; a
// refusal or error text arrives as a plain string.
function errorLine(output: unknown): string {
  const last = (text: string): string =>
    lines(text).map(l => l.trim()).filter(l => l !== '').at(-1) ?? ''
  if (typeof output === 'string') return last(output)
  const out = fields(output)

  return last(str(out.stderr)) || last(str(out.stdout))
}

// ---------------------------------------------------------------------------
// Tool frames: a rounded border in the colour of the calls' state, no fill. A
// run of calls shares one frame; each row is `│` + content + `│`.

const NAME_COL = 10
// Cells before a row's target: space, status, two gaps, the name column, a gap.
const TARGET_COL = 1 + 1 + 2 + NAME_COL + 2

// One status for several calls: running if any runs, failed if any failed,
// interrupted only when all were.
const mergeStatus = (list: Status[]): Status => ({
  isRunning: list.some(s => s.isRunning),
  isErrored: list.some(s => s.isErrored),
  isInterrupted: list.length > 0 && list.every(s => s.isInterrupted),
})

const frameColor = (s: Status): string =>
  s.isRunning ? C.accent : s.isErrored ? C.red : s.isInterrupted ? C.faint : C.frame

// What the top border says: the state mark and, for several calls, how many;
// then the time the finished ones took. A lone call with no time known has none.
function frameLabel(list: Status[], finished: number[]): Seg[] {
  const mark = statusOf(mergeStatus(list))
  const time: Seg[] = finished.length > 0 ? [{ text: seconds(finished.reduce((a, b) => a + b, 0)), color: C.faint }] : []
  if (list.length > 1) {
    return [mark, { text: ` ${list.length} lệnh`, color: C.soft }, ...(time.length > 0 ? [{ text: ' · ', color: C.faint }, ...time] : [])]
  }

  return time.length > 0 ? [mark, { text: ' ' }, ...time] : []
}

type Tail = { cells: number; node: RenderElement }

function borderTop(Box: BoxEl, Text: TextEl, color: string, width: number, label: Seg[], tail?: Tail): RenderElement {
  if (label.length === 0) return <Text color={color}>{`╭${'─'.repeat(Math.max(0, width - 2))}╮`}</Text>
  const head: Seg[] = [{ text: '╭─ ', color }, ...label, { text: ' ' }]
  const fill = '─'.repeat(Math.max(1, width - segCells(head) - (tail ? tail.cells + 3 : 0) - 1))
  const lead = head.map(s => (
    <Text color={s.color} bold={s.bold}>{s.text}</Text>
  ))
  if (!tail) {
    return (
      <Text>
        {lead}
        <Text color={color}>{`${fill}╮`}</Text>
      </Text>
    )
  }

  return (
    <Box>
      <Text>
        {lead}
        <Text color={color}>{`${fill} `}</Text>
      </Text>
      {tail.node}
      <Text color={color}>{' ─╮'}</Text>
    </Box>
  )
}

const borderBottom = (Text: TextEl, color: string, width: number): RenderElement => (
  <Text color={color}>{`╰${'─'.repeat(Math.max(0, width - 2))}╯`}</Text>
)

// A content row between the side borders; `parts` fill the width inside them.
const framed = (Box: BoxEl, Text: TextEl, color: string, parts: RenderElement[]): RenderElement => (
  <Box>
    <Text color={color}>│</Text>
    {parts}
    <Text color={color}>│</Text>
  </Box>
)

// Side bars of a tall block: a column of `│` drawn absolute, spanning the block
// whatever its height, clipped to it. Taller than any result block there is.
const BAR_ROWS = 400
const BAR_COLUMN = Array.from({ length: BAR_ROWS }, () => '│').join('\n')

// Another plugin's (or the engine's) tree between side bars of unknown height,
// with the top border and the bottom border each drawn or left to the other
// half of the frame: a call's header opens it, its result closes it.
function enclosed(Box: BoxEl, Text: TextEl, color: string, width: number, tree: RenderElement, edges: { top: boolean; bottom: boolean }): RenderElement {
  const bar = (side: 'left' | 'right'): RenderElement => (
    <Box position="absolute" top={0} bottom={0} width={1} overflow="hidden" {...(side === 'left' ? { left: 0 } : { right: 0 })}>
      <Text color={color}>{BAR_COLUMN}</Text>
    </Box>
  )

  return (
    <Box flexDirection="column" marginTop={edges.top ? 1 : 0}>
      {edges.top ? borderTop(Box, Text, color, width, []) : null}
      <Box flexDirection="column" width={width} paddingX={1} overflow="hidden">
        {bar('left')}
        {bar('right')}
        {tree}
      </Box>
      {edges.bottom ? borderBottom(Text, color, width) : null}
    </Box>
  )
}

// One call: status, tool name, target, right-aligned summary. A running call
// stands out by its frame colour and its blue name, never by a fill.
function callRow(Text: TextEl, width: number, status: Status, tool: string, goal: Seg[], right: Seg[]): RenderElement {
  const rightCells = segCells(right)
  const room = width - TARGET_COL - 1
  const shown = fitSegs(goal, Math.max(8, room - (rightCells > 0 ? rightCells + 2 : 0)))
  const gap = Math.max(2, room - segCells(shown) - rightCells)

  const name = fit(tool, NAME_COL)

  return paint(Text, undefined, width, [
    statusOf(status),
    { text: '  ' },
    { text: name, color: status.isRunning ? C.blue : C.dim },
    { text: ' '.repeat(NAME_COL - cells(name) + 2) },
    ...shown,
    ...(rightCells > 0 ? [{ text: ' '.repeat(gap) }, ...right] : []),
  ])
}

const noteRow = (Text: TextEl, width: number, segs: Seg[]): RenderElement =>
  paint(Text, undefined, width, [{ text: ' '.repeat(TARGET_COL - 1) }, ...segs])

function diffRow(Text: TextEl, width: number, mark: '+' | '−', code: string, path: string): RenderElement {
  const lineBg = mark === '+' ? C.addBg : C.delBg
  const codeWidth = width - TARGET_COL - 4
  const segs = fitSegs(highlight(code, path), codeWidth).map(s => ({ ...s, bg: lineBg }))

  return paint(Text, undefined, width, [
    { text: ' '.repeat(TARGET_COL - 1) },
    { text: ` ${mark} `, color: mark === '+' ? C.green : C.red, bg: lineBg },
    ...segs,
    { text: ' '.repeat(Math.max(0, codeWidth - segCells(segs))), bg: lineBg },
  ])
}

function prettyModel(id: string): string {
  const name = id.replace(/^claude-/, '').replace(/\[.*\]$/, '').replace(/-\d{8}$/, '')
  const [family = name, ...version] = name.split('-')

  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${version.join('.')}`.trim()
}

async function refreshGit($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  const run = (argv: string[]) => $.process.run(['git', ...argv], { cwd, timeoutMs: 5000 }).catch(() => null)
  const [branch, head, status, numstat] = await Promise.all([
    run(['rev-parse', '--abbrev-ref', 'HEAD']),
    run(['rev-parse', '--short', 'HEAD']),
    run(['status', '--porcelain']),
    run(['diff', 'HEAD', '--numstat']),
  ])
  if (branch === null || branch.exitCode !== 0) {
    await update($, git, () => null)
    return
  }

  const counts = new Map<string, { added: number; removed: number }>()
  for (const row of lines(numstat?.stdout.trim() ?? '')) {
    const [added = '0', removed = '0', path = ''] = row.split('\t')
    counts.set(path, { added: Number(added) || 0, removed: Number(removed) || 0 })
  }
  const listed = lines(status?.stdout.trimEnd() ?? '').map(row => {
    const code = row.slice(0, 2)
    const path = row.slice(3).split(' -> ').at(-1) ?? ''
    const letter = code === '??' ? 'A' : (code.trim().charAt(0) || 'M')
    return { status: letter, path, isTracked: code !== '??' }
  })
  // The first changed lines of each tracked file, for the pane's hover card.
  const files: FileChange[] = await Promise.all(
    listed.map(async (f, i) => {
      let preview: string[] = []
      if (f.isTracked && i < 8) {
        const diff = await run(['diff', 'HEAD', '--unified=0', '--no-color', '--', f.path])
        preview = lines(diff?.stdout ?? '')
          .filter(l => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'))
          .slice(0, 6)
      }
      return { status: f.status, path: f.path, preview, ...(counts.get(f.path) ?? { added: 0, removed: 0 }) }
    }),
  )

  await update($, git, () => ({ branch: branch.stdout.trim(), head: head?.stdout.trim() ?? '', files }))
}

async function refreshSession($: EngineInterface): Promise<void> {
  const [model, usage, now] = await Promise.all([$.session.model(), $.session.usage(), $.clock.now()])
  const next: Band = { model: prettyModel(model), ctxPercent: usage.context.percent ?? null }
  await update($, band, () => next)
  await update($, footer, previous => ({
    test: previous?.test ?? null,
    minutes: Math.max(0, Math.round((now - usage.startedAt) / 60000)),
    usd: usage.cost?.usd ?? null,
  }))
}

// ---------------------------------------------------------------------------
// /enhance: rewrite a rough prompt into a clear one, using the conversation so
// far, and put it in the prompt box for the person to review before sending.

const enhanceRequest = (draft: string): string =>
  [
    "Rewrite the user's draft prompt below into a clear, specific prompt for the coding agent in this session.",
    'Use the conversation so far to resolve vague references (files, functions, errors, earlier decisions).',
    "Keep the draft's language: if it is Vietnamese, write Vietnamese.",
    'Keep the intent; do not add requirements the user did not ask for or imply.',
    'Shape: one line stating the goal, then the relevant context, then numbered steps or acceptance criteria only when they help.',
    'Output ONLY the rewritten prompt: no preamble, no quotes, no code fences.',
    '',
    'Draft:',
    '<<<',
    draft,
    '>>>',
  ].join('\n')

// The band's ✨ button presses on this engine action's chord, so binding a key
// to it in ~/.claude/keybindings.json (ctrl+shift+l) enhances the prompt box.
// The action itself only acts while the diff panel is open.
const ENHANCE_ACTION = 'app:toggleDiffPreSession'

// Rewrites the draft and puts it in the prompt box; resolves to the rewrite
// when the box could not take it, so a command can show it instead.
async function enhanceIntoPrompt($: EngineInterface, draft: string): Promise<string | null> {
  $.ui.status('✨ đang viết lại câu lệnh…')
  await update($, enhanced, () => ({ busy: true, text: null }))
  try {
    const better = await enhance($, draft)
    if (better === null || better === '') {
      $.ui.toast('Không viết lại được lúc này; câu gốc đã được đặt lại vào ô nhập.')
      await $.prompt.fill({ text: draft, mode: 'replace' })
      return null
    }
    const filled = await $.prompt.fill({ text: better, mode: 'replace' })
    if (!filled.isFilled) {
      await update($, enhanced, en => ({ ...en, text: better }))
      return better
    }
    $.ui.toast('✨ Đã viết lại — xem trong ô nhập, Enter để gửi.')

    return null
  } finally {
    $.ui.status(undefined)
    await update($, enhanced, en => ({ ...en, busy: false }))
  }
}

async function enhancePromptBox($: EngineInterface): Promise<void> {
  const { text } = await $.prompt.read()
  if (text.trim() === '') {
    $.ui.toast('Gõ câu lệnh vào ô nhập trước, hoặc dùng /enhance <câu lệnh>.')
    return
  }
  await enhanceIntoPrompt($, text.trim())
}

// Drops a wrapping code fence or quotes a model may add despite the request.
const unwrap = (text: string): string =>
  text
    .trim()
    .replace(/^```[\w-]*\n([\s\S]*?)\n```$/, '$1')
    .replace(/^"([\s\S]*)"$/, '$1')
    .trim()

async function enhance($: EngineInterface, draft: string): Promise<string | null> {
  const request = enhanceRequest(draft)
  const forked = await $.model.fork({ prompt: request })
  if (forked.isAnswered) return unwrap(forked.text)
  if (forked.reason !== 'nothing-to-fork') return null
  // A new session has nothing to fork: ask the session's model without context.
  const completed = await $.model.complete({ model: await $.session.model(), prompt: request })

  return completed.isAnswered ? unwrap(completed.text) : null
}

// ---------------------------------------------------------------------------
// Vietnamese spinner words. The engine samples one English word per turn; the
// mod maps it through a hash, so a turn keeps one phrase for its whole run.

const WORKING = [
  'Đang pha cà phê', 'Đang gõ phím lạch cạch', 'Đang hỏi Stack Overflow', 'Đang đọc tài liệu',
  'Đang nấu mì tôm', 'Đang lục lọi code', 'Đang xếp hàng mua trà sữa', 'Đang gỡ rối dây điện',
  'Đang soi bug', 'Đang đếm dấu chấm phẩy', 'Đang tra Google', 'Đang rửa bát code',
  'Đang uống trà đá', 'Đang nhắn hỏi đồng nghiệp', 'Đang chạy deadline', 'Đang vẽ sơ đồ',
]
const THINKING = ['Đang suy nghĩ', 'Đang vắt óc', 'Đang ngẫm nghĩ', 'Đang cân não', 'Đang thiền', 'Đang nghĩ kế']
const DONE = [
  'Pha xong cà phê', 'Nấu xong mì', 'Gỡ xong rối', 'Vắt óc xong', 'Uống xong trà đá', 'Soi xong bug',
  'Chạy kịp deadline', 'Xong việc',
]

const hash = (text: string): number => [...text].reduce((h, ch) => (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0, 7)

const pick = (pool: readonly string[], seed: string): string => pool[hash(seed) % pool.length] ?? pool[0] ?? ''

// As the engine writes a turn's length: `3s`, `1m 4s`, `1h 2m`.
function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`

  return `${s}s`
}

function bubbleFor(tool: string, input: Fields, agentType?: string): string {
  const goal = target(tool, input).map(seg => seg.text).join('')
  const what =
    AGENT_TOOLS.has(tool) ? `Đang giao việc cho ${str(input.subagent_type) || 'agent'}`
    : kindOf(tool) === 'read' ? `Đang đọc ${goal}`
    : kindOf(tool) === 'search' ? `Đang tìm ${goal}`
    : kindOf(tool) === 'edit' ? `Đang sửa ${goal}`
    : kindOf(tool) === 'run' ? `Đang chạy ${goal}`
    : `Đang dùng ${tool}`

  return fit(agentType ? `${agentType}: ${what.charAt(0).toLowerCase()}${what.slice(1)}` : what, 60)
}

const statusColor = (letter: string): string =>
  letter === 'A' ? C.green : letter === 'D' ? C.red : letter === 'U' ? C.yellow : C.blue

const section = (Text: TextEl, title: string, width: number, note = ''): RenderElement => (
  <Text color={C.dim}>
    {title} <Text color={C.rule}>{'─'.repeat(Math.max(3, width - cells(title) - cells(note) - 2))}</Text>
    {note === '' ? '' : ` ${note}`}
  </Text>
)

// Redraws once a second while a subagent runs, so its elapsed time moves.
// A reload starts the module over, and a later spawn starts the timer again.
let ticker: Timer | null = null

function startTicker($: EngineInterface): void {
  if (ticker) return
  ticker = $.clock.every(1000, () => {
    void read($, agents).then(all => {
      if (Object.values(all).some(isRunning)) {
        $.ui.invalidate('ui.render')
      } else {
        ticker?.cancel()
        ticker = null
      }
    })
  })
}

export const register: Register = on => {
  let turnStartedAt = 0
  let lastActivityAt = 0

  on('session.start', async ($, e, next) => {
    // The chosen theme is kept across sessions; an unknown one falls back.
    const saved = await $.store.get(THEME_KEY)
    if (typeof saved === 'string' && applyTheme(saved)) $.ui.invalidate('ui.render')
    await $.command.register({
      name: 'acp-theme',
      description: 'Đổi bộ màu của acp-ui; gõ không kèm tên để xem danh sách',
      argumentHint: `<${Object.keys(THEMES).join('|')}>`,
    })
    const [sceneSetting, best] = await Promise.all([$.store.get(SCENE_KEY), $.store.get(BEST_KEY)])
    await update($, scene, sc => ({ ...sc, enabled: sceneSetting !== 'off', best: typeof best === 'number' ? best : sc.best }))
    await $.command.register({ name: 'play', description: 'Bật hoặc tắt trò Né bug trên dải phía trên ô nhập' })
    await $.command.register({ name: 'acp-scene', description: 'Bật hoặc tắt cảnh chú mèo khi Claude đang làm việc' })
    await $.command.register({ name: 'dash', description: 'Mở hoặc đóng pane tổng quan phiên làm việc' })
    await $.command.register({
      name: 'enhance',
      description: 'Viết lại câu lệnh cho rõ ràng theo ngữ cảnh phiên, đặt vào ô nhập để xem trước khi gửi',
      argumentHint: '<câu lệnh>',
    })
    await Promise.all([refreshGit($), refreshSession($)])

    return next(e)
  })

  // /dash toggles the pane: a second run closes it.
  on('command.run', { command: 'dash' }, async $ => {
    if ((await $.ui.panes()).some(pane => pane.id === DASH)) {
      await $.ui.close({ id: DASH })
      return { text: 'Đã đóng pane /dash.' }
    }
    await $.ui.open({ id: DASH, title: 'Phiên làm việc' })

    return { text: 'Đã mở pane /dash. Gõ /dash lần nữa để đóng.' }
  })

  on('command.run', { command: 'play' }, async $ => {
    const now = (await read($, scene)).playing
    await update($, scene, sc => ({ ...sc, playing: !now, enabled: true }))
    return now
      ? { text: 'Đã tắt Né bug.' }
      : { text: 'Bật Né bug! Bấm Ctrl+X rồi Tab để chọn dải phía trên ô nhập, rồi bấm j để nhảy (toàn màn hình: bấm vào cảnh rồi Space). q để thoát.' }
  })

  on('command.run', { command: 'acp-scene' }, async $ => {
    const isOn = !(await read($, scene)).enabled
    await update($, scene, sc => ({ ...sc, enabled: isOn, playing: isOn ? sc.playing : false }))
    await $.store.set(SCENE_KEY, isOn ? 'on' : 'off')
    return { text: isOn ? 'Đã bật cảnh chú mèo.' : 'Đã tắt cảnh chú mèo.' }
  })

  // The scene posts the score as it changes; the best one is kept.
  on('ui.message', async ($, e, next) => {
    const data = fields(e.data)
    const score = num(data.score)
    if (e.module.endsWith('scene.tsx') && score !== null) {
      const best = Math.max(num(data.best) ?? 0, (await read($, scene)).best)
      await update($, scene, sc => ({ ...sc, score, best }))
      if (data.over === true) await $.store.set(BEST_KEY, best)
    }

    return next(e)
  })

  // /acp-theme lists the themes; /acp-theme <name> switches, redraws and saves.
  on('command.run', { command: 'acp-theme' }, async ($, e) => {
    const name = e.args.trim().toLowerCase()
    const current = (await $.store.get(THEME_KEY)) ?? DEFAULT_THEME
    if (name === '') {
      const rows = Object.entries(THEMES).map(([key, t]) => `- \`${key}\`: ${t.label}${key === current ? ' ← đang dùng' : ''}`)
      return { text: ['Bộ màu của acp-ui (gõ `/acp-theme <tên>` để đổi):', ...rows].join('\n') }
    }
    if (!applyTheme(name)) {
      return { text: `Không có bộ màu \`${name}\`. Có: ${Object.keys(THEMES).map(k => `\`${k}\``).join(', ')}.` }
    }
    await $.store.set(THEME_KEY, name)
    $.ui.invalidate('ui.render')

    return { text: `Đã đổi bộ màu sang ${(THEMES[name] as Theme).label}.` }
  })

  // The rewrite lands in the prompt box, not the transcript, so the model reads
  // nothing until the person sends it.
  on('command.run', { command: 'enhance' }, async ($, e) => {
    const draft = e.args.trim()
    if (draft === '') {
      $.ui.toast('Gõ /enhance <câu lệnh> để viết lại câu lệnh đó.')
      return {}
    }
    const unfilled = await enhanceIntoPrompt($, draft)

    return unfilled === null ? {} : { text: unfilled }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, scene, sc => ({ ...sc, bubble: 'Đang đọc yêu cầu…', turnTools: 0 }))
    await update($, toolRuns, endRun)
    turnStartedAt = await $.clock.now()
    lastActivityAt = turnStartedAt

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    const id = e.tool_use_id
    const startedAt = await $.clock.now()
    const minute = String(Math.floor(startedAt / 60000))
    const gap = lastActivityAt > 0 ? startedAt - lastActivityAt : 0

    await update($, stats, s => ({ total: s.total + 1, tools: { ...s.tools, [tool]: (s.tools[tool] ?? 0) + 1 } }))
    await update($, beats, list => [...list, ...(gap > THINK_GAP_MS ? (['think'] as Beat[]) : []), kindOf(tool)].slice(-80))
    await update($, activity, counts => {
      const oldest = Number(minute) - 60
      const kept = Object.fromEntries(Object.entries(counts).filter(([m]) => Number(m) >= oldest))
      return { ...kept, [minute]: (kept[minute] ?? 0) + 1 }
    })
    if (id) {
      await update($, timings, all => {
        const entries = Object.entries({ ...all, [id]: { startedAt, ms: null } as Timing })
        return Object.fromEntries(entries.sort((a, b) => a[1].startedAt - b[1].startedAt).slice(-200))
      })
    }

    // A subagent's call is also a step on its card.
    const agentId = e.agentId
    // Consecutive drawn calls of the main loop share a frame; any other call
    // (an Agent card, another plugin's tool) breaks the run around it.
    const isDrawn = DRAWN_TOOLS.has(tool)
    if (!agentId) {
      if (isDrawn && id) await update($, toolRuns, runs => joinRun(runs, id))
      else if (!isDrawn) await update($, toolRuns, endRun)
    }
    const agentType = agentId ? (await read($, agents))[agentId]?.type : undefined
    await update($, scene, sc => ({
      ...sc,
      bubble: bubbleFor(tool, fields(e), agentType),
      turnTools: agentId ? sc.turnTools : sc.turnTools + 1,
    }))
    const goal = target(tool, fields(e)).map(seg => seg.text).join('')
    if (agentId && id) {
      const step: AgentStep = { id, tool, target: goal, isDone: false, isErrored: false }
      await update($, agents, all => {
        const run = all[agentId]
        return run ? { ...all, [agentId]: { ...run, tools: run.tools + 1, steps: [...run.steps, step].slice(-40) } } : all
      })
    }

    const ran = await next(e)
    const endedAt = await $.clock.now()
    if (!agentId) lastActivityAt = endedAt
    if (!agentId && !isDrawn) await update($, toolRuns, endRun)
    const isErrored = ran.deny !== undefined || ran.isError === true
    if (agentId && id) {
      const path = str(fields(e).file_path) || str(fields(e).notebook_path)
      await update($, agents, all => {
        const run = all[agentId]
        if (!run) return all
        const steps = run.steps.map(st => (st.id === id ? { ...st, isDone: true, isErrored } : st))
        const filesRead = tool === 'Read' && path && !run.filesRead.includes(path) ? [...run.filesRead, path] : run.filesRead
        const filesEdited = EDIT_TOOLS.has(tool) && path && !run.filesEdited.includes(path) ? [...run.filesEdited, path] : run.filesEdited
        return { ...all, [agentId]: { ...run, steps, filesRead, filesEdited } }
      })
    }
    if (id) await update($, timings, all => ({ ...all, [id]: { startedAt, ms: endedAt - startedAt, isErrored } }))

    if (RUN_TOOLS.has(tool)) {
      const command = str(fields(e).command)
      if (TEST_COMMAND.test(command) && ran.deny === undefined) {
        const test: Footer['test'] = ran.isError === true ? 'fail' : 'pass'
        await update($, footer, previous => ({ minutes: 0, usd: null, ...previous, test }))
      }
    }
    if (EDIT_TOOLS.has(tool) || RUN_TOOLS.has(tool)) await refreshGit($)

    return ran
  })

  // Text the model writes between tool calls ends the run before it: the calls
  // after it draw in a new frame. A subagent's steps are not the main loop's.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (!e.agentId && result.answer.trim() !== '') await update($, toolRuns, endRun)

    return result
  })

  // A subagent started by the Agent tool: tracked from spawn to its last turn.
  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const agentId = started.agentId
    if (agentId) {
      const run: AgentRun = {
        agentId,
        toolUseId: e.tool_use_id,
        type: e.subagentType,
        description: e.description,
        startedAt: await $.clock.now(),
        endedAt: null,
        tools: 0,
        steps: [],
        filesRead: [],
        filesEdited: [],
        answer: '',
      }
      await update($, agents, all => {
        const kept = Object.values(all).sort((a, b) => a.startedAt - b.startedAt).slice(-30)
        return { ...Object.fromEntries(kept.map(r => [r.agentId, r])), [agentId]: run }
      })
      await update($, agentByToolUse, all => ({ ...all, [e.tool_use_id]: agentId }))
      startTicker($)
    }

    return started
  })

  on('turn.complete', async ($, e, next) => {
    // A subagent's last turn closes its card; the main turn's work below is not its.
    const agentId = e.agentId
    if (agentId) {
      const endedAt = await $.clock.now()
      const run = (await read($, agents))[agentId]
      if (run) {
        await update($, agents, all => ({ ...all, [agentId]: { ...run, endedAt, answer: e.answer } }))
        const summary = firstLine(e.answer)
        $.ui.toast(`✓ ${run.type} xong (${duration(endedAt - run.startedAt)})${summary ? `: ${fit(summary, 70)}` : ''}`, { timeoutMs: 6000 })
      }
      return next(e)
    }

    await Promise.all([refreshGit($), refreshSession($)])
    const played = await read($, scene)
    await update($, scene, sc => ({ ...sc, bubble: '✓ Xong!', playing: false }))
    if (played.playing) {
      await $.store.set(BEST_KEY, played.best)
      $.ui.toast(`Né bug: ${played.score} điểm (kỷ lục ${played.best})`, { timeoutMs: 6000 })
    }
    const took = Math.round(((await $.clock.now()) - turnStartedAt) / 1000)
    if (turnStartedAt > 0 && took >= 15) {
      const changed = (await read($, git))?.files.length ?? 0
      const label = took >= 60 ? `${Math.round(took / 60)}m` : `${took}s`
      $.ui.toast(`✓ Claude đã xong việc · ${changed} file đổi · ${label}`, { timeoutMs: 6000 })
    }

    return next(e)
  })

  // The person's prompt: a rounded box in its own border colour, as wide as the
  // tool frames, with no fill.
  on('ui.render', { component: 'UserMessage', surface: 'terminal' }, ($, e, next) => {
    if (e.props.origin.kind !== 'composer') return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const width = frameWidth(e.viewport?.columns)
    const rows = lines(e.props.text).flatMap(row => hardWrap(row, width - 7))

    return (
      <Box flexDirection="column" marginTop={1}>
        {borderTop(Box, Text, C.prompt, width, [])}
        {rows.map((row, i) => framed(Box, Text, C.prompt, [
          paint(Text, undefined, width - 2, [{ text: ` ${i === 0 ? '› ' : '  '}`, color: C.accent }, { text: row, color: C.text }]),
        ]))}
        {borderBottom(Text, C.prompt, width)}
      </Box>
    )
  })

  // Assistant prose: plain markdown, no card and no bullet.
  on('ui.render', { component: 'AssistantMessage', surface: 'terminal' }, ($, e) => {
    const { Box, Markdown } = $.ui.resolve(e)

    return (
      <Box marginTop={e.props.isFirstOfReply ? 1 : 0}>
        <Markdown text={e.props.text} />
      </Box>
    )
  })

  // A folded run of reads and searches: one frame, a row per call. A group
  // holding a tool this frame cannot draw faithfully (another plugin's, an agent
  // call) goes on down the chain, where that plugin or the engine draws it.
  on('ui.render', { component: 'ToolGroup', surface: 'terminal' }, async ($, e, next) => {
    for (const call of e.props.calls) {
      if (!call.tool_use_id) continue
      if (e.props.isExpanded) inlineRows.add(call.tool_use_id)
      else inlineRows.delete(call.tool_use_id)
    }
    if (e.props.isExpanded) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    if (e.props.calls.some(call => !DRAWN_TOOLS.has(call.tool))) {
      // The engine's folded row for the group, inside one frame of the group's state.
      const state = mergeStatus(e.props.calls)

      return enclosed(Box, Text, frameColor(state), frameWidth(e.viewport?.columns), await next(e), { top: true, bottom: true })
    }
    const width = frameWidth(e.viewport?.columns)
    const inner = width - 2
    const calls = e.props.calls
    const timed = await read($, timings)
    const msOf = (id?: string): number | null => (id ? (timed[id]?.ms ?? null) : null)
    const status = mergeStatus(calls)
    const color = frameColor(status)
    const finished = calls.flatMap(call => msOf(call.tool_use_id) ?? [])

    return (
      <Box flexDirection="column" marginTop={1}>
        {borderTop(Box, Text, color, width, frameLabel(calls, finished))}
        {calls.map(call =>
          framed(Box, Text, color, [
            callRow(Text, inner, call, call.tool, target(call.tool, fields(call.input)), rowRight(call.tool, call, msOf(call.tool_use_id))),
          ]),
        )}
        {borderBottom(Text, color, width)}
      </Box>
    )
  })

  // An Agent call as a live card: what the subagent is doing, then a summary.
  // Its status comes from the agent's own run: a background agent keeps
  // working after the Agent tool call itself returned.
  on('ui.render', { component: 'ToolUse', surface: 'terminal' }, async ($, e, next) => {
    if (!AGENT_TOOLS.has(e.props.tool)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const width = frameWidth(e.viewport?.columns)
    const inner = width - 2
    const input = fields(e.props.input)
    const [byTool, runs, now] = await Promise.all([read($, agentByToolUse), read($, agents), $.clock.now()])
    const runId = byTool[e.props.tool_use_id]
    const run = runId ? runs[runId] : undefined
    const live = run ? isRunning(run) : e.props.isRunning
    const state: Status = { isRunning: live, isErrored: e.props.isErrored, isInterrupted: e.props.isInterrupted }
    const color = frameColor(state)
    const type = run?.type ?? (str(input.subagent_type) || 'agent')
    const description = run?.description || str(input.description) || firstLine(str(input.prompt))
    const right: Seg[] = run
      ? [{ text: `${run.tools} tool · ${duration((run.endedAt ?? now) - run.startedAt)}`, color: live ? C.blue : C.dim }]
      : []
    const rightCells = segCells(right)
    const fixed = 1 + 2 + 2 + cells(type) + 2 + (rightCells > 0 ? rightCells + 2 : 0) + 1
    const shown = fitSegs([{ text: description, color: C.text }], Math.max(8, inner - fixed))
    const header = paint(Text, undefined, inner, [
      statusOf(state),
      { text: ' ' },
      { text: '◆', color: C.violet },
      { text: ' ' },
      { text: type, color: C.dim },
      { text: '  ' },
      ...shown,
      ...(rightCells > 0 ? [{ text: ' '.repeat(Math.max(2, inner - fixed - segCells(shown) + 2)) }, ...right] : []),
    ])
    const stepRow = (st: AgentStep): RenderElement => {
      const mark: Seg = !st.isDone ? { text: '◌', color: C.accent } : st.isErrored ? { text: '✗', color: C.red } : { text: ' ' }
      return paint(Text, undefined, inner, [
        { text: '   ' },
        iconOf(kindOf(st.tool)),
        { text: ' ' },
        { text: fit(st.tool, 6).padEnd(7), color: C.dim },
        { text: fit(st.target, inner - 18), color: st.isDone ? C.soft : C.text },
        { text: ' ' },
        mark,
      ])
    }
    const body: RenderElement[] = [header]
    if (run && live) body.push(...run.steps.slice(-3).map(stepRow))
    if (run && !live) {
      const parts = [
        run.filesRead.length > 0 ? `đọc ${run.filesRead.length} file` : '',
        run.filesEdited.length > 0 ? `sửa ${run.filesEdited.length} file` : '',
      ].filter(Boolean)
      const answer = firstLine(run.answer)
      if (parts.length > 0) body.push(paint(Text, undefined, inner, [{ text: `   ${parts.join(' · ')}`, color: C.dim }]))
      if (answer) body.push(paint(Text, undefined, inner, [{ text: '   ↳ ', color: C.faint }, { text: fit(answer, inner - 7), color: C.soft }]))
    }

    return (
      <Box flexDirection="column" marginTop={1}>
        {borderTop(Box, Text, color, width, [])}
        {body.map(row => framed(Box, Text, color, [row]))}
        {borderBottom(Text, color, width)}
      </Box>
    )
  })

  // One tool call as a row of a frame. Fullscreen rows redraw as a run grows, so
  // the calls of one run join: the first row draws the top border, the last the
  // bottom one. The main screen cannot redraw a row once printed, so each call
  // there is a whole frame. Edits carry their changed lines, highlighted; in
  // fullscreen a long diff folds behind a toggle, a finished run of several
  // calls folds into its border.
  on('ui.render', { component: 'ToolUse', surface: 'terminal' }, async ($, e, next) => {
    const tool = e.props.tool
    const width = frameWidth(e.viewport?.columns)
    if (!DRAWN_TOOLS.has(tool)) {
      // Any tool the mod does not draw itself: the engine's or another plugin's
      // row, inside a frame. An MCP tool's result block closes it; a built-in
      // one has no result block, and neither has a call still running or one
      // drawn with its result inline, so their frame closes here.
      const { Box, Text } = $.ui.resolve(e)
      const isOpen = isForeign(tool) && !e.props.isRunning && e.props.output !== undefined && !inlineRows.has(e.props.tool_use_id)
      const status: Status = { isRunning: e.props.isRunning, isErrored: e.props.isErrored, isInterrupted: e.props.isInterrupted }

      return enclosed(Box, Text, frameColor(status), width, await next(e), { top: true, bottom: !isOpen })
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const id = e.props.tool_use_id
    const isFullscreen = e.viewport?.isFullscreen === true
    const inner = width - 2
    const [runs, timed, folds] = await Promise.all([read($, toolRuns), read($, timings), read($, expanded)])
    const input = fields(e.props.input)
    const path = str(input.file_path) || str(input.notebook_path)

    // The run this row belongs to, and its place in it.
    const runId = runs.byId[id] ?? ''
    const order = isFullscreen && runId !== '' ? (runs.order[runId] ?? []) : []
    const at = order.indexOf(id)
    const ids = at >= 0 ? order : [id]
    const isFirst = at <= 0
    const isLast = at < 0 || at === ids.length - 1
    const statuses: Status[] = ids.map(one =>
      one === id ? e.props : { isRunning: timed[one]?.ms === null, isErrored: timed[one]?.isErrored === true },
    )
    const status = mergeStatus(statuses)
    const color = frameColor(status)
    const label = frameLabel(statuses, ids.flatMap(one => timed[one]?.ms ?? []))

    // A run folds once it is closed, finished and clean; one with a failure never does.
    const isFoldable = at >= 0 && ids.length >= FOLD_RUN && runs.current !== runId && !status.isRunning && !status.isErrored
    const isRunOpen = !isFoldable || (folds[runId] ?? false)
    const runToggle: Tail | undefined = isFoldable && isFirst
      ? {
          cells: 9,
          node: (
            <Button
              key={`fold-${runId}`}
              plain
              label={isRunOpen ? '▾ thu gọn' : '▸ mở rộng'}
              onPress={() => update($, expanded, all => ({ ...all, [runId]: !isRunOpen }))}
            />
          ),
        }
      : undefined
    if (!isRunOpen) {
      if (!isFirst) return <Box />
      return (
        <Box key={`tool-${id}`} flexDirection="column" marginTop={1}>
          {borderTop(Box, Text, color, width, label, runToggle)}
          {borderBottom(Text, color, width)}
        </Box>
      )
    }

    const diff = EDIT_TOOLS.has(tool) ? editDiff(tool, input) : null
    const timing = timed[id]
    const right: Seg[] = [
      ...(diff ? [{ text: `−${diff.removed.length}`, color: C.red }, { text: ' ' }, { text: `+${diff.added.length}`, color: C.green }] : []),
      ...rowRight(tool, e.props, timing?.ms ?? null).map((s, i) => (i === 0 && diff ? { ...s, text: `  ${s.text}` } : s)),
    ]
    const shown: Array<['+' | '−', string]> = diff && tool !== 'Write'
      ? [...diff.removed.map(l => ['−', l] as ['−', string]), ...diff.added.map(l => ['+', l] as ['+', string])]
      : []
    const canFold = isFullscreen && shown.length > FOLD_OVER
    const isOpen = !canFold || (folds[id] ?? false)
    const visible = isOpen ? shown.slice(0, DIFF_LINES) : []
    const diffLabel = isOpen ? '▾ gập' : '▸ diff'
    const failed = e.props.isErrored && !e.props.isInterrupted ? errorLine(e.props.output) : ''

    const rows: RenderElement[] = [
      canFold
        ? framed(Box, Text, color, [
            callRow(Text, inner - cells(diffLabel), e.props, tool, target(tool, input), right),
            <Button
              key={`fold-${id}`}
              plain
              label={diffLabel}
              onPress={() => update($, expanded, all => ({ ...all, [id]: !isOpen }))}
            />,
          ])
        : framed(Box, Text, color, [callRow(Text, inner, e.props, tool, target(tool, input), right)]),
      ...(failed === ''
        ? []
        : [framed(Box, Text, color, [noteRow(Text, inner, [{ text: '└ ', color: C.redDim }, { text: fit(failed, inner - TARGET_COL - 3), color: C.redDim }])])]),
      ...visible.map(([mark, code]) => framed(Box, Text, color, [diffRow(Text, inner, mark, code, path)])),
      ...(isOpen && shown.length > DIFF_LINES
        ? [framed(Box, Text, color, [noteRow(Text, inner, [{ text: `… ${shown.length - DIFF_LINES} dòng nữa (ctrl+o)`, color: C.faint }])])]
        : []),
    ]
    const block: RenderElement[] = [
      ...(isFirst ? [borderTop(Box, Text, color, width, label, runToggle)] : []),
      ...rows,
      ...(isLast ? [borderBottom(Text, color, width)] : []),
    ]

    if (!isFullscreen) {
      return (
        <Box flexDirection="column" marginTop={1}>
          {block}
        </Box>
      )
    }

    return (
      <Box key={`tool-${id}`} flexDirection="column" marginTop={isFirst ? 1 : 0}>
        {block}
      </Box>
    )
  })

  // The ToolUse row already summarizes these results (an Agent card carries its
  // answer's first line, so the engine's filled block is not drawn). A failure in fullscreen is
  // summarized in the frame too: the engine's block would cut the run's border.
  // Another plugin's tool keeps its result block, drawn inside the frame its row
  // opened: side bars down its height, then the closing border.
  on('ui.render', { component: 'ToolResult', surface: 'terminal' }, async ($, e, next) => {
    if (isForeign(e.props.tool)) {
      const { Box, Text } = $.ui.resolve(e)
      const color = frameColor({ isRunning: false, isErrored: e.props.isErrored, isInterrupted: false })

      return enclosed(Box, Text, color, frameWidth(e.viewport?.columns), await next(e), { top: false, bottom: true })
    }
    const isFramed = !e.props.isErrored || e.viewport?.isFullscreen === true
    if (!isFramed || !(DRAWN_TOOLS.has(e.props.tool) || AGENT_TOOLS.has(e.props.tool))) return next(e)
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  // The working line: a Vietnamese phrase in place of the sampled word. A state
  // message the engine shows instead of the word (a retry, a wait) is kept.
  on('ui.render', { component: 'Spinner', surface: 'terminal' }, ($, e, next) => {
    const pool = e.props.mode === 'thinking' ? THINKING : WORKING

    return next({ ...e, props: { ...e.props, word: pick(pool, e.props.word) } })
  })

  // The line closing a turn: `✻ Pha xong cà phê trong 1m 12s`.
  on('ui.render', { component: 'TurnDuration', surface: 'terminal' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return (
      <Text color={C.dim}>
        ✻ {pick(DONE, e.props.word)} trong {duration(e.props.durationMs)}
      </Text>
    )
  })

  // Tags above the prompt: branch, changed files, model, context.
  on('ui.render', { component: 'AbovePrompt', surface: 'terminal' }, async ($, e, next) => {
    const [repo, session, runs, sc] = await Promise.all([read($, git), read($, band), read($, agents), read($, scene)])
    const running = Object.values(runs).filter(isRunning).sort((a, b) => a.startedAt - b.startedAt)
    const sceneRows = SCENE_ROWS[sc.playing ? 'game' : 'scene']
    const showScene = sc.enabled && (e.props.isWorking || sc.playing) && e.props.maxRows >= sceneRows + 2
    if (e.props.hasSurvey || (repo === null && session === null && running.length === 0 && !showScene)) return next(e)
    const { Box, Text, Client, Button } = $.ui.resolve(e)
    const sceneProps: SceneProps = {
      mode: sc.playing ? 'game' : 'scene',
      bubble: sc.bubble || 'Đang suy nghĩ…',
      progress: sc.turnTools / (sc.turnTools + 6),
      jumpSeq: sc.jumpSeq,
      width: Math.max(30, e.props.bodyColumns - 2),
      colors: {
        cat: '#E8A35C', eye: '#1E1E1E', nose: '#F28FAD', track: C.track, trackDone: C.accent,
        star: C.yellow, bug: C.red, house: C.soft, roof: C.orange, bubbleBg: C.popup, bubbleFg: C.text, dim: C.dim,
      },
    }
    const sceneBlock = showScene ? (
      <Box flexDirection="column">
        <Client key="scene" module="./scene.tsx" props={sceneProps} height={sceneRows} />
        {sc.playing && (
          <Box gap={2}>
            <Button key="jump" hotkey="j" label="j nhảy" onPress={() => update($, scene, s => ({ ...s, jumpSeq: s.jumpSeq + 1 }))} />
            <Button key="quit" hotkey="q" label="q thoát" onPress={() => update($, scene, s => ({ ...s, playing: false }))} />
          </Box>
        )}
      </Box>
    ) : null
    const percent = session?.ctxPercent ?? null
    const bar = smoothBar((percent ?? 0) / 100, 8)

    return (
      <Box flexDirection="column">
      {sceneBlock}
      <Box>
        {repo && pill(Text, C.tagBlueBg, [{ text: `⎇ ${repo.branch}`, color: C.tagBlueFg }])}
        {repo && repo.files.length > 0 && pill(Text, C.tagYellowBg, [{ text: `${repo.files.length} file đổi`, color: C.tagYellowFg }])}
        {running.length > 0 &&
          pill(Text, C.running, [
            { text: '◆ ', color: C.violet },
            { text: `${running.length} agent: `, color: C.soft },
            { text: running.slice(0, 3).map(r => `${r.type} ◌`).join(' · '), color: C.text },
            ...(running.length > 3 ? [{ text: ` +${running.length - 3}`, color: C.dim }] : []),
          ])}
        {session && pill(Text, C.pill, [{ text: session.model, color: C.soft }])}
        {percent !== null &&
          pill(Text, C.pill, [
            { text: 'ctx ', color: C.dim },
            { text: bar.filled, color: C.accent },
            { text: bar.empty, color: C.track },
            { text: ` ${Math.round(percent)}%`, color: C.soft },
          ])}
        <Button key="enhance" plain label="✨" action={ENHANCE_ACTION} onPress={() => enhancePromptBox($)} />
      </Box>
      </Box>
    )
  })

  // The desktop draws its own composer, so the nearest a plugin gets to its
  // send button is the band just above it.
  on('ui.render', { component: 'AbovePrompt', surface: 'desktop' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const en = await read($, enhanced)
    if (e.props.isWorking && en.text === null) return next(e)
    const { Box, Button, Markdown } = $.ui.resolve(e)
    // A rewrite the desktop's prompt box would not take shows here to send.
    if (en.text !== null) {
      const text = en.text
      return (
        <Box flexDirection="column" gap={1}>
          <Markdown text={text} />
          <Box gap={1} justifyContent="flex-end">
            <Button key="enhance-drop" label="Bỏ" onPress={() => update($, enhanced, s => ({ ...s, text: null }))} />
            <Button
              key="enhance-send"
              variant="primary"
              label="Gửi"
              onPress={async () => {
                await update($, enhanced, s => ({ ...s, text: null }))
                await $.prompt.submit({ text, asUser: true })
              }}
            />
          </Box>
        </Box>
      )
    }

    return (
      <Box justifyContent="flex-end">
        {en.busy ? (
          <Button key="enhance" label="✨ Đang viết lại…" onPress={() => {}} />
        ) : (
          <Button key="enhance" label="✨ Viết lại câu lệnh" onPress={() => enhancePromptBox($)} />
        )}
      </Box>
    )
  })

  // Test result, session time and cost after the hint line.
  on('ui.render', { component: 'PromptHint', surface: 'terminal' }, async ($, e, next) => {
    const info = await read($, footer)
    if (info === null) return next(e)
    const parts = [
      info.test === 'pass' ? '✓ test' : info.test === 'fail' ? '✗ test' : '',
      `${info.minutes}m`,
      info.usd === null ? '' : `$${info.usd.toFixed(2)}`,
    ].filter(part => part !== '')

    return next({ ...e, props: { ...e.props, tail: `  ${parts.join(' │ ')}` } })
  })

  // The /dash pane: tiles, timeline, activity, tool bars, changed files, head.
  on('ui.render', { component: 'Pane', requestId: DASH }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const [s, repo, beatList, counts, now] = await Promise.all([
      read($, stats), read($, git), read($, beats), read($, activity), $.clock.now(),
    ])
    const files = repo?.files ?? []
    const added = files.reduce((sum, f) => sum + f.added, 0)
    const removed = files.reduce((sum, f) => sum + f.removed, 0)
    const ranked = Object.entries(s.tools).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const top = ranked[0]?.[1] ?? 1
    const width = Math.max(24, Math.min(e.props.bodyColumns - 2, 48))
    const barWidth = Math.max(6, width - 16)
    const pathWidth = Math.max(8, Math.min(width - 14, Math.max(0, ...files.map(f => cells(f.path)))))
    const tiles: Array<[string, string, string]> = [
      [String(s.total), 'tool call', C.text],
      [`+${added}`, 'dòng thêm', C.green],
      [`−${removed}`, 'dòng xoá', C.red],
    ]

    // Tool calls per minute over the last `columns` minutes, 4 rows tall.
    const columns = Math.max(6, Math.min(24, Math.floor(width / 2)))
    const nowMinute = Math.floor(now / 60000)
    const perMinute = Array.from({ length: columns }, (_, i) => counts[String(nowMinute - columns + 1 + i)] ?? 0)
    const peak = Math.max(1, ...perMinute)
    const chartRows = [3, 2, 1, 0].map(level =>
      perMinute.map(v => LEVELS[Math.max(0, Math.min(8, Math.round((v / peak) * 32) - level * 8))] ?? ' ').join(' '),
    )
    const firstMinute = new Date((nowMinute - columns + 1) * 60000)
    const startLabel = `${String(firstMinute.getHours()).padStart(2, '0')}:${String(firstMinute.getMinutes()).padStart(2, '0')}`
    const shownBeats = beatList.slice(-width)

    return (
      <Box flexDirection="column" gap={1}>
        {width >= 38 ? (
          <Box gap={1}>
            {tiles.map(([value, label, color]) =>
              card(Box, Text, C.snippet, 12, [
                paint(Text, C.snippet, 12, [{ text: value, color, bold: true }]),
                paint(Text, C.snippet, 12, [{ text: label, color: C.dim }]),
              ], 0),
            )}
          </Box>
        ) : (
          <Text>
            {tiles.map(([value, label, color]) => (
              <Text><Text bold color={color}>{value}</Text><Text color={C.dim}> {label}  </Text></Text>
            ))}
          </Text>
        )}
        <Box flexDirection="column">
          {section(Text, 'TIMELINE', width)}
          {shownBeats.length === 0 ? (
            <Text color={C.faint}>Chưa có hoạt động.</Text>
          ) : (
            <Text>{shownBeats.map(b => <Text color={beatColor(b)}>▆</Text>)}</Text>
          )}
          <Text color={C.dim}>
            {BEAT_LABEL.map(([b, label]) => (
              <Text><Text color={beatColor(b)}>■</Text> {label} </Text>
            ))}
          </Text>
        </Box>
        <Box flexDirection="column">
          {section(Text, 'HOẠT ĐỘNG', width, `${columns} phút`)}
          {chartRows.map(row => <Text color={C.accent}>{row}</Text>)}
          <Text color={C.faint}>{startLabel.padEnd(columns * 2 - 8)}bây giờ</Text>
        </Box>
        <Box flexDirection="column">
          {section(Text, 'TOOL', width)}
          {ranked.length === 0 && <Text color={C.faint}>Chưa có tool call nào.</Text>}
          {ranked.map(([name, count]) => {
            const bar = smoothBar(count / top, barWidth)
            const icon = iconOf(kindOf(name))
            return (
              <Text>
                <Text color={icon.color}>{icon.text} </Text>
                <Text color={C.text}>{fit(name, 6).padEnd(7)}</Text>
                <Text color={C.accent}>{bar.filled}</Text>
                <Text color={C.pill}>{bar.empty}</Text>
                <Text color={C.soft}>{String(count).padStart(4)}</Text>
              </Text>
            )
          })}
        </Box>
        <Box flexDirection="column">
          {section(Text, 'CHANGES', width)}
          {files.length === 0 && <Text color={C.faint}>Không có thay đổi.</Text>}
          {files.slice(0, 12).map(f => (
            <Text key={`file-${f.path}`}>
              <Text bold color={statusColor(f.status)}>{f.status} </Text>
              <Text color={C.text}>{fit(f.path, pathWidth).padEnd(pathWidth)}</Text>
              <Text color={C.red}>{`−${f.removed}`.padStart(5)}</Text>
              <Text color={C.green}>{`+${f.added}`.padStart(5)}</Text>
            </Text>
          ))}
          {files.length > 12 && <Text color={C.faint}>… {files.length - 12} file nữa</Text>}
        </Box>
        {repo && (
          <Text>
            {pill(Text, C.tagBlueBg, [{ text: `⎇ ${repo.branch}`, color: C.tagBlueFg }])}
            <Text color={C.dim}> {repo.head}</Text>
          </Text>
        )}
      </Box>
    )
  })
}
