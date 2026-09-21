<div align="center">

# Tabfold

**Less tab noise. More headspace.**

Turn crowded Chrome windows into clean, collapsible tab groups — **previewed before anything changes**.

**Preview → Review → Apply**

Chrome Manifest V3 · Local-first · Jev 1.13 · No runtime dependencies

[English](README.md) · [Français](readme/README.fr.md) · [한국어](readme/README.ko.md) · [简体中文](readme/README.zh-CN.md) · [繁體中文](readme/README.zh-TW.md) · [Русский](readme/README.ru.md) · [日本語](readme/README.ja.md) · [Türkçe](readme/README.tr.md) · [Español](readme/README.es.md)

<img src="docs/assets/cover.svg" alt="Tabfold cover" width="100%" />

</div>

## Why Tabfold

- **Preview first** — see the proposed groups before Tabfold touches your tabs.
- **Works without AI** — local TF-IDF and cosine similarity cluster title/URL terms with no API key.
- **AI when you want it** — use Jev through OpenRouter or TypeSafe for smarter classification.
- **Keeps your context** — tabs stay in their original windows; groups simply collapse to reduce clutter.
- **Safe by default** — pinned, audible, incognito, internal, and already-grouped tabs are protected.
- **Easy to recover** — undo the last grouping and recover URLs removed by duplicate cleanup.

<img src="docs/assets/popup-en.png" alt="Tabfold popup preview" width="100%" />

## How it works

1. **Preview** with local clustering or AI.
2. **Review** the proposed groups.
3. **Apply** when the result looks right.

That’s it. Tabfold groups and folds tabs without merging windows or replacing your pages.

By default, existing groups are preserved. Existing groups are visible before you run AI. AI prioritizes groups in the same window, using their names and example tab titles and URL paths. Matching ungrouped tabs are added to those groups; other tabs form new groups. Existing members, names, colors, and collapsed states stay unchanged. Undo removes only the tabs added by Tabfold from existing groups. The example titles and URL paths are sent to the selected AI provider.

Choose **Regroup all eligible tabs** to ignore existing group names and context and reassign eligible grouped and ungrouped tabs within each window. Pinned, audible, incognito and internal tabs stay protected. Undo restores original groups where possible; exact original tab order is not guaranteed. Only proposed groups are applied. New groups require at least two tabs; unmatched single tabs stay where they are.

Quick preview uses statistical TF-IDF weights and cosine similarity over title/URL terms, entirely in your browser. It matches lexical similarities, not meanings translated across languages. This is not a pretrained neural or TensorFlow model: no dependencies, model downloads or server requests. The reusable JavaScript clustering module also runs in Node.js.

The popup independently remembers **Regroup existing groups**, **Ignore saved categories**, and **Suggest new categories**. Ignoring categories skips saved/default AI choices without deleting them; existing Chrome groups still provide context unless regrouping is enabled. With both ignore and regroup enabled, suggestions validate locally extracted topics through Jev; turning suggestions off falls back to domains.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `extension` folder.
5. Pin **Tabfold** to the toolbar.

No build step or package installation is required.

## Make it yours

From **Settings**, you can:

- Create up to **12 custom categories**
- Choose **current / title / least-recently-used** tab ordering
- Review suggested new topics before adding them
- Import or export categories as JSON
- Switch between English, French, Korean, Simplified Chinese, Traditional Chinese, Russian, Japanese, Turkish, and Spanish

“Other” is handled automatically.

## AI is optional

Local preview stays entirely in your browser.

For AI preview, choose **OpenRouter** or **TypeSafe** in **Settings → AI connection** and add that provider’s API key.

- OpenRouter uses the **Decisions API**
- TypeSafe uses **Jev 1.13**
- API keys are stored in Chrome **session storage** and cleared when the browser closes
- There is **no automatic provider fallback**

## Privacy

| | |
|---|---|
| **Local preview** | No external transmission |
| **AI preview** | Sends tab titles, URL origins/paths, and category criteria |
| **Never sent** | Page bodies, URL credentials, query strings, fragments |
| **API keys** | Session-only storage |
| **Analytics / ads** | None |

Titles and URL paths can still contain sensitive information. See [Privacy](docs/PRIVACY.md) for details.

## Develop

Requires **Node.js 22+**.

```bash
npm test
npm run check
```

Plain JavaScript, native Chrome APIs, no runtime dependencies, and no remote code.

[Validation](docs/VALIDATION.md) · [Launch notes](docs/LAUNCH.md) · [Category JSON example](docs/categories.example.json)

---

**Folding is visual compaction, not content summarization or guaranteed memory reduction.**
