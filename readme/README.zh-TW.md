<div align="center">

# Tabfold

**減少分頁干擾，騰出思考空間。**

將擁擠的 Chrome 視窗整理成清楚、可收合的分頁群組 — **任何變更前都能先預覽**。

**預覽 → 檢查 → 套用**

Chrome Manifest V3 · 本機優先 · Jev 1.13 · 無執行階段相依套件

[English](../README.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md) · [Español](README.es.md)

<img src="../docs/assets/cover.svg" alt="Tabfold 封面" width="100%" />

</div>

## 為什麼選擇 Tabfold

- **先預覽** — Tabfold 變更分頁前，先查看建議的群組。
- **不使用 AI 也能運作** — 透過本機標題與網域規則立即整理分頁，不需要 API 金鑰。
- **需要時再用 AI** — 透過 OpenRouter 或 TypeSafe 使用 Jev，進行更智慧的分類。
- **保留工作脈絡** — 分頁留在原本的視窗中，只收合群組以減少雜亂。
- **預設保護分頁** — 已固定、正在播放音訊、無痕、瀏覽器內部及已分組的分頁都受到保護。
- **輕鬆復原** — 復原上一次分組，並還原清理重複分頁時移除的網址。

<img src="../docs/assets/popup-en.png" alt="Tabfold 彈出視窗預覽" width="100%" />

## 使用方式

1. 使用本機規則或 AI **預覽**。
2. **檢查**建議的群組。
3. 確認結果後**套用**。

就是這麼簡單。Tabfold 會分組並收合分頁，不合併視窗，也不取代你的頁面。

## 安裝

1. 下載或複製此儲存庫。
2. 開啟 `chrome://extensions`。
3. 啟用**開發人員模式**。
4. 按一下**載入未封裝項目**，選擇 `extension` 資料夾。
5. 將 **Tabfold** 固定到工具列。

不需要建置或安裝套件。

## 依照習慣調整

在**設定**中，你可以：

- 建立最多 **12 個自訂分類**
- 選擇按**目前順序／標題／最久未使用**排列分頁
- 在新增前檢查建議的新主題
- 以 JSON 匯入或匯出分類
- 切換英文、法文、韓文、簡體中文、繁體中文、俄文、日文、土耳其文及西班牙文

「其他」分類會自動處理。

## AI 是選用功能

本機預覽完全在瀏覽器中進行。

若要使用 AI 預覽，請在**設定 → AI 連線**中選擇 **OpenRouter** 或 **TypeSafe**，並新增該供應商的 API 金鑰。

- OpenRouter 使用 **Decisions API**
- TypeSafe 使用 **Jev 1.13**
- API 金鑰儲存在 Chrome 的**工作階段儲存空間**中，關閉瀏覽器後就會清除
- **不會自動改用其他供應商**

## 隱私

| | |
|---|---|
| **本機預覽** | 不對外傳送資料 |
| **AI 預覽** | 傳送分頁標題、網址來源／路徑及分類條件 |
| **絕不傳送** | 頁面內文、網址認證資訊、查詢字串、片段識別碼 |
| **API 金鑰** | 僅保存在目前工作階段 |
| **分析／廣告** | 無 |

標題與網址路徑仍可能含有敏感資訊。詳情請參閱[隱私說明](../docs/PRIVACY.md)。

## 開發

需要 **Node.js 22+**。

```bash
npm test
npm run check
```

使用原生 JavaScript 和 Chrome API，沒有執行階段相依套件，也沒有遠端程式碼。

[驗證紀錄](../docs/VALIDATION.md) · [發布說明](../docs/LAUNCH.md) · [分類 JSON 範例](../docs/categories.example.json)

---

**收合僅是視覺上的整理，不會摘要內容，也不保證降低記憶體用量。**
