/**
 * Host capability detection for the frozen Adaptive Task layer.
 *
 * Newer DSH releases dropped `AgentRegistry.roots()` and `AgentRegistry.isOwnedBy()`. Adaptive Task
 * is frozen, so a host without them must keep the plugin's provider, image and proxy paths working
 * and simply not assemble the task layer — instead of failing every model request on a removed API.
 */
import type { Context } from '@deepseek-ai/cordis'

/** Registry members the adaptive-task layer still calls; a host may remove either of them. */
const REQUIRED_REGISTRY_MEMBERS = ['roots', 'isOwnedBy'] as const

/**
 * Report whether the running host still exposes every registry member Adaptive Task relies on.
 * Missing `agents` is also reported as unsupported: the task layer has never worked without it.
 */
export function hostSupportsAdaptiveTask(ctx: Context): boolean {
  const agents = ctx.get('agents')
  if (agents === undefined) return false
  const registry = agents as unknown as Record<string, unknown>
  return REQUIRED_REGISTRY_MEMBERS.every(member => typeof registry[member] === 'function')
}
