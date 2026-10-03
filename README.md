# claude-acp-ui

A [Claude Code](https://code.claude.com) mod that restyles the terminal like an ACP chat (the look of spec-ade's agent panel), using only what a terminal can draw: colored cells, block characters, one monospace font.

- **Prompt card**: your message sits in a filled card with `›`.
- **Tool frames**: tool calls draw in a full-width rounded frame (`╭─╮ │ ╰─╯`) with no filled block. Consecutive calls share one frame, a row each: status (`✓ ◌ ✗ ■`), the tool, its target and a right-aligned summary (`142 dòng`, `4 file`, `24 passed`, a shell command's output as `N dòng`) with how long it took. The top border says `N lệnh · time`. The border takes the state's colour (blue while a call runs, red after a failure, grey-blue otherwise); a running row is filled blue, and a failed shell row adds a `└` line with the last error line. In fullscreen a finished run of 4 or more clean calls folds behind `▸ mở rộng`; text from Claude between calls starts a new frame. On the main screen rows cannot redraw, so each call is its own frame. A tool from another plugin or an MCP server (`mcp__…`) keeps its own header and result but draws inside the same frame, one per call, never grouped.
- **Inline diffs**: Edit / MultiEdit rows show the changed lines on red and green rows, syntax-highlighted, `−N +N` at the edge. In fullscreen a diff over 4 lines folds behind `▸ diff`.
- **Hover cards** (fullscreen): hover a tool row for the full command, how long it ran and its last output lines; hover a changed file in `/dash` for its first changed lines.
- **Subagent cards**: an Agent call draws as a live card: `◌ ◆ Explore  find the viewport code  6 tool · 12s`, its last three steps under it while it runs, then `✓` with the files it read and edited and the first line of its answer. In fullscreen, hover it for every step and the head of the answer. A toast says when each subagent finishes.
- **Status band** above the prompt: branch, changed-file count, running subagents (`◆ 2 agent: Explore ◌ · Plan ◌`), model, context bar.
- **Footer**: test result, session minutes and cost after the hint line.
- **`/dash` pane** (type `/dash` again to close it): totals, a timeline of what Claude did (think, read, search, edit, run), tool calls per minute, per-tool bars, changed files with `−/+` counts, current commit.
- **`/enhance <prompt>`**: rewrites a rough prompt into a clear one using the conversation so far (same model, cached context), keeps your language, and puts it in the prompt box so you can edit before pressing Enter. In a new session it falls back to the session model without context.
- **Vietnamese spinner**: the working line reads `Đang pha cà phê…`, `Đang soi bug…` (or `Đang vắt óc…` while thinking) instead of the sampled English word, one phrase per turn; the closing line reads `✻ Pha xong cà phê trong 1m 12s`.
- **Themes**: `/acp-theme` lists them, `/acp-theme <name>` switches and remembers the choice across sessions: `spec-ade` (default), `tokyo-night`, `dracula`, `catppuccin`, `github-light` (for light terminals).
- **Cat scene** above the prompt while Claude works: a pixel cat walks a track toward its house as the turn goes on, with a speech bubble saying what is happening (`Đang đọc viewport.ts`, `Explore: đang tìm "devtools"`). `/acp-scene` turns it off or on.
- **Né bug** (`/play`): a jump-over-the-bugs game in the same band while you wait. Focus the band with `Ctrl+X` then `Tab` and press `j` to jump (`q` quits); in fullscreen, click the scene and use `Space`. The round ends with the turn, and the best score is kept.
- **Toast** when a turn of 15 s or more finishes.

The prompt and subagent cards get half a row of padding and corners cut by half a cell from quadrant blocks (`▗▄▖`, `▝▀▘`); bars fill in eighths of a cell.

## Install

As a Claude Code plugin, from this repository's marketplace. Inside Claude Code:

```
/plugin marketplace add huydepzai121/claude-acp-ui
/plugin install acp-ui@claude-acp-ui
```

Or from a shell:

```sh
claude plugin marketplace add huydepzai121/claude-acp-ui
claude plugin install acp-ui@claude-acp-ui
```

Start a new Claude Code session to see it. Update with `claude plugin marketplace update claude-acp-ui`; disable or remove it from `/plugin`.

### Without the marketplace

```sh
npx claude-acp-ui            # copies the mod to ~/.claude/mods/acp-ui and lists it in CLAUDE_CODE_PLUGIN_DIRS
npx claude-acp-ui uninstall  # undoes both
claude --plugin-dir "$(npx claude-acp-ui path)"   # one session only, nothing installed
```

Use one way or the other, not both: two copies load as two plugins of the same name.

## Requirements

- Claude Code 2.1.287 or newer. Function-hook mods are early access and the API may change between releases.
- A dark terminal theme, or `/acp-theme github-light` on a light one.
- A font that draws Unicode block elements. Windows Terminal, iTerm2, kitty, WezTerm and Ghostty all do.

## Limits

- The prompt input box (its rules and `❯`) is drawn by Claude Code; a mod cannot restyle it.
- The `/dash` pane docks beside the transcript only in fullscreen mode (`/tui fullscreen`) at 110+ columns; otherwise it opens above the prompt.
- Text added to the hint line is drawn dim.
- The test result is a guess: a Bash command naming `test`, `vitest`, `jest`, `pytest` or `playwright` counts as a test run, pass or fail by its exit status.
- Edit diffs show the changed lines without file line numbers. Highlighting is a small per-line tokenizer, not a full grammar.
- Hover and the fold toggle need the mouse, so they work in fullscreen only; on the main screen diffs show open, up to 10 lines.
- A folded group that holds a tool this plugin does not draw (another plugin's tool, an agent call) is left to the next hook or the engine instead of getting the group card.
- A framed MCP tool's result block closes its frame; a call shown with no separate result block (an expanded group) closes it in the row, and an interrupted call's result bar takes the normal frame colour. Side bars are a column of `│` sized to the block, so a result block taller than 400 rows loses them below that.
- "think" on the timeline is a guess: a quiet gap of 3 s or more between tool calls.

## Develop

```sh
npm run validate   # claude plugin validate plugin
npm test           # claude plugin test plugin
```

The mod lives in `plugin/`: `hooks/register.tsx` is the hooks module, `types/index.d.ts` its state contract.

## License

MIT
