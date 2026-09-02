import argparse
import sys
from pathlib import Path

from pixiv_images_downloader.auth import create_api
from pixiv_images_downloader.config import DOWNLOAD_DIR
from pixiv_images_downloader.downloader import download_artwork
from pixiv_images_downloader.queue import load_queue


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            try:
                reconfigure(encoding="utf-8")
            except Exception:
                pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download Pixiv artwork from IDs or an exported browser queue."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    download_parser = subparsers.add_parser(
        "download",
        help="Download artwork from IDs and/or a queue file.",
    )
    download_parser.add_argument(
        "artwork_ids",
        nargs="*",
        type=int,
        help="Artwork IDs to download directly (without a queue file).",
    )
    download_parser.add_argument(
        "--queue",
        type=Path,
        help="Path to a queue JSON file exported from the userscript.",
    )
    download_parser.add_argument(
        "--output",
        type=Path,
        default=DOWNLOAD_DIR,
        help=f"Download directory (default: {DOWNLOAD_DIR}).",
    )
    download_parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download files even if they already exist.",
    )

    return parser.parse_args()


def collect_artwork_ids(args: argparse.Namespace) -> list[int]:
    ids: list[int] = list(args.artwork_ids)
    seen = set(ids)

    if args.queue:
        for item in load_queue(args.queue):
            if item.artwork_id not in seen:
                seen.add(item.artwork_id)
                ids.append(item.artwork_id)

    if not ids:
        raise SystemExit("Provide artwork IDs and/or --queue path.")

    return ids


def main() -> None:
    configure_stdio()
    args = parse_args()

    if args.command != "download":
        raise SystemExit(f"Unknown command: {args.command}")

    artwork_ids = collect_artwork_ids(args)
    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    api = create_api()
    failures: list[tuple[int, str]] = []

    print(f"Downloading {len(artwork_ids)} artwork(s) to {output_dir.resolve()}")

    for artwork_id in artwork_ids:
        print(f"[{artwork_id}]")
        try:
            download_artwork(
                api,
                artwork_id,
                output_dir,
                skip_existing=not args.force,
            )
        except Exception as exc:  # noqa: BLE001 - report and continue with remaining items
            failures.append((artwork_id, str(exc)))
            print(f"  error: {exc}")

    if failures:
        print("\nFailed downloads:")
        for artwork_id, message in failures:
            print(f"  {artwork_id}: {message}")
        raise SystemExit(1)

    print("\nDone.")


if __name__ == "__main__":
    main()
