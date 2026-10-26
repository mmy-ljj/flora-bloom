"""Extract the closing half of the supplied fifth-flower video as 29 transparent WebP frames.

Requires OpenCV, NumPy and Pillow. Frame 00 is open; frame 28 is closed.
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def extract(video: Path, output: Path) -> None:
    capture = cv2.VideoCapture(str(video))
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    if not capture.isOpened() or total < 59:
        raise ValueError("Cannot read the supplied opening-and-closing video")
    output.mkdir(parents=True, exist_ok=True)

    for index in range(29):
        source_index = round(index * 58 / 28)
        capture.set(cv2.CAP_PROP_POS_FRAMES, source_index)
        ok, frame = capture.read()
        if not ok:
            raise ValueError(f"Cannot read source frame {source_index}")
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)[190:670, :, :]
        red, green, blue = [rgb[:, :, c].astype(np.int16) for c in range(3)]
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        sure = (red - green > 20) & (red - blue > 10) & (hsv[:, :, 1] > 12)
        ys, xs = np.where(sure)
        if len(xs) < 150:
            raise ValueError(f"Could not locate flower in frame {source_index}")
        x0, x1 = max(0, int(xs.min()) - 28), min(480, int(xs.max()) + 29)
        y0, y1 = max(0, int(ys.min()) - 28), min(480, int(ys.max()) + 29)

        mask = np.full((480, 480), cv2.GC_BGD, np.uint8)
        mask[y0:y1, x0:x1] = cv2.GC_PR_BGD
        near = cv2.dilate(np.uint8(sure) * 255, np.ones((55, 55), np.uint8)) > 0
        mask[near] = cv2.GC_PR_FGD
        mask[sure] = cv2.GC_FGD
        background = np.zeros((1, 65), np.float64)
        foreground = np.zeros((1, 65), np.float64)
        cv2.grabCut(rgb, mask, None, background, foreground, 3, cv2.GC_INIT_WITH_MASK)
        alpha = np.uint8((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)) * 255
        alpha = cv2.GaussianBlur(alpha, (5, 5), 0.8)
        Image.fromarray(np.dstack((rgb, alpha)), "RGBA").save(
            output / f"flower_{index:02d}.webp", "WEBP", quality=84, method=5
        )
    capture.release()
    print("Extracted 29 closing frames; frame 00 open, frame 28 closed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    extract(arguments.video, arguments.output)
