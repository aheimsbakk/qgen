"""Decode a PNG QR image with OpenCV and print the result as JSON.

Usage:
    uv run --project tools/decoder python tools/decoder/decode_png.py <image.png>

Output is a single JSON object on stdout:
    {"ok": true, "text": "<decoded payload>"}
    {"ok": false, "text": null, "error": "<plain reason>"}

Exit code 0 when a result was produced, 2 when the file could not be read.
"""

import json
import sys

import cv2


def decode_image(path):
    """Return the decoded text, or None when no QR code was found."""
    image = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError(f"Could not read the image at {path}")

    detector = cv2.QRCodeDetector()
    text = detector.detectAndDecode(image)[0]
    if text:
        return text

    # Small versions can sit just below the detector's minimum module size.
    # A nearest-neighbour upscale keeps module edges sharp.
    enlarged = cv2.resize(image, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
    return detector.detectAndDecode(enlarged)[0]


def main(argv):
    if len(argv) != 2:
        print(
            json.dumps({"ok": False, "text": None, "error": "Expected one image path."})
        )
        return 2

    try:
        text = decode_image(argv[1])
    except ValueError as error:
        print(json.dumps({"ok": False, "text": None, "error": str(error)}))
        return 2

    if text:
        print(json.dumps({"ok": True, "text": text}))
        return 0

    print(
        json.dumps(
            {"ok": False, "text": None, "error": "No QR code found in the image."}
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
