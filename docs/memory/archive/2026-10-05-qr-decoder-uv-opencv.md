---
topic: "QR decode verification uses uv plus OpenCV headless"
importance: medium
category: decision
tags: [testing, decoder, uv, opencv]
created: 2026-10-05T16:26:51Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

The independent decoder is a Python tool in a project-local uv environment,
planned on opencv-python-headless, numpy, and Pillow with pinned versions.
pyzbar was rejected because it needs a system libzbar package, which would
modify the host. Environment verified: uv 0.11.33, Python 3.13.5, PyPI reachable.
