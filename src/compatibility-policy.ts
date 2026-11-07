/**
 * Shared deterministic policy for Host and browser; no filesystem, process or runtime imports.
 *
 * 自主维护分支的改造要点（双轨制，2026-11-06 老板裁决）：
 * - 轨道一「准入」：`engines.dsh` 声明**有界区间**，区间内一律装得上。宿主门禁只读这一处，
 *   因此 DSH 小版本更新不会再被拒载。
 * - 轨道二「报告」：`evaluateCompatibility` 只把**维护者实测过的清单**
 *   (`isVerifiedDshPluginApiVersion`) 判为 `compatible`；清单外一律 `unverified`，
 *   绝不从「在区间内」推断「可用」。
 * - 两条轨道刻意分离：门前放宽保证不被锁死，报告从严保证不谎报。
 * - 该模块被浏览器侧共用，因此不 import semver，自带极简比较器。
 */

export const COMPATIBILITY_SCHEMA_VERSION = 1 as const
export const SUPPORTED_NODE_RANGE = '^22.19.0 || >=24.0.0'

/** 准入区间下界。 */
export const MIN_SUPPORTED_DSH_VERSION = '0.1.7-rc.1'
/** 准入区间上界（开区间端点）：0.3.x 起需要人工确认后另行放宽。 */
export const MAX_SUPPORTED_DSH_VERSION = '0.3.0'
/** 准入区间。宿主门禁与 peer 声明共用这一个字符串。 */
export const SUPPORTED_DSH_PLUGIN_API_RANGE = `>=${MIN_SUPPORTED_DSH_VERSION} <${MAX_SUPPORTED_DSH_VERSION}`

/** 基线版本，仅用于展示与诊断，**不是**安装白名单。 */
export const SUPPORTED_DSH_PLUGIN_API_VERSION = MIN_SUPPORTED_DSH_VERSION

/** 维护者真实跑过的版本。用于把「在区间内」与「已实测」在 UI 上区分开，不参与安装判定。 */
export const VERIFIED_DSH_PLUGIN_API_VERSIONS = [
  '0.1.7-rc.1',
  '0.1.7-rc.2',
  '0.2.0-rc.1',
  '0.2.0-rc.2',
  '0.2.1-alpha.1',
  '0.2.1-alpha.2',
  '0.2.1-alpha.3',
  '0.2.1-alpha.4',
  '0.2.1-alpha.5',
  '0.2.1-rc.1',
  '0.2.1-rc.2',
  '0.2.1-rc.3',
  '0.2.1-rc.4',
  '0.2.1-rc.5',
  '0.2.2-alpha.3',
] as const

/**
 * 兼容别名，保留给仍按旧名导入的调用方。
 * @deprecated 语义已从「允许的版本」变为「已实测的版本」，新代码请用 VERIFIED_DSH_PLUGIN_API_VERSIONS。
 */
export const SUPPORTED_DSH_PLUGIN_API_VERSIONS = VERIFIED_DSH_PLUGIN_API_VERSIONS

export const SUPPORTED_PI_AI_RANGE = '0.85.1'
export const PI_AI_PACKAGE = '@earendil-works/pi-ai'

/**
 * 契约声明的宿主包清单 = `package.json` 里**实际声明的全部 dsh-* peer**。
 *
 * 与旧版差别的理由：旧清单 19 项是「只要 import 过就登记」的历史账；本分支只对真正需要
 * 与宿主共享单例的 8 个包声明 peer，清单因此收敛到这 8 个。清单必须与 peer 声明严格一致
 * （`tests/compatibility.spec.ts` 逐条对账），多余项会让契约声称依赖一个并未声明的包。
 */
export const DSH_PLUGIN_API_PACKAGES = [
  '@deepseek-ai/dsh-attachment',
  '@deepseek-ai/dsh-compaction',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@deepseek-ai/dsh-session',
  '@deepseek-ai/dsh-tools',
  '@deepseek-ai/dsh-util-values',
  '@deepseek-ai/dsh-web',
] as const

/**
 * 运行时诊断清单：**不等同于**上面的 npm peer 声明，两者回答不同问题。
 *
 * - `DSH_PLUGIN_API_PACKAGES`（8 项）＝「我要求宿主以 npm peer 形式保证哪些包」，
 *   必须与 `package.json` 的 peer 声明严格一致，否则契约会声称依赖一个并未声明的包。
 * - `DSH_RUNTIME_DIAGNOSTIC_PACKAGES`（19 项）＝「跑起来时宿主必须提供的 dsh-* 运行时面」，
 *   含只在 `dsh.client.inject` 里出现的 client-UI 包：它们不是 npm peer，但缺了或混版，
 *   浏览器侧照样加载失败。
 *
 * 合成一个清单会让两边同时出错：要么契约变松（多声明没要求的包），要么诊断变哑（漏检 UI 包）。
 * 2026-11-06 的一次 19→8 收缩正是踩了这个坑 —— capability-diagnostics 的 UI peer 检测变哑。
 */
export const DSH_RUNTIME_DIAGNOSTIC_PACKAGES = [
  '@deepseek-ai/dsh-agent',
  '@deepseek-ai/dsh-atomic-write',
  '@deepseek-ai/dsh-attachment',
  '@deepseek-ai/dsh-client-ui-chat',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-tool',
  '@deepseek-ai/dsh-compaction',
  '@deepseek-ai/dsh-fs',
  '@deepseek-ai/dsh-home-paths',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@deepseek-ai/dsh-session',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-timeout',
  '@deepseek-ai/dsh-tools',
  '@deepseek-ai/dsh-util-values',
  '@deepseek-ai/dsh-web',
] as const

export const COMPATIBILITY_PACKAGES = [
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@deepseek-ai/dsh-compaction',
  PI_AI_PACKAGE,
] as const

export type CompatibilityPackageName = (typeof COMPATIBILITY_PACKAGES)[number]
/** Version metadata proves a declared match, not behavioral failure for an untested package. */
export type CompatibilityStatus = 'compatible' | 'unverified' | 'incompatible' | 'unknown'

export interface CompatibilityEntry {
  /** 人类可读的约束描述：宿主包为下界区间，pi-ai 为精确版本。 */
  supported: string
  installed: string | null
  status: CompatibilityStatus
}

export interface CompatibilityReport {
  schemaVersion: typeof COMPATIBILITY_SCHEMA_VERSION
  status: CompatibilityStatus
  node: CompatibilityEntry
  packages: Record<CompatibilityPackageName, CompatibilityEntry>
}

export interface CompatibilityEvaluationInput {
  /** Node version to evaluate; defaults to the running process in detectCompatibility. */
  nodeVersion?: string | null
  /** Alias accepted by callers that already group installed values. */
  node?: string | null
  /** Installed package versions keyed by package name. */
  packageVersions?: Partial<Record<CompatibilityPackageName, string | null | undefined>>
  /** Alias accepted by callers that already group installed values. */
  packages?: Partial<Record<CompatibilityPackageName, string | null | undefined>>
  /** Nested installed values are useful when feeding a captured diagnostic fixture. */
  installed?: {
    node?: string | null
    packages?: Partial<Record<CompatibilityPackageName, string | null | undefined>>
  }
}

/* ------------------------------------------------------------------ *
 * 极简 semver 比较器（浏览器安全，零依赖）
 * ------------------------------------------------------------------ */

interface SemverParts {
  major: number
  minor: number
  patch: number
  prerelease: Array<number | string>
}

function parseSemverParts(raw: string): SemverParts | undefined {
  if (typeof raw !== 'string') return undefined
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(raw.trim())
  if (match === null) return undefined
  const prerelease = match[4] === undefined
    ? []
    : match[4].split('.').map(part => (/^\d+$/u.test(part) ? Number(part) : part))
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if (![major, minor, patch].every(Number.isSafeInteger)) return undefined
  return { major, minor, patch, prerelease }
}

function compareIdentifiers(left: number | string, right: number | string): number {
  if (typeof left === 'number' && typeof right === 'number') return left < right ? -1 : left > right ? 1 : 0
  if (typeof left === 'number') return -1
  if (typeof right === 'number') return 1
  return left < right ? -1 : left > right ? 1 : 0
}

/** SemVer 2.0.0 precedence；无法解析时返回 undefined（调用方据此降级为 unknown）。 */
export function compareDshVersion(left: string, right: string): number | undefined {
  const a = parseSemverParts(left)
  const b = parseSemverParts(right)
  if (a === undefined || b === undefined) return undefined
  for (const [aPart, bPart] of [[a.major, b.major], [a.minor, b.minor], [a.patch, b.patch]] as const) {
    if (aPart !== bPart) return aPart < bPart ? -1 : 1
  }
  // 无 prerelease 视为高于任何同号的 prerelease
  if (a.prerelease.length === 0 && b.prerelease.length !== 0) return 1
  if (a.prerelease.length !== 0 && b.prerelease.length === 0) return -1
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const aPart = a.prerelease[index]
    const bPart = b.prerelease[index]
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1
    const comparison = compareIdentifiers(aPart, bPart)
    if (comparison !== 0) return comparison
  }
  return 0
}

/** 是否落在受支持的宿主下界之上（等于下界也算）。无法解析返回 false。 */
export function meetsMinimumDshVersion(value: string): boolean {
  const comparison = compareDshVersion(value, MIN_SUPPORTED_DSH_VERSION)
  return comparison !== undefined && comparison >= 0
}

/** 是否落在**准入区间** `[下界, 上界)` 内。等于上界即视为出区间。无法解析返回 false。 */
export function withinSupportedDshRange(value: string): boolean {
  if (!meetsMinimumDshVersion(value)) return false
  const comparison = compareDshVersion(value, MAX_SUPPORTED_DSH_VERSION)
  return comparison !== undefined && comparison < 0
}

/** 是否为维护者实际跑过的版本（严格列举，不参与安装判定）。 */
export function isVerifiedDshPluginApiVersion(value: string): boolean {
  return VERIFIED_DSH_PLUGIN_API_VERSIONS.some(version => version === value)
}

/**
 * 是否受支持。语义已变更两次：枚举 → 下界 → **有界准入区间**。
 * 保留函数名以免打断既有导入与测试。注意它只回答「门开不开」，不回答「可信不可信」。
 */
export function isSupportedDshPluginApiVersion(value: string): boolean {
  return withinSupportedDshRange(value)
}

/**
 * Public contract data mirrored by compatibility.json without importing JSON at runtime.
 *
 * ⚠ 刻意与原版保持**形状完全一致**（version / versions / packages），不新增 minimum/range 字段。
 * 原因：`scripts/check-compatibility.mjs` 会拿这份契约与仓库里的 `compatibility.json` 对账；
 * 一旦改形状，`compatibility.json` 必须同步重写，而在无法本地跑校验的情况下等于盲改。
 * 新语义只落在下面的判定函数里，不进入契约数据。
 */
export const COMPATIBILITY_CONTRACT = {
  schemaVersion: COMPATIBILITY_SCHEMA_VERSION,
  engines: { node: SUPPORTED_NODE_RANGE },
  dshPluginApi: {
    version: SUPPORTED_DSH_PLUGIN_API_VERSION,
    versions: SUPPORTED_DSH_PLUGIN_API_VERSIONS,
    packages: DSH_PLUGIN_API_PACKAGES,
  },
  piAi: { package: PI_AI_PACKAGE, version: SUPPORTED_PI_AI_RANGE },
} as const

/* ------------------------------------------------------------------ *
 * 判定
 * ------------------------------------------------------------------ */

/** pi-ai 是本分支自有的私有依赖，仍按精确版本判定：不匹配只降级为 unverified，不阻止安装。 */
function piAiVersionStatus(value: string): CompatibilityStatus {
  return value.trim() === SUPPORTED_PI_AI_RANGE ? 'compatible' : 'unverified'
}

function parseNodeVersion(value: string): [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/u.exec(value.trim())
  if (match === null) return undefined
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if (![major, minor, patch].every(Number.isSafeInteger)) return undefined
  return [major, minor, patch]
}

function nodeStatus(value: string | null | undefined): CompatibilityStatus {
  if (value === undefined || value === null || value.trim() === '') return 'unknown'
  const parsed = parseNodeVersion(value)
  if (parsed === undefined) return 'unknown'
  const [major, minor, patch] = parsed
  if (major === 22) return minor > 19 || (minor === 19 && patch >= 0) ? 'compatible' : 'incompatible'
  return major >= 24 ? 'compatible' : 'incompatible'
}

function packageEntry(
  supported: string,
  installed: string | null | undefined,
  status: (value: string) => CompatibilityStatus,
): CompatibilityEntry {
  const missing = installed === undefined || installed === null || installed === ''
  return {
    supported,
    installed: missing ? null : installed,
    status: missing ? 'unknown' : status(installed),
  }
}

function nodeEntry(installed: string | null | undefined): CompatibilityEntry {
  return {
    supported: SUPPORTED_NODE_RANGE,
    installed: installed ?? null,
    status: nodeStatus(installed),
  }
}

function aggregateStatus(entries: readonly CompatibilityEntry[]): CompatibilityStatus {
  if (entries.some(entry => entry.status === 'incompatible')) return 'incompatible'
  if (entries.some(entry => entry.status === 'unknown')) return 'unknown'
  if (entries.some(entry => entry.status === 'unverified')) return 'unverified'
  return 'compatible'
}

/**
 * 报告口径（轨道二）：**只有维护者实测过的版本**才算 `compatible`。
 *
 * 落在准入区间内但不在清单里 → `unverified`，既不说可用，也不判死——版本号本身
 * 证明不了行为兼容，这里只承认证据。低于下界同样只降级为 `unverified`：
 * 是否拒载由宿主读 `engines.dsh` 决定，不由这张报告代劳。
 */
function hostStatus(value: string): CompatibilityStatus {
  return isVerifiedDshPluginApiVersion(value) ? 'compatible' : 'unverified'
}

function hostEntry(installed: string | null | undefined): CompatibilityEntry {
  return packageEntry(SUPPORTED_DSH_PLUGIN_API_RANGE, installed, hostStatus)
}

/** Evaluate a captured set of versions without touching the filesystem. */
export function evaluateCompatibility(input: CompatibilityEvaluationInput = {}): CompatibilityReport {
  const installedNode = input.nodeVersion ?? input.node ?? input.installed?.node
  const suppliedPackages = input.packageVersions ?? input.packages ?? input.installed?.packages ?? {}
  const packages = {
    '@deepseek-ai/dsh-llm': hostEntry(suppliedPackages['@deepseek-ai/dsh-llm']),
    '@deepseek-ai/dsh-llm-pi-ai': hostEntry(suppliedPackages['@deepseek-ai/dsh-llm-pi-ai']),
    '@deepseek-ai/dsh-compaction': hostEntry(suppliedPackages['@deepseek-ai/dsh-compaction']),
    [PI_AI_PACKAGE]: packageEntry(
      SUPPORTED_PI_AI_RANGE,
      suppliedPackages[PI_AI_PACKAGE],
      piAiVersionStatus,
    ),
  } as Record<CompatibilityPackageName, CompatibilityEntry>
  const node = nodeEntry(installedNode)
  const status = aggregateStatus([node, ...Object.values(packages)])

  const dshVersion = packages['@deepseek-ai/dsh-llm'].installed
  const piVersion = packages[PI_AI_PACKAGE].installed
  // 三个宿主包必须来自同一发行版本；混装（例如装了 rc.1 的 llm 与 alpha.3 的 compaction）只降级为 unverified。
  const matchedPair = dshVersion !== null
    && dshVersion === packages['@deepseek-ai/dsh-llm-pi-ai'].installed
    && dshVersion === packages['@deepseek-ai/dsh-compaction'].installed
    && isVerifiedDshPluginApiVersion(dshVersion)
    && piVersion === SUPPORTED_PI_AI_RANGE

  return {
    schemaVersion: COMPATIBILITY_SCHEMA_VERSION,
    status: status === 'compatible' && !matchedPair ? 'unverified' : status,
    node,
    packages,
  }
}

/** Alias for callers that prefer assessment terminology. */
export const assessCompatibility = evaluateCompatibility
