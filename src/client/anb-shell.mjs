// dsh-chatgpt-connect —— ANB 工具壳（内联副本，逐字取自 dsh-proxy-egress）
// 块体必须与其他 ANB 系列插件逐字一致（由仓库内的一致性哨兵脚本比对）。
import React from 'react'
const h = React.createElement

// >>> ANB-SHELL:BEGIN v2 ── 这一段在 ANB 系列插件里必须**逐字一致**。
//     迁移其它插件时整段复制；不一致 = 壳行为分叉，用 `node tools/check-anb-shell.mjs` 比对即可发现。
const SHELL_ID = 'anb-toolbox'
const SHELL_SLOT = 'anb.tool.tab'
const SHELL_TITLE = 'ANB 工具'
const SHELL_ORDER = 16   // 紧跟官方的「内置插件」（order 15）
/** 作者主页：标题行的小字与说明里的「点击」都指向它。 */
const SHELL_HOME = 'https://github.com/yiyunet'
const SHELL_TAGLINE = 'AI原生突围'
// 说明文案逐字拆成三段，中间那段「点击」是唯一的链接。
const SHELL_INTRO_LEAD = 'ANB工具箱聚焦【AI原生突围】，更多好用工具，请'
const SHELL_INTRO_LINK = '点击'
const SHELL_INTRO_TAIL = '！'

/** 只有合法 http(s) 地址才给 href：地址被改坏时降级成不可跳转，不抛错。 */
function shellHref(url) {
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : undefined
}

const SH = {
  wrap: { padding: '4px 2px' },
  head: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', margin: '0 0 4px' },
  title: { fontSize: 15, fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 12, opacity: 0.72, color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 },
  intro: { opacity: 0.72, fontSize: 12, margin: '0 0 14px' },
  link: { color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 },
  empty: { opacity: 0.72, fontSize: 13 },
  // 文件夹式标签栏：`flex-wrap` 让一排放不下时自动折成多排，每排都坐在自己的基线上。
  tabs: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 4,
    padding: '0 6px', borderBottom: '1px solid var(--dsh-border, #e3e5e8)', marginBottom: 12,
  },
  tab: {
    padding: '6px 14px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
    background: 'rgba(127, 127, 127, 0.10)',
    border: '1px solid var(--dsh-border, #e3e5e8)', borderBottom: 'none',
    borderRadius: '8px 8px 0 0', color: 'inherit', opacity: 0.72,
  },
  tabActive: {
    opacity: 1, fontWeight: 600,
    // 与内容区同色并下压 1px，盖住栏底那条分隔线 —— 这就是"文件夹的当前页"。
    background: 'var(--dsh-bg, Canvas)', borderBottom: '1px solid var(--dsh-bg, Canvas)',
    marginBottom: -1,
  },
  panel: {},
}

/**
 * 壳：把 `anb.tool.tab` 账本投影成标签行。
 * 标题行 + 说明 + **始终显示的标签栏**（只有一个工具时也显示单选中项）：
 * 后续工具注册进来时，用户看到的位置不会跳变，也不用重学界面；
 * 工具被移除/禁用时标签随账本消失，选中项回落到第一个，不会留下失效项。
 */
function AnbShell(props) {
  const rows = props.useTabs((value) => value)
  const [activeId, setActiveId] = React.useState()
  const [visited, setVisited] = React.useState(() => new Set())
  const active = rows.find((row) => row.id === activeId)?.id ?? (rows[0] ? rows[0].id : undefined)

  // 标签首次选中才挂载，之后保持挂载：面板里的草稿与已加载状态切回来不丢。
  React.useEffect(() => {
    if (active === undefined) return
    setVisited((previous) => (previous.has(active) ? previous : new Set([...previous, active])))
  }, [active])

  const href = shellHref(SHELL_HOME)
  const head = [
    h('div', { key: 'head', style: SH.head },
      h('h2', { style: SH.title }, SHELL_TITLE),
      h('a', {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: SH.subtitle,
      }, SHELL_TAGLINE)),
    h('p', { key: 'intro', style: SH.intro },
      SHELL_INTRO_LEAD,
      h('a', {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: SH.link,
      }, SHELL_INTRO_LINK),
      SHELL_INTRO_TAIL),
  ]

  if (rows.length === 0) {
    return h('div', { style: SH.wrap }, head,
      h('p', { style: SH.empty }, '还没有可显示的插件面板。'))
  }

  const move = (event, index) => {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % rows.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + rows.length) % rows.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = rows.length - 1
    else return
    event.preventDefault()
    setActiveId(rows[next].id)
  }

  return h('div', { style: SH.wrap }, head,
    h('div', { role: 'tablist', 'aria-label': SHELL_TITLE, style: SH.tabs },
      rows.map((row, index) => h('button', {
        key: row.id,
        type: 'button',
        role: 'tab',
        id: `anb-tab-${row.id}`,
        'aria-selected': row.id === active,
        'aria-controls': `anb-panel-${row.id}`,
        tabIndex: row.id === active ? 0 : -1,
        style: row.id === active ? { ...SH.tab, ...SH.tabActive } : SH.tab,
        onClick: () => { setActiveId(row.id) },
        onKeyDown: (event) => move(event, index),
      }, row.label))),
    rows
      .filter((row) => row.id === active || visited.has(row.id))
      .map((row) => h('div', {
        key: row.id,
        role: 'tabpanel',
        id: `anb-panel-${row.id}`,
        'aria-labelledby': `anb-tab-${row.id}`,
        hidden: row.id !== active,
        style: SH.panel,
      }, props.renderSlot(SHELL_SLOT, {}, { only: row.id }))))
}

/**
 * 账本 → 有序标签行。
 * · 用 `entriesOfSlot`（每个 id 只取胜出的那一格），与渲染器 `only` 的过滤口径一致；
 *   老版本没有这个 API 时退回 `entries`。
 * · uSES 要求版本不变时返回**同一引用**，否则每次渲染都是新数组 → 无限重渲染。
 */
function shellTabs(ctx) {
  let version = -1
  let rows = []
  const read = (label) => (typeof label === 'function' ? label() : label)
  const winners = (key) => (typeof ctx.slots.entriesOfSlot === 'function'
    ? ctx.slots.entriesOfSlot(key)
    : ctx.slots.entries(key))
  return {
    tabs: {
      getSnapshot: () => {
        const next = ctx.slots.getVersion(SHELL_SLOT)
        if (next !== version) {
          version = next
          rows = winners(SHELL_SLOT)
            .map((entry) => ({
              id: entry.options.id || '',
              order: entry.options.order || 0,
              label: String(read(entry.options.label) || ''),
            }))
            .sort((left, right) => left.order - right.order)
        }
        return rows
      },
      subscribe: (listener) => ctx.slots.subscribe(SHELL_SLOT, listener),
    },
  }
}

/** 登记壳：拥有设置导航项，并声明它独占的子 slot。 */
function mountShell(ctx) {
  return ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SHELL_ID,
    order: SHELL_ORDER,
    label: () => SHELL_TITLE,
    inject: () => ({ hooks: shellTabs(ctx) }),
    children: { [SHELL_SLOT]: { kind: 'list', scope: 'root' } },
  }, AnbShell))
}

/**
 * 壳守护：没有壳就补一个；别人已经登记就让位。
 * ⚠️ 用**组件引用**判断"这一格是不是我登记的"：同 id 注册是**替换**语义，
 * 只看 id 会把自己刚登记的那格误判成别人的，然后让位 → 壳闪一下又没了。
 */
function guardShell(ctx) {
  let owned
  // 与渲染口径一致：每个 id 只看胜出的那一格。
  const winners = () => (typeof ctx.slots.entriesOfSlot === 'function'
    ? ctx.slots.entriesOfSlot('settings.section')
    : ctx.slots.entries('settings.section'))
  const holds = () => winners().some((entry) => entry.options.id === SHELL_ID)
  const mine = () => winners().some((entry) => entry.options.id === SHELL_ID && entry.component === AnbShell)

  const ensure = () => {
    if (mine()) return
    if (owned !== undefined) { owned(); owned = undefined }
    if (holds()) return
    owned = mountShell(ctx)
  }

  ensure()
  ctx.effect(() => ctx.slots.subscribe('settings.section', ensure), 'anb shell guard')
}
// <<< ANB-SHELL:END v2

export { SHELL_ID, SHELL_SLOT, SHELL_TITLE, SHELL_ORDER, shellTabs, mountShell, guardShell }
