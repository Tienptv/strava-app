import requests
import json

url = 'http://localhost:3001/api/screenshot/full-table'
payload = {
    "month": 9,
    "year": 2026,
    "athleteId": 133066813,
    "lang": "vi",
    "chartsCollapsed": False,
    "targetScope": "leaderboard"
}

try:
    response = requests.post(url, json=payload, timeout=30)
    print("Status code:", response.status_code)
    print("Headers:", response.headers)
    print("Content length:", len(response.content))
    if response.status_code == 200:
        with open('test_screenshot.png', 'wb') as f:
            f.write(response.content)
        print("Screenshot saved to test_screenshot.png")
except Exception as e:
    print("Error:", e)
