/**
 * Direction guard for the capability gate that keeps the frozen Adaptive Task layer off hosts
 * which removed `AgentRegistry.roots()` / `isOwnedBy()`.
 *
 * An inverted gate would silently reproduce the original failure, so each direction is pinned.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { hostSupportsAdaptiveTask } from '../src/adaptive-task-host-support.ts'

function contextWith(agents: unknown): Context {
  return { get: (name: string) => (name === 'agents' ? agents : undefined) } as unknown as Context
}

describe('hostSupportsAdaptiveTask', () => {
  it('accepts a registry that still exposes both members', () => {
    expect(hostSupportsAdaptiveTask(contextWith({ roots() {}, isOwnedBy() {} }))).toBe(true)
  })
  it('rejects a registry that dropped roots()', () => {
    expect(hostSupportsAdaptiveTask(contextWith({ isOwnedBy() {} }))).toBe(false)
  })
  it('rejects a registry that dropped isOwnedBy()', () => {
    expect(hostSupportsAdaptiveTask(contextWith({ roots() {} }))).toBe(false)
  })
  it('rejects a host without an agent registry', () => {
    expect(hostSupportsAdaptiveTask(contextWith(undefined))).toBe(false)
  })
})
