import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class QueueItem:
    artwork_id: int
    url: str | None = None


def load_queue(path: Path) -> list[QueueItem]:
    if not path.exists():
        raise SystemExit(f"Queue file not found: {path}")

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid queue file {path}: {exc}") from exc

    raw_items = data.get("items", data if isinstance(data, list) else None)
    if not isinstance(raw_items, list):
        raise SystemExit(f"Queue file {path} must contain an 'items' array.")

    items: list[QueueItem] = []
    seen: set[int] = set()

    for entry in raw_items:
        if isinstance(entry, int):
            artwork_id = entry
            url = None
        elif isinstance(entry, dict):
            artwork_id = entry.get("id") or entry.get("artwork_id")
            url = entry.get("url")
        else:
            continue

        if artwork_id is None:
            continue

        artwork_id = int(artwork_id)
        if artwork_id in seen:
            continue

        seen.add(artwork_id)
        items.append(QueueItem(artwork_id=artwork_id, url=url))

    if not items:
        raise SystemExit(f"No artwork IDs found in {path}.")

    return items
