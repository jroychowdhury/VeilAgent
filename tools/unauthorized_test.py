"""Demo script: what happens when a client without a valid token calls the backend.

Run it while the server is up:   python tools/unauthorized_test.py
"""

import json
import urllib.error
import urllib.request

BASE = "http://localhost:8000"

CASES = [
    ("No token at all", None, "/agent/reason"),
    ("Forged token", "INVALID_TOKEN", "/agent/reason"),
    ("Forged token on the data endpoint", "INVALID_TOKEN", "/agent/data"),
    ("Valid customer token on an admin endpoint", "veil-demo-token-001", "/admin/accounts"),
    ("Valid customer token on its own endpoint", "veil-demo-token-001", "/agent/data"),
]


def call(token, path):
    payload = json.dumps({"task": "probe", "context": {"url": path, "elements": []}}).encode()
    method = "POST" if path == "/agent/reason" else "GET"
    request = urllib.request.Request(
        BASE + path,
        data=payload if method == "POST" else None,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"{}")
    except urllib.error.URLError as error:
        return 0, {"detail": f"Backend unreachable: {error.reason}"}


def main():
    print("\nUnauthorized access check against", BASE, "\n")
    for label, token, path in CASES:
        status, body = call(token, path)
        verdict = {200: "ALLOWED", 401: "BLOCKED (authentication)", 403: "FORBIDDEN (authorization)"}.get(
            status, f"HTTP {status}"
        )
        print(f"  {label:<45} {path:<20} -> {verdict}")
        if status != 200:
            print(f"      reason: {body.get('detail', '-')}")
    print("\nEvery line above is now in the audit log at /audit/logs and in the extension's Security tab.\n")


if __name__ == "__main__":
    main()
