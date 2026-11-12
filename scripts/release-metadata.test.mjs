import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isAlphaReleaseVersion, isReleaseVersion, validateReadmeInstallation, validateUpdateHighlights } from './release-metadata.mjs'

let cases = 0
function check(name, run) {
  try {
    run()
    cases += 1
  } catch (error) {
    throw new Error(`Release metadata regression: ${name}`, { cause: error })
  }
}

const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
const workflowPattern = workflow.match(/\[\[ ! "\$VERSION" =~ (.+) \]\]/u)?.[1]
assert.ok(workflowPattern, 'release workflow must declare its Alpha version check')
const workflowVersion = new RegExp(workflowPattern, 'u')
// The workflow publishes exactly two shapes: numeric Alpha prereleases and stable full releases.
// The Alpha predicate keeps its narrower meaning because the highlight catalog is Alpha-only, so
// each column is asserted separately instead of assuming the two predicates agree everywhere.
for (const [value, alpha, release] of [
  ['0.1.0-alpha.4.29', true, true], ['0.1.0-alpha.4.30', true, true], ['0.2.0-alpha.1', true, true],
  ['1.0.0-alpha.0', true, true], ['0.1.0-alpha.10', true, true],
  ['0.1.0', false, true], ['0.3.1', false, true], ['1.0.0', false, true],
  ['0.1.0-alpha.01', false, false], ['01.1.0-alpha.1', false, false], ['0.1.0-alpha.1.01', false, false],
  ['0.1.0-alpha.1+build.2', false, false], ['0.1.2-rc.1+build.0', false, false],
  ['0.1.0-beta.1', false, false], ['0.1.0-rc.1', false, false],
  ['0.3.1+build.2', false, false], ['01.3.1', false, false], ['0.3', false, false],
  ['alpha', false, false], ['latest', false, false], ['v0.1.0-alpha.1', false, false], ['0.1.0-alpha.1\n', false, false],
]) {
  check(`local and workflow format: ${JSON.stringify(value)}`, () => {
    assert.equal(isAlphaReleaseVersion(value), alpha)
    assert.equal(isReleaseVersion(value), release)
    assert.equal(workflowVersion.exec(value)?.[0] === value, release)
  })
}

const entry = (version, highlights = []) => ({ version, highlights })
const highlights = releases => ({ schemaVersion: 1, releases })
check('highlight catalog can omit maintenance releases and retain empty historical entries', () => {
  assert.deepEqual(validateUpdateHighlights(highlights([
    entry('0.1.0-alpha.4.5', ['runtime-compatibility']), entry('0.1.0-alpha.4.29'),
  ]), '0.1.0-alpha.4.30'), [])
})
check('highlight catalog accepts a future independent sequence without deleting its history', () => {
  assert.deepEqual(validateUpdateHighlights(highlights([
    entry('0.1.0-alpha.4.29'), entry('0.2.0-alpha.1', ['multi-account']),
  ]), '0.2.0-alpha.1'), [])
})
check('empty highlights need no invented release entry', () => {
  assert.deepEqual(validateUpdateHighlights(highlights([]), '0.1.0-alpha.4.29'), [])
})
for (const [name, value] of [
  ['unsupported schema', { schemaVersion: 2, releases: [] }],
  ['missing catalog', null],
  ['oversized catalog', highlights(Array.from({ length: 257 }, () => entry('0.1.0-alpha.1')))],
  ['duplicate version', highlights([entry('0.1.0-alpha.4.29'), entry('0.1.0-alpha.4.29')])],
  ['lexical rather than numeric order', highlights([entry('0.1.0-alpha.4.10'), entry('0.1.0-alpha.4.9')])],
  ['release newer than candidate', highlights([entry('0.2.0-alpha.1')])],
  ['build metadata', highlights([entry('0.1.0-alpha.4.29+build.1')])],
  ['unsupported phase', highlights([entry('0.1.0-beta.1')])],
  ['unknown capability', highlights([entry('0.1.0-alpha.4.29', ['unknown'])])],
  ['duplicate capability', highlights([entry('0.1.0-alpha.4.29', ['multi-account', 'multi-account'])])],
  ['oversized capability list', highlights([entry('0.1.0-alpha.4.29', Array(33).fill('multi-account'))])],
]) {
  check(`reject ${name}`, () => assert.notEqual(validateUpdateHighlights(value, '0.1.0-alpha.4.29').length, 0))
}

// 2026-11-08 老板裁决：README 只给裸包名；精确版本改由 INSTALL.md 承担。
const installs = (version = '0.1.0-alpha.4.29') => `# Install\n\ndsh plugin --profile web add dsh-chatgpt-connect@${version}\n`
const readmes = () => [
  `# dsh-chatgpt-connect\n\n[Install](INSTALL.md)\n\nNew introduction, badges, and reordered sections.\n\n[中文](docs/README.zh.md)\n\ndsh plugin --profile web add dsh-chatgpt-connect\n`,
  `# dsh-chatgpt-connect\n\n[English](../README.md) | 中文\n\n[安装](../INSTALL.md)\n\ndsh plugin --profile web add dsh-chatgpt-connect\n`,
]
const compatibility = {
  schemaVersion: 1,
  checkedAt: '2026-09-07',
  latestDshVersion: '0.1.2-rc.1',
  pluginVersions: [{ version: '0.1.0-alpha.4.29', verifiedDshVersions: ['0.1.2-rc.1'] }],
}
check('README publishes without a version while a newer candidate is prepared', () => {
  assert.deepEqual(validateReadmeInstallation(readmes(), compatibility, '0.1.0-alpha.4.30', installs()), [])
})
check('README prose and section order are not release invariants', () => {
  assert.deepEqual(validateReadmeInstallation(readmes(), compatibility, '0.1.0-alpha.4.29', installs()), [])
})
for (const [name, docs, catalog, candidate, install] of [
  ['missing language', [readmes()[0]], compatibility, '0.1.0-alpha.4.29', installs()],
  ['missing installation link', readmes().map(text => text.replace(/\(\.\.\/INSTALL.md\)|\(INSTALL.md\)/gu, '')), compatibility, '0.1.0-alpha.4.29', installs()],
  ['moving tag in README', readmes().map(text => text.replace('add dsh-chatgpt-connect\n', 'add dsh-chatgpt-connect@alpha\n')), compatibility, '0.1.0-alpha.4.29', installs()],
  ['pinned version in README', readmes().map(text => text.replace('add dsh-chatgpt-connect\n', 'add dsh-chatgpt-connect@0.1.0-alpha.4.29\n')), compatibility, '0.1.0-alpha.4.29', installs()],
  ['multiple install commands', readmes().map(text => text + '\ndsh plugin --profile web add dsh-chatgpt-connect\n'), compatibility, '0.1.0-alpha.4.29', installs()],
  ['INSTALL without an exact version', readmes(), compatibility, '0.1.0-alpha.4.29', installs('alpha')],
  ['INSTALL newer than candidate', readmes(), compatibility, '0.1.0-alpha.4.28', installs('0.1.0-alpha.4.29')],
  ['replacement JSON format', readmes(), { '0.1.0-alpha.4.29': { verified_with: ['0.1.2-rc.1'] } }, '0.1.0-alpha.4.29', installs()],
  ['malformed catalog', readmes(), { ...compatibility, pluginVersions: 'x' }, '0.1.0-alpha.4.29', installs()],
]) {
  check(`reject ${name}`, () => assert.notEqual(validateReadmeInstallation(docs, catalog, candidate, install).length, 0))
}

process.stdout.write(`release metadata: ${cases} regression cases passed\n`)
