/**
 * Negative control for the Codex proxy gate.
 *
 * The plugin claims: when a proxy is selected, a dead or broken proxy must fail the
 * request. It must never fall back to a direct connection from the local IP.
 *
 * "The origin saw no connection" is not evidence on its own — a request that never
 * happened also leaves the origin untouched. So this file pairs every negative case
 * with a positive control that proves the origin counter can register traffic.
 */
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { OpenAICodexProxyManager } from '../src/index.ts'

const originalDispatcher = getGlobalDispatcher()
const managers: OpenAICodexProxyManager[] = []
const servers: Server[] = []

afterEach(async () => {
  for (const manager of managers.splice(0)) await manager.dispose()
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    await new Promise<void>(resolve => { server.close(() => { resolve() }) })
  }
  setGlobalDispatcher(originalDispatcher)
})

function track(manager: OpenAICodexProxyManager): OpenAICodexProxyManager {
  managers.push(manager)
  return manager
}

async function startServer(server: Server): Promise<string> {
  servers.push(server)
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

/** A port that was just released, so nothing can be listening on it. */
async function closedProxyUrl(): Promise<string> {
  const server = createServer()
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
  const address = server.address() as AddressInfo
  await new Promise<void>(resolve => { server.close(() => { resolve() }) })
  return `http://127.0.0.1:${address.port}`
}

function createOrigin(): { server: Server; connections: () => number; requests: () => number } {
  let connections = 0
  let requests = 0
  const server = createServer((_request, response) => {
    requests += 1
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('origin')
  })
  server.on('connection', () => { connections += 1 })
  return { server, connections: () => connections, requests: () => requests }
}

/** Accepts a connection and immediately drops it: reached, but never usable. */
function createBrokenProxy(): { server: Server; requests: () => number } {
  let requests = 0
  const server = createServer((_request, response) => {
    requests += 1
    response.destroy()
  })
  server.on('connect', (_request, socket) => {
    requests += 1
    socket.destroy()
  })
  return { server, requests: () => requests }
}

/** Walk the cause chain the same way the proxy manager classifies failures. */
function errorCodes(error: unknown, seen = new Set<object>()): string[] {
  if (typeof error !== 'object' || error === null || seen.has(error)) return []
  seen.add(error)
  const record = error as Record<string, unknown>
  const code = typeof record['code'] === 'string' ? record['code'] : undefined
  return [...code === undefined ? [] : [code], ...errorCodes(record['cause'], seen)]
}

const CONNECT_FAILURES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']

function isConnectFailure(error: unknown): boolean {
  return errorCodes(error).some(code => CONNECT_FAILURES.includes(code))
}

describe('Codex proxy egress has no direct fallback', () => {
  it('reaches the origin when no proxy is selected', async () => {
    const origin = createOrigin()
    const url = await startServer(origin.server)
    const manager = track(new OpenAICodexProxyManager())

    const response = await manager.run(undefined, () => fetch(`${url}/control`))

    expect(response.status).toBe(200)
    await response.text()
    // Positive control: without it, the zero-connection cases below prove nothing.
    expect(origin.connections()).toBeGreaterThan(0)
    expect(origin.requests()).toBe(1)
  })

  it('fails without connecting to the origin when the proxy refuses', async () => {
    const origin = createOrigin()
    const url = await startServer(origin.server)
    const deadProxy = await closedProxyUrl()
    const manager = track(new OpenAICodexProxyManager())

    const error = await manager.run(deadProxy, () => fetch(`${url}/should-not-leave`))
      .then(() => { throw new Error('the request unexpectedly succeeded') }, (reason: unknown) => reason)

    expect(isConnectFailure(error)).toBe(true)
    expect(origin.connections()).toBe(0)
    expect(origin.requests()).toBe(0)
  })

  it('fails without connecting to the origin when the proxy drops the connection', async () => {
    const origin = createOrigin()
    const url = await startServer(origin.server)
    const brokenProxy = createBrokenProxy()
    const proxyUrl = await startServer(brokenProxy.server)
    const manager = track(new OpenAICodexProxyManager())

    const error = await manager.run(proxyUrl, () => fetch(`${url}/should-not-leave`))
      .then(() => { throw new Error('the request unexpectedly succeeded') }, (reason: unknown) => reason)

    // The request really did go to the proxy, so the missing origin connection is the gate.
    expect(brokenProxy.requests()).toBeGreaterThan(0)
    expect(error).toBeDefined()
    expect(origin.connections()).toBe(0)
    expect(origin.requests()).toBe(0)
  })

  it('fails closed on a malformed proxy instead of silently going direct', async () => {
    const origin = createOrigin()
    const url = await startServer(origin.server)
    const manager = track(new OpenAICodexProxyManager())

    expect(() => manager.run('socks5://127.0.0.1:1080', () => fetch(`${url}/should-not-leave`)))
      .toThrow(TypeError)
    expect(origin.connections()).toBe(0)
    expect(origin.requests()).toBe(0)
  })
})
