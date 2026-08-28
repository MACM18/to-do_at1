#!/usr/bin/env python3
"""
Dokploy VPS Webhook Trigger Script
Triggers application deployment on Dokploy with customized browser headers
to prevent Cloudflare WAF / Bot Management from blocking the GitHub Actions runner.
"""

import os
import sys
import json
import time

try:
    import requests
except ImportError:
    # Fallback to urllib if requests is not available
    import urllib.request
    import urllib.error
    requests = None


def trigger_deployment():
    webhook_url = os.environ.get("DOKPLOY_WEBHOOK_URL", "").strip()
    webhook_secret = os.environ.get("DOKPLOY_WEBHOOK_SECRET", "").strip()

    if not webhook_url:
        print("❌ Error: DOKPLOY_WEBHOOK_URL environment variable is not set.")
        print("Please add DOKPLOY_WEBHOOK_URL to your GitHub repository secrets.")
        sys.exit(1)

    print(f"🚀 Triggering Dokploy deployment webhook: {webhook_url[:30]}...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
    }

    if webhook_secret:
        headers["Authorization"] = f"Bearer {webhook_secret}"
        headers["X-Webhook-Secret"] = webhook_secret

    payload = {
        "event": "push",
        "ref": "refs/heads/main",
        "timestamp": int(time.time()),
        "source": "github_actions",
    }

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        print(f"📡 Sending webhook request (Attempt {attempt}/{max_retries})...")
        try:
            if requests:
                response = requests.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=30,
                )
                status_code = response.status_code
                response_text = response.text
            else:
                data_bytes = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    webhook_url,
                    data=data_bytes,
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    status_code = resp.getcode()
                    response_text = resp.read().decode("utf-8")

            print(f"📥 Response Code: {status_code}")
            if response_text:
                print(f"📄 Response Body: {response_text[:300]}")

            if 200 <= status_code < 300:
                print("✅ Dokploy deployment successfully triggered!")
                return True
            elif status_code == 403 or status_code == 503:
                print(f"⚠️ Cloudflare challenge or block detected (Status {status_code}). Retrying in 5 seconds...")
                time.sleep(5)
            else:
                print(f"⚠️ Webhook returned unexpected status {status_code}. Retrying...")
                time.sleep(3)

        except Exception as err:
            print(f"❌ Connection error: {err}")
            if attempt < max_retries:
                time.sleep(4)

    print("❌ Failed to trigger deployment webhook after multiple attempts.")
    sys.exit(1)


if __name__ == "__main__":
    trigger_deployment()
