/**
 * Hosts where the frozen Adaptive Task layer is unavailable by design.
 *
 * `compatibility.json` drives two different questions from one list: "does the plugin install and
 * serve a provider here" (every declared version, including the install matrix) and "is the frozen
 * task layer fully usable here" (only hosts whose AgentRegistry still exposes every member the
 * layer calls). DSH 0.2.2-rc.1/rc.2 answer yes to the first and no to the second, so the task
 * matrices must not receive them. Conflating the two purposes is what broke CI run 43255512128:
 * adding a host for installation coverage silently changed what the task assertions had to prove.
 *
 * This table is explicit on purpose: an excluded host is a recorded decision, not a silent skip.
 * The capability-derived replacement (reading the host's own AgentRegistry surface, which the
 * installation matrix already records) is the follow-up; until then a stale or contradictory entry
 * fails closed here instead of quietly widening or narrowing coverage.
 */
export const TASK_UNAVAILABLE_HOSTS = Object.freeze({
  '0.2.2-rc.1': 'AgentRegistry dropped the members the task layer calls',
  '0.2.2-rc.2': 'AgentRegistry dropped the members the task layer calls',
  // rc.3 keeps `currentInitiator` but still exposes neither `roots` nor `isOwnedBy`, so the frozen
  // task layer cannot enumerate roots or prove ownership here either.
  '0.2.2-rc.3': 'AgentRegistry still lacks the members the task layer calls',
})

/**
 * Narrow the declared host list to the hosts the task matrices may exercise.
 * @param {string[]} declaredVersions - every version declared in compatibility.json
 * @param {string} recoveryHost - the exact host that runs the bespoke recovery suite instead
 * @returns {string[]} the versions the task matrices run on
 */
export function taskMatrixVersions(declaredVersions, recoveryHost) {
  const undeclared = Object.keys(TASK_UNAVAILABLE_HOSTS).filter(version => !declaredVersions.includes(version))
  if (undeclared.length > 0) {
    throw new Error(`task availability table names hosts that are no longer declared: ${undeclared.join(', ')}`)
  }
  if (TASK_UNAVAILABLE_HOSTS[recoveryHost] !== undefined) {
    throw new Error(`the recovery host ${recoveryHost} must not also be marked task-unavailable`)
  }
  return declaredVersions.filter(version => TASK_UNAVAILABLE_HOSTS[version] === undefined)
}
