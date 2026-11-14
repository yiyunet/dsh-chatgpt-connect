import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { anonymousRoute, browserCookiePresent, harnessHttpRejection } from '../src/http-auth.ts'

const request = { headers: { host: '127.0.0.1:3081' } } as IncomingMessage
function context(get: (name: string) => unknown): Context {
  return { get } as unknown as Context
}

describe('Harness admission for protected plugin HTTP routes', () => {
  it('requires the current Connection to admit the original request', () => {
    const requestRejection = vi.fn(() => undefined)
    const get = vi.fn(() => ({ requestRejection }))
    expect(harnessHttpRejection(context(get), request)).toBeUndefined()
    expect(get).toHaveBeenCalledWith('connection')
    expect(requestRejection).toHaveBeenCalledExactlyOnceWith(request)
  })

  it.each([401, 403] as const)('preserves a Host rejection %s', status => {
    const requestRejection = vi.fn(() => status)
    expect(harnessHttpRejection(context(() => ({ requestRejection })), request)).toEqual({
      status, error: status === 401 ? 'DSH_BROWSER_AUTH_REQUIRED' : 'forbidden',
    })
  })

  it.each(['missing', 'lookup-error', 'validation-error', 'invalid-result'] as const)(
    'fails closed without exposing private errors when Connection is %s', failure => {
      const privateError = new Error('fixture-private-cookie-must-not-leak')
      const ctx = context(() => {
        if (failure === 'lookup-error') throw privateError
        if (failure === 'missing') return undefined
        return { requestRejection() {
          if (failure === 'validation-error') throw privateError
          return 500
        } }
      })
      expect(harnessHttpRejection(ctx, request)).toEqual({ status: 503, error: 'DSH_CONNECTION_UNAVAILABLE' })
    },
  )

  it('does not retain a removed or replaced authentication service', () => {
    let connection: { requestRejection: () => 401 | undefined } | undefined = {
      requestRejection: () => undefined,
    }
    const ctx = context(() => connection)
    expect(harnessHttpRejection(ctx, request)).toBeUndefined()
    connection = undefined
    expect(harnessHttpRejection(ctx, request)?.status).toBe(503)
    connection = { requestRejection: () => 401 }
    expect(harnessHttpRejection(ctx, request)?.status).toBe(401)
  })

  /**
   * Real `Connection` implements admission as prototype methods that read `this` — `admit` itself
   * calls `this.requestRejection(...)`. Detaching one into a local and calling the bare function
   * throws, and the resulting `catch` reported that TypeError as `503`, which is the shape that kept
   * the frozen task layer's recovery control on screen. Object-literal fixtures cannot catch this
   * because they carry no `this`, so the binding is pinned explicitly here.
   */
  it('calls requestRejection() through its receiver so `this` survives', () => {
    const surface = {
      seen: undefined as unknown,
      requestRejection(this: { seen: unknown }, received: IncomingMessage) {
        this.seen = received
        return undefined
      },
    }
    expect(harnessHttpRejection(context(() => surface), request)).toBeUndefined()
    expect(surface.seen).toBe(request)
  })
})

/**
 * DSH `0.2.2-rc.2` removed `requestRejection` and shipped `admit` instead, whose comment says it
 * "passes `requestRejection` **and speaks for the operator Peer**". That extra step is the trap:
 * a page navigation never establishes an operator, so `admit` answers the legal
 * `{ rejection: 503 }` and every protected route reported "temporarily unavailable" — which the task
 * control renders as *unconfirmed state* and therefore keeps offering recovery.
 *
 * Those hosts also default every WebServer route to `auth: 'required'`, so admission happens before
 * the handler runs. The handler must not repeat it.
 */
describe('admit-only admission surface (DSH 0.2.2-rc.2 and later)', () => {
  const withCookie = (value: string): IncomingMessage =>
    ({ headers: { host: '127.0.0.1:3081', cookie: `dsh-auth-fixture=${value}` } }) as unknown as IncomingMessage

  it('authenticates the Host browser cookie instead of asking admit()', () => {
    const admit = vi.fn(() => ({ rejection: 503 as const }))
    expect(harnessHttpRejection(context(() => ({ admit })), withCookie('v2.cGF5bG9hZA.c2lnbmF0dXJl'))).toBeUndefined()
    expect(admit).not.toHaveBeenCalled()
  })

  /**
   * The regression: `required` routes refuse a browser fetch before the handler runs, and answering
   * `503`/`401` there is indistinguishable from "unconfirmed state" in the client. Registering the
   * route as `anonymous` is what lets this code run at all — so it must authenticate the cookie.
   */
  it('refuses a request that carries no Host browser cookie', () => {
    expect(harnessHttpRejection(context(() => ({ admit: () => ({ peer: {} }) })), request))
      .toEqual({ status: 401, error: 'DSH_BROWSER_AUTH_REQUIRED' })
  })

  it('refuses a dsh-auth cookie that is not the Host session shape', () => {
    expect(harnessHttpRejection(context(() => ({ admit: () => ({ peer: {} }) })), withCookie('not-a-session')))
      .toEqual({ status: 401, error: 'DSH_BROWSER_AUTH_REQUIRED' })
  })

  it('prefers requestRejection() when a host exposes both spellings', () => {
    // A host that still has the narrower member keeps answering the only question these routes ask:
    // may this request proceed. `admit` is not consulted, so no operator is required either.
    const admit = vi.fn(() => ({ peer: {} }))
    const requestRejection = vi.fn(() => undefined)
    expect(harnessHttpRejection(context(() => ({ admit, requestRejection })), request)).toBeUndefined()
    expect(requestRejection).toHaveBeenCalledExactlyOnceWith(request)
    expect(admit).not.toHaveBeenCalled()
  })

  it('preserves requestRejection() refusals on a both-spellings host', () => {
    const requestRejection = vi.fn((): 401 | 403 | undefined => 403)
    expect(harnessHttpRejection(context(() => ({ admit: () => ({ peer: {} }), requestRejection })), request))
      .toEqual({ status: 403, error: 'forbidden' })
  })

  /**
   * The regression this file exists for: a host that removed the whole surface used to be reported
   * as `503`, which the task control reads as *unconfirmed state* and therefore keeps offering
   * recovery. A removed contract must be raised, not disguised as a transient outage.
   */
  it('raises a removed admission surface instead of reporting a transient outage', () => {
    expect(() => harnessHttpRejection(context(() => ({})), request))
      .toThrow(/neither requestRejection\(\) nor admit\(\)/u)
  })
})

describe('route authentication policy', () => {
  /**
   * DSH 0.2.2-rc.2 defaults every WebServer route to `auth: 'required'`, which needs an admitted
   * operator Peer that a browser fetch cannot present — the request is refused before the handler
   * runs. These routes authenticate the browser themselves and must opt out.
   */
  it('marks routes anonymous so the Host does not demand an operator Peer', () => {
    const route = anonymousRoute({ kind: 'exact' as const, path: '/plugins/dsh-codex-connect/task' })
    expect((route as unknown as { auth?: string }).auth).toBe('anonymous')
    expect((route as unknown as { path: string }).path).toBe('/plugins/dsh-codex-connect/task')
  })

  it.each([
    ['v1.cGF5bG9hZA.c2lnbmF0dXJl', true],
    ['v2.cGF5bG9hZA.c2lnbmF0dXJl', true],
    ['not-a-session', false],
    ['', false],
  ] as const)('recognizes the Host session cookie shape %j as %s', (value, expected) => {
    const request = { headers: { cookie: `dsh-auth-fixture=${value}` } } as unknown as IncomingMessage
    expect(browserCookiePresent(request)).toBe(expected)
  })

  it('ignores cookies outside the dsh-auth prefix', () => {
    const request = { headers: { cookie: 'other=v2.body.sig' } } as unknown as IncomingMessage
    expect(browserCookiePresent(request)).toBe(false)
  })
})
