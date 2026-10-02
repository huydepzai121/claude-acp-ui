import type { ClientModule, ClientSurface, RenderElement } from 'claude-code'

// The band's pixel scene while Claude works, and the "Né bug" game.
// Drawn on a grid of half-block cells: each text row holds two pixel rows,
// the top one as the glyph's color and the bottom one as its background.

export type SceneProps = {
  mode: 'scene' | 'game'
  bubble: string
  progress: number
  jumpSeq: number
  width: number
  colors: {
    cat: string; eye: string; nose: string; track: string; trackDone: string
    star: string; bug: string; house: string; roof: string; bubbleBg: string; bubbleFg: string; dim: string
  }
}

type Bug = { x: number }
type SceneState = {
  // The latest props and width, read by the frame timer, which outlives a call.
  live: { props: SceneProps; width: number }
  frame: number
  stars: number[]
  lastJumpSeq: number
  jumpT: number
  bugs: Bug[]
  spawnIn: number
  score: number
  best: number
  over: boolean
}

const PX_ROWS = 8 // pixel rows: 4 text rows
const JUMP_FRAMES = 10
const JUMP_HEIGHT = 4
const CAT_X_GAME = 4

// 11 × 7 pixels; '#' fur, 'o' eye, 'p' nose, two leg frames.
const CAT_TOP = [
  '..#......#.',
  '..##....##.',
  '..########.',
  '#.#o####o#.',
  '#.###pp###.',
]
const CAT_LEGS = [
  ['...######..', '...#.##.#..'],
  ['...######..', '..#..##..#.'],
]
const BUG = ['#.#', '###']
const HOUSE = ['..#..', '.###.', '#####', '#.#.#', '#.#.#']

type Px = (string | null)[][]

const blank = (w: number): Px => Array.from({ length: PX_ROWS }, () => Array<string | null>(w).fill(null))

function stamp(px: Px, sprite: readonly string[], x: number, y: number, colors: Record<string, string>): void {
  sprite.forEach((row, dy) => {
    ;[...row].forEach((ch, dx) => {
      const color = colors[ch]
      const yy = y + dy
      const xx = x + dx
      if (color && yy >= 0 && yy < PX_ROWS && xx >= 0 && xx < (px[0]?.length ?? 0)) {
        const line = px[yy]
        if (line) line[xx] = color
      }
    })
  })
}

// Packs two pixel rows per text row, joining runs of one look into one Text.
function rows(px: Px, Text: ClientSurface['elements']['Text']): RenderElement[] {
  const out: RenderElement[] = []
  for (let r = 0; r < PX_ROWS; r += 2) {
    const top = px[r] ?? []
    const bottom = px[r + 1] ?? []
    const runs: Array<{ glyph: string; fg?: string; bg?: string; n: number }> = []
    for (let x = 0; x < top.length; x += 1) {
      const t = top[x] ?? null
      const b = bottom[x] ?? null
      const cell = t && b ? { glyph: '▀', fg: t, bg: b }
        : t ? { glyph: '▀', fg: t }
        : b ? { glyph: '▄', fg: b }
        : { glyph: ' ' }
      const last = runs.at(-1)
      if (last && last.glyph === cell.glyph && last.fg === cell.fg && last.bg === cell.bg) last.n += 1
      else runs.push({ ...cell, n: 1 })
    }
    out.push(
      <Text>
        {runs.map(run => (
          <Text color={run.fg} backgroundColor={run.bg}>{run.glyph.repeat(run.n)}</Text>
        ))}
      </Text>,
    )
  }

  return out
}

const fresh = (props: SceneProps, width: number, best: number): SceneState => ({
  live: { props, width },
  frame: 0,
  stars: Array.from({ length: Math.max(3, Math.floor(width / 12)) }, (_, i) => (i * 37 + 11) % Math.max(1, width)),
  lastJumpSeq: 0,
  jumpT: 0,
  bugs: [],
  spawnIn: 12,
  score: 0,
  best,
  over: false,
})

const Scene: ClientModule<SceneProps, SceneState> = (props, surface) => {
  const { Box, Text } = surface.elements
  const width = Math.max(30, Math.min(props.width, 120))
  const state = surface.state ?? fresh(props, width, 0)
  state.live.props = props
  state.live.width = width

  if (surface.state === undefined) {
    surface.setState(state)
    surface.every(70, () => {
      const s = surface.state
      if (!s) return
      surface.setState(step(s, surface))
    })
    surface.onKey(event => {
      const s = surface.state
      if (!s) return
      if (event.key === ' ' || event.key === 'up' || event.key === 'w') surface.setState(jump(s))
    })
  }

  // A jump pressed from the band's hotkey arrives as a new jumpSeq.
  if (props.jumpSeq !== state.lastJumpSeq) {
    const next = { ...jump(state), lastJumpSeq: props.jumpSeq }
    surface.setState(next)
  }

  const c = props.colors
  const px = blank(width)
  const legs = CAT_LEGS[Math.floor(state.frame / 3) % 2] ?? CAT_LEGS[0]
  const cat = [...CAT_TOP, ...(legs ?? [])]
  const catColors = { '#': c.cat, o: c.eye, p: c.nose }

  // Twinkling stars in the sky rows.
  state.stars.forEach((x, i) => {
    if ((state.frame + i * 5) % 14 < 9) {
      const line = px[i % 2]
      if (line && x < width) line[x] = c.star
    }
  })

  // The track on the bottom pixel row, crenellated; the done part lit.
  const track = px[PX_ROWS - 1]
  const doneTo = Math.round(Math.max(0, Math.min(1, props.progress)) * (width - 1))
  if (track) for (let x = 0; x < width; x += 1) if (x % 3 !== 2) track[x] = props.mode === 'scene' && x <= doneTo ? c.trackDone : c.track

  let bubbleX = 0
  if (props.mode === 'scene') {
    stamp(px, HOUSE, width - 6, PX_ROWS - 1 - HOUSE.length, { '#': c.house })
    const roof = px[PX_ROWS - 1 - HOUSE.length]
    if (roof) roof[width - 4] = c.roof
    const catX = Math.min(width - 18, Math.round(props.progress * (width - 18)))
    stamp(px, cat, catX, PX_ROWS - 1 - cat.length, catColors)
    bubbleX = catX + 12
  } else {
    const lift = Math.round(Math.sin((Math.PI * state.jumpT) / JUMP_FRAMES) * JUMP_HEIGHT)
    stamp(px, cat, CAT_X_GAME, PX_ROWS - 1 - cat.length - (state.jumpT > 0 ? lift : 0), catColors)
    state.bugs.forEach(bug => stamp(px, BUG, bug.x, PX_ROWS - 1 - BUG.length, { '#': c.bug }))
  }

  const bubble = props.mode === 'scene'
    ? props.bubble
    : state.over
      ? `Trúng bug! ${state.score} điểm · kỷ lục ${state.best} · Space/j chơi lại`
      : `Né bug · ${state.score} điểm · kỷ lục ${state.best}`
  const pad = Math.max(0, Math.min(bubbleX, width - bubble.length - 4))

  return (
    <Box flexDirection="column">
      <Text>
        {' '.repeat(pad)}
        <Text color={c.bubbleBg}>▐</Text>
        <Text backgroundColor={c.bubbleBg} color={c.bubbleFg}>{bubble.slice(0, width - 4)}</Text>
        <Text color={c.bubbleBg}>▌</Text>
      </Text>
      {rows(px, Text)}
    </Box>
  )
}

function jump(s: SceneState): SceneState {
  if (s.over) return { ...fresh(s.live.props, s.live.width, s.best), lastJumpSeq: s.lastJumpSeq, frame: s.frame }
  return s.jumpT > 0 ? s : { ...s, jumpT: 1 }
}

// One frame: walk the legs, move the bugs, land the jump, score and collide.
function step(s: SceneState, surface: ClientSurface<SceneState>): SceneState {
  const { props, width } = s.live
  const frame = s.frame + 1
  if (props.mode !== 'game' || s.over) return { ...s, frame }

  const speed = 1 + Math.floor(s.score / 8)
  let score = s.score
  const bugs = s.bugs
    .map(b => ({ x: b.x - speed }))
    .filter(b => {
      if (b.x + BUG[0]!.length < CAT_X_GAME) {
        score += 1
        return false
      }
      return true
    })
  let spawnIn = s.spawnIn - 1
  if (spawnIn <= 0) {
    bugs.push({ x: width - 1 })
    spawnIn = 14 + ((frame * 7) % 16) - Math.min(8, Math.floor(s.score / 5))
  }
  const jumpT = s.jumpT > 0 ? (s.jumpT + 1 > JUMP_FRAMES ? 0 : s.jumpT + 1) : 0
  const lift = jumpT > 0 ? Math.round(Math.sin((Math.PI * jumpT) / JUMP_FRAMES) * JUMP_HEIGHT) : 0
  const hit = lift < 2 && bugs.some(b => b.x <= CAT_X_GAME + 9 && b.x + 2 >= CAT_X_GAME + 3)
  const best = Math.max(s.best, score)
  if (score !== s.score || hit) surface.post({ score, best, over: hit })

  return { ...s, frame, bugs, spawnIn, jumpT, score, best, over: hit }
}

export default Scene
