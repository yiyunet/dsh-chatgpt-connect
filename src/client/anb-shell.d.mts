/**
 * `anb-shell.mjs` 的类型声明。
 *
 * 为什么壳块放在 .mjs 而不是 .tsx：一致性哨兵脚本要求壳块在
 * `// >>> ANB-SHELL:BEGIN v2` 与 `// <<< ANB-SHELL:END v2` 之间**逐字节一致**，
 * 而 TypeScript 的类型标注会让文本必然分叉。所以壳保持纯 JS，仅在需要的地方补声明。
 */

import type { Context } from '@deepseek-ai/cordis'

/** 壳在 `settings.section` 里的 id。 */
export declare const SHELL_ID: 'anb-toolbox'
/** 壳独占的子槽位；面板注册进它。 */
export declare const SHELL_SLOT: 'anb.tool.tab'
/** 壳的标题文案。 */
export declare const SHELL_TITLE: 'ANB 工具'

/**
 * 登记壳（运行时单例）：已有别的 ANB 插件登记就让位，登记者被禁用后自动接管。
 * 幂等，可重复调用。
 */
export declare function guardShell(ctx: Context): void
