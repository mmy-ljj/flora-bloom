"""Extract 29 transparent bloom frames from the supplied Seedance studio clip.

The source clip opens over time; the site indexes frame 0 as fully open and
frame 28 as most closed, so the sampling order is reversed here.
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def extract(video: Path, output: Path) -> None:
    capture = cv2.VideoCapture(str(video))
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    if not capture.isOpened() or total < 29:
        raise ValueError("Cannot read enough frames from the supplied video")
    output.mkdir(parents=True, exist_ok=True)
    count = 29
    for index in range(count):
        source_index = round((count - 1 - index) * (total - 1) / (count - 1))
        capture.set(cv2.CAP_PROP_POS_FRAMES, source_index)
        ok, bgr = capture.read()
        if not ok:
            raise ValueError(f"Cannot read source frame {source_index}")
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        h, w = rgb.shape[:2]
        target_h = round(w * 664 / 496)
        top = max(0, (h - target_h) // 2)
        rgb = cv2.resize(rgb[top:top + target_h], (496, 664), interpolation=cv2.INTER_AREA)

        # Pale pink petals have a red excess over the neutral grey backdrop.
        red, green, blue = [rgb[:, :, channel].astype(np.int16) for channel in range(3)]
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        strong = (red - green > 18) & (red - blue > 10) & (hsv[:, :, 1] > 15)
        yy, xx = np.ogrid[:664, :496]
        flower_body = ((xx - 248) / 212) ** 2 + ((yy - 320) / 250) ** 2 < 1
        weak = (red - green > 12) & (red - blue > 7) & (hsv[:, :, 1] > 8) & (
            (hsv[:, :, 2] > 105) | (flower_body & (hsv[:, :, 2] > 45))
        )
        count_regions, regions, stats, _ = cv2.connectedComponentsWithStats(np.uint8(weak), 8)
        matte = np.zeros(weak.shape, np.uint8)
        for region in range(1, count_regions):
            pixels = regions == region
            if stats[region, cv2.CC_STAT_AREA] > 80 and np.count_nonzero(strong & pixels) > 25:
                matte[pixels] = 255
        matte = cv2.morphologyEx(matte, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        alpha = cv2.GaussianBlur(matte, (5, 5), 0.8)
        Image.fromarray(np.dstack((rgb, alpha)), "RGBA").save(
            output / f"flower_{index:02d}.webp", "WEBP", quality=84, method=5
        )
    capture.release()
    print(f"Extracted {count} frames from {total} source frames")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    extract(args.video, args.output)
