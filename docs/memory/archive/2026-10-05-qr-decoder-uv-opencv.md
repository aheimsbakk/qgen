---
topic: "QR decode verification uses uv plus OpenCV headless"
importance: medium
category: decision
tags: [testing, decoder, uv, opencv]
created: 2026-10-05T18:12:31Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

Built and verified: `tests/tools/decoder/` holds `decode_png.py` and
`matrix_to_png.py`, with `pyproject.toml` pinning
`opencv-python-headless==4.11.0.86`. Pillow was dropped as unnecessary; numpy
arrives through OpenCV and is locked in `uv.lock`. Run from `tests/` with
`uv sync --project tools/decoder`, then
`uv run --project tools/decoder tools/decoder/decode_png.py <png-path>`. pyzbar
stays rejected because it needs a system libzbar package.
