# USB Security Monitor - Backend Service

FastAPI-powered defensive cybersecurity monitoring engine with multi-OS hardware adapters.

## Quick Start by Operating System

### Windows
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements-windows.txt
uvicorn app.main:app --reload --port 8000
```

### Linux
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-linux.txt
uvicorn app.main:app --reload --port 8000
```

### macOS
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-macos.txt
uvicorn app.main:app --reload --port 8000
```

## Running Automated Tests
```bash
python3 tests/run_tests.py
# or with pytest if installed:
pytest tests
```
