/**
 * Every host surface the frozen Adaptive Task layer calls, declared once.
 *
 * The 0.2.2-rc.2 failure was not a missing declaration but a *partial* one: the gate named only the
 * two members that had already been removed. The next host change could therefore remove a third
 * member and crash on first use exactly as before, with the gate still reporting a healthy host.
 *
 * Declaring the whole surface here has two effects:
 *  - the task layer degrades as soon as *any* member it calls disappears, not only the two we
 *    happened to memorise;
 *  - a host change surfaces as a named missing capability instead of a stack trace raised from
 *    inside a request hook, which is what made the original failure land on every model request.
 *
 * Keep this list in step with `adaptive-task-control-runtime.ts`, `adaptive-task-delegation*.ts` and
 * `adaptive-task-runtime.ts`. B4 (`check-dsh-next`) loads the built plugin against a candidate host
 * and asserts every name here, so an accidental extra or stale entry fails a real host check rather
 * than surviving as a comment.
 */

/** Services the task layer resolves through `ctx.get`. */
export const ADAPTIVE_TASK_HOST_SERVICES = ['agents', 'sessions'] as const

/** `AgentRegistry` members the task layer calls directly. */
export const ADAPTIVE_TASK_REGISTRY_MEMBERS = [
  'get',
  'list',
  'create',
  'roots',
  'isOwnedBy',
  'currentInitiator',
] as const

export const ADAPTIVE_TASK_HOST_CONTRACT = {
  services: ADAPTIVE_TASK_HOST_SERVICES,
  registryMembers: ADAPTIVE_TASK_REGISTRY_MEMBERS,
} as const
