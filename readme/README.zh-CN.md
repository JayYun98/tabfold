<div align="center">

# Tabfold

**少些标签纷扰，多些思考空间。**

将拥挤的 Chrome 窗口整理为清晰、可折叠的标签页分组——**先预览，再更改**。

**预览 → 检查 → 应用**

Chrome Manifest V3 · 本地优先 · Jev 1.13 · 无运行时依赖

[English](../README.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md) · [Español](README.es.md)

<img src="../docs/assets/cover.svg" alt="Tabfold 封面" width="100%" />

</div>

## 为什么选择 Tabfold

- **预览优先** — 在修改标签页之前，先查看建议的分组。
- **无需 AI 也能使用** — 本地标题和域名规则可即时整理标签页，无需 API 密钥。
- **按需使用 AI** — 通过 OpenRouter 或 TypeSafe 使用 Jev，进行更智能的分类。
- **保留工作上下文** — 标签页留在原来的窗口中，只需折叠分组即可减少杂乱。
- **默认保护** — 保护固定、正在播放声音、无痕、内部页面及已分组的标签页。
- **轻松恢复** — 撤销上一次分组，并恢复清理重复标签页时移除的网址。

<img src="../docs/assets/popup-en.png" alt="Tabfold 弹出窗口预览" width="100%" />

## 使用方法

1. 使用本地规则或 AI 生成**预览**。
2. **检查**建议的分组。
3. 结果合适后再**应用**。

就是这么简单。Tabfold 将标签页分组并折叠，不会合并窗口或替换页面。

## 安装

1. 下载或克隆此仓库。
2. 打开 `chrome://extensions`。
3. 启用**开发者模式**。
4. 点击**加载已解压的扩展程序**，选择 `extension` 文件夹。
5. 将 **Tabfold** 固定到工具栏。

无需构建或安装依赖包。

## 按你的习惯设置

在**设置**中，你可以：

- 创建最多 **12 个自定义分类**
- 选择**当前顺序 / 标题 / 最久未使用优先**的标签页排序
- 检查新主题建议后再添加
- 以 JSON 格式导入或导出分类
- 切换英语、法语、韩语、简体中文、繁体中文、俄语、日语、土耳其语和西班牙语

“其他”分类会自动处理。

## AI 是可选功能

本地预览完全在浏览器内处理。

如需 AI 预览，请在**设置 → AI 连接**中选择 **OpenRouter** 或 **TypeSafe**，并输入对应服务商的 API 密钥。

- OpenRouter 使用 **Decisions API**
- TypeSafe 使用 **Jev 1.13**
- API 密钥保存在 Chrome **会话存储**中，关闭浏览器后即清除
- **不会自动切换到其他服务商**

## 隐私

| | |
|---|---|
| **本地预览** | 不向外部传输数据 |
| **AI 预览** | 发送标签页标题、URL 来源及路径、分类标准 |
| **从不发送** | 页面正文、URL 身份验证信息、查询字符串、片段标识符 |
| **API 密钥** | 仅在会话中保存 |
| **分析追踪 / 广告** | 无 |

标题和 URL 路径仍可能包含敏感信息。详情请参阅[隐私说明](../docs/PRIVACY.md)。

## 开发

需要 **Node.js 22 或更高版本**。

```bash
npm test
npm run check
```

使用原生 JavaScript 和 Chrome API，无运行时依赖，不加载远程代码。

[验证记录](../docs/VALIDATION.md) · [发布说明](../docs/LAUNCH.md) · [分类 JSON 示例](../docs/categories.example.json)

---

**折叠只是视觉上的整理，不会概括页面内容，也不保证减少内存占用。**
