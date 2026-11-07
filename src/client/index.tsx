/** Browser half: OpenAI Codex account management inside Plugin configuration. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
// Type-only: pulls the conversation input-region SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the independent completed-Turn tail SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: pulls ctx.modelDirectories and its session directory contract.
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { OPENAI_CODEX_SETTINGS_NAMESPACE } from '../settings-contract.ts'
import type { OpenAICodexSettingsConfig } from '../settings-contract.ts'
import { OpenAICodexPluginCard } from './OpenAICodexPluginCard.tsx'
import type { OpenAICodexPluginCardInjected } from './OpenAICodexPluginCard.tsx'
import { OpenAICodexQuotaIndicator } from './OpenAICodexQuotaIndicator.tsx'
import type { OpenAICodexQuotaIndicatorInjected } from './OpenAICodexQuotaIndicator.tsx'
import { OpenAICodexFastModeToggle } from './OpenAICodexFastModeToggle.tsx'
import type { OpenAICodexFastModeToggleInjected } from './OpenAICodexFastModeToggle.tsx'
import { en, zh } from './locales.ts'
import type { OpenAICodexSettingsKey } from './locales.ts'
import { CodexImageToolView } from './CodexImageToolView.tsx'
import type { CodexImageToolViewInjected } from './CodexImageToolView.tsx'
import { CodexImageTurnTail } from './CodexImageTurnTail.tsx'
import type { CodexImageTurnTailProps } from './CodexImageTurnTail.tsx'
import { OpenAICodexUpdateOverlay } from './OpenAICodexUpdateNotice.tsx'
import { OpenAICodexUpdateStore } from './update-store.ts'
import { CODEX_CONNECT_VERSION } from '../version.ts'
import { OpenAICodexAccountStore } from './account-store.ts'
import { OpenAICodexModelsCard } from './OpenAICodexModelsCard.tsx'
import { PublishedAdaptiveTaskControl as AdaptiveTaskControl } from './PublishedAdaptiveTaskControl.tsx'
import { OpenAICodexConfigForm } from './config-form.ts'
import { guardShell, SHELL_SLOT } from './anb-shell.mjs'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** OpenAI Codex account page copy. */
    'settings.openai-codex': OpenAICodexSettingsKey
  }

  /**
   * ANB 工具壳独占的子槽位（部门约定，见 N29）。壳把它投影成标签行，
   * 各 ANB 插件的面板注册进这里。宿主没有内置这个槽位，因此由本插件增补声明。
   */
  interface SlotMap {
    'anb.tool.tab': { kind: 'list'; scope: 'root' }
  }
}

/** Stable browser-plugin name. */
export const name = 'dsh-codex-connect-client'
/** Client services required by the Plugin configuration contribution. */
export const inject = ['slots', 'locale', 'connection', 'remote', 'remote.session', 'configForms', 'sessions']

/** Register account copy and the OpenAI Codex card under Plugin configuration. */
export function apply(ctx: ClientContext): void {
  const namespace = 'settings.openai-codex'
  const updater = new OpenAICodexUpdateStore(CODEX_CONNECT_VERSION)
  const account = new OpenAICodexAccountStore()
  ctx.effect(() => () => { account.dispose() }, 'dsh-codex-connect: account observation')
  ctx.effect(() => {
    void updater.refresh()
    return () => { updater.dispose() }
  }, 'dsh-codex-connect: update checker')
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }), 'dsh-codex-connect: settings copy')
  const t = ctx.locale.bind(namespace) as OpenAICodexPluginCardInjected['t']
  const configScope = new OpenAICodexConfigForm(
    ctx.configForms.get<OpenAICodexSettingsConfig>(OPENAI_CODEX_SETTINGS_NAMESPACE),
    ctx.configForms.describe(),
  )
  // ── 设置入口归口「ANB 工具」（N29 · 老板 2026-10-30 令）──────────────────
  // 面板挂到壳独占的 `anb.tool.tab` 槽位，由壳统一注册 `settings.section`。
  // 本插件**不再**注册 settings.section / settings.plugins.tab —— 设置里只留一个人口。
  // `anb.tool.tab` 已在上方 `declare module` 里并入宿主 SlotMap，无需类型断言。
  ctx.effect(() => {
    guardShell(ctx)
    return ctx.configForms.whileServed([OPENAI_CODEX_SETTINGS_NAMESPACE], () => ctx.slots.inject(SHELL_SLOT, () => ctx.slots.register({
      name: SHELL_SLOT,
      id: 'chatgpt-connect',
      order: 20,
      locale: namespace,
      label: () => t('title'),
      inject: (): OpenAICodexPluginCardInjected => ({ t, configScope, updater, account }),
    }, OpenAICodexPluginCard)))
  }, 'dsh-chatgpt-connect: anb tool tab')

  ctx.slots.inject('settings.models.footer', () => ctx.slots.register({
    name: 'settings.models.footer',
    id: 'dsh-codex-connect-account',
    order: 100,
    inject: () => ({ t, account, configScope }),
  }, OpenAICodexModelsCard))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-codex-connect-update',
    order: 40,
    locale: namespace,
    inject: (): { updater: OpenAICodexUpdateStore } => ({ updater }),
  }, OpenAICodexUpdateOverlay))

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'codex-connect-task-models',
    order: 30,
    inject: () => ({ language: t('adaptiveTaskLanguage') }),
  }, AdaptiveTaskControl))

  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'codex_connect_image_generate',
    locale: namespace,
    inject: (): CodexImageToolViewInjected => ({ sessions: ctx.sessions, configScope }),
  }, CodexImageToolView))

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    id: 'codex-connect-generated-images',
    order: 20,
    locale: namespace,
    inject: (): Pick<CodexImageTurnTailProps, 'sessions' | 'configScope'> => ({ sessions: ctx.sessions, configScope }),
  }, CodexImageTurnTail))

  ctx.inject(['slots', 'modelDirectories'], (scope: ClientContext) => {
    scope.slots.inject('conversation.input.right', () => scope.slots.register({
      name: 'conversation.input.right',
      id: 'openai-codex-fast-mode',
      order: 10,
      locale: namespace,
      inject: (sessionId): OpenAICodexFastModeToggleInjected => ({
        directory: scope.modelDirectories.directoryFor(sessionId).store,
        account,
      }),
    }, OpenAICodexFastModeToggle))
    scope.slots.inject('conversation.input.right', () => scope.slots.register({
      name: 'conversation.input.right',
      id: 'openai-codex-quota',
      order: 20,
      locale: namespace,
      inject: (sessionId): OpenAICodexQuotaIndicatorInjected => ({
        directory: scope.modelDirectories.directoryFor(sessionId).store,
      }),
    }, OpenAICodexQuotaIndicator))
  })
}
