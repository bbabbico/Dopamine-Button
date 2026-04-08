import json
import urllib.request
from mitmproxy import http

TARGET_KEYWORDS = [
    "window.open",
    "location.href",
    "/compose",
    "/message",
    "redirect"
]


def send_event(payload):
    req = urllib.request.Request(
        "http://localhost:3000/proxy/events",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=2)
        print(f"[proxy-addon] sent event: {payload.get('eventType')}")
    except Exception as exc:
        print(f"[proxy-addon] send failed: {exc}")


class HiddenEventInterceptor:
    def response(self, flow: http.HTTPFlow):
        url = flow.request.pretty_url
        body = ""

        try:
            if flow.response and flow.response.content:
                body = flow.response.get_text(strict=False)[:40000]
        except Exception:
            body = ""

        lowered = body.lower()

        for keyword in TARGET_KEYWORDS:
            if keyword.lower() in lowered:
                payload = {
                    "url": url,
                    "eventType": "hidden_js_hint",
                    "note": f"keyword={keyword}"
                }

                if "redirect" in keyword.lower() or "location.href" in keyword.lower():
                    payload["redirectUrl"] = url

                send_event(payload)
                break


addons = [HiddenEventInterceptor()]
