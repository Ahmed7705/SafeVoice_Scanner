"""
SafeVoice Scanner - Main Flask Application
Provides API endpoints for URL/QR code safety checking using hybrid threat detection.
Combines local heuristic analysis with Google Safe Browsing API verification.
"""

import re
import requests
from urllib.parse import urlparse
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from database import init_db, log_scan, get_history, clear_history

# ==============================================================================
# Configuration
# ==============================================================================

app = Flask(__name__)
CORS(app)

# Google Safe Browsing API key
GOOGLE_API_KEY = "AIzaSyDeQAusBM_iewdryRN5dsM5iFi3bkqIOD4"
SAFE_BROWSING_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_API_KEY}"

# Heuristic threshold - score >= this value is considered dangerous
HEURISTIC_THRESHOLD = 50

# Known URL shortener domains
URL_SHORTENERS = [
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "bl.ink", "lnkd.in", "shorte.st", "cli.gs",
    "short.io", "rebrand.ly", "cutt.ly", "rb.gy"
]

# Suspicious phishing keywords commonly found in malicious URLs
PHISHING_KEYWORDS = [
    "login", "verify", "secure", "account", "update", "banking",
    "confirm", "signin", "password", "wallet", "paypal", "support",
    "suspend", "locked", "urgent", "alert", "notification"
]


# ==============================================================================
# Heuristic Analysis Engine
# ==============================================================================

def analyze_heuristics(url):
    """
    Perform local heuristic analysis on a URL to detect suspicious patterns.
    Returns a risk score (0-100) and a list of flagged issues.

    Checks performed:
    1. IP address used instead of domain name
    2. Missing HTTPS protocol
    3. Suspicious URL length
    4. Presence of '@' symbol (credential injection)
    5. Excessive subdomains
    6. Phishing keywords in URL
    7. URL shortener usage
    8. Suspicious special characters
    9. Port number in URL
    10. Punycode / IDN homograph attack indicators
    """
    score = 0
    flags = []

    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        path = parsed.path or ""
        full_url = url.lower()
    except Exception:
        return 80, ["invalid_url_structure"]

    # --- Check 1: IP address instead of domain name ---
    ip_pattern = re.compile(
        r"^(?:\d{1,3}\.){3}\d{1,3}$"  # IPv4 pattern
    )
    if ip_pattern.match(hostname):
        score += 25
        flags.append("ip_instead_of_domain")

    # --- Check 2: Missing HTTPS ---
    if parsed.scheme != "https":
        score += 15
        flags.append("no_https")

    # --- Check 3: Suspicious URL length (> 75 characters) ---
    if len(url) > 75:
        score += 10
        flags.append("suspicious_length")

    # --- Check 4: '@' symbol in URL (potential credential injection) ---
    if "@" in url:
        score += 20
        flags.append("at_symbol_present")

    # --- Check 5: Excessive subdomains (more than 3 dots in hostname) ---
    if hostname.count(".") > 3:
        score += 15
        flags.append("excessive_subdomains")

    # --- Check 6: Phishing keywords ---
    keyword_matches = [kw for kw in PHISHING_KEYWORDS if kw in full_url]
    if keyword_matches:
        score += min(len(keyword_matches) * 8, 20)
        flags.append(f"phishing_keywords:{','.join(keyword_matches)}")

    # --- Check 7: URL shortener ---
    if hostname in URL_SHORTENERS:
        score += 15
        flags.append("url_shortener")

    # --- Check 8: Suspicious characters (multiple // after protocol, - in domain) ---
    path_double_slash = "//" in path
    if path_double_slash:
        score += 10
        flags.append("double_slash_in_path")

    # Excessive hyphens in hostname
    if hostname.count("-") > 3:
        score += 10
        flags.append("excessive_hyphens")

    # --- Check 9: Non-standard port ---
    if parsed.port and parsed.port not in [80, 443]:
        score += 10
        flags.append("non_standard_port")

    # --- Check 10: Punycode / IDN homograph attack ---
    if "xn--" in hostname:
        score += 20
        flags.append("punycode_domain")

    # Cap the score at 100
    score = min(score, 100)

    return score, flags


# ==============================================================================
# Google Safe Browsing API Verification
# ==============================================================================

def check_safe_browsing(url):
    """
    Query the Google Safe Browsing API to check if a URL is in any threat lists.
    Returns a tuple: (is_dangerous: bool, threat_types: list, error: str or None)
    """
    body = {
        "client": {
            "clientId": "safevoice-scanner",
            "clientVersion": "1.0.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": url}
            ]
        }
    }

    try:
        response = requests.post(SAFE_BROWSING_URL, json=body, timeout=10)
        response.raise_for_status()
        result = response.json()

        if result.get("matches"):
            threat_types = list(set(
                match.get("threatType", "UNKNOWN")
                for match in result["matches"]
            ))
            return True, threat_types, None
        else:
            return False, [], None

    except requests.exceptions.Timeout:
        return False, [], "api_timeout"
    except requests.exceptions.RequestException as e:
        return False, [], f"api_error: {str(e)}"
    except Exception as e:
        return False, [], f"unexpected_error: {str(e)}"


# ==============================================================================
# API Routes
# ==============================================================================

@app.route("/")
def index():
    """Serve the main application page."""
    return render_template("index.html")


@app.route("/api/check-url", methods=["POST"])
def check_url():
    """
    Main endpoint for URL safety checking.
    Accepts JSON with 'url' and optional 'scan_type' ('url' or 'qr').
    Runs hybrid analysis and returns the verdict.
    """
    data = request.get_json()

    if not data or not data.get("url"):
        return jsonify({
            "error": "No URL provided",
            "result": "error"
        }), 400

    url = data["url"].strip()
    scan_type = data.get("scan_type", "url")

    # Ensure the URL has a protocol prefix
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url

    # --- Step 1: Local Heuristic Analysis ---
    heuristic_score, heuristic_flags = analyze_heuristics(url)

    # --- Step 2: Google Safe Browsing API Verification ---
    api_dangerous, threat_types, api_error = check_safe_browsing(url)

    # --- Step 3: Combine Results ---
    # URL is dangerous if API flags it OR heuristic score exceeds threshold
    is_dangerous = api_dangerous or heuristic_score >= HEURISTIC_THRESHOLD
    result = "dangerous" if is_dangerous else "safe"

    # Determine API result status string
    if api_error:
        api_result_str = "error"
    elif api_dangerous:
        api_result_str = "dangerous"
    else:
        api_result_str = "safe"

    # --- Step 4: Log the scan to database ---
    try:
        log_scan(
            url=url,
            scan_type=scan_type,
            result=result,
            heuristic_score=heuristic_score,
            api_result=api_result_str,
            threat_types=",".join(threat_types),
            heuristic_flags=",".join(heuristic_flags)
        )
    except Exception as e:
        print(f"[WARNING] Failed to log scan: {e}")

    # --- Build response ---
    response_data = {
        "url": url,
        "result": result,
        "heuristic_score": heuristic_score,
        "heuristic_flags": heuristic_flags,
        "api_result": api_result_str,
        "threat_types": threat_types,
        "scan_type": scan_type
    }

    if api_error:
        response_data["api_warning"] = api_error

    return jsonify(response_data)


@app.route("/api/history", methods=["GET"])
def scan_history():
    """Retrieve scan history records."""
    try:
        history = get_history(limit=50)
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"error": str(e), "history": []}), 500


@app.route("/api/history", methods=["DELETE"])
def delete_history():
    """Clear all scan history records."""
    try:
        clear_history()
        return jsonify({"message": "History cleared successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# Application Entry Point
# ==============================================================================

if __name__ == "__main__":
    # Initialize the database on startup
    init_db()
    print("=" * 60)
    print("  SafeVoice Scanner - Server Starting")
    print("  Access the application at: http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)
