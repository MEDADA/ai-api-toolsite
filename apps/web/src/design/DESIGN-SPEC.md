# 设计规范 v1.0 — AI 生成工具站

**版本：** v1.0
**日期：** 2026-04-16
**状态：** ✅ 已确认
**设计方式：** HTML Mockup（代码渲染 → 用户评审）

---

## 1. 整体布局

**黄金比例分栏：**
- 左侧操作面板：**38.2%**（min 320px / max 440px）
- 右侧历史区域：**61.8%**（主要视觉区域）

**设计风格：** 深色极简（`#08080f` 背景）、毛玻璃Header、紫蓝渐变主色调

---

## 2. 图片生成页 — 最终设计

**设计稿：** `src/design/mockup-image-gen-v5.html`

### 2.1 左侧操作面板（38.2%）

**顶部一行 Chip 栏：**
```
[⚡ FLUX.2 schnell ▼] [尺寸·1024²] [质量·标准] [张数·1张] [📷]
```
- 模型选择：胶囊按钮，点击展开下拉选项
- 参数 Chip：尺寸/质量/张数 横向排列，选中态为紫边框+背景
- 参考图：28×28 小方块按钮（纯图标，无文字）

**主体：Prompt 输入框 + 生成按钮（无缝衔接）**

```
┌──────────────────────────────┐
│  描述你想要生成的图片...      │  ← Prompt 文本框，flex:1 撑满
│                              │
│                        37/2000 │  ← 右下角字数
├──────────────────────────────┤
│        🎨 开始生成            │  ← 渐变按钮，无圆角缝接
└──────────────────────────────┘
```
- Prompt 框：`border-bottom: none`，生成按钮 `border-radius: 0 0 12px 12px`
- 两者视觉上是一个整体，无间距
- 底部余额提示：「余额 ¥9.50 · 预估 ¥0.50」

### 2.2 右侧历史区域（61.8%）

**瀑布流网格（3列）：**
- 生成中卡片置顶，含：spinner + 进度条 + 部分预览
- 历史卡片：图片 + 模型标签 + Prompt 摘要 + 时间 + 操作按钮
- 悬停：卡片上浮 + 紫色边框发光

**过滤器（置顶）：** 全部 / 图片 / 收藏

---

## 3. 全局组件规范

### 3.1 Header
- 高度：56px，固定定位
- 背景：`rgba(8,8,15,0.88)` + `backdrop-filter: blur(16px)`
- 导航激活态：`#a5b4fc` 文字 + `rgba(99,102,241,0.15)` 背景 + 紫边框

### 3.2 色彩系统
| Token | 色值 | 用途 |
|-------|------|------|
| 背景主色 | `#08080f` | 页面背景 |
| 卡片背景 | `rgba(255,255,255,0.04)` | 面板/卡片 |
| 边框 | `rgba(255,255,255,0.07)` | 默认边框 |
| 边框激活 | `rgba(99,102,241,0.4)` | Hover/Focus |
| 主色 | `#6366f1 → #8b5cf6` | 渐变按钮 |
| 主色文字 | `#a5b4fc` | 激活态文字 |
| 成功/价格 | `#48bb78` | 余额/价格 |
| 暗文字 | `#475569` | 次要文字 |
| 极暗文字 | `#374151` | Label/提示 |

### 3.3 字体
- 主字体：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Prompt 区域：`font-size: 14px`，`line-height: 1.7`
- 参数 Chip：`font-size: 11px`
- 历史摘要：`font-size: 10px`，最多2行截断

### 3.4 圆角规范
| 场景 | 圆角 |
|------|------|
| Prompt 输入框 | `12px`（顶部） |
| 生成按钮 | `0 0 12px 12px`（紧贴Prompt） |
| 参数 Chip | `7px` |
| 模型胶囊 | `8px` |
| 历史卡片 | `11px` |

### 3.5 动效
- Hover 上浮：`transform: translateY(-2px)`，配合阴影
- 按钮 Hover：`box-shadow` 增强
- 加载 Spinner：`border-radius: 50%`，`animation: spin 1s linear infinite`
- 进度条：`transition: width 1s ease`

---

## 4. 响应式策略

| 断点 | 布局变化 |
|------|---------|
| ≥ 769px | 左右分栏（38.2% / 61.8%）|
| ≤ 768px | 上下堆叠，左侧高度自适应，右侧占满剩余高度，历史2列 |

---

## 5. 设计文件

| 文件 | 说明 |
|------|------|
| `src/design/mockup-image-gen-v5.html` | 最新确认设计稿（图片生成页） |
| `src/design/mockup-image-gen-v5b.html` | 最终微调版本（参考图缩小） |
| `src/design/mockup-video.html` | 视频生成页 Mockup（DevUI） |
| `src/design/mockup-audio.html` | 语音处理页 Mockup（DevUI） |
| `src/design/mockup-dashboard.html` | 个人看板页 Mockup（DevUI） |

---

## 7. 视频生成页 — 交互规范补充

### 7.1 布局
- 左侧操作面板：38.2%（min 320px / max 440px）
- 右侧历史区域：61.8%，瀑布流 3 列（Mobile 2 列）
- 左侧顶部：模式切换按钮（文生视频 / 图生视频），下方为参数 Chip 栏

### 7.2 左侧操作面板元素
| 元素 | 规范 |
|------|------|
| 模式切换 | 2 个按钮，激活态紫边框+背景，等宽 |
| 模型选择 | Pill 胶囊，显示模型图标+名称，点击切换 |
| 时长选择 | Chip 组：5秒 / 10秒 / 15秒，激活态紫 |
| 分辨率 | Chip 组：720p / 1080p |
| 镜头运动 | Chip 组：固定 / 环绕 / 推进 / 平移 |
| 参考图上传 | img2vid 模式下出现，16:9 占位图，点击上传 |
| Prompt 框 | 同图片页，border-bottom: none，border-radius: 12px 顶部 |
| 生成按钮 | 渐变按钮，无圆角缝接（0 0 12px 12px） |
| 预估价格 | 余额提示 + 动态估算（时长 × 单价）|

### 7.3 右侧历史瀑布流
- 视频卡片含：视频封面图 + 播放图标浮层 + 时长标签
- 悬停：卡片上浮 + 紫色边框发光
- 生成中卡片置顶，含进度条 + 预览区域
- 过滤器：全部 / 视频 / 收藏

---

## 8. 语音处理页 — 交互规范补充

### 8.1 布局
- 左侧操作面板：38.2%（min 320px / max 440px）
- 右侧历史区域：61.8%，**纵向列表**（非瀑布流）
- 左侧顶部：模式切换按钮（TTS 文字转语音 / ASR 语音转文字 / 声音克隆）

### 8.2 左侧操作面板元素
| 元素 | 规范 |
|------|------|
| 模式切换 | 3 个按钮，激活态紫边框+背景 |
| 音色选择 | Chip 组：晓晓 / 云飞 / 小宁 / 阿波 |
| 语言 | Chip 组：中文 / 英文 / 中日 / 中英 |
| 语速 | Chip 组：0.8x / 1.0x / 1.2x / 1.5x |
| Prompt 框 | TTS 模式：文本输入，ASR/克隆 模式：可变为提示区 |
| 生成按钮 | 渐变按钮，固定在面板底部 |
| 余额提示 | 余额 + 预估费用 |

### 8.3 右侧历史列表
- **纵向卡片列表**（非瀑布流）
- 每张卡片含：播放按钮 + 波形图 + 时长 + 文本摘要 + 时间 + 操作
- 波形图：40 个柱状条，已播放部分高亮（`rgba(52,211,153,0.65)`），未播放（`rgba(52,211,153,0.2)`）
- 过滤器：全部 / TTS / ASR / 收藏

---

## 9. 个人看板页 — 交互规范补充

### 9.1 布局
- **单列全宽布局**（非分栏），max-width 900px 居中
- 页面结构：余额卡片 → 快捷入口 → 消费记录表格 → 任务历史卡片网格

### 9.2 余额卡片
- 渐变绿色余额数字（`#48bb78 → #68d391`）
- 充值按钮：渐变紫蓝，悬停上浮+阴影增强
- 统计数据行：累计消费 / 总任务数 / 进行中 / 最后活跃

### 9.3 消费记录表格
- 表格样式：圆角容器包裹，header 背景微亮
- 类型标签：紫色（图片）/ 蓝色（视频）/ 绿色（语音）
- 状态：绿色已完成 / 橙色处理中 / 红色失败
- 费用：红色带 `-` 前缀

### 9.4 任务历史
- 自动填充卡片网格（minmax 200px）
- 卡片样式同图片/视频页历史卡片
- 底部：时间 + 消费金额（红色）

---

## 10. 统一交互规范（v2.0 — 2026-04-17）

> 所有核心页面（图片/视频/语音）必须遵循以下统一规范，确保 UI 一致性和开发可落地性。

### 10.1 布局统一（所有页面）

| 区域 | 规格 |
|------|------|
| 左侧面板 | 38.2%，min 320px / max 440px，flex 列布局，overflow-y: auto |
| 右侧区域 | 61.8%，瀑布流网格（3列，Mobile 2列）；语音页为纵向列表 |
| 面板间距 | padding: 14px 16px（左侧），padding: 16px 20px（右侧）|
| 面板内 gap | 各控件之间 5–6px 间隔 |

### 10.2 顶部导航（Header）

```html
<nav class="header-nav">
  <a href="#">首页</a>
  <a href="#">图片生成</a>  <!-- 当前页加 class="active" -->
  <a href="#">视频生成</a>
  <a href="#">语音生成</a>
</nav>
```
- 激活态：文字 `#a5b4fc` + `background: rgba(99,102,241,0.15)` + `border: 1px solid rgba(99,102,241,0.3)` + `border-radius: 8px`
- 非激活态：文字 `#475569`，无背景

### 10.3 模型选择 — 统一下拉

**所有页面的模型选择统一使用下拉组件，禁止用 Chip/Pill 展开列表。**

```
结构：
┌──────────────────────────────────────┐
│ 🎬 Seedance 1.5 Pro          ▼       │  ← voice-pill / model-pill
└──────────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ 🎬 Seedance 1.5 Pro      ✓       │  ← 已选，带勾选
  │ 🚀 Kling 3.0                     │
  │ ⚡ MiniMax Video-01              │
  └──────────────────────────────────┘  ← 下拉菜单

CSS 规范：
- 菜单容器：position: absolute, z-index: 100, background: #12121c
- 边框：border: 1px solid rgba(255,255,255,0.09)
- 圆角：border-radius: 10px, padding: 6px
- 阴影：box-shadow: 0 12px 40px rgba(0,0,0,0.6)
- 菜单项 hover：background: rgba(255,255,255,0.06)
- 菜单项选中：background: rgba(99,102,241,0.1) + 文字 #a5b4fc
- 触发：点击 Pill 展开，再次点击或点击外部关闭
```

### 10.4 参数 Chip 组

**横向排列，包裹在 `.top-bar` / `.lang-chips` 容器中。**

```
选中态：border-color: rgba(99,102,241,0.4) + background: rgba(99,102,241,0.08) + color: #a5b4fc
hover：border-color: rgba(255,255,255,0.15) + color: #e2e8f0
默认：background: rgba(255,255,255,0.04) + border: 1px solid rgba(255,255,255,0.08) + color: #64748b

标签（.lbl）：font-size: 9px, font-weight: 700, text-transform: uppercase, letter-spacing: 0.06em, color: #374151
分隔（.div）：color: #374151
```

**同组 Chip 互斥**：点击某 Chip 时，同组其他 Chip 取消激活状态（通过 `.lbl` 文案匹配分组）。

### 10.5 参考图上传（视频/图片页）

**交互模式：在 Chip 栏最右侧放置 📷 小按钮，点击展开上传区域。**

```
📷 小按钮（.ref-chip / .top-chip.ref-chip）：
  - 尺寸：28×28px（宽高相等）
  - padding: 0，justify-content: center
  - 激活态：border-color: rgba(99,102,241,0.5) + background: rgba(99,102,241,0.15)

上传区域（.ref-upload-area）：
  - 默认 display: none，激活时 display: block
  - 16:9 aspect-ratio，border-radius: 10px
  - 虚线边框：border: 1.5px dashed rgba(255,255,255,0.1)
  - hover：border-color: rgba(99,102,241,0.3) + background: rgba(99,102,241,0.05)
  - 上传后显示图片 + 右上角 ✕ 删除按钮
```

### 10.6 语速滑块（语音页）

```
滑块范围：min=0.5, max=2.0, step=0.1，当前值显示在滑块上方

布局：
  语速                    1.0×      ← 右侧显示当前值（#a5b4fc, font-weight: 700）
  ━━━━━━━━━●━━━━━━━━━━
  0.5×      1.0×  1.5×   2.0×      ← 刻度标签

轨道：height: 6px, background: rgba(255,255,255,0.06), border-radius: 3px
填充（.speed-fill）：position: absolute, left: 0, top: 0, height: 100%, background: linear-gradient(90deg, #6366f1, #818cf8)
滑块（::-webkit-slider-thumb）：width/height: 16px, border-radius: 50%, background: #fff, box-shadow: 0 1px 6px rgba(0,0,0,0.5), 0 0 0 2px rgba(99,102,241,0.3)
```

### 10.7 音色下拉 + 试听（语音页）

**在模型下拉的基础上，右侧增加「▶ 试听」按钮。**

```
布局：voice-row { display: flex; gap: 6px; }
     ├─ voice-dropdown（flex: 1）
     └─ voice-preview-btn（width: 30px, height: 30px, border-radius: 7px）

下拉每项结构：
  🎙️ │ 晓晓                  ✓
      │ 年轻女性，温暖自然，适合旁白

试听按钮交互：
  - 默认：▶ 按钮，hover 时 border-color 变紫
  - 播放中：显示"⏸"，按钮变紫色激活态
  - 3 秒后自动恢复（模拟试听时长）
```

### 10.8 登录弹窗

**触发场景：点击用户头像或未登录状态下操作。**

```
容器：width: 400px, max-width: 90vw, background: #13131f
  border: 1px solid rgba(255,255,255,0.09)
  border-radius: 18px
  box-shadow: 0 24px 80px rgba(0,0,0,0.7)

Tab 切换：手机号 / 邮箱，两个表单互斥显示
验证码输入：6 个独立 input（width: 40px, height: 48px），自动跳格
发送按钮：60s 倒计时，disabled 态显示"Xs 后重发"
OAuth 按钮：Google SVG icon + Apple SVG icon，hover 态背景变亮
首次登录 Banner：绿色渐变背景 + 脉冲 dot + ¥5.00 体验金文案
底部：服务条款 / 隐私政策链接
```

---

## 11. 后续页面设计流程

所有新页面/大改必须经过：
1. DevPM 拆解需求 → PRD
2. **HTML Mockup → 用户评审 ✅**（强制门控）
3. 评审通过后，Mockup 归档至 `src/design/`
4. DevCoder 按 Mockup 实现
5. DevReviewer QA 验收
