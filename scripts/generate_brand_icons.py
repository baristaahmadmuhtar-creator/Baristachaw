from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\Alpha\Downloads\IMG_7014.PNG")
WEB_ICONS = ROOT / "apps" / "web" / "public" / "icons"
WEB_PUBLIC = ROOT / "apps" / "web" / "public"
MOBILE_ASSETS = ROOT / "apps" / "mobile" / "assets"
ASSET_VERSION = "20260423b"

WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def remove_outer_white(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    mask = Image.new("L", (width, height), 0)
    mask_pixels = mask.load()
    queue: deque[tuple[int, int]] = deque()
    step = max(1, min(width, height) // 600)

    def is_outer_background(pixel: tuple[int, int, int, int]) -> bool:
        red, green, blue, alpha = pixel
        return alpha == 0 or (
            red >= 244
            and green >= 244
            and blue >= 244
            and max(red, green, blue) - min(red, green, blue) <= 18
        )

    for x in range(0, width, step):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(0, height, step):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or mask_pixels[x, y]:
            continue
        if not is_outer_background(pixels[x, y]):
            continue
        mask_pixels[x, y] = 255
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    alpha = Image.eval(mask.filter(ImageFilter.GaussianBlur(1.2)), lambda value: 255 - value)
    image.putalpha(alpha)
    bbox = image.getbbox()
    if not bbox:
        raise ValueError("No visible logo found in source image")
    return image.crop(bbox)


def fit_logo(logo: Image.Image, size: int, padding: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)
    item = logo.copy()
    max_side = int(size * (1 - padding * 2))
    item.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas.alpha_composite(item, ((size - item.width) // 2, (size - item.height) // 2))
    return canvas


def original_icon(logo: Image.Image, size: int, padding: float = 0.12) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), WHITE)
    canvas.alpha_composite(fit_logo(logo, size, padding))
    return canvas


def transparent_icon(logo: Image.Image, size: int, padding: float = 0.12) -> Image.Image:
    return fit_logo(logo, size, padding)


def monochrome_icon(logo: Image.Image, size: int, padding: float = 0.18) -> Image.Image:
    alpha = fit_logo(logo, size, padding).getchannel("A")
    return Image.merge(
        "RGBA",
        (
            Image.new("L", (size, size), 255),
            Image.new("L", (size, size), 255),
            Image.new("L", (size, size), 255),
            alpha,
        ),
    )


def google_mark(size: int = 128) -> Image.Image:
    image = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    pad = int(size * 0.18)
    box = [pad, pad, size - pad, size - pad]
    width = max(5, int(size * 0.13))
    draw.arc(box, 300, 360, fill=(66, 133, 244, 255), width=width)
    draw.arc(box, 0, 45, fill=(66, 133, 244, 255), width=width)
    draw.arc(box, 45, 145, fill=(52, 168, 83, 255), width=width)
    draw.arc(box, 145, 215, fill=(251, 188, 5, 255), width=width)
    draw.arc(box, 215, 300, fill=(234, 67, 53, 255), width=width)
    draw.line([size * 0.52, size // 2, size * 0.82, size // 2], fill=(66, 133, 244, 255), width=width)
    draw.line([size * 0.82, size // 2, size * 0.82, size * 0.38], fill=(66, 133, 244, 255), width=width)
    return image


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def save_ico(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


def svg_wrapper(image_path: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none" '
        'role="img" aria-label="Baristachaw app icon">\n'
        f'  <image href="{image_path}?v={ASSET_VERSION}" width="1024" height="1024" preserveAspectRatio="xMidYMid meet" />\n'
        "</svg>\n"
    )


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source image not found: {SOURCE}")

    logo = remove_outer_white(Image.open(SOURCE))

    web_outputs = {
        "pwa-source-blue-cup.png": original_icon(logo, 1024),
        "icon-1024.png": original_icon(logo, 1024),
        "icon-512.png": original_icon(logo, 512),
        "icon-512-maskable.png": original_icon(logo, 512, 0.18),
        "icon-192.png": original_icon(logo, 192),
        "icon-192-maskable.png": original_icon(logo, 192, 0.18),
        "apple-touch-icon.png": original_icon(logo, 180),
        "favicon-32x32.png": original_icon(logo, 32, 0.10),
        "favicon-16x16.png": original_icon(logo, 16, 0.08),
        "brand-mark-transparent.png": transparent_icon(logo, 1024),
    }
    for name, image in web_outputs.items():
        save_png(image, WEB_ICONS / name)

    save_ico(original_icon(logo, 256, 0.10), WEB_PUBLIC / "favicon.ico")
    (WEB_PUBLIC / "favicon.svg").write_text(svg_wrapper("/icons/icon-1024.png"), encoding="utf-8")
    (WEB_ICONS / "icon-192.svg").write_text(svg_wrapper("/icons/icon-192.png"), encoding="utf-8")
    (WEB_ICONS / "icon-512.svg").write_text(svg_wrapper("/icons/icon-512.png"), encoding="utf-8")
    (WEB_ICONS / "icon-master.svg").write_text(svg_wrapper("/icons/icon-1024.png"), encoding="utf-8")

    mobile_outputs = {
        "icon.png": original_icon(logo, 1024),
        "favicon.png": original_icon(logo, 512),
        "splash-icon.png": transparent_icon(logo, 1024, 0.16),
        "android-icon-background.png": Image.new("RGBA", (1024, 1024), WHITE),
        "android-icon-foreground.png": transparent_icon(logo, 1024, 0.18),
        "android-icon-monochrome.png": monochrome_icon(logo, 1024),
        "google-g.png": google_mark(),
    }
    for name, image in mobile_outputs.items():
        save_png(image, MOBILE_ASSETS / name)

    print(f"Generated Baristachaw assets from {SOURCE}")


if __name__ == "__main__":
    main()
