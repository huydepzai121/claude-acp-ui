#!/usr/bin/env node
// Installs the acp-ui mod: copies it under the Claude config folder and lists
// that folder in CLAUDE_CODE_PLUGIN_DIRS in the env block of the user's
// settings.json, which Claude Code reads at every start.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN = 'acp-ui'
const ENV_KEY = 'CLAUDE_CODE_PLUGIN_DIRS'
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'plugin')
const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
const target = join(claudeDir, 'mods', PLUGIN)
const settingsPath = join(claudeDir, 'settings.json')

const isOurs = dir => {
  try {
    return JSON.parse(readFileSync(join(dir, '.claude-plugin', 'plugin.json'), 'utf8')).name === PLUGIN
  } catch {
    return false
  }
}

function readSettings() {
  if (!existsSync(settingsPath)) return {}
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf8'))
  } catch (error) {
    console.error(`Cannot parse ${settingsPath}: ${error.message}. Fix it, then run this again.`)
    process.exit(1)
  }
}

function writeSettings(settings) {
  mkdirSync(claudeDir, { recursive: true })
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
}

const pluginDirs = settings => (settings.env?.[ENV_KEY] ?? '').split(delimiter).filter(Boolean)

const samePath = (a, b) =>
  process.platform === 'win32' ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b)

function install() {
  const settings = readSettings()
  if (existsSync(target)) {
    if (!isOurs(target)) {
      console.error(`${target} exists and is not the ${PLUGIN} mod; leaving it alone.`)
      process.exit(1)
    }
    rmSync(target, { recursive: true, force: true })
  }
  cpSync(source, target, {
    recursive: true,
    // Tests and the files the engine generates beside a mod are not shipped.
    filter: path => {
      const rel = relative(source, path)
      return !rel.startsWith('tests') && !rel.startsWith(join('.claude-plugin', 'types')) && rel !== 'tsconfig.json'
    },
  })

  const dirs = pluginDirs(settings)
  if (!dirs.some(dir => samePath(dir, target))) {
    settings.env = { ...settings.env, [ENV_KEY]: [...dirs, target].join(delimiter) }
    writeSettings(settings)
  }

  console.log(`Installed ${PLUGIN} to ${target}`)
  console.log(`Listed it in ${ENV_KEY} in ${settingsPath}`)
  console.log('Start a new Claude Code session to load it. Type /dash for the session pane.')
}

function uninstall() {
  const settings = readSettings()
  const dirs = pluginDirs(settings)
  const kept = dirs.filter(dir => !samePath(dir, target))
  if (kept.length !== dirs.length) {
    const env = { ...settings.env }
    if (kept.length > 0) env[ENV_KEY] = kept.join(delimiter)
    else delete env[ENV_KEY]
    if (Object.keys(env).length > 0) settings.env = env
    else delete settings.env
    writeSettings(settings)
    console.log(`Removed ${PLUGIN} from ${ENV_KEY} in ${settingsPath}`)
  }

  if (!existsSync(target)) {
    console.log(`${PLUGIN} is not installed at ${target}`)
    return
  }
  if (!isOurs(target)) {
    console.error(`${target} is not the ${PLUGIN} mod; leaving it alone.`)
    process.exit(1)
  }
  rmSync(target, { recursive: true, force: true })
  console.log(`Removed ${target}`)
}

const help = `Usage: claude-acp-ui [install|uninstall|path]

  install     copy the mod to ${target}
              and list it in ${ENV_KEY} in ${settingsPath} (default)
  uninstall   undo both
  path        print the bundled plugin folder (for claude --plugin-dir)`

const command = process.argv[2] ?? 'install'

switch (command) {
  case 'install':
    install()
    break
  case 'uninstall':
    uninstall()
    break
  case 'path':
    console.log(source)
    break
  default:
    console.log(help)
    process.exit(command === 'help' || command === '--help' ? 0 : 1)
}
