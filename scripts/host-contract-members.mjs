/**
 * Read the Adaptive Task host contract from its single source in src/host-contract.ts.
 *
 * Scripts cannot import TypeScript, and copying the member list into each script would recreate
 * exactly the drift the contract exists to prevent. Parsing one array literal is the smallest
 * honest bridge, and it fails closed: a changed shape throws instead of quietly yielding an empty
 * list, which would let every downstream check pass against nothing.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const CONTRACT_SOURCE = fileURLToPath(new URL('../src/host-contract.ts', import.meta.url))
export const AGENT_PACKAGE = '@deepseek-ai/dsh-agent'

const DECLARATION = /ADAPTIVE_TASK_REGISTRY_MEMBERS\s*=\s*\[([\s\S]*?)\n\]/u

/** @returns {Promise<string[]>} the declared registry members, in declaration order. */
export async function readDeclaredRegistryMembers(source = CONTRACT_SOURCE) {
  const text = await readFile(source, 'utf8')
  const block = DECLARATION.exec(text)?.[1]
  if (block === undefined) {
    throw new Error('src/host-contract.ts must declare ADAPTIVE_TASK_REGISTRY_MEMBERS as a multi-line array literal')
  }
  const members = [...block.matchAll(/'([A-Za-z][A-Za-z0-9_]*)'/gu)].map(match => match[1])
  if (members.length === 0) throw new Error('the registry member list is empty')
  if (new Set(members).size !== members.length) throw new Error('the registry member list contains duplicates')
  return members
}

/**
 * Accept only a surface record whose `present` and `missing` partition `members`.
 *
 * The record is evidence, not a requirement: a host that dropped a member is expected and is
 * handled by the plugin's capability gate. What must not happen is an ambiguous record — a name in
 * both lists, a name in neither, or a member repeated — because that would make a matrix diff
 * unreadable precisely when someone is debugging a host change.
 */
export function validHostContract(value) {
  if (value?.package !== AGENT_PACKAGE) return false
  const { members, present, missing } = value
  if (!Array.isArray(members) || members.length === 0) return false
  if (!Array.isArray(present) || !Array.isArray(missing)) return false
  if (new Set(members).size !== members.length) return false
  if (new Set([...present, ...missing]).size !== members.length) return false
  return present.every(member => !missing.includes(member))
}
