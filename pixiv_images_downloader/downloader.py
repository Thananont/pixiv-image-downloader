import re
from pathlib import Path

from pixivpy3 import AppPixivAPI

INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WHITESPACE = re.compile(r"\s+")


def sanitize_filename(value: str, max_length: int = 80) -> str:
    cleaned = INVALID_FILENAME_CHARS.sub("", value)
    cleaned = WHITESPACE.sub(" ", cleaned).strip()
    if not cleaned:
        return "untitled"
    return cleaned[:max_length].rstrip(". ")


def extension_from_url(url: str) -> str:
    path = url.split("?", 1)[0]
    suffix = Path(path).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".gif"} else ".jpg"


def get_image_urls(api: AppPixivAPI, artwork_id: int) -> tuple[object, list[str]]:
    detail = api.illust_detail(artwork_id)
    illust = detail.illust

    if illust.page_count <= 1:
        single = illust.meta_single_page or {}
        url = single.get("original_image_url") or illust.image_urls.large
        return illust, [url]

    urls: list[str] = []
    for page in illust.meta_pages or []:
        if isinstance(page, dict):
            image_urls = page.get("image_urls", {})
            url = image_urls.get("original") or image_urls.get("large")
        else:
            url = page.image_urls.original or page.image_urls.large
        if url:
            urls.append(url)

    if not urls:
        raise RuntimeError(f"No image URLs found for artwork {artwork_id}.")

    return illust, urls


def build_artwork_folder(illust: object, artwork_id: int) -> str:
    user_name = sanitize_filename(getattr(illust.user, "name", "unknown"))
    title = sanitize_filename(getattr(illust, "title", "untitled"))
    return f"{user_name}_{artwork_id}_{title}"


def build_filename(page_index: int, url: str) -> str:
    ext = extension_from_url(url)
    return f"p{page_index + 1:02d}{ext}"


def download_artwork(
    api: AppPixivAPI,
    artwork_id: int,
    output_dir: Path,
    *,
    skip_existing: bool = True,
) -> list[Path]:
    illust, urls = get_image_urls(api, artwork_id)
    artwork_dir = output_dir / build_artwork_folder(illust, artwork_id)
    artwork_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []

    for page_index, url in enumerate(urls):
        filename = build_filename(page_index, url)
        destination = artwork_dir / filename

        if skip_existing and destination.exists():
            print(f"  skip existing: {artwork_dir.name}/{destination.name}")
            saved.append(destination)
            continue

        print(f"  downloading: {artwork_dir.name}/{destination.name}")
        api.download(
            url,
            path=str(artwork_dir),
            name=filename,
            referer="https://www.pixiv.net/",
        )

        if not destination.exists():
            raise RuntimeError(f"Download failed for artwork {artwork_id}, page {page_index + 1}")

        saved.append(destination)

    return saved
