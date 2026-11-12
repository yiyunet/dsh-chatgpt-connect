import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const install = await readFile(new URL('../INSTALL.md', import.meta.url), 'utf8')
const compatibility = JSON.parse(await readFile(new URL('../verified-compatibility.json', import.meta.url), 'utf8'))
const firstInstall = install.indexOf('dsh plugin --profile web add ')
const preflight = install.slice(0, firstInstall)
const shellBlocks = [...install.matchAll(/```sh\s*\n([\s\S]*?)```/gu)]
  .flatMap(match => (match[1] ?? '').split('\n').map(line => line.trim()))

describe('installation version guidance', () => {
  it.each(['0.2.1-alpha.4', '0.2.1-alpha.5', '0.2.1-rc.1'])('preserves the first published %s support in historical Alpha 5', version => {
    // Fork READMEs carry no upstream release history (2026-11-08 老板裁决):
    // the historical markers and per-release records live in INSTALL.md only.
    expect(install).toContain('Historical Alpha 5')
    for (const guide of [install]) expect(guide).toContain(`\`${version}\``)
    const firstAlpha5 = compatibility.pluginVersions.findIndex((entry: { version: string }) => entry.version === '0.2.0-alpha.5')
    expect(firstAlpha5).toBeGreaterThanOrEqual(0)
    expect(compatibility.pluginVersions.slice(0, firstAlpha5)
      .every((entry: { verifiedDshVersions: string[] }) =>
      !entry.verifiedDshVersions.includes(version))).toBe(true)
  })

  it('preserves historical pairings while recommending published Alpha 12 with exact rc.5', async () => {
    const declared = JSON.parse(await readFile(new URL('../compatibility.json', import.meta.url), 'utf8'))
    const published = ['0.1.7-rc.1', '0.1.7-rc.2', '0.2.0-rc.1', '0.2.0-rc.2',
      '0.2.1-alpha.1', '0.2.1-alpha.2', '0.2.1-alpha.3', '0.2.1-alpha.4', '0.2.1-alpha.5', '0.2.1-rc.1']
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.5')?.verifiedDshVersions)
      .toEqual(published)
    expect(declared.dshPluginApi.versions).toEqual([...published, '0.2.1-rc.2', '0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5', '0.2.2-alpha.3', '0.2.2-rc.1', '0.2.2-rc.2'])
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.10')?.verifiedDshVersions)
      .toEqual([...published, '0.2.1-rc.2', '0.2.1-rc.3'])
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.11')?.verifiedDshVersions)
      .toEqual([...published, '0.2.1-rc.2', '0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5'])
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.9')?.verifiedDshVersions)
      .toEqual([...published, '0.2.1-rc.2'])
    expect(install).toContain('The recommended pair is Codex Connect `0.2.0-alpha.12` / DSH `0.2.1-rc.5`')
    expect(install).toContain('### 0.2.0-alpha.9 verified publication')
    expect(install).toContain('### 0.2.0-alpha.8 verified publication')
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.8')?.verifiedDshVersions)
      .toEqual([...published, '0.2.1-rc.2'])
    expect(install).toContain('### 0.2.0-alpha.7 verified publication')
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.7')?.verifiedDshVersions)
      .toEqual([...published, '0.2.1-rc.2'])
    expect(install).not.toContain('does not support DSH `0.2.1-rc.2`')
  })

  it('recommends the verified Alpha 12 release without rewriting historical Alpha 10 and Alpha 9 pairings', async () => {
    const guides = await Promise.all([readFile(new URL('../README.md', import.meta.url), 'utf8'),
      readFile(new URL('../docs/README.zh.md', import.meta.url), 'utf8')])
    // Upstream release history lives in INSTALL.md only (2026-11-08 老板裁决).
    for (const guide of [install]) {
      expect(guide).toContain('`0.2.0-alpha.12`')
      expect(guide).toContain('`0.2.1-rc.5`')
      expect(guide).toContain('`0.2.0-alpha.10`')
      expect(guide).toContain('`0.2.1-rc.3`')
      expect(guide).toContain('dsh-codex-connect@0.2.0-alpha.12')
    }
    for (const guide of [...guides, install]) {
      expect(guide).not.toContain('Source candidate (unreleased)')
      expect(guide).not.toContain('源码候选（尚未发布）')
    }
    // A fork README must never hand out the upstream package's install command.
    for (const guide of guides) expect(guide).not.toContain('dsh plugin --profile web add dsh-codex-connect@')
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.9')?.verifiedDshVersions)
      .not.toContain('0.2.1-rc.3')
  })

  it('recommends published Alpha 12 while preserving the Alpha 11 host limit', async () => {
    for (const guide of [install]) expect(guide).toContain('0.2.2-alpha.3')
    expect(install).toContain('**Published Alpha 12:**')
    expect(install).not.toContain('Alpha 12 candidate, not yet published')
    const declared = JSON.parse(await readFile(new URL('../compatibility.json', import.meta.url), 'utf8'))
    // The newest record tracks the declared matrix; every earlier record is frozen history. This
    // used to compare the Alpha 12 record, which only held while the declared matrix happened to
    // stop at the same version. B5 added DSH 0.2.2-rc.1/rc.2 — the hosts the 0.3.1 fix exists for —
    // so the anchor moves to the newest entry instead of rewriting Alpha 12's history.
    const newest = compatibility.pluginVersions[compatibility.pluginVersions.length - 1]
    expect(newest?.version).toBe('0.3.2')
    expect(newest?.verifiedDshVersions).toEqual(declared.dshPluginApi.versions)
    expect(compatibility.pluginVersions
      .filter((entry: { version: string }) => !['0.2.0-alpha.12', '0.3.1-alpha.1', '0.3.1-alpha.2', '0.3.1-alpha.3', '0.3.1-alpha.4', '0.3.1-alpha.5', '0.3.1', '0.3.2'].includes(entry.version))
      .every((entry: { verifiedDshVersions: string[] }) => !entry.verifiedDshVersions.includes('0.2.2-alpha.3'))).toBe(true)
  })

  it.each(['0.2.1-rc.4', '0.2.1-rc.5'])('recommends %s with published Alpha 12 and preserves Alpha 10/11 records', version => {
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.10')?.verifiedDshVersions)
      .not.toContain(version)
    expect(compatibility.pluginVersions.find((entry: { version: string }) => entry.version === '0.2.0-alpha.11')?.verifiedDshVersions)
      .toContain(version)
    expect(install).toContain('**Published Alpha 12:**')
    expect(install).toContain('**Historical Alpha 11:**')
    expect(install).not.toContain('**Unpublished compatibility candidate:**')
    expect(install).toContain('add dsh-codex-connect@0.2.0-alpha.12')
  })

  it.each([
    ['0.1.0-rc.7', '0.1.0-alpha.4.14'],
    ['0.1.1-rc.2', '0.1.0-alpha.4.21'],
    ['0.1.2-alpha.2', '0.1.0-alpha.4.23'],
    ['0.1.2-alpha.5', '0.1.0-alpha.4.25'],
    ['0.1.2-rc.1', '0.1.0-alpha.4.41'],
    ['0.1.5-alpha.1', '0.1.0-alpha.4.41'],
    ['0.1.5-rc.1', '0.1.0-alpha.4.41'],
    ['0.1.5-rc.2', '0.1.0-alpha.4.41'],
    ['0.1.7-rc.1', '0.2.0-alpha.12'],
    ['0.1.7-rc.2', '0.2.0-alpha.12'],
    ['0.2.0-rc.1', '0.2.0-alpha.12'],
    ['0.2.0-rc.2', '0.2.0-alpha.12'],
    ['0.2.1-alpha.1', '0.2.0-alpha.12'],
    ['0.2.1-alpha.2', '0.2.0-alpha.12'],
    ['0.2.1-alpha.3', '0.2.0-alpha.12'],
    ['0.2.1-alpha.4', '0.2.0-alpha.12'],
    ['0.2.1-alpha.5', '0.2.0-alpha.12'],
    ['0.2.1-rc.1', '0.2.0-alpha.12'],
    ['0.2.1-rc.2', '0.2.0-alpha.12'],
    ['0.2.1-rc.3', '0.2.0-alpha.12'],
    ['0.2.1-rc.4', '0.2.0-alpha.12'],
    ['0.2.1-rc.5', '0.2.0-alpha.12'],
    ['0.2.2-alpha.3', '0.2.0-alpha.12'],
  ])('selects the recorded DSH %s / Codex Connect %s pair before installation', (dsh, plugin) => {
    expect(firstInstall).toBeGreaterThan(0)
    expect(compatibility.pluginVersions).toContainEqual(expect.objectContaining({
      version: plugin,
      verifiedDshVersions: expect.arrayContaining([dsh]),
    }))
    const rows = preflight.split('\n').filter(line => line.trim().startsWith('|'))
      .map(line => line.split('|').slice(1, -1).map(cell => cell.replaceAll('`', '').trim()))
    expect(rows).toContainEqual([dsh, plugin])
    expect(shellBlocks).toContain(`dsh plugin --profile web add dsh-codex-connect@${plugin}`)
  })

  it('reports the published pairing and default channel without claiming live acceptance', async () => {
    const [english, chinese] = await Promise.all([
      readFile(new URL('../README.md', import.meta.url), 'utf8'),
      readFile(new URL('../docs/README.zh.md', import.meta.url), 'utf8'),
    ])
    expect(install).toContain('dsh plugin --profile web add dsh-codex-connect@0.2.0-alpha.12')
    for (const guide of [english, chinese]) {
      expect(guide).toContain('`latest`')
    }
    // 宿主清单不再复制进 README（2026-11-08 老板裁决：README 只写有界区间）。
    for (const guide of [install]) {
      expect(guide).toContain('`0.1.7-rc.1`')
      expect(guide).toContain('`0.1.7-rc.2`')
      expect(guide).toContain('`0.2.0-rc.1`')
      expect(guide).toContain('`0.2.0-rc.2`')
      expect(guide).toContain('`0.2.1-alpha.1`')
      expect(guide).toContain('`0.2.1-alpha.2`')
      expect(guide).toContain('`0.2.1-alpha.3`')
    }
    expect(english).toContain('**Luna Reserve has been removed.**')
    expect(english).toContain('Legacy `enableReserveFallback` settings are ignored')
    expect(english).toContain('Old return files are not read, migrated or deleted')
    expect(chinese).toContain('**Luna Reserve 已移除。**')
    expect(chinese).toContain('旧 `enableReserveFallback` 开关会被忽略')
    expect(chinese).toContain('不读取、迁移或删除')
    expect(install).toContain('Channel snapshot on 2026-11-04: npm `alpha` points to `0.2.0-alpha.12`; `latest` remains `0.2.0-alpha.10`')
    expect(install).toContain('Stock rc.1 keeps Task controls paused')
    expect(install).toContain('Luna Reserve has been removed')
  })

  it('scopes the version-only Desktop comparison to historical alpha.3, not later npm acceptance', async () => {
    const [english, chinese] = await Promise.all([
      readFile(new URL('../README.md', import.meta.url), 'utf8'),
      readFile(new URL('../docs/README.zh.md', import.meta.url), 'utf8'),
    ])
    expect(english).not.toContain('The released client differs only by the package-version string')
    expect(chinese).not.toContain('发布客户端与该客户端仅版本字符串不同')
    expect(install).toContain('On 2026-10-10 the maintainer reported successful login and normal use')
    expect(install).toContain('not independent live-account verification of a later npm artifact')
  })

  it('requires version checks and warns against blind alpha installation before any add command', () => {
    expect(preflight).toContain('dsh --version')
    expect(preflight).toContain('verified-compatibility.json')
    expect(preflight).toMatch(/(?:unknown|not listed|unlisted)[^.]*\b(?:verify|check)\b/iu)
    expect(preflight).toMatch(/(?:do not|never)[^\n]*dsh-codex-connect@alpha/iu)
    expect(shellBlocks).not.toContain('dsh plugin --profile web add dsh-codex-connect@alpha')
  })

  it('uses the bundled CLI and separate profile for the published Desktop installation', () => {
    expect(shellBlocks).toContain('"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" --version')
    expect(shellBlocks).toContain('"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add dsh-codex-connect@0.2.0-alpha.12')
    expect(install).toContain('fully quit it before CLI package operations')
    expect(install).toContain('Use the intended `DSH_HOME`')
    expect(install).toContain('Preserve profile patches, default models, optional capabilities and OAuth state')
    expect(install).toContain('Reopen Desktop after installing')
    expect(install).not.toContain('trust-origin dsh-app://app')
  })

  it('retains exact GitHub fallbacks for the latest releases when npm is unavailable', () => {
    expect(install).toMatch(/npm is unavailable[^\n]*github:franksong2702\/dsh-codex-connect#v0\.1\.0-alpha\.4\.21/iu)
    expect(install).toMatch(/npm is unavailable[^\n]*github:franksong2702\/dsh-codex-connect#v0\.1\.0-alpha\.4\.23/iu)
    expect(install).toMatch(/npm is unavailable[^\n]*github:franksong2702\/dsh-codex-connect#v0\.1\.0-alpha\.4\.25/iu)
    expect(install).toMatch(/npm is unavailable[^\n]*github:franksong2702\/dsh-codex-connect#v0\.1\.0-alpha\.4\.41/iu)
    expect(install).toMatch(/npm is unavailable[^\n]*github:franksong2702\/dsh-codex-connect#v0\.1\.0-alpha\.4\.46/iu)
    expect(install).toMatch(/npm is unavailable[^\n]*github:franksong2702\/dsh-codex-connect#v0\.2\.0-alpha\.12/iu)
  })
})
