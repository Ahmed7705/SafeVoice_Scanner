# SafeVoice Scanner

**Suspicious Link & QR Code Checker for Visually Impaired Users**

A fully accessible, voice-guided web application that helps users — especially visually impaired individuals — detect malicious links and QR codes before opening them.

---

## Features

- **Voice Guidance** — Automatic voice announcements for all results in Arabic and English using Google Text-to-Speech
- **Hybrid Threat Detection** — Combines local heuristic analysis (10 checks) with Google Safe Browsing API verification
- **QR Code Scanning** — Camera-based QR code scanning with real-time analysis
- **Bilingual Support** — Full Arabic (RTL) and English interface with one-click switching
- **Dark / Light Mode** — Automatic system preference detection with manual toggle
- **Responsive Design** — Optimized for all devices: iPhone, Samsung, iPad, tablets, and desktops
- **Private History** — Scan history stored locally in the browser (per-device, not shared)
- **Accessibility** — ARIA labels, keyboard shortcuts, skip navigation, and screen reader support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python / Flask |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Icons | Phosphor Icons |
| TTS | Google Text-to-Speech (gTTS) |
| QR Scanner | html5-qrcode |
| API | Google Safe Browsing API v4 |
| Database | SQLite (server-side logging) |

## Heuristic Checks

The local analysis engine performs 10 security checks on every URL:

| # | Check | Score |
|---|-------|-------|
| 1 | IP address instead of domain | +25 |
| 2 | Missing HTTPS | +50 |
| 3 | Suspicious URL length (>75 chars) | +10 |
| 4 | `@` symbol (credential injection) | +20 |
| 5 | Excessive subdomains (>3 dots) | +15 |
| 6 | Phishing keywords | +8-20 |
| 7 | URL shortener domain | +15 |
| 8 | Double slashes in path | +10 |
| 9 | Non-standard port | +10 |
| 10 | Punycode / IDN homograph | +20 |

> A score of **50 or above** flags the URL as **dangerous**.

## Project Structure

```
SafeVoice_Scanner/
├── app.py              # Flask backend (API endpoints, threat detection)
├── database.py         # SQLite database module
├── requirements.txt    # Python dependencies
├── wsgi.py             # WSGI config for PythonAnywhere
├── templates/
│   └── index.html      # Main HTML page
└── static/
    ├── css/
    │   └── style.css   # Responsive CSS with themes
    └── js/
        └── app.js      # Core application logic
```

## Installation & Setup

### Prerequisites

- Python 3.10+
- pip

### Local Development

```bash
# Clone or download the project
cd SafeVoice_Scanner

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

Open **http://localhost:5000** in your browser.

### PythonAnywhere Deployment

1. Upload project files to `/home/<username>/mysite/`
2. Create virtualenv and install dependencies:
   ```bash
   cd ~/mysite
   python3 -m venv .venv
   source .venv/bin/activate
   pip install flask flask-cors requests gtts
   ```
3. Configure WSGI file (`/var/www/<username>_pythonanywhere_com_wsgi.py`):
   ```python
   import sys, os
   project_home = '/home/<username>/mysite'
   if project_home not in sys.path:
       sys.path = [project_home] + sys.path
   os.chdir(project_home)
   from app import app as application
   ```
4. Set virtualenv path in Web tab: `/home/<username>/mysite/.venv`
5. Add static files mapping: `/static/` → `/home/<username>/mysite/static`
6. Reload the web app

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit URL for scanning |
| `Escape` | Dismiss result / Close QR panel |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main application page |
| POST | `/api/check-url` | Check a URL for threats |
| POST | `/api/tts` | Generate speech audio |
| GET | `/api/history` | Get scan history |
| DELETE | `/api/history` | Clear scan history |

## Team

SafeVoice Scanner — Graduation Project 2026

## License

This project is developed for educational purposes.
