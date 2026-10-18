"""Extract the supplied pink-lily wilt clip as display-matched WebP frames."""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    capture = cv2.VideoCapture(str(args.video))
    fps = capture.get(cv2.CAP_PROP_FPS)
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    if fps <= 0 or total <= 0:
        raise ValueError("Could not read source video")
    args.output.mkdir(parents=True, exist_ok=True)
    # The supplied portrait clip is 496x864. Match the 496x664 bloom frames:
    # crop equal blank space above and below, preserving the flower's scale.
    count = 81
    for index in range(count):
        source_index = round(index * (total - 1) / (count - 1))
        capture.set(cv2.CAP_PROP_POS_FRAMES, source_index)
        ok, frame = capture.read()
        if not ok:
            raise ValueError(f"Missing source frame {source_index}")
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = Image.fromarray(rgb)
        width, height = image.size
        top = (height - round(width * 664 / 496)) // 2
        rgb = np.asarray(image.crop((0, top, width, height - top)).resize((496, 664), Image.Resampling.LANCZOS))
        # Seedance's nearly neutral studio backdrop can be removed by seeding
        # GrabCut from the colored petals; white petal centers stay probable FG.
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        chroma = hsv[:, :, 1] > 25
        seed = np.uint8(chroma) * 255
        near = cv2.dilate(seed, np.ones((43, 43), np.uint8)) > 0
        far = cv2.dilate(seed, np.ones((111, 111), np.uint8)) > 0
        mask = np.full(seed.shape, cv2.GC_PR_BGD, dtype=np.uint8)
        mask[near] = cv2.GC_PR_FGD
        mask[~far] = cv2.GC_BGD
        mask[chroma] = cv2.GC_FGD
        mask[:4, :] = mask[-4:, :] = cv2.GC_BGD
        mask[:, :4] = mask[:, -4:] = cv2.GC_BGD
        background = np.zeros((1, 65), np.float64)
        foreground = np.zeros((1, 65), np.float64)
        if np.count_nonzero(chroma) > 30 and np.count_nonzero(mask == cv2.GC_PR_BGD) > 30:
            cv2.grabCut(rgb, mask, None, background, foreground, 3, cv2.GC_INIT_WITH_MASK)
            alpha = np.uint8((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)) * 255
            alpha = cv2.GaussianBlur(alpha, (5, 5), 0.8)
        else:
            alpha = np.zeros(seed.shape, np.uint8)
        image = Image.fromarray(np.dstack((rgb, alpha)), "RGBA")
        image.save(args.output / f"wilt_{index:03d}.webp", "WEBP", quality=80, method=5)
    print(f"Extracted {count} frames over {(total - 1) / fps:.2f}s")


if __name__ == "__main__":
    main()
