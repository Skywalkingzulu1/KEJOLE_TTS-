# Kejoletts TTS (KEJOLE_TTS)

## Table of Contents
- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Node.js Backend](#nodejs-backend)
  - [Python Dependencies (Testing)](#python-dependencies-testing)
  - [Docker Deployment](#docker-deployment)
- [Usage](#usage)
  - [Web UI](#web-ui)
  - [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview
**Kejoletts TTS** is a secure, web‑based Text‑to‑Speech (TTS) service powered by Google Cloud Text‑to‑Speech.  
It provides:

- A clean, responsive web UI for end‑users.
- A RESTful API for programmatic synthesis.
- Rate‑limiting and CORS protection out of the box.
- Docker support for easy production deployment.

The repository contains the **backend** (Node.js/Express) and the **frontend** (static HTML/CSS/JS). Tests are written in Python/pytest for CI pipelines.

---

## Prerequisites
| Tool | Minimum Version | Why |
|------|----------------|-----|
| **Node.js** | 18.x | Runs the Express backend |
| **npm** | 9.x | Package management |
| **Docker** | 24.x | Containerised deployment |
| **Google Cloud credentials** | Service account JSON | Access to Google Cloud TTS API |
| **Git** | any | Source control |

---

## Installation

### Node.js Backend
```bash
# Clone the repository
git clone https://github.com/Skywalkingzulu1/KEJOLE_TTS.git
cd KEJOLE_TTS

# Install Node dependencies
npm install

# Create a .env file (see Configuration section)
cp .env.example .env
```

### Python Dependencies (Testing)
```bash
# (Optional) Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install test requirements
pip install -r requirements.txt
```

### Docker Deployment
A ready‑to‑use Dockerfile is provided.

```bash
# Build the image
docker build -t kejoletts-tts:latest .

# Run the container (replace /path/to/creds.json with your Google credentials)
docker run -d \
  -p 3000:3000 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/creds.json \
  -v /local/path/to/creds.json:/app/creds.json:ro \
  --name kejoletts \
  kejoletts-tts:latest
```

The service will be reachable at `http://localhost:3000`.

---

## Usage

### Web UI
Open a browser and navigate to the server root (e.g., `http://localhost:3000`).  
The UI allows you to:

1. Select a language & voice.
2. Enter text to synthesize.
3. Play or download the generated audio.

### API Endpoints
All endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Description | Request Body (JSON) |
|--------|----------|-------------|---------------------|
| `POST` | `/synthesize` | Generate speech from text | `{ "text": "Hello world", "languageCode": "en-US", "voiceName": "en-US-Wavenet-D" }` |
| `GET`  | `/voices` | List available Google Cloud voices | N/A |
| `GET`  | `/health` | Health check (returns `200 OK`) | N/A |

**Example using `curl`:**
```bash
curl -X POST http://localhost:3000/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello from Kejoletts!","languageCode":"en-US","voiceName":"en-US-Wavenet-D"}' \
  --output output.mp3
```

---

## Configuration
Configuration is handled via environment variables (loaded with `dotenv`). Create a `.env` file at the project root:

```dotenv
# Server
PORT=3000

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./creds.json   # Path inside the container or local dev env

# Rate limiting (requests per minute)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
```

You can also override any of these variables at runtime (e.g., `docker run -e PORT=8080 ...`).

---

## Contributing
We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Write code and tests.
4. Ensure all tests pass: `npm test` (if added) and `pytest`.
5. Submit a Pull Request with a clear description of changes.

**Code style:**  
- JavaScript: Standard ESLint rules (run `npm run lint`).  
- Python: PEP 8 (run `flake8`).

---

## License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.