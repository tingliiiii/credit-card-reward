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
| 前端 | Vue 3 + TypeScript + Vite + Bootstrap 5 | 純靜態頁面，打包時直接讀入 `campaigns.json` |
| 資料 | `src/assets/campaigns.json` | 所有卡片的回饋方案 |
| 爬蟲 | Python + requests + BeautifulSoup + Gemini | 抓官網文字，由 LLM 轉成 JSON |
| 自動化 | GitHub Actions | 每週自動爬取並開 PR、merge 後自動部署 |

## 前端開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev       # 本機開發 http://localhost:5173/credit-card-reward/
npm run build     # 打包到 dist/
npm run serve     # 預覽打包結果
```

推送到 `main` 後，`.github/workflows/deploy.yml` 會自動 build 並發布到 `gh-pages` 分支。
（仍可手動執行 `npm run build && npm run deploy`。）

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
    "link": ["https://www.cathaybk.com.tw/cathaybk/personal/product/credit-card/cards/cube-list/"]
}
```

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

`.github/workflows/update-data.yml` 每週一 09:00（台灣時間）執行爬蟲，若資料有變動會自動開一個 PR，
人工確認 diff 無誤後 merge，就會觸發部署。也可以在 GitHub → Actions → 「更新信用卡優惠資料」→ Run workflow 手動執行。

首次使用需設定：

1. Settings → Secrets and variables → Actions → 新增 `GEMINI_API_KEY`
2. Settings → Actions → General → Workflow permissions → 勾選 **Allow GitHub Actions to create and approve pull requests**
3. Settings → Pages → Source 選 `gh-pages` 分支

## 常見問題

**SSL 錯誤 `certificate verify failed: Missing Subject Key Identifier`**
Python 3.13 起預設的憑證檢查較嚴格，部分台灣銀行憑證不符合。`scraper.py` 已處理（只放寬該項檢查，仍會驗證憑證），請勿改用 `verify=False`。

**`404 NOT_FOUND`：模型無法使用**
Google 會陸續下架舊模型。預設模型寫在 `scraper.py` 的 `GEMINI_MODEL`，也可以不改程式、臨時指定：
`GEMINI_MODEL=其他模型名稱 python scraper.py`。可用模型請見 [Gemini 模型列表](https://ai.google.dev/gemini-api/docs/models)。

**`429 RESOURCE_EXHAUSTED`**
API 額度或每月花費上限已用完，到 [AI Studio](https://aistudio.google.com/spend) 調整或等下個月重置。

**`503 UNAVAILABLE`：模型忙碌**
Google 端暫時性的流量高峰。程式會自動重試約 2 分鐘，仍失敗就稍後再跑，或換一個模型。

**`KeyError: 'GEMINI_API_KEY'` 或「未設定 GEMINI_API_KEY」**
目前的終端機沒有設定金鑰，請重新執行 `export GEMINI_API_KEY=...`。

## 免責聲明

本站資料僅供參考，實際回饋內容、活動期間與適用條件以各銀行官網公告為準。謹慎理財，信用至上。
