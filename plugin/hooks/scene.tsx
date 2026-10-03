import type { ClientModule, ClientSurface, RenderElement } from 'claude-code'

// The band's pixel scene while Claude works, and the "Né bug" game.
// Drawn on a grid of half-block cells: each text row holds two pixel rows,
// the top one as the glyph's color and the bottom one as its background.
// Everything moves every frame: the cat walks toward the turn's progress and
// paces there, bobbing, blinking and wagging; the ground scrolls under it,
// stars twinkle and drift, and the bubble types its words out.

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
  // The cat's position in pixels, where it heads, and which way it faces.
  catX: number
  facing: 1 | -1
  // Stars as [x, row]; they drift left a pixel every few frames.
  stars: Array<[number, number]>
  // The bubble's text and how much of it is typed out so far.
  said: string
  typed: number
  lastJumpSeq: number
  jumpT: number
  bugs: Bug[]
  spawnIn: number
  score: number
  best: number
  over: boolean
}

const FRAME_MS = 70
const JUMP_FRAMES = 10
const JUMP_HEIGHT = 4
const CAT_X_GAME = 4

// Pixel rows of the grid, an even number so text rows hold two each. Scene: the
// ground, the cat and its bob. Game: the ground, the cat and its highest jump.
// The Client's height in register.tsx is one bubble row plus half of this.
const PX_ROWS = { scene: 10, game: 14 } as const
// The ground fills one whole text row; everything else stands on top of it.
const GROUND_ROWS = 2
const CAT_W = 11
const PACE = 5 // how far the cat paces either side of where it stands
const WALK_PX = 0.5 // pixels per frame
const TYPE_CHARS = 2 // bubble characters per frame

// 11 × 7 pixels facing right; '#' fur, 'o' eye, 'p' nose, 't' tail.
const CAT_TOP = [
  '..#......#.',
  '..##....##.',
  '..########.',
  't.#o####o#.',
  't.###pp###.',
]
const TAIL_UP = [
  't.#......#.',
  't.##....##.',
  '..########.',
  '..#o####o#.',
  '..###pp###.',
]
const CAT_LEGS = [
  ['...######..', '...#.##.#..'],
  ['...######..', '..#..##..#.'],
]
const BUG_FRAMES = [
  ['#.#', '###'],
  ['.#.', '###'],
]
const HOUSE = ['..#..', '.###.', '#####', '#.#.#', '#.#.#']

type Px = (string | null)[][]

const blank = (w: number, h: number): Px => Array.from({ length: h }, () => Array<string | null>(w).fill(null))

const mirror = (sprite: readonly string[]): string[] => sprite.map(row => [...row].reverse().join(''))

function stamp(px: Px, sprite: readonly string[], x: number, y: number, colors: Record<string, string>): void {
  sprite.forEach((row, dy) => {
    ;[...row].forEach((ch, dx) => {
      const color = colors[ch]
      const yy = y + dy
      const xx = x + dx
      if (color && yy >= 0 && yy < px.length && xx >= 0 && xx < (px[0]?.length ?? 0)) {
        const line = px[yy]
        if (line) line[xx] = color
      }
    })
  })
}

// Packs two pixel rows per text row, joining runs of one look into one Text.
function rows(px: Px, Text: ClientSurface['elements']['Text']): RenderElement[] {
  const out: RenderElement[] = []
  for (let r = 0; r < px.length; r += 2) {
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

// The cat for this frame: legs alternate while it walks, the tail wags, the
// eyes close for two frames every few seconds, and it faces where it goes.
function catSprite(frame: number, facing: 1 | -1, isWalking: boolean): string[] {
  const top = (frame % 16 < 8 ? CAT_TOP : TAIL_UP).map(row =>
    frame % 48 < 2 ? row.replace(/o/g, '#') : row,
  )
  const legs = CAT_LEGS[isWalking ? Math.floor(frame / 3) % 2 : 0] ?? CAT_LEGS[0] ?? []
  const sprite = [...top, ...legs]

  return facing === 1 ? sprite : mirror(sprite)
}

const homeX = (props: SceneProps, width: number): number =>
  Math.max(0, Math.min(width - CAT_W - 8, Math.round(Math.max(0, Math.min(1, props.progress)) * (width - CAT_W - 8))))

const fresh = (props: SceneProps, width: number, best: number): SceneState => ({
  live: { props, width },
  frame: 0,
  catX: homeX(props, width),
  facing: 1,
  stars: Array.from({ length: Math.max(4, Math.floor(width / 10)) }, (_, i) => [(i * 37 + 11) % Math.max(1, width), i % 3] as [number, number]),
  said: props.bubble,
  typed: 0,
  lastJumpSeq: props.jumpSeq,
  jumpT: 0,
  bugs: [],
  spawnIn: 12,
  score: 0,
  best,
  over: false,
})

const Scene: ClientModule<SceneProps, SceneState> = (props, surface) => {
  const { Box, Text } = surface.elements
  const width = Math.max(30, props.width)
  const state = surface.state ?? fresh(props, width, 0)
  state.live.props = props
  state.live.width = width

  if (surface.state === undefined) {
    surface.setState(state)
    surface.every(FRAME_MS, () => {
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
    surface.setState({ ...jump(state), lastJumpSeq: props.jumpSeq })
  }

  const c = props.colors
  const height = PX_ROWS[props.mode]
  // The pixel row of the ground's top edge, which sprites rest just above.
  const ground = height - GROUND_ROWS
  const px = blank(width, height)
  const catColors = { '#': c.cat, o: c.eye, p: c.nose, t: c.cat }

  // Stars twinkle in the top rows and drift.
  state.stars.forEach(([x, row], i) => {
    if ((state.frame + i * 5) % 14 < 9) {
      const line = px[row]
      if (line && x >= 0 && x < width) line[x] = c.star
    }
  })

  // The ground: crenellated, scrolling under the cat; the done part lit.
  const scroll = props.mode === 'game' ? state.frame : Math.floor(state.frame / 2)
  const doneTo = Math.round(Math.max(0, Math.min(1, props.progress)) * (width - 1))
  for (let y = ground; y < height; y += 1) {
    const track = px[y]
    if (!track) continue
    for (let x = 0; x < width; x += 1) {
      if ((x + scroll) % 3 !== 2) track[x] = props.mode === 'scene' && x <= doneTo ? c.trackDone : c.track
    }
  }

  let bubbleX = 0
  if (props.mode === 'scene') {
    stamp(px, HOUSE, width - 6, ground - HOUSE.length, { '#': c.house })
    const roof = px[ground - HOUSE.length]
    if (roof) roof[width - 4] = c.roof
    const x = Math.round(state.catX)
    const bob = Math.floor(state.frame / 3) % 2
    const cat = catSprite(state.frame, state.facing, true)
    stamp(px, cat, x, ground - cat.length - bob, catColors)
    bubbleX = x + CAT_W + 1
  } else {
    const lift = state.jumpT > 0 ? Math.round(Math.sin((Math.PI * state.jumpT) / JUMP_FRAMES) * JUMP_HEIGHT) : 0
    const cat = catSprite(state.frame, 1, state.jumpT === 0 && !state.over)
    stamp(px, cat, CAT_X_GAME, ground - cat.length - lift, catColors)
    const bug = BUG_FRAMES[Math.floor(state.frame / 4) % 2] ?? BUG_FRAMES[0] ?? []
    state.bugs.forEach(b => stamp(px, bug, b.x, ground - bug.length, { '#': c.bug }))
  }

  const full = props.mode === 'scene'
    ? state.said
    : state.over
      ? `Trúng bug! ${state.score} điểm · kỷ lục ${state.best} · Space/j chơi lại`
      : `Né bug · ${state.score} điểm · kỷ lục ${state.best}`
  const shown = props.mode === 'scene' ? [...full].slice(0, state.typed).join('') : full
  const cursor = props.mode === 'scene' && state.typed < [...full].length ? '▏' : ''
  const text = `${shown}${cursor}`.slice(0, width - 4)
  const pad = Math.max(0, Math.min(bubbleX, width - [...full].length - 4))

  return (
    <Box flexDirection="column">
      <Text>
        {' '.repeat(pad)}
        <Text color={c.bubbleBg}>▐</Text>
        <Text backgroundColor={c.bubbleBg} color={c.bubbleFg}>{text}</Text>
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

// One frame of the scene: the cat walks home or paces around it, the stars
// drift, and the bubble types on.
function sceneStep(s: SceneState, frame: number): SceneState {
  const { props, width } = s.live
  const home = homeX(props, width)
  const lo = Math.max(0, home - PACE)
  const hi = Math.min(width - CAT_W - 8, home + PACE)
  // Far from home it heads there; near it, it turns at the pacing bounds.
  let facing = s.facing
  if (s.catX < lo) facing = 1
  else if (s.catX > hi) facing = -1
  else if (s.catX + WALK_PX * facing > hi || s.catX + WALK_PX * facing < lo) facing = facing === 1 ? -1 : 1
  const catX = s.catX + WALK_PX * facing

  const stars = frame % 6 === 0
    ? s.stars.map(([x, row]) => [x - 1 < 0 ? width - 1 : x - 1, row] as [number, number])
    : s.stars
  const isNew = props.bubble !== s.said
  const said = isNew ? props.bubble : s.said
  const typed = isNew ? 0 : Math.min([...said].length, s.typed + TYPE_CHARS)

  return { ...s, frame, catX, facing, stars, said, typed }
}

// One frame: walk the legs, move the bugs, land the jump, score and collide.
function step(s: SceneState, surface: ClientSurface<SceneState>): SceneState {
  const { props, width } = s.live
  const frame = s.frame + 1
  if (props.mode !== 'game') return sceneStep(s, frame)
  if (s.over) return { ...s, frame }

  const speed = 1 + Math.floor(s.score / 8)
  let score = s.score
  const bugs = s.bugs
    .map(b => ({ x: b.x - speed }))
    .filter(b => {
      if (b.x + 3 < CAT_X_GAME) {
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
  const stars = frame % 3 === 0 ? s.stars.map(([x, row]) => [x - 1 < 0 ? width - 1 : x - 1, row] as [number, number]) : s.stars

  return { ...s, frame, bugs, spawnIn, jumpT, score, best, over: hit, stars }
}

export default Scene
