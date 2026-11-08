/** Alpha release metadata checks shared by lint and its keyless regression tests. */

const ALPHA_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-alpha\.(0|[1-9]\d*)(\.(0|[1-9]\d*))*$/u
const HIGHLIGHT_KINDS = new Set(['trusted-origins', 'runtime-compatibility', 'quota-fast-mode', 'dsh-rc7', 'search-stability', 'image-generation', 'oauth-history', 'model-visibility', 'proxy-connection', 'models-account', 'context-budget', 'auto-review-probe', 'auto-review', 'astra-compatibility', 'multi-account', 'search-route', 'image-model-hint', 'luna-reserve'])

/** Accept the numeric Alpha format supported by the current release workflow, without build metadata. */
export function isAlphaReleaseVersion(value) {
  return typeof value === 'string' && ALPHA_VERSION.exec(value)?.[0] === value
}

/** Compare validated numeric Alpha versions without assuming a particular core or counter length. */
function compareAlphaVersions(left, right) {
  const parts = value => value.replace('-alpha.', '.').split('.').map(part => BigInt(part))
  const a = parts(left)
  const b = parts(right)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index] === undefined) return -1
    if (b[index] === undefined) return 1
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1
  }
  return 0
}

/** Check bounded, ordered highlight entries; maintenance releases may be omitted or have no highlights. */
export function validateUpdateHighlights(manifest, packageVersion) {
  const failures = []
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.releases) || manifest.releases.length > 256) {
    return ['update-highlights.json must use schemaVersion 1 with at most 256 releases']
  }
  let previous
  for (const release of manifest.releases) {
    if (!isAlphaReleaseVersion(release?.version) || !Array.isArray(release.highlights) || release.highlights.length > 32) {
      failures.push('update-highlights.json contains an invalid release entry')
      continue
    }
    if (previous !== undefined && compareAlphaVersions(previous, release.version) >= 0) {
      failures.push('update-highlights.json versions must be unique and in increasing SemVer order')
    }
    if (isAlphaReleaseVersion(packageVersion) && compareAlphaVersions(release.version, packageVersion) > 0) {
      failures.push(`update-highlights.json includes a version newer than package.json: ${release.version}`)
    }
    previous = release.version
    const seen = new Set()
    for (const kind of release.highlights) {
      if (!HIGHLIGHT_KINDS.has(kind)) failures.push(`update-highlights.json contains an unknown highlight kind: ${String(kind)}`)
      if (seen.has(kind)) failures.push(`update-highlights.json contains a duplicate highlight: ${release.version}:${String(kind)}`)
      seen.add(kind)
    }
  }
  return failures
}

/**
 * Check bilingual installation guidance.
 *
 * 2026-11-08 老板裁决：README 写**裸包名**（不带版本号、不带 tag），这样发版不必改 README。
 * 代偿：把「必须推荐一个精确且不超前于候选的版本」这条保护从 README **移到 INSTALL.md**
 * （运行手册，本来就随版本更新），由第四个参数显式传入 —— 不再从 README 里猜。
 */
export function validateReadmeInstallation(readmes, compatibility, packageVersion, install) {
  const failures = []
  for (const [index, text] of readmes.entries()) {
    const languageLink = index === 0 ? '(docs/README.zh.md)' : '(../README.md)'
    const installLink = index === 0 ? '(INSTALL.md)' : '(../INSTALL.md)'
    if (!/^# dsh-chatgpt-connect\s*$/mu.test(text) || !text.includes(languageLink) || !text.includes(installLink)) {
      failures.push('each README must include the product title, other language, and installation guide links')
    }
    const commands = [...text.matchAll(/\bdsh plugin --profile [\w-]+ add dsh-chatgpt-connect(@[^\s`]*)?/gu)]
    const targets = [...new Set(commands.map(match => match[1] ?? ''))]
    if (commands.length !== 1 || targets[0] !== '') {
      failures.push('each README must show exactly one installation command for the bare package name, with no tag and no version')
    }
  }
  const exact = [...String(install ?? '').matchAll(/\bdsh plugin --profile [\w-]+ add dsh-chatgpt-connect@([^\s`]+)/gu)]
    .map(match => match[1])
  const distinctExact = [...new Set(exact)]
  if (distinctExact.length !== 1 || !isAlphaReleaseVersion(distinctExact[0])) {
    failures.push('INSTALL.md must recommend exactly one exact Alpha version')
  } else if (isAlphaReleaseVersion(packageVersion) && compareAlphaVersions(distinctExact[0], packageVersion) > 0) {
    failures.push('INSTALL.md installation version must not be newer than the candidate package')
  }
  if (compatibility?.schemaVersion !== 1 || !Array.isArray(compatibility.pluginVersions) || compatibility.pluginVersions.length === 0) {
    failures.push('verified-compatibility.json must keep its recorded V1 shape')
  }
  return failures
}
