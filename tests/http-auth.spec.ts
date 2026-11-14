import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { harnessHttpRejection } from '../src/http-auth.ts'

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

  it('calls admit() through its receiver so `this` survives', () => {
    const surface = {
      seen: undefined as unknown,
      admit(this: { seen: unknown }, payload: { headers: unknown }) {
        this.seen = payload
        return { peer: {} }
      },
    }
    expect(harnessHttpRejection(context(() => surface), request)).toBeUndefined()
    expect(surface.seen).toEqual({ headers: request.headers })
  })
})

/**
 * DSH `0.2.2-rc.2` replaced `requestRejection` with `admit`. Keeping only the old spelling is what
 * made DSH `0.2.2-rc.3` answer `503` on every protected route while every test stayed green: the
 * fixtures supplied the member the real host had already removed.
 */
describe('admit() admission surface (DSH 0.2.2-rc.2 and later)', () => {
  it('admits a request the Host granted a Peer for', () => {
    const admit = vi.fn(() => ({ peer: { id: 'peer-fixture' } }))
    expect(harnessHttpRejection(context(() => ({ admit })), request)).toBeUndefined()
    expect(admit).toHaveBeenCalledExactlyOnceWith({ headers: request.headers })
  })

  it.each([
    [401, 'DSH_BROWSER_AUTH_REQUIRED'],
    [403, 'forbidden'],
    [503, 'DSH_CONNECTION_UNAVAILABLE'],
  ] as const)('preserves an admit() rejection %s', (status, error) => {
    expect(harnessHttpRejection(context(() => ({ admit: () => ({ rejection: status }) })), request))
      .toEqual({ status, error })
  })

  it('prefers requestRejection() when a host exposes both spellings', () => {
    // `admit` is a strict superset: it also resolves an operator Peer and answers the legal
    // `{ rejection: 503 }` when none is registered. These routes only ask whether a request may
    // proceed, so the narrower member stays authoritative while it exists.
    const admit = vi.fn(() => ({ peer: {} }))
    const requestRejection = vi.fn(() => undefined)
    expect(harnessHttpRejection(context(() => ({ admit, requestRejection })), request)).toBeUndefined()
    expect(requestRejection).toHaveBeenCalledExactlyOnceWith(request)
    expect(admit).not.toHaveBeenCalled()
  })

  it('treats a Peer-less, rejection-less admission as unavailable rather than admitting', () => {
    expect(harnessHttpRejection(context(() => ({ admit: () => ({}) })), request))
      .toEqual({ status: 503, error: 'DSH_CONNECTION_UNAVAILABLE' })
  })

  it('fails closed when admit() throws instead of admitting the request', () => {
    const ctx = context(() => ({ admit() { throw new Error('fixture-private-cookie-must-not-leak') } }))
    expect(harnessHttpRejection(ctx, request)).toEqual({ status: 503, error: 'DSH_CONNECTION_UNAVAILABLE' })
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
