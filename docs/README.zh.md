# dsh-chatgpt-connect

![ChatGPT Connect —— 把你的 ChatGPT 订阅接进 DeepSeek Harness](https://raw.githubusercontent.com/yiyunet/dsh-chatgpt-connect/main/assets/hero.svg)

[![npm version](https://img.shields.io/npm/v/dsh-chatgpt-connect/alpha?label=npm%20alpha&color=cb3837)](https://www.npmjs.com/package/dsh-chatgpt-connect)
[![license](https://img.shields.io/npm/l/dsh-chatgpt-connect?color=blue)](../LICENSE)
[![node](https://img.shields.io/node/v/dsh-chatgpt-connect)](../package.json)

[English](../README.md) | 中文

通过 OAuth 把你的 ChatGPT 订阅接入 DeepSeek Harness：在常规 Harness agent loop 中使用 Codex 模型，并提供可选的 GPT Image 图片生成与编辑、由用户控制的默认设置、Harness 原生审批、额度显示、诊断与可靠的会话恢复。

社区 Alpha 项目。本项目独立维护，**与 OpenAI、ChatGPT、Codex、DeepSeek 或 DeepSeek Harness 不存在隶属关系，也未获得其赞助或背书。**

**本分支状态 —— 版本 `0.3.1-alpha.2`，已于 2026-11-07 通过 Trusted Publishing 发布到 npm 的 `alpha` 标签。** 它是 [franksong2702/dsh-codex-connect](https://github.com/franksong2702/dsh-codex-connect) 的自维护分支，后者又派生自 [Yan-Zero/dsh-codex](https://github.com/Yan-Zero/dsh-codex)。包名与 CLI 名均为 `dsh-chatgpt-connect`；设置面板标题为 **ChatGPT Connect**。上游自己的发布记录原样保留在本文末尾，仍使用旧包名。

本分支相对上游的改动：

- **准入与已验证分离**：包声明有界宿主区间，区间内的 DSH 更新不再拒载；只有维护者实测过的版本才报告 `compatible`，区间内其余版本一律报告 `unverified`，不声称可用。可用性由声明区间决定，可信度由已验证清单决定。
- **包名、CLI 名与仓库名统一**：包名与 CLI 名为 `dsh-chatgpt-connect`；设置面板标题为 `ChatGPT Connect`，中文语种下 ANB 工具选项卡显示「ChatGPT连接」。
- **面板内的更新检查在本分支关闭**：面板显示无法取得更新信息，关闭期间不发起任何网络请求。升级请通过插件管理器进行，不要依赖该面板。
- **Windows 验收通道可用**：native-compaction 验收脚本不再在 Windows 上套用 POSIX 专属的权限与归属检查；POSIX 行为不变。

Codex Connect 为标准 Harness agent loop 添加 `openai-codex` 模型提供方。工具、权限、审批、附件、会话持久化、压缩与恢复继续由 Harness 管理。安装插件不会改变默认模型或搜索路由，也不会把 ChatGPT 订阅变成 OpenAI Platform API Key。

## 前置要求

| 要求 | 取值 |
|---|---|
| 插件 | `dsh-chatgpt-connect@0.3.1-alpha.2` |
| DeepSeek Harness | 声明区间 `>=0.1.7-rc.1 <0.3.0`。本版本仅在实测过的十五个宿主上报告 `compatible`：`0.1.7-rc.1`、`0.1.7-rc.2`、`0.2.0-rc.1`、`0.2.0-rc.2`、`0.2.1-alpha.1`、`0.2.1-alpha.2`、`0.2.1-alpha.3`、`0.2.1-alpha.4`、`0.2.1-alpha.5`、`0.2.1-rc.1`、`0.2.1-rc.2`、`0.2.1-rc.3`、`0.2.1-rc.4`、`0.2.1-rc.5`、`0.2.2-alpha.3`。区间内其余宿主一律报告 `unverified`，不声称可用。 |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| 账户 | 通过 ChatGPT OAuth 使用所请求的 Codex 模型；可用性由 OpenAI 决定 |

本版本记录的精确组合见 [compatibility.json](../compatibility.json)，其中 `latestDshVersion` 为 `0.2.2-alpha.3`。已验证清单中没有某个宿主，只表示该组合尚未验证，不表示已知不可运行。不要根据旧组合推断新版宿主支持，也不要为了凑上某一行而升级或降级 Harness。

## 快速开始

### 1. 安装

```sh
dsh plugin --profile web add dsh-chatgpt-connect@0.3.1-alpha.2
dsh web
```

将 `web` 替换为正在使用的 profile 名，启动 Harness 时也使用同一个 profile。从 DSH 源码 checkout 执行时，请在命令前加 `pnpm`。

必须带精确版本号：npm 的 `latest` 标签仍指向仅用于保留包名的 `0.0.0` 占位包，不带版本号会装到无法运行的包；`alpha` 是本分支唯一发布渠道，会移动的 tag 不保证其他宿主的兼容性。其他 profile 用法与完整安装检查见 [INSTALL.md](../INSTALL.md)。

### 2. 授权并选择模型

打开 **设置 → 模型 → Openai-Codex → 授权**，然后亲自在浏览器中完成批准。如果内嵌窗口被拦截，请用 **打开 ChatGPT 登录页面**。在 Harness 的常规模型选择器中选择一个 `openai-codex` 模型。

不要把授权 URL、code、token 或账户标识粘贴到 issue、日志、聊天或配置文件中。在另一台设备上使用浏览器时，可通过可选的手动回调表单完成当前登录，无需转发 localhost 回调端口；请遵循[远程浏览器授权](reference.zh.md#远程浏览器授权)说明。

### 3. 检查安装

若要求诊断不经过包管理器，请直接运行已经安装的 bin（替换为已经独立识别的实际路径）：

```sh
node /absolute/profile/node_modules/dsh-chatgpt-connect/lib/bin.js doctor --json \
  --install-anchor /absolute/dsh/node_modules/@deepseek-ai/dsh/package.json
```

`doctor --json` 只读本地安装元数据，不请求网络或输出原始凭据；指定安装锚点不证明该安装正在运行。`dsh plugin exec` 等包装命令自身可能核对或安装依赖。包含本改动的开发构建还会在设置中区分页面、Host 已加载和磁盘安装版本。诊断通过不代表模型权限，实际请求须另获授权。

## 核心能力

- **账户**：在 DSH 主机上保存最多 16 个账户，手动选择后续请求使用的活动账户，不按会话绑定。请求保持已固定的账户，插件不会自动轮换或静默故障切换。
- **模型与 Astra 支持**：当前已验证的 DSH 与插件组合支持 `gpt-6-astra`。插件补充缺失的模型定义，提供 Low、Medium、High、Xhigh 和 Max 五档推理强度；Default 保持提供方默认值。已保存的 Off/Minimal 选择需要[明确更新](../MIGRATION.md#astra-reasoning-selections)。安装的依赖目录包含 Astra 时，插件保留其原生元数据，同时维持这五档已校准的推理选择。模型出现在列表中，不代表当前账户具有调用权限。
- **Fast Mode**：为单个对话请求优先服务，默认关闭。可分别为新建主对话和新建子代理对话启用默认值，不改变已有对话。实际速度和额度消耗取决于服务端，不保证固定提速倍数。
- **额度**：显示服务端返回的 `5h`、`7d` 窗口及重置时间，已登录且标签页可见时通常每 60 秒刷新一次；失败后延长重试间隔。不虚构缺失窗口；Spark 使用独立额度桶。
- **插件更新**：本分支关闭面板内的更新检查。它不访问任何 registry，只报告信息不可用，也不会据此建议更改 DSH。

## 可选能力

以下选项在新安装时全部关闭。请在 **设置 → 插件 → 插件配置 → ChatGPT Connect** 或 **设置 → 模型 → Openai-Codex → 更多设置** 中编辑，再点击 **保存更改**。发生冲突或保存失败时会保留草稿。

| 能力 | 启用字段 | 重要行为 |
|---|---|---|
| 代理 | `enableProxy` | 不带凭据的 HTTP(S)，只作用于本插件流量，包括压缩的 OAuth 和额度响应；无关的 Fetch 请求仍使用宿主原来的传输方式。代理请求失败不会静默改走直连。 |
| Codex 搜索 | `enableSearch` | 将整个 profile 的搜索路由切换为 Codex；关闭后恢复之前的路由。 |
| 图片查看 | `enableImageTool` | 为视觉模型添加 `view_image`，读取本地文件和经过校验的公网 HTTP(S) 图片。 |
| GPT Image 图片生成与编辑 | `enableImageGeneration` | 根据提示词生图，或编辑明确选定的会话图片并使用有顺序的参考图；可用性、尺寸和额度仍由账户及服务端控制。同时作为跨路由图片句柄桥接的开关：在非 Codex 路由上把 ChatGPT Connect 图片选择句柄持久化到图片工具结果中，使图片编辑在这些路由上同样可用；`openai-codex` 路由会跳过，因为其适配器已在每次请求时注入相同句柄。可选 `imageHandleBridgeTools` 可将桥接限定到指定工具。 |
| 自动审查 | `enableAutoReview` | 将有界的审批上下文、工具参数、工作目录和待执行动作发送到 `chatgpt.com`，首次启用需要确认。失败时交还人工审批。 |

使用你当前 GPT 订阅计划提供的图片生成能力。成功生成的图片会显示在对话回复下方，无需展开处理过程；原工具卡片仍保留在处理过程里。生成原文件与附件预览分开保存；关闭能力或卸载插件不会删除这些文件。存储和访问规则见[配置与恢复](reference.zh.md#搜索与图片工具)。

自动审查在 Harness 策略判定需要审批后执行，不会绕过该策略。启用前请阅读[自动审查行为](auto-review.zh.md)。

**Luna Reserve 已移除。** 旧 `enableReserveFallback` 开关会被忽略，不再协商或自动切换模型。旧 `gpt-reserve` 会话须由用户明确选择普通模型；如宿主不支持在原会话切换，请保留原会话并用所选普通模型新建对话。旧 return 文件原样保留，不读取、迁移或删除。账户额度 UI 和只读额度工具仍使用普通 60 秒缓存及失败冷却，不后台轮询。参见[迁移说明](reference.zh.md#luna-reserve-回退)。

**可选的模型额度查询**：在插件 profile 配置中显式设置 `enableQuotaTool: true` 并重新加载插件后，会注册只读工具 `codex_connect_quota`。默认关闭，自定义设置卡没有该开关。它只返回共享 Codex 窗口的剩余比例、重置时间和新鲜度，不返回余额或账户标识。详见[额度查询](quota-tool.md)。百分比不是任务预算；资源限制不能成为降低要求、跳过测试或安全检查的理由。

**Task 编排已冻结。** 开发遵循[核心维护范围](maintenance-scope.md)：保留接入、兼容、诊断与恢复。Task 控件仍暂停——激活请求会被拒绝，现有宿主的浏览器回归中，新 Session 不显示这些控件。Adaptive Task、自动委派及未证明收益的优化均已冻结；此决定不会删除已发布选项，也不会远程停用已有安装。

## 常见问题与重要限制

### 凭据保存在哪里？

OAuth 凭据保存在运行 DSH 的主机上，由该主机用于向 OpenAI 认证和发起请求。正常浏览器账户响应只返回账户摘要，不返回原始 token。远程浏览器设备不一定是 DSH 主机。

### 卸载插件会退出登录吗？

不会。OAuth 状态单独保存在 `$DSH_HOME/.openai-codex-auth.json`（默认 `~/.dsh`），插件不会复制或修改 `~/.codex/auth.json`。只有确实要删除凭据时，才使用 **退出所有账户**，或在卸载前运行 `logout`。

### 可以给不同对话分别切换账户吗？

后续 Codex 请求使用所选活动账户，每个对话不会各自绑定账户。Fast Mode 才是会话级设置。取消新的授权会保留已有账户；明确的刷新凭据撤销响应会提示重新授权，临时故障则保留账户供重试。详见[账户行为](reference.zh.md#账户模型与额度)。

### 为什么列表中的模型调用失败？

模型 HTTP/SSE 请求失败时，会在原错误消息后附加有界、仅属于该请求的诊断信息。单凭 `overloaded` 消息不能认定账户被封锁。范围与复现方式见[持续错误诊断](experiments/issue-219-diagnostics.md)。

账户权限、插件与宿主兼容性、网络条件都会影响可用性。其他客户端可以使用，不代表此集成一定可用。OpenAI 控制模型权限、额度、上下文容量和服务行为；目录条目不是账户权限证明。

### 修改客户端请求头就能避免持续授权失败吗？

目前没有这样的保证。本项目是第三方集成，不冒充 Codex Desktop，也不伪造安装标识或 attestation 请求头。pi-ai 模型/OAuth 路由与辅助路由目前采用不同的客户端身份。OpenAI 的 [App Server 文档](https://developers.openai.com/codex/app-server/)要求集成通过 `clientInfo` 标识自己的客户端，但这不能证明本插件直接调用后端接口的接受规则。`overloaded` 本身不是封锁证据。应保留有界诊断信息，对照成功和失败时段后再判断原因；请求 ID 仅私下提供，不公开 token 或完整会话归档。

### 可以保留原来的 `dsh-codex` 插件吗？

不能在同一份有效配置中并存：两者都会注册 `openai-codex`。请遵循 [MIGRATION.md](../MIGRATION.md)，只移除已经确认冲突的条目，不删除凭据或无关提供方。

### 诊断能证明什么？

`doctor` 只做本地检查。能力与 reviewer 探针在满足前置条件时可能联网并消耗额度。`auto-review-probe` 只检查 reviewer 路由和结构化响应，不验证完整 Harness 审批集成，也不执行被审查的动作。命令、限制与退出码见[诊断参考](reference.zh.md#能力探针)。

兼容性记录中缺少某个 DSH/plugin 组合，只表示尚未验证，不表示已知不可运行。

## 文档与开发

`docs/` 目录不随 npm 包发布；以下链接指向仓库，在那里始终是最新版本。

- [安装与升级](../INSTALL.md)
- [版本策略](../VERSIONING.md) · [从 `dsh-codex` 迁移](../MIGRATION.md)
- [配置、诊断与恢复](reference.zh.md)
- [架构与安全细节](design.zh.md)
- [自动审查行为](auto-review.zh.md)
- [本地请求计量：启用、报告与停用](request-metrics.zh.md)
- [英文 README](../README.md)
- [发布运行手册](../RELEASING.md) · [贡献指南](../CONTRIBUTING.md) · [安全政策](../SECURITY.md)

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:browser
pnpm run check:dsh-install
```

`check` 包含静态检查、单元测试、构建、兼容性和打包检查。`lint:metadata` 检查包元数据与发布规则；`lint:source` 检查宿主与浏览器 TypeScript 中未处理或误用的 Promise、无效 await、重复 case 和不可达代码。浏览器回归与隔离 DSH 安装是另外两个命令。这些检查不使用真实 OAuth 授权，也不能替代真实账户验收。

`lib/` 是入库的构建产物。请在 Linux 上重建——同一份源码在 Windows 上会产出不同字节，提交产物校验会失败。详见发布运行手册。

## 贡献、安全与支持

Issue 与 Pull Request 提交到 <https://github.com/yiyunet/dsh-chatgpt-connect>。怀疑凭据或授权出问题时请私下报告，不要写进公开 issue；具体渠道见安全政策。任何报告中都不要附带完整会话归档、token 或账户标识。

## 许可证与致谢

Codex Connect 原始工作 Copyright 2026 Frank Song；本分支的修改与新增工作 Copyright 2026 yiyunet。本项目包含派生自 [Yan-Zero/dsh-codex](https://github.com/Yan-Zero/dsh-codex) 的软件，并 fork 自 [franksong2702/dsh-codex-connect](https://github.com/franksong2702/dsh-codex-connect)；所有上游版权均予保留。全部按 Apache-2.0 发布，详情见 [NOTICE](../NOTICE) 与 [LICENSE](../LICENSE)。

已发布的包带有 SLSA provenance 存证，记录了构建它的确切提交与 workflow，因此可以在不信任维护者机器的前提下，把 tarball 与本仓库对应起来。

## 上游历史发布（旧包名 `dsh-codex-connect`）

本节全部内容描述的是**上游**以旧包名发布的版本。包名、版本号、tag 状态与宿主数量均为上游当时的记录，**刻意保持原样不改写**；它们不代表本分支，也不含本分支的改动。安装本分支请使用上文「快速开始」中的命令。

上游曾用 `dsh plugin --profile web add dsh-codex-connect@0.2.0-alpha.12` 安装。那是**另一个 npm 包**，由上游以旧包名发布，不含本分支的任何改动。

**已发布 Alpha 12：** [`0.2.0-alpha.12`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.12) 在下述仅恢复限制下适配精确的 stock DSH `0.2.2-alpha.3`，退役 Luna Reserve，并修复自带 Auto review preset 的 Codex Responses temperature 参数错误。发布渠道为 `alpha`，`latest` 保持 Alpha 10。参见[发行与迁移说明](release-notes/0.2.0-alpha.12.md)。这不要求升级 DSH。

在精确的 DSH `0.2.2-alpha.3` 上，旧 Task 仅保留状态查看、停止和转手动。自动路由、续跑和证据子任务创建均被拒绝，包括内部直接入口。原有停用委派／归档安全退出仍保留 owner、回执和清理校验。原十四个 Host 的行为不变，所有版本的 Task 公共激活入口继续关闭。

**历史 Alpha 11：** [`0.2.0-alpha.11`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.11) 交付 GPT-6.1 Terra、统一速度菜单、精确 DSH rc.4／rc.5、seeded fork 原图及 bili 原生压缩预检，并抬高直接 Undici 最低版本。全部 14 个精确宿主使用同一安装包完成验证；npm 版本／alpha、Git tag、prerelease 和包完整性均已独立回读。`latest` 保持 Alpha 10。参见[发布记录](release-notes/0.2.0-alpha.11.md)；无凭据检查不代表真实账户／模型或 Desktop 验收，Computer Use 不在本版内。

**历史 Alpha 10：** [`0.2.0-alpha.10`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.10) 仅新增精确 DSH `0.2.1-rc.3`，保留原有 11 个宿主，并交付默认关闭的只读额度工具及紧凑速度菜单。npm 版本、alpha 标签、Git tag、prerelease 和包哈希已独立回读；`latest` 不变。rc.3 的上游 Git 源码映射仍未验证；无凭据合约不代表真实账户／模型或 Desktop 验收。参见[发布记录](release-notes/0.2.0-alpha.10.md)。

上游当时的推荐为 Codex Connect `0.2.0-alpha.12` / DSH `0.2.1-rc.5`；其他受支持的精确宿主版本见下表。请先运行 `dsh --version`，再用 `doctor --json` 做本地诊断；单凭 CLI 版本无法证明实际安装的模型运行库版本，缺少版本元数据时会报告未知。其他版本请查阅[安装与升级](../INSTALL.md)。`alpha` 等会移动的 npm tag 不代表兼容性保证。

| 要求 | 上游历史已验证组合 |
|---|---|
| Codex Connect | `0.2.0-alpha.12` |
| DeepSeek Harness | `0.1.7-rc.1`、`0.1.7-rc.2`、`0.2.0-rc.1`、`0.2.0-rc.2`、`0.2.1-alpha.1`、`0.2.1-alpha.2`、`0.2.1-alpha.3`、`0.2.1-alpha.4`、`0.2.1-alpha.5`、`0.2.1-rc.1`、`0.2.1-rc.2`、`0.2.1-rc.3`、`0.2.1-rc.4`、`0.2.1-rc.5` 或 `0.2.2-alpha.3`（包版本必须一致） |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| 账户 | 通过 ChatGPT OAuth 使用所请求的 Codex 模型；可用性由 OpenAI 决定 |

**历史维护版本：** [`0.2.0-alpha.9`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.9) 增加可选的推理强度回退设置，以及新顶层会话和普通子代理会话各自独立的 Standard / Fast / Ultrafast 默认设置。显式请求中的推理强度和后续手动速度选择优先；省略或重置时保留对应的旧默认行为。已有／恢复会话继续受到尊重。Ultrafast 仍要求登录并匹配可用的模型／账户路由；资格与实际服务档位仍未知。finite SSE 和 Task 暂停状态不变；不声称已测得提速倍数或完成真实账户／Desktop 验收。

**历史维护版本：** [`0.2.0-alpha.8`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.8) 增加显式会话级 Standard / Fast / Ultrafast 选择，保留宿主重试策略，将 GPT-6.1 Sol 默认上下文设为 500,000 token，并修复恢复／文件身份及 Windows 打包检查。Ultrafast 仅对文档列明的两个 Codex 模型显式启用；不包含新主会话／子代理的默认设置。资格与实际服务档位仍报告未知，保留 finite SSE 及原有可选功能默认行为。不声称已测得提速或完成真实账户／Desktop 验收。

**历史图片恢复版本：** [`0.2.0-alpha.7`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.7) 在 Harness 预览保存失败时保留已完成、已验证的原图，支持下载原图和明确选择继续编辑。工具说明明确：聊天可继续使用 DeepSeek，图片由 Codex Connect 的独立 ChatGPT OAuth 通道处理。其原有十一个精确宿主组合均保留验证；底层图片接口与凭据行为不变。合成检查不代表真实账户或 Desktop 验收。

`0.2.0-alpha.4` 将精确宿主支持扩展到 DSH `0.2.1-alpha.2` 和 `0.2.1-alpha.3`，保留原有五个宿主。原有受支持宿主无需升级；Task 仍暂停，默认设置不变。

**历史维护版本：** [`0.2.0-alpha.5`](https://github.com/franksong2702/dsh-codex-connect/releases/tag/v0.2.0-alpha.5) 交付精确 DSH `0.2.1-alpha.4`、`0.2.1-alpha.5` 和 `0.2.1-rc.1` 支持及宿主／浏览器运行版本诊断，保留原有七个已发布宿主。诊断共用一份版本策略。发布及无凭据验证不等于新的真实账户、Desktop 或已登录浏览器验收；#339 继续保持打开，单独跟进验收。

历史发布 [`0.2.0-alpha.3`](release-notes/0.2.0-alpha.3.md) 增加官方 Desktop 登录适配和桌面版专用账户诊断，保留 Web 登录行为。Desktop 使用独立的 profile 和自带 CLI，请遵循 [Desktop 安装说明](../INSTALL.md#official-desktop)。声明的宿主版本、默认设置和账户存储不变。

历史发布 [`0.2.0-alpha.2`](release-notes/0.2.0-alpha.2.md) 已发布精确 DSH `0.2.1-alpha.1` 的兼容适配，以及跨模型路由的图片选择句柄修复。较早的 `0.2.0-alpha.1` 安装包保持不变，仍拒绝该宿主。原有受支持宿主无需升级。

截至 2026-11-04，npm `alpha` 指向 `0.2.0-alpha.12`，`latest` 保持 `0.2.0-alpha.10`，因此默认安装仍选择 Alpha 10；会移动的 npm tag 不保证其他宿主版本的兼容性。这是上游的包与上游的标签状态，本分支的 `alpha` 是 `0.3.1-alpha.2`。

历史发布 [`0.2.0-alpha.1`](release-notes/0.2.0-alpha.1.md) 通过模型目录补充增加 `gpt-6.1-sol`，并开始较短的独立插件编号。四个受支持的 DSH 版本不变，无需升级宿主。

它保留 Alpha 4.54 的改动，在 DSH 0.2.0-rc.2 调用固定版本的 Codex 提供方时保留初始系统指令和工具定义，修正宿主与插件使用不同提供方库版本时的诊断，并补强 Canary 的普通请求检查。继续保留 Alpha 4.53 的核心维护改动、已有任务恢复与安全检查，以及 4.52 的[可选本地请求计量](request-metrics.zh.md)。配置私有目录后才采集；未知用量不当作零。不恢复 Task，也不升级模型库或 OAuth。

上游安装包已通过上方十五个精确 DSH 版本的无凭据安装及运行回归验证。Task 控件仍暂停：激活请求会被拒绝，现有宿主的浏览器回归中，新 Session 不显示这些控件。这些检查不代表真实 OAuth、真实账户图片编辑、新宿主的已登录浏览器验收或完整用户验收；跨 Harness 升级迁移旧任务授权尚未验证。较旧组合及其任务行为见[安装与升级](../INSTALL.md)。

历史记录：2026-10-10，维护者报告已在 Desktop `0.2.0-rc.2` 用已记录的本地适配包完成登录并正常使用。仅历史 `0.2.0-alpha.3` 客户端与该本地适配包进行了比较，确认只差包版本字符串。此比较不代表 `0.2.0-alpha.4` 的 Desktop 或真实账户验收，也不代表后续 npm 安装包的验收；未进行新的真实 Desktop 验收。参见[Desktop 验收记录](../INSTALL.md#official-desktop)。
