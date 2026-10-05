"""Render a symbol dump to a PNG image.

Usage:
    uv run --project tools/decoder python tools/decoder/matrix_to_png.py <dump.json> <out.png> [scale]

The dump is JSON produced by the test helper: {"rows": ["#.#...", ...]}.
The quiet zone is already part of the rows, so it is not added here.
"""

import json
import sys

import cv2
import numpy as np


def rows_to_image(rows, scale):
    height = len(rows)
    width = len(rows[0])
    # OpenCV reads light modules as 255 and dark modules as 0.
    image = np.full((height * scale, width * scale), 255, dtype=np.uint8)
    for y, row in enumerate(rows):
        for x, cell in enumerate(row):
            if cell == "#":
                image[y * scale : (y + 1) * scale, x * scale : (x + 1) * scale] = 0
    return image


def main(argv):
    if len(argv) not in (3, 4):
        print(
            json.dumps(
                {"ok": False, "error": "Expected <dump.json> <out.png> [scale]."}
            )
        )
        return 2

    dump_path, out_path = argv[1], argv[2]
    scale = int(argv[3]) if len(argv) == 4 else 8

    with open(dump_path, encoding="utf-8") as handle:
        dump = json.load(handle)

    rows = dump.get("rows") or []
    if not rows or any(len(row) != len(rows[0]) for row in rows):
        print(json.dumps({"ok": False, "error": "Symbol rows are empty or uneven."}))
        return 2

    if not cv2.imwrite(out_path, rows_to_image(rows, scale)):
        print(json.dumps({"ok": False, "error": f"Could not write {out_path}."}))
        return 2

    print(
        json.dumps({"ok": True, "path": out_path, "modules": len(rows), "scale": scale})
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
