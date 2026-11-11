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
 * Report whether Adaptive Task can run: every registry member it calls is still a function.
 *
 * A host that provides neither `agents` nor `sessions` is reported as supported on purpose. That
 * shape is not "a newer host removed an API" — it is a host without the task services, and the
 * existing paths already answer it with `TASK_LIVE_ROOT_REQUIRED`. Judging it here would replace a
 * more specific, already-tested failure with a vaguer one.
 */
export function hostSupportsAdaptiveTask(ctx: Context): boolean {
  const agents = ctx.get('agents')
  if (agents === undefined || ctx.get('sessions') === undefined) return true
  const registry = agents as unknown as Record<string, unknown>
  return REQUIRED_REGISTRY_MEMBERS.every(member => typeof registry[member] === 'function')
}
