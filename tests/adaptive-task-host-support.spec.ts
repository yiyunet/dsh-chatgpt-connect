/**
 * Direction guard for the capability gate that keeps the frozen Adaptive Task layer off hosts
 * which removed `AgentRegistry.roots()` / `isOwnedBy()`.
 *
 * Two failure shapes must not be confused:
 *  - a host without `agents` or `sessions` — the existing paths already answer `TASK_LIVE_ROOT_REQUIRED`;
 *  - a host that provides both services but removed a registry member — only this gate catches it.
 * An inverted or over-eager gate silently reproduces the original failure, so both are pinned here.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { hostSupportsAdaptiveTask } from '../src/adaptive-task-host-support.ts'

function contextWith(agents: unknown, sessions: unknown = {}): Context {
  return {
    get: (name: string) => (name === 'agents' ? agents : name === 'sessions' ? sessions : undefined),
  } as unknown as Context
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
  it('leaves a host without task services to the existing TASK_LIVE_ROOT_REQUIRED contract', () => {
    expect(hostSupportsAdaptiveTask(contextWith(undefined))).toBe(true)
    expect(hostSupportsAdaptiveTask(contextWith({ roots() {}, isOwnedBy() {} }, undefined))).toBe(true)
  })
})
