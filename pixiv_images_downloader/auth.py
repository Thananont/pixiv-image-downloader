from pixivpy3 import AppPixivAPI

from pixiv_images_downloader.config import REFRESH_TOKEN


def create_api() -> AppPixivAPI:
    if not REFRESH_TOKEN:
        raise SystemExit(
            "Missing PIXIV_REFRESH_TOKEN. Copy .env.example to .env and add your token."
        )

    api = AppPixivAPI()
    api.auth(refresh_token=REFRESH_TOKEN)
    return api
