import requests

API_KEY = "AIzaSyDeQAusBM_iewdryRN5dsM5iFi3bkqIOD4"

def check_url(url):
    # Ensure URL has protocol
    if not url.startswith("http"):
        url = "http://" + url

    body = {
        "client": {
            "clientId": "safevoice-test",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": url}
            ]
        }
    }

    print(f"\nChecking: {url}")

    try:
        response = requests.post(
            f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={API_KEY}",
            json=body
        )

        print("Status Code:", response.status_code)

        result = response.json()
        print("API Response:", result)

        if result.get("matches"):
            print("Result: DANGEROUS")
        else:
            print("Result: SAFE")

    except Exception as e:
        print("Error:", e)


if __name__ == "__main__":
    # Test cases
    test_urls = [
        "http://malware.testing.google.test/testing/malware/",
    ]

    for url in test_urls:
        check_url(url)