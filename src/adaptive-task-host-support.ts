/**
 * Host capability detection for the frozen Adaptive Task layer.
 *
 * Newer DSH releases dropped `AgentRegistry.roots()` and `AgentRegistry.isOwnedBy()`. Adaptive Task
 * is frozen, so a host without them must keep the plugin's provider, image and proxy paths working
 * and simply not assemble the task layer — instead of failing every model request on a removed API.
 */
import type { Context } from '@deepseek-ai/cordis'
import { ADAPTIVE_TASK_REGISTRY_MEMBERS } from './host-contract.ts'

/**
 * Report which registry members this host no longer provides.
 *
 * The list is empty both for a fully capable host and for a host without the task services at all.
 * The second shape is not "a newer host removed an API" — it is a host that never had the task
 * services, and the existing paths already answer it with `TASK_LIVE_ROOT_REQUIRED`. Judging it
 * here would replace a more specific, already-tested failure with a vaguer one, which is why the
 * deferral below is deliberate rather than an omission.
 */
export function missingAdaptiveTaskHostMembers(ctx: Context): string[] {
  const agents = ctx.get('agents')
  if (agents === undefined || ctx.get('sessions') === undefined) return []
  const registry = agents as unknown as Record<string, unknown>
  return ADAPTIVE_TASK_REGISTRY_MEMBERS.filter(member => typeof registry[member] !== 'function')
}

/** Report whether every registry member the task layer calls is still a function. */
export function hostSupportsAdaptiveTask(ctx: Context): boolean {
  return missingAdaptiveTaskHostMembers(ctx).length === 0
}
