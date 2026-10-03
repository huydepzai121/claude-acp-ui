import { expect, mock, test } from 'claude-code/testing'

test('an Edit row shows its tool, file, counts and diff lines', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: {
      tool_use_id: 'tu_1',
      tool: 'Edit',
      input: {
        file_path: 'E:/Dev/www/Browzy/src/panel/viewport.ts',
        old_string: 'a\nconst h = window.innerHeight;\nz',
        new_string: 'a\nconst h = getViewportHeight(tab);\nonDevtoolsToggle(tab, relayout);\nz',
      },
      isRunning: false,
      isErrored: false,
      isInterrupted: false,
    },
  })

  expect(await ui.find({ type: 'Text', text: 'Edit' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /src\/panel\/viewport\.ts/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '−1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '+2' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /window/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'onDevtoolsToggle' })).toBeDefined()
})

test('a folded group lists each call with its target', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolGroup',
    props: {
      calls: [
        { tool: 'Read', input: { file_path: 'src/panel/viewport.ts' }, isRunning: false, isErrored: false, isInterrupted: false },
        { tool: 'Grep', input: { pattern: 'devtools', path: 'src' }, isRunning: true, isErrored: false, isInterrupted: false },
      ],
      isActive: true,
      isExpanded: false,
    },
  })

  expect(await ui.find({ type: 'Text', text: /2 lệnh/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '"devtools"' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' trong src' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^╭/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '◌' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /tool calls/ })).toBeUndefined()
})

const quiet = { isRunning: false, isErrored: false, isInterrupted: false }

test('a folded group with a tool acp-ui does not draw is passed down the chain', async ($, on) => {
  on('ui.render', { component: 'ToolGroup', surface: 'terminal' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>drawn further down</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolGroup',
    props: {
      calls: [
        { tool: 'Read', input: { file_path: 'src/a.ts' }, ...quiet },
        { tool: 'mcp__viber-context__codebase_retrieval', input: { information_request: 'q' }, ...quiet },
      ],
      isActive: false,
      isExpanded: false,
    },
  })

  expect(await ui.find({ type: 'Text', text: 'drawn further down' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /lệnh/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^╭/ })).toBeUndefined()
})

test('an expanded group is passed down the chain', async ($, on) => {
  on('ui.render', { component: 'ToolGroup', surface: 'terminal' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>drawn further down</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolGroup',
    props: { calls: [{ tool: 'Read', input: { file_path: 'src/a.ts' }, ...quiet }], isActive: false, isExpanded: true },
  })

  expect(await ui.find({ type: 'Text', text: 'drawn further down' })).toBeDefined()
})

test('the person’s prompt draws as a card with its text', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'UserMessage',
    props: { text: 'sửa lỗi viewport', origin: { kind: 'composer' }, isExpanded: false },
  })

  expect(await ui.find({ type: 'Text', text: 'sửa lỗi viewport' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '› ' })).toBeDefined()
})

test('/dash opens the pane, and a second /dash closes it', async ($, on) => {
  // The test's hooks stand for the engine's pane registry.
  const open = new Set<string>()
  on('ui.panes', () => ({
    value: [...open].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })),
  }))
  on('ui.open', (_$, e) => {
    open.add(e.id)
    return { value: { isPlaced: true as const } }
  })
  on('ui.close', (_$, e) => {
    open.delete(e.id)
    return { value: undefined }
  })
  const run = () =>
    $.command.run({
      command: 'dash',
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 120 },
    })

  expect((await run()).text).toContain('Đã mở')
  expect(open.has('acp-dash')).toBe(true)
  expect((await run()).text).toContain('Đã đóng')
  expect(open.has('acp-dash')).toBe(false)
})

const LONG_EDIT = {
  tool_use_id: 'tu_long',
  tool: 'Edit',
  input: {
    file_path: 'src/panel/viewport.ts',
    old_string: 'a\nconst h = window.innerHeight; // old\nz',
    new_string: 'a\nconst h = getViewportHeight(tab);\nonDevtoolsToggle(tab, () => relayout(42));\nconst w = 1;\nconst s = "x";\nz',
  },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
}

test('diff lines are highlighted: keyword, function, number, string, comment', async $ => {
  const ui = await $.ui.mount({ plugin: 'acp-ui', surface: 'terminal', component: 'ToolUse', props: LONG_EDIT })

  expect(await ui.find({ type: 'Text', text: 'const' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'getViewportHeight' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '42' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '"x"' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '// old' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '✎' })).toBeUndefined()
})

test('in fullscreen a long diff folds behind a toggle that opens it', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: LONG_EDIT,
    viewport: { columns: 120, rows: 40, isFullscreen: true },
  })

  expect(await ui.find({ type: 'Text', text: 'getViewportHeight' })).toBeUndefined()
  await ui.press({ key: 'fold-tu_long' })
  expect(await ui.find({ type: 'Text', text: 'getViewportHeight' })).toBeDefined()
})

const bashRow = (output: unknown, extra: Record<string, unknown> = {}) => ({
  tool_use_id: 'tu_bash',
  tool: 'Bash',
  input: { command: 'npm test -- session-model' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
  output,
  ...extra,
})

test('a Bash row is drawn in a rounded frame, with no kind icon and no filled edges', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: bashRow({ stdout: 'one\ntwo\n\nlast line\n', stderr: '' }),
  })

  expect(await ui.find({ type: 'Text', text: /^╭/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '│' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'npm test -- session-model' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '❯' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^▗/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^▝/ })).toBeUndefined()
})

test('a Bash row summarizes its output as a line count, not its last line', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: bashRow({ stdout: 'one\ntwo\n\nlast line\n', stderr: '' }),
  })

  expect(await ui.find({ type: 'Text', text: '3 dòng' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'last line' })).toBeUndefined()
})

test('a failed Bash row shows the last error line and a red frame', async $ => {
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: bashRow({ stdout: '', stderr: 'npm ERR! failed\nexpected sonnet to equal opus\n' }, { isErrored: true }),
  })

  expect(await ui.find({ type: 'Text', text: '└ ' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'expected sonnet to equal opus' })).toBeDefined()
  expect(JSON.stringify(await ui.find({ type: 'Text', text: /^╭─+╮$/ }))).toContain('#F87C88')

  const fine = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: bashRow({ stdout: 'ok', stderr: '' }),
  })
  expect(JSON.stringify(await fine.find({ type: 'Text', text: /^╭─+╮$/ }))).toContain('#5B6B8C')
})

const FULLSCREEN = { columns: 120, rows: 40, isFullscreen: true }

const readRow = (id: string, file: string, extra: Record<string, unknown> = {}) => ({
  plugin: 'acp-ui',
  surface: 'terminal' as const,
  component: 'ToolUse' as const,
  viewport: FULLSCREEN,
  props: {
    tool_use_id: id,
    tool: 'Read',
    input: { file_path: file },
    isRunning: false,
    isErrored: false,
    isInterrupted: false,
    output: { file: { numLines: 12 } },
    ...extra,
  },
})

// The model's text between tool calls: a `turn.step` whose answer is not empty.
function stepper($: any, on: any): (answer: string) => Promise<void> {
  let said = ''
  on('turn.step', async function* () {
    return { turnId: 't1', index: 0, answer: said, toolUses: [], stopReason: 'end_turn', usage: null }
  })

  return async answer => {
    said = answer
    for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 1 })) {
      // The chunks are not needed; the step's result is what ends the run.
    }
  }
}

test('in fullscreen consecutive calls share one frame; text between them splits it', async ($, on) => {
  mock.clock(on)
  const say = stepper($, on)
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'u1' })
  await $.tool.call({ tool: 'Read', file_path: 'src/b.ts', tool_use_id: 'u2' })

  const first = await $.ui.mount(readRow('u1', 'src/a.ts'))
  const last = await $.ui.mount(readRow('u2', 'src/b.ts'))
  expect(await first.find({ type: 'Text', text: /^╭/ })).toBeDefined()
  expect(await first.find({ type: 'Text', text: /2 lệnh/ })).toBeDefined()
  expect(await first.find({ type: 'Text', text: /^╰/ })).toBeUndefined()
  expect(await last.find({ type: 'Text', text: /^╭/ })).toBeUndefined()
  expect(await last.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()

  await say('Đã đọc xong, giờ tìm tiếp.')
  await $.tool.call({ tool: 'Read', file_path: 'src/c.ts', tool_use_id: 'u3' })
  const after = await $.ui.mount(readRow('u3', 'src/c.ts'))
  expect(await after.find({ type: 'Text', text: /^╭/ })).toBeDefined()
  expect(await after.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
  expect(await $.ui.mount(readRow('u2', 'src/b.ts')).then(ui => ui.find({ type: 'Text', text: /^╰─+╯$/ }))).toBeDefined()
})

test('a finished run of four calls folds into its border and opens on demand', async ($, on) => {
  mock.clock(on)
  const say = stepper($, on)
  on('tool.call', () => ({ result: 'ok' }))
  const files = ['a', 'b', 'c', 'd']
  for (const f of files) await $.tool.call({ tool: 'Read', file_path: `src/${f}.ts`, tool_use_id: `c_${f}` })
  await say('Xong phần đọc.')

  const rows = await Promise.all(files.map(f => $.ui.mount(readRow(`c_${f}`, `src/${f}.ts`))))
  const [head, second] = rows as [(typeof rows)[number], (typeof rows)[number]]
  expect(await head.find({ type: 'Text', text: /4 lệnh/ })).toBeDefined()
  expect(await head.find({ text: /mở rộng/ })).toBeDefined()
  expect(await head.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
  expect(await head.find({ type: 'Text', text: 'src/a.ts' })).toBeUndefined()
  expect(await second.find({ type: 'Text', text: 'src/b.ts' })).toBeUndefined()

  await head.press({ key: 'fold-run:c_a' })
  expect(await head.find({ text: /thu gọn/ })).toBeDefined()
  expect(await head.find({ type: 'Text', text: 'src/a.ts' })).toBeDefined()
  expect(await second.find({ type: 'Text', text: 'src/b.ts' })).toBeDefined()
})

test('a run with a failed call does not fold', async ($, on) => {
  mock.clock(on)
  const say = stepper($, on)
  on('tool.call', (_$, e) => (e.tool_use_id === 'f_c' ? { deny: 'bị từ chối' } : { result: 'ok' }))
  const files = ['a', 'b', 'c', 'd']
  for (const f of files) await $.tool.call({ tool: 'Read', file_path: `src/${f}.ts`, tool_use_id: `f_${f}` })
  await say('Có một lệnh lỗi.')

  const head = await $.ui.mount(readRow('f_a', 'src/a.ts'))
  expect(await head.find({ type: 'Text', text: 'src/a.ts' })).toBeDefined()
  expect(await head.find({ text: /mở rộng/ })).toBeUndefined()
  expect(JSON.stringify(await head.find({ type: 'Text', text: /^╭/ }))).toContain('#F87C88')
})

test('the pane draws a timeline and an activity chart from tool calls', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: 'a.ts' })
  await $.tool.call({ tool: 'Grep', pattern: 'x' })

  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'acp-dash',
    props: { title: 'Phiên làm việc', isFocused: false, bodyColumns: 48, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })

  expect(await ui.find({ type: 'Text', text: /TIMELINE/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /HOẠT ĐỘNG/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /█/ })).toBeDefined()
})

const RUN_INPUT = { origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 120 } }
const USAGE = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('/enhance rewrites the draft with the session context and fills the prompt box', async ($, on) => {
  let asked = ''
  let filled = ''
  on('model.fork', (_$, e) => {
    asked = e.prompt
    return { value: { isAnswered: true as const, text: '```\nSửa lỗi viewport khi mở DevTools (F12).\n```', usage: USAGE } }
  })
  on('prompt.fill', (_$, e) => {
    filled = e.text
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })

  const ran = await $.command.run({ command: 'enhance', args: 'sửa lỗi viewport khi f12', ...RUN_INPUT })

  expect(asked).toContain('sửa lỗi viewport khi f12')
  expect(filled).toBe('Sửa lỗi viewport khi mở DevTools (F12).')
  expect(ran.text).toBeUndefined()
})

test('/enhance falls back to the session model in a new session', async ($, on) => {
  let filled = ''
  on('model.fork', () => ({ value: { isAnswered: false as const, reason: 'nothing-to-fork' as const, usage: USAGE } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('model.complete', () => ({ value: { isAnswered: true as const, text: 'Câu đã viết lại', usage: USAGE } }))
  on('prompt.fill', (_$, e) => {
    filled = e.text
    return { isFilled: true, text: e.text, cursor: 0 }
  })

  await $.command.run({ command: 'enhance', args: 'làm gì đó', ...RUN_INPUT })

  expect(filled).toBe('Câu đã viết lại')
})

test('the spinner and the turn line speak Vietnamese, one phrase per turn', async ($, on) => {
  // Stands for the engine's own spinner: it draws the word it is handed.
  on('ui.render', { component: 'Spinner' }, (_$, e) => {
    const { Text } = _$.ui.resolve(e)
    return <Text>{e.props.word}</Text>
  })
  const spin = (word: string, mode: 'thinking' | 'responding') =>
    $.ui.mount({ plugin: 'acp-ui', surface: 'terminal', component: 'Spinner', props: { word, message: null, suffix: '…', mode } })

  const a = await spin('Sauteing', 'responding')
  const b = await spin('Sauteing', 'responding')
  const thinking = await spin('Sauteing', 'thinking')
  expect(await a.find({ type: 'Text', text: /^Đang / })).toBeDefined()
  expect((await a.find({ type: 'Text', text: /^Đang / }))?.text).toBe((await b.find({ type: 'Text', text: /^Đang / }))?.text)
  expect(await thinking.find({ type: 'Text', text: /Đang (suy nghĩ|vắt óc|ngẫm nghĩ|cân não|thiền|nghĩ kế)/ })).toBeDefined()

  const done = await $.ui.mount({ plugin: 'acp-ui', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 72000 } })
  expect(await done.find({ type: 'Text', text: /trong 1m 12s/ })).toBeDefined()
})

test('/acp-theme lists themes, switches the palette and remembers the choice', async ($, on) => {
  mock.store(on)
  const run = (args: string) => $.command.run({ command: 'acp-theme', args, ...RUN_INPUT })

  expect((await run('')).text).toContain('tokyo-night')
  expect((await run('nope')).text).toContain('Không có bộ màu')
  expect((await run('github-light')).text).toContain('GitHub Light')
  expect((await run('')).text).toContain('`github-light`: GitHub Light (cho terminal nền sáng) ← đang dùng')

  // A user card now paints with the light theme's widget color.
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'UserMessage',
    props: { text: 'xin chào', origin: { kind: 'composer' }, isExpanded: false },
  })
  expect(await ui.find({ type: 'Text', text: /^▗▄+▖$/ })).toBeDefined()
  expect(JSON.stringify(await ui.find({ type: 'Text', text: /^▗▄+▖$/ }))).toContain('#EAEEF2')
  await run('spec-ade')
})

const BAND = {
  plugin: 'acp-ui',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('a running subagent shows on the band until its last turn ends', async ($, on) => {
  mock.clock(on)
  on('session.cwd', () => ({ value: 'E:/repo' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'master\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5', agentId: 'ag1' }))
  on('turn.complete', () => ({ text: '' }))
  // Stands for the engine's empty band, drawn when the mod has nothing to show.
  on('ui.render', { component: 'AbovePrompt' }, (_$, e) => {
    const { Box } = _$.ui.resolve(e)
    return <Box />
  })

  await $.agent.spawn({
    tool_use_id: 'tu_agent',
    prompt: 'tìm file',
    description: 'tìm file viewport',
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: true,
    fork: false,
  })
  const running = await $.ui.mount(BAND)
  expect(await running.find({ type: 'Text', text: /1 agent/ })).toBeDefined()
  expect(await running.find({ type: 'Text', text: /Explore ◌/ })).toBeDefined()

  await $.turn.complete({ reason: 'answer', answer: 'Tìm thấy 3 chỗ.', durationMs: 1000, isAborted: false, turnId: 't1', agentId: 'ag1' })
  const done = await $.ui.mount(BAND)
  expect(await done.find({ type: 'Text', text: /agent/ })).toBeUndefined()

  // The Agent call's card now reads as finished, with the answer's first line.
  const agentCard = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: { tool_use_id: 'tu_agent', tool: 'Agent', input: { description: 'tìm file viewport', prompt: '' }, isRunning: false, isErrored: false, isInterrupted: false },
  })
  expect(await agentCard.find({ type: 'Text', text: '✓' })).toBeDefined()
  expect(await agentCard.find({ type: 'Text', text: 'Tìm thấy 3 chỗ.' })).toBeDefined()
})

test('an Agent call draws as a card with its type and task', async ($, on) => {
  mock.clock(on)
  const ui = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolUse',
    props: {
      tool_use_id: 'tu_agent',
      tool: 'Agent',
      input: { description: 'tìm chỗ xử lý DevTools', prompt: '...', subagent_type: 'Explore' },
      isRunning: true,
      isErrored: false,
      isInterrupted: false,
    },
  })

  expect(await ui.find({ type: 'Text', text: '◆' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Explore' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'tìm chỗ xử lý DevTools' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '◌' })).toBeDefined()
})

const WORKING_BAND = {
  plugin: 'acp-ui',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 80, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const

test('while Claude works, the cat walks the band saying what it does', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: 'src/panel/viewport.ts' })

  const ui = await $.ui.mount(WORKING_BAND)
  // The bubble types its words out over a few frames.
  await ui.advance(2000)
  expect(await ui.find({ type: 'Text', text: /Đang đọc src\/panel\/viewport\.ts/, in: 'scene' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▀|▄/, in: 'scene' })).toBeDefined()
})

test('the scene keeps moving with no new tool call: the cat paces, the ground scrolls', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ui = await $.ui.mount(WORKING_BAND)
  const frames = new Set<string>()
  for (let i = 0; i < 6; i += 1) {
    frames.add(JSON.stringify(await ui.drawn({ in: 'scene' })))
    await ui.advance(210)
  }
  expect(frames.size).toBeGreaterThan(4)
})

test('/play turns the band into the Né bug game, which ends on a hit and restarts on Space', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const played = await $.command.run({ command: 'play', args: '', ...RUN_INPUT })
  expect(played.text).toContain('Bật Né bug')

  const ui = await $.ui.mount({ ...WORKING_BAND, props: { ...WORKING_BAND.props, isWorking: false } })
  expect(await ui.find({ type: 'Text', text: /Né bug · 0 điểm/, in: 'scene' })).toBeDefined()
  expect(await ui.find({ key: 'jump' })).toBeDefined()

  // No jumping: the first bug reaches the cat and the round ends.
  await ui.advance(12000)
  expect(await ui.find({ type: 'Text', text: /Trúng bug!/, in: 'scene' })).toBeDefined()

  await ui.key({ key: ' ', in: 'scene' })
  expect(await ui.find({ type: 'Text', text: /Né bug · 0 điểm/, in: 'scene' })).toBeDefined()
})

const RETRIEVAL = 'mcp__viber-context__codebase_retrieval'

// Stands for the plugin that draws the tool's own header and result.
function drawForeign(on: Parameters<Parameters<typeof test>[1]>[1]) {
  on('ui.render', { component: 'ToolUse', surface: 'terminal' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>◎ Retrieval header</Text>
  })
  on('ui.render', { component: 'ToolResult', surface: 'terminal' }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Text>README.md#L72-76</Text>
        <Text>+4 more</Text>
      </Box>
    )
  })
}

const foreignUse = (state: Record<string, unknown>) => ({
  plugin: 'acp-ui',
  surface: 'terminal' as const,
  component: 'ToolUse' as const,
  props: { tool_use_id: 'tu_f', tool: RETRIEVAL, input: { information_request: 'q' }, ...quiet, ...state },
})

test('a finished foreign tool draws its header and result in one frame', async ($, on) => {
  drawForeign(on)
  const use = await $.ui.mount(foreignUse({ output: { chunks: 8 } }))
  const result = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolResult',
    props: { tool_use_id: 'tu_f', tool: RETRIEVAL, output: { chunks: 8 }, isErrored: false },
  })

  // The row opens the frame and leaves it open; the result block closes it.
  expect(await use.find({ type: 'Text', text: /^╭─+╮$/ })).toBeDefined()
  expect(await use.find({ type: 'Text', text: '◎ Retrieval header' })).toBeDefined()
  expect(await use.find({ type: 'Text', text: /^│/ })).toBeDefined()
  expect(await use.find({ type: 'Text', text: /^╰/ })).toBeUndefined()
  expect(await result.find({ type: 'Text', text: /^╭/ })).toBeUndefined()
  expect(await result.find({ type: 'Text', text: 'README.md#L72-76' })).toBeDefined()
  expect(await result.find({ type: 'Text', text: '+4 more' })).toBeDefined()
  expect(await result.find({ type: 'Text', text: /^│/ })).toBeDefined()
  expect(await result.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
})

test('a running foreign tool closes its own frame, in the accent colour', async ($, on) => {
  drawForeign(on)
  const use = await $.ui.mount(foreignUse({ isRunning: true }))

  expect(await use.find({ type: 'Text', text: /^╭─+╮$/ })).toBeDefined()
  expect(await use.find({ type: 'Text', text: '◎ Retrieval header' })).toBeDefined()
  expect(await use.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
  const top = await use.find({ type: 'Text', text: /^╭─+╮$/ })
  const bottom = await use.find({ type: 'Text', text: /^╰─+╯$/ })
  expect(bottom?.props?.color).toBe(top?.props?.color)
  const done = await (await $.ui.mount(foreignUse({ output: {} }))).find({ type: 'Text', text: /^╭─+╮$/ })
  expect(top?.props?.color).not.toBe(done?.props?.color)
})

test('a failed foreign tool draws a red frame, closed by its result', async ($, on) => {
  drawForeign(on)
  const use = await $.ui.mount(foreignUse({ isErrored: true, output: 'boom' }))
  const result = await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolResult',
    props: { tool_use_id: 'tu_f', tool: RETRIEVAL, output: 'boom', isErrored: true },
  })

  const top = await use.find({ type: 'Text', text: /^╭─+╮$/ })
  const bottom = await result.find({ type: 'Text', text: /^╰─+╯$/ })
  const ok = await (await $.ui.mount(foreignUse({ output: {} }))).find({ type: 'Text', text: /^╭─+╮$/ })
  expect(bottom?.props?.color).toBe(top?.props?.color)
  expect(top?.props?.color).not.toBe(ok?.props?.color)
})

test('a foreign tool in an expanded group closes its frame in the row', async ($, on) => {
  drawForeign(on)
  on('ui.render', { component: 'ToolGroup', surface: 'terminal' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine rows</Text>
  })
  await $.ui.mount({
    plugin: 'acp-ui',
    surface: 'terminal',
    component: 'ToolGroup',
    props: {
      calls: [{ tool_use_id: 'tu_f', tool: RETRIEVAL, input: {}, ...quiet, output: { chunks: 1 } }],
      isActive: false,
      isExpanded: true,
    },
  })
  const use = await $.ui.mount(foreignUse({ output: { chunks: 1 } }))

  expect(await use.find({ type: 'Text', text: /^╰─+╯$/ })).toBeDefined()
})

test('a tool the mod neither draws nor frames keeps the engine row', async ($, on) => {
  drawForeign(on)
  const use = await $.ui.mount({ ...foreignUse({ output: {} }), props: { tool_use_id: 'tu_t', tool: 'TodoWrite', input: {}, ...quiet, output: {} } })

  expect(await use.find({ type: 'Text', text: /^╭/ })).toBeUndefined()
  expect(await use.find({ type: 'Text', text: '◎ Retrieval header' })).toBeDefined()
})
