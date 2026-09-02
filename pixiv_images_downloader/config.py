from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", "downloads"))
REFRESH_TOKEN = os.getenv("PIXIV_REFRESH_TOKEN", "")
