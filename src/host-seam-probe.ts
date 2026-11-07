/**
 * Load-time seam probing for a Host-version-independent plugin.
 *
 * 目的：把「宿主版本对不上 → 整插件装不上」换成「宿主接缝缺失 → 只关掉对应功能」。
 *
 * 命名说明：本文件刻意**不叫** `capability-probe.ts`——那个名字已被上游占用，用于
 * Codex Responses 能力探针（`probeCodexResponses`，被 `capability-diagnostics.ts` 依赖）。
 * 两者用途不同，不可合并。
 *
 * 纪律：
 * 1. **永不向宿主抛错**。任何探测失败都折叠成 `present: false`。
 * 2. **只探测本插件真实使用到的接缝**（依据 `src/index.ts` 的调用点），不猜。
 * 3. 探测是**只读**的：不注册、不订阅、不修改上下文。
 * 4. 探测失败 ≠ 判定宿主不兼容。它是"降级依据"，不是"拒绝理由"。
 *
 * 定位与边界（勿高估）：
 * - 本模块是**启动期粗筛**，只回答"这个服务/方法在不在"，**不回答"签名/返回值/生命周期语义变没变"**。
 *   宿主升级更常见的恰恰是后者，那种情况必须靠契约测试发现，不能指望这里。
 * - 同一份清单在**不同就绪时机**结果不同：`ctx.get()` 在启动早期可能返回 undefined 而稍后可用。
 *   因此缺失结论只用于决定"本轮先不启用该功能"，不得用于持久化判定或写进兼容状态。
 * - 若将来要接入运行时，正确用法是：核心 provider 缺失 → 明确报不支持；可选功能缺失 → 单独关闭并给出可见原因。
 */

/** 一个被探测的运行时接缝。 */
export interface SeamProbe {
  /** 人类可读的接缝名，例如 `llm.registerAdapter`。 */
  seam: string
  /** 依赖该接缝的功能标签，用于聚合成"哪些功能被关掉"。 */
  feature: ProbeFeature
  /** 接缝是否存在且可用。 */
  present: boolean
  /** 缺失时的补充说明（不含路径/凭据/账号信息）。 */
  note?: string
}

/** 可独立降级的功能标签。 */
export type ProbeFeature =
  | 'provider'        // 注册 openai-codex 路由（核心，缺了等于插件无意义）
  | 'model-catalog'   // 模型列表/元数据
  | 'search'          // 可选搜索接管
  | 'tools'           // view_image / image_generate / quota 工具
  | 'settings'        // 设置面板读写
  | 'http-routes'     // OAuth / 代理 / 图片资源 / Task HTTP 路由
  | 'attachments'     // 附件读取
  | 'workspace-fs'    // 文件系统沙箱读取（图片工具依赖）

interface SeamSpec {
  /** `ctx.get(<service>)` 的服务名。 */
  service: string
  /** 该服务上必须具备的方法；省略则只检查服务本身存在。 */
  method?: string
  feature: ProbeFeature
}

/**
 * 探测清单。每条都对应 `src/index.ts` 里一处真实调用，新增调用时同步补一条。
 * 顺序按重要性排列，`provider` 必须最先。
 */
const SEAMS: readonly SeamSpec[] = [
  { service: 'llm', method: 'registerAdapter', feature: 'provider' },
  { service: 'llm', method: 'listProviders', feature: 'provider' },
  { service: 'llm', method: 'listModels', feature: 'model-catalog' },
  { service: 'llm', method: 'resolveModelInfo', feature: 'model-catalog' },
  { service: 'web', method: 'registerSearchProvider', feature: 'search' },
  { service: 'tools', method: 'register', feature: 'tools' },
  { service: 'fs', feature: 'workspace-fs' },
  { service: 'attachments', feature: 'attachments' },
  { service: 'settings', method: 'configure', feature: 'settings' },
  { service: 'webServer', feature: 'http-routes' },
  { service: 'connection', feature: 'http-routes' },
] as const

function seamName(spec: SeamSpec): string {
  return spec.method === undefined ? spec.service : `${spec.service}.${spec.method}`
}

/** 安全读取服务：`ctx.get` 对未知服务可能抛错，一律折叠为 undefined。 */
function readService(ctx: unknown, service: string): unknown {
  if (ctx === null || typeof ctx !== 'object') return undefined
  const getter = (ctx as { get?: unknown }).get
  if (typeof getter !== 'function') return undefined
  try {
    return (getter as (name: string) => unknown).call(ctx, service)
  } catch {
    return undefined
  }
}

function readMethod(target: unknown, method: string): unknown {
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) return undefined
  try {
    return (target as Record<string, unknown>)[method]
  } catch {
    return undefined
  }
}

/**
 * 探测全部接缝。
 * @param ctx - 插件上下文（鸭子类型，不导入 cordis 类型，便于单测直接传普通对象）。
 * @param seams - 测试用接缝清单覆盖。
 * @returns 每个接缝的探测结果，顺序与清单一致。
 */
export function probeHostSeams(ctx: unknown, seams: readonly SeamSpec[] = SEAMS): SeamProbe[] {
  return seams.map(spec => {
    const service = readService(ctx, spec.service)
    if (service === undefined || service === null) {
      return { seam: seamName(spec), feature: spec.feature, present: false, note: `service "${spec.service}" not present` }
    }
    if (spec.method === undefined) {
      return { seam: seamName(spec), feature: spec.feature, present: true }
    }
    const method = readMethod(service, spec.method)
    return typeof method === 'function'
      ? { seam: seamName(spec), feature: spec.feature, present: true }
      : { seam: seamName(spec), feature: spec.feature, present: false, note: `method "${spec.method}" missing on "${spec.service}"` }
  })
}

/**
 * 聚合出需要跳过的功能。
 * 同一 feature 有多条接缝时，**任一缺失即视为该功能不可用**（保守：宁可少开功能，不可半坏）。
 */
export function unavailableFeatures(probes: readonly SeamProbe[]): ProbeFeature[] {
  const missing = new Set<ProbeFeature>()
  for (const probe of probes) if (!probe.present) missing.add(probe.feature)
  return [...missing]
}

/** 核心功能是否可用。缺它时插件应保持沉默（不注册 provider）而非抛错。 */
export function hasCoreProvider(probes: readonly SeamProbe[]): boolean {
  const required = probes.filter(probe => probe.feature === 'provider')
  return required.length > 0 && required.every(probe => probe.present)
}

/**
 * 单行结构化诊断，给 `ctx.logger.warn` 用。
 * 只含接缝名与功能标签——不含路径、凭据、账号、会话内容。
 */
export function formatProbeReport(probes: readonly SeamProbe[]): string {
  const missing = probes.filter(probe => !probe.present)
  if (missing.length === 0) return 'dsh-chatgpt-connect: all host seams present'
  const disabled = unavailableFeatures(probes).join(', ')
  const detail = missing.map(probe => `${probe.seam}${probe.note === undefined ? '' : ` (${probe.note})`}`).join('; ')
  return `dsh-chatgpt-connect: host seams missing — disabled: ${disabled}; detail: ${detail}`
}
