<div align="center">

# Tabfold

**Less tab noise. More headspace.**

Turn crowded Chrome windows into clean, collapsible tab groups — **previewed before anything changes**.

**Preview → Review → Apply**

Chrome Manifest V3 · Local-first · Jev 1.13 · No runtime dependencies

[English](README.md) · [Français](readme/README.fr.md) · [한국어](readme/README.ko.md) · [简体中文](readme/README.zh-CN.md) · [繁體中文](readme/README.zh-TW.md) · [Русский](readme/README.ru.md) · [日本語](readme/README.ja.md) · [Türkçe](readme/README.tr.md) · [Español](readme/README.es.md)

<img src="docs/assets/cover.svg" alt="Tabfold cover" width="100%" />

</div>

https://github.com/user-attachments/assets/d1485909-6730-4a3a-91ae-d74b688c3df4

Jev helps cluster tabs by context. Preview, then apply: each window is organized in place, without merging windows.

*English narration · Illustrative demo, not a live screen recording.*

## Why Tabfold

- **Preview first** — see the proposed groups before Tabfold touches your tabs.
- **Works without AI** — local title similarity proposes groups without an API key.
- **AI when you want it** — use Jev through OpenRouter or TypeSafe for smarter classification.
- **Keeps your context** — tabs stay in their original windows; groups simply collapse to reduce clutter.
- **Safe by default** — pinned, audible, incognito, internal, and already-grouped tabs are protected.
- **Easy to recover** — undo the last grouping and recover URLs removed by duplicate cleanup.

## How it works

1. **Preview** with local clustering or AI.
2. **Review** the proposed groups.
3. **Apply** when the result looks right.

That’s it. Tabfold groups and folds tabs without merging windows or replacing your pages.

Existing groups are visible before AI runs. Preserve mode adds matching tabs to same-window groups without changing existing members or group styling. Named categories from other windows can become separate local groups; tabs never move between windows. Regroup rebuilds membership. Existing names guide it only when **Use existing group names** is enabled; raw-hostname groups are not category templates.

Pinned, audible, incognito and internal tabs remain protected. Only proposed groups are applied; new groups need at least two tabs and unmatched singletons stay put. Undo restores original groups where possible, without guaranteeing exact tab order.

Quick preview compares title words locally using TF-IDF and cosine similarity. Each member must closely match the others, which avoids loose chains of unrelated tabs but can leave related pages ungrouped. Only image-file extensions have a fixed category rule. There are no site-specific category rules, model downloads, or server requests for local preview.

The popup independently remembers regrouping, ignoring saved categories, and new-category suggestions. Ignoring saved categories excludes saved/default AI choices without deleting them; existing Chrome group names remain context, including during regrouping. AI may receive group names, a broad purpose, and up to six diverse example titles and URL origins/paths without queries. Uncertain AI decisions stay unassigned; they do not fall back to lexical grouping. With OpenRouter, GPT-4.1 proposes names for unmatched tabs and Jev checks their membership. These groups appear in the preview without changing saved categories. TypeSafe connects directly to Jev and retains Jev-only suggestions. Review either result before applying. Semantic accuracy and full-tab coverage are still being improved.

**Use existing group names** is on by default: turn it off and enable regrouping for a full reset, independently of **Ignore saved categories**; no existing-group metadata or examples are sent when it is off, though eligible tabs’ titles and URLs still go to AI.

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

- OpenRouter uses **Jev 1.13** for classification and **GPT-4.1** when new-group suggestions are enabled; naming uses additional API calls.
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

### Explicit grouping preferences

Image-file URL paths (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`, `.svg` and other common image extensions) use **Images** before topic inference. Query strings and fragments do not determine the extension. A new group still requires two tabs; a single image can join an existing Images group.
