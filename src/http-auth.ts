/** Host-owned authentication for plugin HTTP routes; origin trust is an additional restriction. */
import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'

export interface HarnessHttpRejection {
  status: 401 | 403 | 503
  error: 'DSH_BROWSER_AUTH_REQUIRED' | 'forbidden' | 'DSH_CONNECTION_UNAVAILABLE'
}

const UNAVAILABLE: HarnessHttpRejection = { status: 503, error: 'DSH_CONNECTION_UNAVAILABLE' }

/** The two admission spellings DSH has shipped, probed at call time. */
interface AdmissionSurface {
  admit?: (request: { readonly headers: IncomingMessage['headers'] }) => {
    readonly peer?: unknown
    readonly rejection?: 401 | 403 | 503
  } | undefined
  requestRejection?: (request: IncomingMessage) => 401 | 403 | undefined
}

/** Map a known refusal; anything else is `undefined` so callers fail closed rather than open. */
function refusal(status: 401 | 403 | 503 | undefined): HarnessHttpRejection | undefined {
  if (status === 401) return { status: 401, error: 'DSH_BROWSER_AUTH_REQUIRED' }
  if (status === 403) return { status: 403, error: 'forbidden' }
  if (status === 503) return UNAVAILABLE
  return undefined
}

/**
 * Resolve the current Connection on each request; never retain a stale authentication service.
 *
 * Both members are invoked **through the Connection receiver**. They are prototype methods that read
 * `this` (`Connection#requestRejection` is called as `this.requestRejection(...)` from
 * `Connection#admit`), so detaching them into locals and calling the bare function throws — and the
 * resulting `catch` reported that TypeError as `503`, which is exactly the shape that kept the frozen
 * task layer's recovery control on screen. Object-literal fixtures cannot catch that mistake because
 * they carry no `this`, which is why the unit tests stayed green while both real-Connection suites
 * turned red.
 *
 * Order matters. `admit` is documented as "it passes `requestRejection` and speaks for the operator
 * Peer", so it is a strict superset: it additionally resolves an operator and answers the legal
 * `{ rejection: 503 }` when none is registered. These routes only ask whether a request may proceed,
 * so `requestRejection` is authoritative while it exists.
 *
 * DSH `0.2.2-rc.2` removed `requestRejection` outright and documented `admit` as its replacement
 * (`docs/upgrade-guide/v0.2.2-rc.2/connection-page-peer`), so `admit` is the forward path. Both
 * spellings are probed because this package still declares hosts back to `0.1.7-rc.1`.
 *
 * A missing member is a contract break and is raised as one; only a *throwing* dependency stays
 * reported as unavailable.
 */
/**
 * Declare a route that authenticates the browser itself.
 *
 * DSH `0.2.2-rc.2` made every WebServer route default to `auth: 'required'`, and `required` needs an
 * admitted *operator* Peer — an identity only a `/connect` API session establishes. A browser fetch
 * never has one, so such a request is refused **before the handler runs**, with a plain-text 401. The
 * client reads a non-JSON body as an unusable answer and keeps the recovery control on screen, which
 * is why fixing the admission code inside the handler changed nothing at all.
 *
 * These routes therefore opt out of the route policy and keep authenticating the browser with the
 * cookie that the Host itself issues (`adaptiveBrowserPrincipal`, and `browserCookiePresent` below for
 * the routes that only need presence). The `auth` field is absent from this package's peer types, hence
 * the widening; it is ignored by hosts that predate the policy.
 */
export function anonymousRoute<T extends { kind: 'exact' | 'prefix'; path: string }>(
  route: T,
): Parameters<Context['webServer']['register']>[0] {
  return { ...route, auth: 'anonymous' } as unknown as Parameters<Context['webServer']['register']>[0]
}

/**
 * Whether the request carries a Host-issued browser session cookie.
 *
 * Signature verification needs the Host's secret, which a plugin cannot read, so this checks the shape
 * the Host writes (`v1.<body>.<sig>` / `v2.<body>.<sig>`) under the `dsh-auth-` prefix. That is weaker
 * than the Host's own check and is only the fallback for hosts that removed `requestRejection`; every
 * route here also enforces its own origin decision, and none of them is reachable off loopback.
 */
export function browserCookiePresent(request: IncomingMessage): boolean {
  const raw = request.headers.cookie
  if (typeof raw !== 'string') return false
  return raw.split(';').some(segment => {
    const text = segment.trim()
    if (!text.startsWith('dsh-auth-')) return false
    const at = text.indexOf('=')
    return at !== -1 && /^v[12]\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(text.slice(at + 1).trim())
  })
}

export function harnessHttpRejection(ctx: Context, request: IncomingMessage): HarnessHttpRejection | undefined {
  let connection: AdmissionSurface | undefined
  try {
    connection = ctx.get('connection') as AdmissionSurface | undefined
  } catch {
    // An inactive service must not become an unauthenticated fallback.
    return UNAVAILABLE
  }
  if (connection === undefined) return UNAVAILABLE
  if (typeof connection.requestRejection !== 'function' && typeof connection.admit !== 'function') {
    throw new Error('dsh-chatgpt-connect: Connection exposes neither requestRejection() nor admit(); '
      + 'this host changed the HTTP admission surface this plugin was built against')
  }
  try {
    if (typeof connection.requestRejection === 'function') {
      const status = connection.requestRejection(request)
      // `undefined` means the request may proceed; an unusable answer must not be read as consent.
      return status === undefined ? undefined : refusal(status) ?? UNAVAILABLE
    }
    // Only `admit` remains, so this is a DSH 0.2.2-rc.2-or-later host. `admit` resolves an *operator*
    // Peer that a browser navigation never establishes and answers the legal `{ rejection: 503 }`
    // when it cannot, so it cannot answer "may this request proceed". These routes are registered
    // through `anonymousRoute` and authenticate the Host's own browser cookie instead.
    return browserCookiePresent(request) ? undefined : { status: 401, error: 'DSH_BROWSER_AUTH_REQUIRED' }
  } catch {
    // A throwing verifier is a transient dependency failure, which stays closed but is not
    // mislabelled as a contract break.
    return UNAVAILABLE
  }
}
