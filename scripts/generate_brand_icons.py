from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\Alpha\Downloads\IMG_6214.PNG")
WEB_ICONS = ROOT / "apps" / "web" / "public" / "icons"
WEB_PUBLIC = ROOT / "apps" / "web" / "public"
MOBILE_ASSETS = ROOT / "apps" / "mobile" / "assets"
ASSET_VERSION = "20260316a"


def resize_square(image: Image.Image, size: int) -> Image.Image:
    if image.mode != "RGBA":
      image = image.convert("RGBA")
    return image.resize((size, size), Image.Resampling.LANCZOS)


def transparent_blank(size: int) -> Image.Image:
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))


def monochrome_from_source(image: Image.Image, size: int) -> Image.Image:
    base = resize_square(image, size)
    gray = ImageOps.grayscale(base)
    alpha = base.getchannel("A") if "A" in base.getbands() else Image.new("L", (size, size), 255)
    mono = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    mono.putalpha(alpha)
    mono_rgb = Image.merge("RGBA", (gray, gray, gray, alpha))
    return mono_rgb


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def save_ico(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def svg_wrapper(image_path: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none" '
        'role="img" aria-label="BaristaClaw app icon">\n'
        f'  <image href="{image_path}" width="1024" height="1024" preserveAspectRatio="xMidYMid meet" />\n'
        '</svg>\n'
    )


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source image not found: {SOURCE}")

    source = Image.open(SOURCE).convert("RGBA")

    web_outputs = {
        "pwa-source-blue-cup.png": resize_square(source, 1024),
        "icon-1024.png": resize_square(source, 1024),
        "icon-512.png": resize_square(source, 512),
        "icon-512-maskable.png": resize_square(source, 512),
        "icon-192.png": resize_square(source, 192),
        "icon-192-maskable.png": resize_square(source, 192),
        "apple-touch-icon.png": resize_square(source, 180),
        "favicon-32x32.png": resize_square(source, 32),
        "favicon-16x16.png": resize_square(source, 16),
        "brand-mark-transparent.png": resize_square(source, 1024),
    }

    for name, image in web_outputs.items():
        save(image, WEB_ICONS / name)

    save_ico(resize_square(source, 64), WEB_PUBLIC / "favicon.ico")
    write_text(WEB_PUBLIC / "favicon.svg", svg_wrapper(f"/icons/icon-1024.png?v={ASSET_VERSION}"))
    write_text(WEB_ICONS / "icon-192.svg", svg_wrapper(f"/icons/icon-192.png?v={ASSET_VERSION}"))
    write_text(WEB_ICONS / "icon-512.svg", svg_wrapper(f"/icons/icon-512.png?v={ASSET_VERSION}"))
    write_text(WEB_ICONS / "icon-master.svg", svg_wrapper(f"/icons/icon-1024.png?v={ASSET_VERSION}"))

    mobile_outputs = {
        "icon.png": resize_square(source, 1024),
        "favicon.png": resize_square(source, 512),
        "splash-icon.png": resize_square(source, 1024),
        "android-icon-background.png": resize_square(source, 1024),
        "android-icon-foreground.png": transparent_blank(1024),
        "android-icon-monochrome.png": monochrome_from_source(source, 1024),
    }

    for name, image in mobile_outputs.items():
        save(image, MOBILE_ASSETS / name)

    print(f"Generated brand assets from {SOURCE}")


if __name__ == "__main__":
    main()
