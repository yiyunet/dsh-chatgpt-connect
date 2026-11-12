/**
 * Direction guard for the capability gate that keeps the frozen Adaptive Task layer off hosts which
 * no longer provide a registry member it calls.
 *
 * Three failure shapes must not be confused:
 *  - a host without `agents` or `sessions` — the existing paths already answer `TASK_LIVE_ROOT_REQUIRED`;
 *  - a host that removed one of the two members the DSH 0.2.2-rc.2 line dropped (`roots`, `isOwnedBy`);
 *  - a host that removes *any other* member the layer calls (`get`, `list`, `create`,
 *    `currentInitiator`). The previous two-member gate waved those hosts through and the layer then
 *    crashed on first use, which is the failure this whole gate exists to prevent.
 * An inverted or over-eager gate silently reproduces the original failure, so all three are pinned.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { hostSupportsAdaptiveTask, missingAdaptiveTaskHostMembers } from '../src/adaptive-task-host-support.ts'
import { ADAPTIVE_TASK_REGISTRY_MEMBERS } from '../src/host-contract.ts'

function fullRegistry(): Record<string, unknown> {
  return {
    get() { return undefined },
    list() { return [] },
    create() { return undefined },
    roots() { return [] },
    isOwnedBy() { return false },
    currentInitiator() { return undefined },
  }
}

function registryWithout(...removed: string[]): Record<string, unknown> {
  const registry = fullRegistry()
  for (const member of removed) delete registry[member]
  return registry
}

function contextWith(agents: unknown, sessions: unknown = {}): Context {
  return {
    get: (name: string) => (name === 'agents' ? agents : name === 'sessions' ? sessions : undefined),
  } as unknown as Context
}

describe('missingAdaptiveTaskHostMembers', () => {
  it('reports nothing for a registry that still exposes every member', () => {
    expect(missingAdaptiveTaskHostMembers(contextWith(fullRegistry()))).toEqual([])
  })

  it('names exactly the removed members', () => {
    expect(missingAdaptiveTaskHostMembers(contextWith(registryWithout('roots', 'isOwnedBy'))))
      .toEqual(['roots', 'isOwnedBy'])
    expect(missingAdaptiveTaskHostMembers(contextWith(registryWithout('currentInitiator'))))
      .toEqual(['currentInitiator'])
  })

  it('treats a non-function member as missing', () => {
    expect(missingAdaptiveTaskHostMembers(contextWith({ ...fullRegistry(), list: [] }))).toEqual(['list'])
  })

  it('defers to TASK_LIVE_ROOT_REQUIRED when the task services are absent', () => {
    expect(missingAdaptiveTaskHostMembers(contextWith(undefined))).toEqual([])
    expect(missingAdaptiveTaskHostMembers(contextWith(fullRegistry(), undefined))).toEqual([])
  })
})

describe('hostSupportsAdaptiveTask', () => {
  it('accepts a registry that still exposes every member', () => {
    expect(hostSupportsAdaptiveTask(contextWith(fullRegistry()))).toBe(true)
  })

  it('rejects a registry that dropped roots()', () => {
    expect(hostSupportsAdaptiveTask(contextWith(registryWithout('roots')))).toBe(false)
  })

  it('rejects a registry that dropped isOwnedBy()', () => {
    expect(hostSupportsAdaptiveTask(contextWith(registryWithout('isOwnedBy')))).toBe(false)
  })

  it.each(['get', 'list', 'create', 'currentInitiator'])('rejects a registry that dropped %s()', member => {
    expect(hostSupportsAdaptiveTask(contextWith(registryWithout(member)))).toBe(false)
  })

  it('leaves a host without task services to the existing TASK_LIVE_ROOT_REQUIRED contract', () => {
    expect(hostSupportsAdaptiveTask(contextWith(undefined))).toBe(true)
    expect(hostSupportsAdaptiveTask(contextWith(fullRegistry(), undefined))).toBe(true)
  })
})

describe('adaptive task host contract', () => {
  it('lists each call site member exactly once', () => {
    expect(new Set(ADAPTIVE_TASK_REGISTRY_MEMBERS).size).toBe(ADAPTIVE_TASK_REGISTRY_MEMBERS.length)
    expect([...ADAPTIVE_TASK_REGISTRY_MEMBERS])
      .toEqual(['get', 'list', 'create', 'roots', 'isOwnedBy', 'currentInitiator'])
  })
})
