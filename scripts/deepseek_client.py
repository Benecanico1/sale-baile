#!/usr/bin/env python3
"""DeepSeek client con backoff exponencial, concurrencia limitada y user_id.
Doc oficial: https://api-docs.deepseek.com/quick_start/rate_limit
Formulario ampliación gratuita: https://trtgsjkv6r.feishu.cn/share/base/form/shrcnda9jNKvhyYr8xb843xLEzc"""
import urllib.request, urllib.error, json, time, os, threading
MAX_CONCURRENT = 20
semaphore = threading.Semaphore(MAX_CONCURRENT)

def call(url, payload, user_id="sale_baile_telegram"):
    payload["user_id"] = user_id
    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode()
    with semaphore:
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, data=data, headers=headers, method="POST")
                resp = urllib.request.urlopen(req, timeout=45)
                return json.loads(resp.read())
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait = 2 ** attempt  # 1,2,4,8,16
                    time.sleep(wait)
                    continue
                raise
        return {}
