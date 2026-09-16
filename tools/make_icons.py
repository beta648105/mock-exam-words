"""모고학습앱 아이콘 생성기.

컨셉: 인디고 그라데이션 배경 위에 겹쳐진 단어 카드, 앞면에 "모고".
색상이나 글자를 바꾸고 다시 실행하면 icons/ 안의 PNG 가 전부 갱신된다.

    pip install pillow
    python tools/make_icons.py
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")

M = 1024                       # 마스터 해상도
LABEL = "모고"

# 굵은 한글 폰트. 환경에 맞게 첫 번째로 존재하는 것을 쓴다.
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\malgunbd.ttf",                                  # Windows
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",                      # macOS
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",             # Linux
]

BG_CORNERS = [(123, 107, 255), (90, 73, 240),      # 좌상, 우상
              (74, 58, 224),  (47, 36, 168)]        # 좌하, 우하
INK = (58, 45, 180)            # 카드 위 글자색
ACCENT = (124, 108, 246, 255)  # 밑줄 악센트


def pick_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit("굵은 한글 폰트를 찾지 못했습니다. FONT_CANDIDATES 에 경로를 추가하세요.")


def gradient(size):
    """2x2 픽셀을 확대해 매끄러운 대각 그라데이션을 만든다."""
    small = Image.new("RGB", (2, 2))
    small.putdata(BG_CORNERS)
    return small.resize((size, size), Image.BICUBIC)


def compose(font_path, scale=1.0):
    """scale: 1.0 = 꽉 참, 0.78 = 마스커블 안전영역 안쪽"""
    img = gradient(M).convert("RGBA")
    layer = Image.new("RGBA", (M, M), (0, 0, 0, 0))

    cx, cy = M / 2, M / 2
    cw, ch = 620 * scale, 440 * scale
    r = 54 * scale

    # 뒤쪽 카드 (반투명, 기울임)
    back = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    ImageDraw.Draw(back).rounded_rectangle(
        [cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2],
        radius=r, fill=(255, 255, 255, 105))
    layer.alpha_composite(back.rotate(9, resample=Image.BICUBIC, center=(cx, cy)))

    # 앞쪽 카드 그림자
    shadow = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [cx - cw / 2, cy - ch / 2 + 26 * scale, cx + cw / 2, cy + ch / 2 + 26 * scale],
        radius=r, fill=(20, 12, 70, 120))
    layer.alpha_composite(shadow.rotate(-4, resample=Image.BICUBIC, center=(cx, cy))
                          .filter(ImageFilter.GaussianBlur(16 * scale)))

    # 앞쪽 카드 + 글자
    front = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    fd = ImageDraw.Draw(front)
    fd.rounded_rectangle([cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2],
                         radius=r, fill=(255, 255, 255, 255))

    font = ImageFont.truetype(font_path, int(206 * scale))
    tb = fd.textbbox((0, 0), LABEL, font=font)
    fd.text((cx - (tb[2] + tb[0]) / 2, cy - (tb[3] + tb[1]) / 2 - 40 * scale),
            LABEL, font=font, fill=INK)

    # 카드 하단 밑줄 악센트
    uw = 172 * scale
    fd.rounded_rectangle([cx - uw / 2, cy + ch / 2 - 88 * scale,
                          cx + uw / 2, cy + ch / 2 - 68 * scale],
                         radius=10 * scale, fill=ACCENT)

    layer.alpha_composite(front.rotate(-4, resample=Image.BICUBIC, center=(cx, cy)))
    img.alpha_composite(layer)
    return img.convert("RGB")


def main():
    os.makedirs(OUT, exist_ok=True)
    font_path = pick_font()

    full = compose(font_path, 1.0)
    maskable = compose(font_path, 0.78)

    targets = [
        ("apple-touch-icon.png", 180, full),   # iOS 홈 화면 (iOS 가 알아서 둥글게 깎음)
        ("icon-192.png", 192, full),
        ("icon-512.png", 512, full),
        ("icon-maskable-512.png", 512, maskable),
        ("favicon-32.png", 32, full),
        ("favicon-180.png", 180, full),
    ]

    for name, size, src in targets:
        path = os.path.join(OUT, name)
        src.resize((size, size), Image.LANCZOS).save(path, "PNG", optimize=True)
        print("%-26s %dx%d  %6d bytes" % (name, size, size, os.path.getsize(path)))


if __name__ == "__main__":
    main()
