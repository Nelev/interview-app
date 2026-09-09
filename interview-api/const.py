from pathlib import Path

OPENAI_BASE_URL = "https://openrouter.ai/api/v1"

# const.py lives at the interview-api root, so its parent is the project root.
# Anchoring on __file__ keeps log paths correct whatever the current directory is.
PROJECT_ROOT = Path(__file__).resolve().parent
LOGS_DIR = PROJECT_ROOT / "logs"
