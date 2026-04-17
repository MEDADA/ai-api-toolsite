# 交互反馈规范 — AI 工具站

> 所有用户可感知的操作必须有明确的反馈。
> 沉默即 Bug。

---

## 铁律

**每 个 onClick / onSubmit 必须同时覆盖：**

| 状态 | 必须表现 |
|------|---------|
| 触发中 | 按钮禁用 + 显示 spinner 或文字变化 |
| 成功 | 绿色 toast 或成功状态 |
| 失败 | 红色 toast，显示具体错误原因（不是 alert） |
| 网络错误 | 红色 toast：「网络异常，请重试」 |

**禁止：**
- ❌ `catch (e) {}` 空 catch 块
- ❌ `console.error` 不显示给用户
- ❌ API 失败但 UI 无变化
- ❌ 按钮点击后不改变状态（用户不知道是否触发了）

---

## 标准反馈模板

```tsx
// ✅ 标准写法
const [loading, setLoading] = useState(false);
const { success, error } = useToast();

const handleAction = async () => {
  if (loading) return; // 防重复点击
  setLoading(true);
  try {
    await apiCall();
    success('操作成功 🎉');
  } catch (err) {
    const e = err as { message?: string; code?: string };
    error(e.message || '操作失败，请重试');
  } finally {
    setLoading(false); // 注意：finally 一定会执行
  }
};

// JSX
<button disabled={loading} onClick={handleAction}>
  {loading ? '处理中...' : '确认'}
</button>
```

---

## 各场景反馈标准

### 1. 登录弹窗
| 操作 | 触发中 | 成功 | 失败 |
|------|--------|------|------|
| 发送验证码 | 按钮禁用 + 显示倒计时 | 绿色提示「已发送」 | 红色提示「发送失败」 |
| 验证码登录 | 按钮禁用 + 「登录中...」 | 弹窗关闭 | 红色横幅显示错误 |
| 密码登录 | 同上 | 同上 | 同上 |

### 2. 图片/视频/语音生成
| 操作 | 触发中 | 成功 | 失败 |
|------|--------|------|------|
| 点生成 | 按钮禁用 + 显示「生成中」 | 图片出现 + toast | 红色 toast |
| 重新生成 | 同上 | 同上 | 同上 |
| SSE 断开 | — | — | 红色 toast「连接中断」 |

### 3. 充值
| 操作 | 触发中 | 成功 | 失败 |
|------|--------|------|------|
| 发起充值 | 按钮禁用 | 跳转支付页 | 红色 toast |
| 支付回调 | — | 余额更新 + 成功 toast | — |

### 4. Header 导航
| 操作 | 反馈 |
|------|------|
| 语言切换 | 页面刷新/跳转，带 loading |
| 退出登录 | 余额消失，显示未登录状态 |

---

## 错误消息规范

错误消息必须包含**用户能理解的原因**：

```typescript
// ❌ 差 - 用户不知道怎么办
error('请求失败');

// ✅ 好 - 用户知道原因和解决方法
error('余额不足，请先充值');

// ✅ 更好 - 提供操作入口
error('余额不足 (¥0.00)，请充值后重试');
```

### 错误消息来源优先级
1. API 返回的 `message` 字段
2. API 返回的 `code` 字段对应的中文翻译
3. fallback：「操作失败，请重试」

---

## 防重复点击

所有表单提交和关键操作必须防重复：

```tsx
// ❌ 可重复点击
<button onClick={handleSubmit}>提交</button>

// ✅ 防重复
const [submitting, setSubmitting] = useState(false);
<button disabled={submitting} onClick={handleSubmit}>
  {submitting ? '提交中...' : '提交'}
</button>
```

---

## Toast 规范

使用项目的 `useToast()` hook：

```tsx
const { success, error, warning, info } = useToast();

success('保存成功');      // 绿色，3秒自动消失
error('网络错误');       // 红色，需手动关闭或等待
warning('余额不足');     // 黄色
info('正在处理...');     // 蓝色
```

**注意：** 不要用 `alert()` 或浏览器原生弹窗。

---

## DevReviewer 检查清单

QA 时每个交互必须验证：

- [ ] 点击按钮后按钮状态是否变化？
- [ ] 操作失败时是否有红色提示？
- [ ] 网络断开时是否有提示？
- [ ] 重复点击是否被阻止？
- [ ] 成功后是否有确认反馈？
- [ ] 错误消息是否用户友好？
