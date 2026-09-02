# pixiv-images-downloader

Download Pixiv artwork in batches using a browser queue and a small Python CLI.

## How it works

1. Install the Tampermonkey userscript and browse Pixiv as usual.
2. Click **Add to queue** on artwork you want.
3. Click **Export** in the floating panel (or use the Tampermonkey menu) to save `pixiv-queue.json`.
4. Run the Python CLI to download everything in the queue.

No local server required for this prototype.

## Setup

### 1. Python environment

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Pixiv refresh token

Pixiv no longer supports password login for API access. Generate a refresh token once:

- [get-pixivpy-token (gppt)](https://github.com/eggplants/get-pixivpy-token) — easiest option

Then copy `.env.example` to `.env` and set your token:

```env
PIXIV_REFRESH_TOKEN=your_refresh_token_here
DOWNLOAD_DIR=downloads
```

### 3. Tampermonkey userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Create a new script and paste the contents of `userscript/pixiv-queue.user.js`.
3. Save and enable the script.

## Usage

### Queue artwork in the browser

- Open any artwork page on Pixiv (`/artworks/123456789`).
- Click **Add to queue** (top-right). Click again to remove it.
- The floating panel shows how many items are queued.
- Click **Export** to download `pixiv-queue.json`.

You can also use Tampermonkey's menu: **Export queue.json** or **Clear queue**.

### Download queued artwork

Move or point to the exported file, then run:

```bash
python -m pixiv_images_downloader download --queue path\to\pixiv-queue.json
```

Images are saved to `downloads/` by default (configurable via `DOWNLOAD_DIR` in `.env`).

### Download by ID directly

```bash
python -m pixiv_images_downloader download 123456789 987654321
```

You can combine both:

```bash
python -m pixiv_images_downloader download --queue pixiv-queue.json 111111111
```

### Options

```bash
python -m pixiv_images_downloader download --queue pixiv-queue.json --output D:\Pixiv
python -m pixiv_images_downloader download --queue pixiv-queue.json --force
```

- `--output` — custom download folder
- `--force` — re-download even if the file already exists

## Queue file format

See `queue.example.json`:

```json
{
  "version": 1,
  "items": [
    {
      "id": 123456789,
      "url": "https://www.pixiv.net/artworks/123456789",
      "added_at": "2026-07-23T00:00:00.000Z"
    }
  ]
}
```

## Notes

- Multi-page artworks download every page automatically.
- Existing files are skipped unless you pass `--force`.
- File names look like: `ArtistName_123456789_Title.jpg`
- For personal use only. Respect Pixiv's terms and rate limits.

## Next steps

Possible improvements after this prototype:

- Local server to skip the export step
- Thumbnail picker for artist galleries
- Queue sync without manual file handling
