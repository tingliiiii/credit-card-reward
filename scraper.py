"""
信用卡優惠爬蟲：抓取各銀行官網 → 交給 Gemini 結構化 → 更新 src/assets/campaigns.json

用法（詳見 README.md）：
    export GEMINI_API_KEY=你的金鑰
    python scraper.py                 # 更新所有卡片
    python scraper.py --card CUBE     # 只更新卡名含 "CUBE" 的卡片
    python scraper.py --dry-run       # 只印出結果，不寫檔
    python scraper.py --text-only     # 只印出抓到的網頁文字（不需 API Key，用來除錯）
"""

import argparse
import datetime
import json
import os
import ssl
import sys
import threading
import time

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from requests.adapters import HTTPAdapter

CAMPAIGNS_PATH = "src/assets/campaigns.json"
# 依序嘗試的模型：前一個忙碌、逾時或已下架時自動換下一個。
# 可用環境變數覆蓋，多個以逗號分隔，例如 GEMINI_MODEL=gemini-3.7-flash,gemini-3.5-flash
GEMINI_MODELS = [m.strip() for m in os.environ.get(
    "GEMINI_MODEL", "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash"
).split(",") if m.strip()]
# 單次請求等待上限（秒），超過視為沒反應並換下一個模型
GEMINI_TIMEOUT = 180
# 送給 LLM 的文字上限（Gemini Flash 支援百萬 token，這裡只是避免異常大的頁面）
MAX_TEXT_CHARS = 60000

# 要爬的卡片清單。新增卡片時在這裡加一筆即可。
#   card:     前端顯示的卡名（也用來比對、覆蓋 campaigns.json 中的舊資料）
#   url:      實際抓取的網址
#   link:     寫進 campaigns.json、給使用者點的「查看詳情」連結
#   kind:     "html"     → 一般網頁（伺服器端渲染）
#             "aem-json" → 前端渲染的網頁，改抓 AEM CMS 的 .model.json
#   selector: (html 限定) 只取這個 CSS selector 內的內容，去掉導覽列等雜訊
#   hint:     (選填) 給 LLM 的額外提示
SOURCES = [
    {
        "card": "國泰 CUBE 卡",
        "url": "https://www.cathay-cube.com.tw/cathaybk/personal/product/credit-card/cards/cube-list.model.json",
        "link": "https://www.cathaybk.com.tw/cathaybk/personal/product/credit-card/cards/cube-list/",
        "kind": "aem-json",
        "hint": "CUBE 卡的權益方案如「玩數位」「樂饗購」「趣旅行」「集精選」等，每個權益方案各輸出一筆。",
    },
    {
        "card": "玉山 Unicard",
        "url": "https://www.esunbank.com/zh-tw/personal/credit-card/intro/bank-card/unicard",
        "link": "https://www.esunbank.com/zh-tw/personal/credit-card/intro/bank-card/unicard",
        "kind": "html",
        "selector": "#main-content",
        "hint": "百大指定消費依通路類別（行動支付、交通加油、百貨、餐飲、電商…）各輸出一筆，"
                "rewardRates 列出各方案（簡單選／任意選／UP選）的回饋與上限。",
    },
    {
        "card": "台新Richart卡",
        "url": "https://mkp.taishinbank.com.tw/s/2025/RichartCard_2025/index.html",
        "link": "https://mkp.taishinbank.com.tw/s/2025/RichartCard_2025/index.html",
        "kind": "html",
        "hint": "Richart 卡的權益方案如「Pay著刷」「天天刷」「大筆刷」「好饗刷」「數趣刷」「玩旅刷」「假日刷」等，每個方案各輸出一筆。",
    },
]


class Campaign(BaseModel):
    """與 campaigns.json 單筆資料相同的結構（card、link 由程式填入，不交給 LLM）"""
    campaignName: str
    rewardRates: list[str]
    period: str
    details: list[str]


class _RelaxedStrictAdapter(HTTPAdapter):
    """
    Python 3.13+ 預設啟用 VERIFY_X509_STRICT，台灣多家銀行（TWCA 簽發）的憑證缺少
    Subject Key Identifier 會因此驗證失敗。這裡只關掉這個嚴格檢查，仍會驗證憑證，
    不需要像以前一樣用 verify=False 整個關掉 SSL 驗證。
    """

    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT
        kwargs["ssl_context"] = ctx
        return super().init_poolmanager(*args, **kwargs)


def make_session():
    session = requests.Session()
    session.mount("https://", _RelaxedStrictAdapter())
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9",
    })
    return session


def html_to_text(html, selector=None):
    """HTML → 去掉 script/style 與空白行的純文字"""
    soup = BeautifulSoup(html, "html.parser")
    root = (soup.select_one(selector) if selector else None) or soup
    for tag in root(["script", "style", "noscript"]):
        tag.decompose()
    lines = (line.strip() for line in root.get_text(separator="\n").splitlines())
    return "\n".join(line for line in lines if line)


def aem_json_to_text(data):
    """遞迴走訪 AEM .model.json，抽出所有可讀文字（字串中可能夾帶 HTML）"""
    texts = []

    def walk(obj):
        if isinstance(obj, dict):
            for value in obj.values():
                walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)
        elif isinstance(obj, str):
            # 純 ASCII 且不含 HTML 的字串多半是路徑、class 名稱、id 等系統欄位
            if obj.isascii() and "<" not in obj:
                return
            text = BeautifulSoup(obj, "html.parser").get_text(separator=" ", strip=True)
            if len(text) > 1:
                texts.append(text)

    walk(data)
    return "\n".join(dict.fromkeys(texts))  # 去重複並保留順序


def fetch_text(session, source):
    response = session.get(source["url"], timeout=30)
    response.raise_for_status()
    if source["kind"] == "aem-json":
        return aem_json_to_text(response.json())
    if response.encoding is None or response.encoding.lower() == "iso-8859-1":
        response.encoding = response.apparent_encoding
    return html_to_text(response.text, source.get("selector"))


def build_prompt(source, page_text):
    today = datetime.date.today().strftime("%Y/%m/%d")
    return f"""你是信用卡優惠資料整理助手。以下是「{source['card']}」官網擷取的文字，今天是 {today}。
請整理出這張卡目前有效（或即將開始）的回饋方案，每個方案輸出一筆。已經過期的活動不要輸出。
{source.get('hint', '')}

欄位規則：
- campaignName：方案名稱，例如「玩數位」。
- rewardRates：回饋比例字串陣列，可附上上限，例如 ["3%"]、["3.3%（無上限）"]、["簡單選 +2%（上限 1000 點）"]。
- period：活動期間，格式「YYYY/M/D~YYYY/M/D」。
- details：適用通路與重要限制，每個元素一行字串：
  - 通路請寫成「分類：店家A、店家B、店家C」，例如「AI工具：ChatGPT、Canva、Claude」；括號備註（如不含電子票券）保留在店家旁。
  - 重要排除條款（如「分期付款僅適用0.3%」、「LINE Pay 綁定不適用」）精簡後獨立成一行。
- 只使用文字中出現的資訊，不要自行推測或補充；店家名單請完整列出，不要用「等」省略。

官網文字：
---
{page_text[:MAX_TEXT_CHARS]}
"""


class AllModelsFailed(Exception):
    """GEMINI_MODELS 中所有模型都忙碌、逾時或無法使用"""


# 目前使用 GEMINI_MODELS 中的第幾個；某模型失敗換下一個後，之後的卡片就直接從可用的模型開始
_model_index = 0


def call_with_deadline(fn, timeout):
    """
    在背景執行緒執行 fn，最多等 timeout 秒，超過就拋出 TimeoutError。
    httpx 的 timeout 只計算「多久沒收到資料」，伺服器若斷斷續續回應就可能一直卡住，
    所以這裡另外用實際經過的時間強制中止等待。
    """
    result = {}

    def run():
        try:
            result["value"] = fn()
        except BaseException as e:
            result["error"] = e

    # daemon=True：逾時後放著不管，程式結束時不必等它
    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise TimeoutError
    if "error" in result:
        raise result["error"]
    return result["value"]


def generate_with_fallback(client, **kwargs):
    """
    依 GEMINI_MODELS 順序呼叫 Gemini，遇到以下情況直接換下一個模型：
    - 伺服器忙碌（5xx）
    - 超過 GEMINI_TIMEOUT 秒沒完成
    - 模型不存在（404）
    429（額度用完）、401/403（Key 有誤）則直接拋出，換模型也沒用。
    """
    global _model_index
    import httpx
    from google.genai import errors

    last_error = None
    while _model_index < len(GEMINI_MODELS):
        model = GEMINI_MODELS[_model_index]
        start = time.monotonic()
        print(f"   🤖 交給 {model} 解析中（通常需要 30 秒～2 分鐘，最多等 {GEMINI_TIMEOUT} 秒）…", flush=True)
        try:
            response = call_with_deadline(
                lambda: client.models.generate_content(model=model, **kwargs), GEMINI_TIMEOUT)
            print(f"   ⏱️ 耗時 {time.monotonic() - start:.0f} 秒")
            return response
        except errors.ServerError as e:
            last_error = e
            print(f"   ⏳ {model} 伺服器忙碌（{e.code}）", flush=True)
        except (TimeoutError, httpx.TimeoutException) as e:
            last_error = e
            print(f"   ⏳ {model} 超過 {GEMINI_TIMEOUT} 秒沒有回應", flush=True)
        except errors.ClientError as e:
            if e.code != 404:
                raise
            last_error = e
            print(f"   ⏳ {model} 無法使用（404）", flush=True)
        _model_index += 1
        if _model_index < len(GEMINI_MODELS):
            print(f"   🔁 改用 {GEMINI_MODELS[_model_index]}", flush=True)
    raise AllModelsFailed(f"所有模型（{'、'.join(GEMINI_MODELS)}）都忙碌、逾時或無法使用") from last_error


def parse_with_llm(client, source, page_text):
    from google.genai import types

    response = generate_with_fallback(
        client,
        contents=build_prompt(source, page_text),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[Campaign],
            temperature=0,
        ),
    )
    campaigns = response.parsed or []
    return [
        {
            "campaignName": c.campaignName,
            "rewardRates": c.rewardRates,
            "period": c.period,
            "card": source["card"],
            "details": c.details,
            "link": [source["link"]],
        }
        for c in campaigns
    ]


def card_key(name):
    """比對卡名時忽略空白，避免「玉山Unicard」與「玉山 Unicard」被視為兩張卡"""
    return "".join(name.split()).lower()


def merge_campaigns(existing, card, new_items):
    """以 new_items 取代 existing 中同一張卡的所有資料，並放在原本的位置；其他卡片不動"""
    key = card_key(card)
    positions = [i for i, c in enumerate(existing) if card_key(c.get("card", "")) == key]
    insert_at = positions[0] if positions else len(existing)
    kept = [c for c in existing if card_key(c.get("card", "")) != key]
    insert_at -= sum(1 for p in positions if p < insert_at)
    return kept[:insert_at] + new_items + kept[insert_at:]


def save_campaigns(campaigns):
    """先寫到暫存檔再取代，避免寫到一半被中斷而留下壞掉的 JSON"""
    tmp_path = CAMPAIGNS_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(campaigns, f, ensure_ascii=False, indent=4)
        f.write("\n")
    os.replace(tmp_path, CAMPAIGNS_PATH)


def main():
    parser = argparse.ArgumentParser(description="爬取信用卡優惠並更新 campaigns.json")
    parser.add_argument("--card", help="只處理卡名包含此字串的卡片")
    parser.add_argument("--dry-run", action="store_true", help="只印出結果，不寫入檔案")
    parser.add_argument("--text-only", action="store_true", help="只印出擷取的網頁文字，不呼叫 LLM")
    args = parser.parse_args()

    sources = [s for s in SOURCES if not args.card or args.card.lower() in s["card"].lower()]
    if not sources:
        sys.exit(f"找不到卡名包含「{args.card}」的設定，可選：{', '.join(s['card'] for s in SOURCES)}")

    client = None
    if not args.text_only:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            sys.exit("❌ 未設定 GEMINI_API_KEY 環境變數。請先執行：export GEMINI_API_KEY=你的金鑰\n"
                     "   （到 https://aistudio.google.com/apikey 申請；只想測試抓取可加 --text-only）")
        from google import genai
        from google.genai import types
        # timeout 單位為毫秒；重試與換模型由 generate_with_fallback 負責
        client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT * 1000))

    with open(CAMPAIGNS_PATH, encoding="utf-8") as f:
        campaigns = json.load(f)

    session = make_session()
    updated, failed = [], []
    for source in sources:
        card = source["card"]
        print(f"🔎 {card}：抓取 {source['url']}")
        try:
            text = fetch_text(session, source)
            print(f"   擷取 {len(text)} 字")
            if args.text_only:
                print(text)
                continue
            items = parse_with_llm(client, source, text)
        except Exception as e:
            print(f"   ⚠️ 失敗，保留原資料：{e!r}")
            failed.append(card)
            # 這些錯誤後面的卡也一定失敗，直接停止
            fatal = {
                401: "API Key 無效，請確認 GEMINI_API_KEY",
                403: "API Key 沒有權限，請確認 GEMINI_API_KEY",
                429: "Gemini API 額度已用完，請到 https://aistudio.google.com/spend 調整上限或稍後再試",
            }
            code = getattr(e, "code", None)
            if isinstance(e, AllModelsFailed) or code in fatal:
                reason = "請稍後再試，或用 GEMINI_MODEL 環境變數指定其他模型" if isinstance(e, AllModelsFailed) else fatal[code]
                print(f"   ⛔ {reason}，停止處理其餘卡片")
                failed.extend(s["card"] for s in sources[sources.index(source) + 1:])
                break
            continue
        if not items:
            print("   ⚠️ LLM 沒有回傳任何方案，保留原資料")
            failed.append(card)
            continue
        print(f"   ✅ 解析出 {len(items)} 個方案：{'、'.join(i['campaignName'] for i in items)}")
        campaigns = merge_campaigns(campaigns, card, items)
        updated.append(card)
        # 每張卡成功就立即處理，後面的卡失敗或中斷（Ctrl+C）也不會浪費這次解析
        if args.dry_run:
            print(json.dumps(items, ensure_ascii=False, indent=4))
        else:
            save_campaigns(campaigns)
            print(f"   💾 已寫入 {CAMPAIGNS_PATH}")

    if args.text_only:
        return
    if updated:
        print(f"{'🧪 dry-run，未寫檔' if args.dry_run else '💾 已更新'}：{'、'.join(updated)}")
    if failed:
        print(f"⚠️ 以下卡片未更新：{'、'.join(failed)}")
    if not updated:
        sys.exit(1)


if __name__ == "__main__":
    main()
