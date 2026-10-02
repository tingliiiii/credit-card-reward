# 現在要刷哪張卡？💳

輸入消費地點（如 momo、屈臣氏、Booking.com），立即查出哪張信用卡有回饋、回饋多少。

🔗 線上版：<https://tingliiiii.github.io/credit-card-reward/>

目前收錄：國泰 CUBE 卡、玉山 Unicard、台新 Richart 卡。

## 架構

```
銀行官網 ──(scraper.py 抓取)──▶ 純文字 ──(Gemini 結構化)──▶ src/assets/campaigns.json ──▶ Vue 前端（GitHub Pages）
```

| 部分 | 技術 | 說明 |
| --- | --- | --- |
| 前端 | Vue 3 + TypeScript + Vite + Bootstrap 5（SCSS 按需引入） | 純靜態頁面，打包時直接讀入 `campaigns.json` |
| 資料 | `src/assets/campaigns.json` | 所有卡片的回饋方案 |
| 爬蟲 | Python + requests + BeautifulSoup + Gemini | 抓官網文字，由 LLM 轉成 JSON |
| 自動化 | GitHub Actions | 每月自動爬取並開 PR、merge 後自動部署 |

## 前端開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev       # 本機開發 http://localhost:5173/credit-card-reward/
npm run build     # 型別檢查（vue-tsc）後打包到 dist/
npm run serve     # 預覽打包結果
npm test          # 單元測試（Vitest）
npm run lint      # ESLint 檢查
npm run format    # Prettier 格式化
```

推送到 `main` 後，`.github/workflows/deploy.yml` 會依序執行 lint、測試、build，並發布到 `gh-pages` 分支。
（仍可手動執行 `npm run build && npm run deploy`。）

搜尋條件會同步到網址（例如 `?q=日本&card=國泰 CUBE 卡`），可直接分享連結。
頁尾的「最後更新」日期在 build 時從 `campaigns.json` 最後一次 commit 的時間自動帶入，不需手動修改。

### 前端結構

```
src/
  App.vue                 # 頁面組裝
  components/             # AppHeader、CardFilter、CampaignCard、AppFooter、AppIcon
  composables/            # useCampaignSearch（搜尋＋網址同步）、useScrolled、useToday、useQueryParam
  utils/                  # 純函式：明細解析、排序、日期狀態、關鍵字高亮（附 __tests__）
  types/campaign.ts       # campaigns.json 的資料型別
  styles/                 # bootstrap.scss（按需引入）、main.css（自訂樣式）
```

## 資料格式

`campaigns.json` 是一個陣列，每筆代表一張卡的一個回饋方案：

```json
{
    "campaignName": "玩數位",
    "rewardRates": ["3%"],
    "period": "2026/1/1~2026/6/30",
    "card": "國泰 CUBE 卡",
    "details": [
        "AI工具：ChatGPT、Canva、Claude",
        "網購平台：蝦皮購物、momo購物網"
    ],
    "links": ["https://www.cathaybk.com.tw/cathaybk/personal/product/credit-card/cards/cube-list/"]
}
```

型別定義在 `src/types/campaign.ts`，欄位有變動時要和 `scraper.py` 一起修改，否則 `npm run build` 的型別檢查會失敗。

前端會用 `campaignName`、`card`、`rewardRates`、`details` 做關鍵字搜尋，並依 `card` 分組顯示。
**同一張卡的 `card` 名稱必須完全一致**，否則會被分成兩組。

## 爬蟲：自動更新優惠資料

### 1. 安裝

需要 Python 3.10 以上。

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. 設定 Gemini API Key

到 [Google AI Studio](https://aistudio.google.com/apikey) 免費申請金鑰：

```bash
export GEMINI_API_KEY=你的金鑰
```

### 3. 執行

```bash
python scraper.py                 # 更新所有卡片，寫入 src/assets/campaigns.json
python scraper.py --card CUBE     # 只更新卡名包含 "CUBE" 的卡片
python scraper.py --dry-run       # 只印出結果，不寫檔
python scraper.py --text-only     # 只印出抓到的網頁文字（不需 API Key，用來除錯）
```

更新規則：

- 某張卡爬取成功時，`campaigns.json` 中**該卡的所有舊方案會被新結果取代**（卡名比對忽略空白）。
- 某張卡爬取或解析失敗時，保留原本的資料，不會被清空。
- 其他卡片的資料不受影響；不在爬蟲清單中的卡片可繼續手動維護。

> ⚠️ LLM 整理的結果可能有誤，執行後請用 `git diff src/assets/campaigns.json` 對照官網確認再 commit。

### 新增一張卡

在 `scraper.py` 的 `SOURCES` 加一筆：

```python
{
    "card": "XX銀行 某某卡",      # 前端顯示名稱，也用來覆蓋舊資料
    "url": "https://...",        # 實際抓取的網址
    "link": "https://...",       # 「查看詳情」按鈕連結
    "kind": "html",              # 一般網頁用 html
    "selector": "#main-content", # 選填：只取主要內容區塊，減少雜訊
    "hint": "每個權益方案各輸出一筆。",  # 選填：給 LLM 的提示
},
```

先用 `python scraper.py --card 某某卡 --text-only` 確認抓得到優惠文字。若只看到「You need to enable JavaScript」，
表示網頁是前端渲染，需要用瀏覽器開發者工具（Network 分頁）找出它實際呼叫的資料 API。
例如國泰官網是 AEM 架構，在網址後加 `.model.json` 就能取得內容，對應 `"kind": "aem-json"`。

### 自動排程（GitHub Actions）

`.github/workflows/update-data.yml` 每月一日 09:00（台灣時間）執行爬蟲，若資料有變動會自動開一個 PR，
人工確認 diff 無誤後 merge，就會觸發部署。也可以在 GitHub → Actions → 「更新信用卡優惠資料」→ Run workflow 手動執行。

首次使用需設定：

1. Settings → Secrets and variables → Actions → 新增 `GEMINI_API_KEY`
2. Settings → Actions → General → Workflow permissions → 勾選 **Allow GitHub Actions to create and approve pull requests**
3. Settings → Pages → Source 選 `gh-pages` 分支

> 第 2 步的選項名稱雖然包含「approve」，但 workflow 只會開 PR，不會核准或合併；且 GitHub 不允許 PR 作者核准自己的 PR，所以一定要由你手動 Merge。

若想在規則上強制「必須經你核准才能合併」（選用）：

1. Settings → Rules → Rulesets → New branch ruleset，Target branches 選 `main`
2. 勾選 **Require a pull request before merging**，Required approvals 設為 `1`
3. **Bypass list 加入 Repository admin**：否則你自己直接 push 到 `main` 也會被擋

## 常見問題

**SSL 錯誤 `certificate verify failed: Missing Subject Key Identifier`**
Python 3.13 起預設的憑證檢查較嚴格，部分台灣銀行憑證不符合。`scraper.py` 已處理（只放寬該項檢查，仍會驗證憑證），請勿改用 `verify=False`。

**模型忙碌（`503`）、沒反應或已下架（`404`）**
程式會依序嘗試 `scraper.py` 中 `GEMINI_MODELS` 列出的模型（預設 `gemini-3.8-flash` → `3.7` → `3.6` → `3.5`）：

- 忙碌（503）、超過 `GEMINI_TIMEOUT`（180 秒）沒完成，或模型不存在（404）：直接換下一個
- 換到可用的模型後，後面的卡片會直接用它

全部失敗就稍後再跑。也可以不改程式、臨時指定模型順序（逗號分隔）：
`GEMINI_MODEL=gemini-3.7-flash,gemini-3.5-flash python scraper.py`。可用模型請見 [Gemini 模型列表](https://ai.google.dev/gemini-api/docs/models)。

**`429 RESOURCE_EXHAUSTED`**
API 額度或每月花費上限已用完，到 [AI Studio](https://aistudio.google.com/spend) 調整或等下個月重置。換模型無效，程式會直接停止。

**`KeyError: 'GEMINI_API_KEY'` 或「未設定 GEMINI_API_KEY」**
目前的終端機沒有設定金鑰，請重新執行 `export GEMINI_API_KEY=...`。

## 免責聲明

本站資料僅供參考，實際回饋內容、活動期間與適用條件以各銀行官網公告為準。謹慎理財，信用至上。
