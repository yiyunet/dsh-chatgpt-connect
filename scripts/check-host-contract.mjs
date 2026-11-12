#!/usr/bin/env node
/**
 * Keep src/host-contract.ts in step with the registry members the code actually calls.
 *
 * The DSH 0.2.2-rc.2 failure happened because the capability gate named only the two members that
 * had already been removed. A hand-maintained list drifts in two directions and both are harmful:
 *
 *  - a member the code calls but the contract omits -> the gate waves that host through and the
 *    frozen task layer crashes on first use, which is exactly the original failure;
 *  - a member the contract names but the code never calls -> the gate disables a healthy host,
 *    turning a defensive check into a regression.
 *
 * This check fails on either direction, so the list cannot quietly become decoration.
 *
 * Known limitation: only receivers spelled `agents` are recognised, and only inside the Adaptive
 * Task layer. Two narrower scopes were tried and rejected as false positives rather than tuning:
 * a bare `registry` identifier swept in `Map`/`Set` methods because that name is not unique here,
 * and scanning all of `src` swept in `provider-proxy.ts`, which keeps its own `agents` map of proxy
 * agents. The per-host surface report is the runtime counterpart that covers what a text scan
 * cannot.
 */
import { readDeclaredRegistryMembers } from './host-contract-members.mjs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONTRACT_FILE = join(ROOT, 'src/host-contract.ts')
/** The contract describes this layer; only these files may own AgentRegistry call sites. */
const TASK_LAYER = /^adaptive-task-.*\.ts$/u

async function typescriptSources(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await typescriptSources(full))
    else if (TASK_LAYER.test(entry.name)) found.push(full)
  }
  return found
}

const membersIn = (text, pattern) => [...text.matchAll(pattern)].map(match => match[1])

const CALL_PATTERNS = [
  /\bagents\??\.([A-Za-z][A-Za-z0-9_]*)\s*\(/gu,
  /get\(\s*['"]agents['"]\s*\)\?\.([A-Za-z][A-Za-z0-9_]*)\s*\(/gu,
]

async function main() {
  const declared = await readDeclaredRegistryMembers(CONTRACT_FILE)
  const called = new Set()
  const scanned = await typescriptSources(join(ROOT, 'src'))
  for (const file of scanned) {
    if (file === CONTRACT_FILE) continue
    const text = await readFile(file, 'utf8')
    for (const pattern of CALL_PATTERNS) for (const member of membersIn(text, pattern)) called.add(member)
  }
  const undeclared = [...called].filter(member => !declared.includes(member)).sort()
  const unused = declared.filter(member => !called.has(member))
  const failures = []
  if (declared.length === 0) failures.push('the registry member list is empty')
  if (new Set(declared).size !== declared.length) failures.push('the registry member list contains duplicates')
  if (undeclared.length > 0) failures.push(`called from src but not declared: ${undeclared.join(', ')}`)
  if (unused.length > 0) failures.push(`declared but never called from src: ${unused.join(', ')}`)
  if (failures.length > 0) throw new Error(failures.join('; '))
  process.stdout.write(`host contract: ${declared.length} members declared and every one is reachable from the ${scanned.length} task-layer files scanned\n`)
}

try {
  await main()
} catch (error) {
  process.stderr.write(`check-host-contract: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
