"""Track an orange fish from a local camera or RTSP feed and send normalized coordinates.

This is a calibration-ready baseline, not a claim that an arbitrary tank or fish is
already recognized. Use --preview and tune the ROI/HSV thresholds on Vlad's camera.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request

import cv2
import numpy as np


def triplet(value: str) -> tuple[int, int, int]:
    parts = tuple(int(part.strip()) for part in value.split(","))
    if len(parts) != 3 or any(part < 0 or part > 255 for part in parts):
        raise argparse.ArgumentTypeError("Use three comma-separated 0–255 values")
    return parts


def rectangle(value: str) -> tuple[float, float, float, float]:
    parts = tuple(float(part.strip()) for part in value.split(","))
    if len(parts) != 4 or any(part < 0 or part > 1 for part in parts):
        raise argparse.ArgumentTypeError("Use x,y,width,height, each from 0 to 1")
    if parts[0] + parts[2] > 1 or parts[1] + parts[3] > 1 or not parts[2] or not parts[3]:
        raise argparse.ArgumentTypeError("ROI must fit inside the frame")
    return parts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=os.getenv("TRACKER_SOURCE", "0"), help="Webcam index, RTSP URL, or video file")
    parser.add_argument("--api-url", default=os.getenv("VLAD_API_URL", "http://127.0.0.1:8787"))
    parser.add_argument("--token", default=os.getenv("INGEST_TOKEN", ""))
    parser.add_argument("--roi", type=rectangle, default=(0.0, 0.0, 1.0, 1.0), help="Tank crop: x,y,width,height normalized")
    parser.add_argument("--hsv-lower", type=triplet, default=(0, 80, 55))
    parser.add_argument("--hsv-upper", type=triplet, default=(25, 255, 255))
    parser.add_argument("--min-area", type=float, default=0.0003, help="Minimum contour area as fraction of crop")
    parser.add_argument("--max-area", type=float, default=0.12, help="Maximum contour area as fraction of crop")
    parser.add_argument("--fps", type=float, default=5.0, help="Observation posts per second")
    parser.add_argument("--mirror", action="store_true", help="Mirror the camera before tracking")
    parser.add_argument("--preview", action="store_true", help="Show local tracking and zone overlay; press Q to quit")
    parser.add_argument("--dry-run", action="store_true", help="Track locally without sending observations")
    return parser


def detect(frame: np.ndarray, lower: tuple[int, int, int], upper: tuple[int, int, int],
           min_area: float, max_area: float, previous: tuple[float, float] | None):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array(lower, np.uint8), np.array(upper, np.uint8))
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = frame.shape[:2]
    area = height * width
    choices = []
    for contour in contours:
        size = cv2.contourArea(contour)
        if not min_area * area <= size <= max_area * area:
            continue
        moments = cv2.moments(contour)
        if not moments["m00"]:
            continue
        x = moments["m10"] / moments["m00"] / width
        y = moments["m01"] / moments["m00"] / height
        distance = ((x - previous[0]) ** 2 + (y - previous[1]) ** 2) ** 0.5 if previous else 0.0
        score = min(1.0, size / (area * 0.015)) * 0.55 + max(0.0, 1 - distance * 2.0) * 0.45
        choices.append((score, x, y, contour, size))
    if not choices:
        return None, mask
    score, x, y, contour, size = max(choices, key=lambda item: item[0])
    confidence = min(0.99, max(0.56, 0.57 + score * 0.4))
    return (x, y, confidence, contour, size), mask


def post_observation(api_url: str, token: str, x: float, y: float, confidence: float) -> None:
    payload = json.dumps({"x": x, "y": y, "confidence": confidence,
                          "observedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}).encode()
    request = urllib.request.Request(
        api_url.rstrip("/") + "/api/ingest/observation", data=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=2) as response:
        if response.status != 200:
            raise RuntimeError(f"Ingest HTTP {response.status}")


def overlay(frame: np.ndarray, point, roi: tuple[float, float, float, float], status: str) -> np.ndarray:
    output = frame.copy()
    height, width = output.shape[:2]
    left, top, roi_width, roi_height = roi
    x1, y1 = int(left * width), int(top * height)
    x2, y2 = int((left + roi_width) * width), int((top + roi_height) * height)
    cv2.rectangle(output, (x1, y1), (x2, y2), (85, 220, 185), 2)
    for fraction in (1 / 3, 2 / 3):
        x = x1 + int((x2 - x1) * fraction)
        cv2.line(output, (x, y1), (x, y1 + int((y2 - y1) * .72)), (95, 145, 130), 1)
    split = y1 + int((y2 - y1) * .72)
    cv2.line(output, (x1, split), (x2, split), (95, 145, 130), 1)
    cv2.line(output, (x1 + (x2 - x1) // 2, split), (x1 + (x2 - x1) // 2, y2), (95, 145, 130), 1)
    cv2.line(output, (x1, y1 + int((y2 - y1) * .36)), (x2, y1 + int((y2 - y1) * .36)), (95, 145, 130), 1)
    labels = [("DOGE", .04, .10), ("SHIB", .37, .10), ("PEPE", .70, .10),
              ("BONK", .04, .46), ("WIF", .37, .46), ("TRUMP", .70, .46),
              ("BUY", .14, .87), ("SELL", .64, .87)]
    for label, x, y in labels:
        cv2.putText(output, label, (x1 + int((x2 - x1) * x), y1 + int((y2 - y1) * y)),
                    cv2.FONT_HERSHEY_SIMPLEX, .55, (220, 245, 233), 2)
    if point:
        px = x1 + int((x2 - x1) * point[0])
        py = y1 + int((y2 - y1) * point[1])
        cv2.circle(output, (px, py), 12, (45, 220, 255), 2)
    cv2.putText(output, status, (20, height - 20), cv2.FONT_HERSHEY_SIMPLEX, .6, (255, 255, 255), 2)
    return output


def main() -> int:
    args = build_parser().parse_args()
    if not args.dry_run and not args.token:
        raise SystemExit("Set INGEST_TOKEN or pass --token; use --dry-run to calibrate locally.")
    source = int(args.source) if args.source.isdigit() else args.source
    capture = cv2.VideoCapture(source)
    if not capture.isOpened():
        raise SystemExit(f"Could not open camera source: {args.source}")
    previous = None
    last_post = 0.0
    last_error = 0.0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                time.sleep(.2)
                continue
            if args.mirror:
                frame = cv2.flip(frame, 1)
            height, width = frame.shape[:2]
            left, top, crop_width, crop_height = args.roi
            crop = frame[int(top * height):int((top + crop_height) * height),
                         int(left * width):int((left + crop_width) * width)]
            result, _ = detect(crop, args.hsv_lower, args.hsv_upper, args.min_area, args.max_area, previous)
            point = (result[0], result[1]) if result else None
            if point:
                previous = point
            now = time.monotonic()
            status = "Vlad detected" if result else "No fish detected"
            if not args.dry_run and now - last_post >= 1 / max(args.fps, .5):
                last_post = now
                try:
                    post_observation(args.api_url, args.token, result[0] if result else .5,
                                     result[1] if result else .5, result[2] if result else 0.0)
                except (urllib.error.URLError, RuntimeError) as error:
                    if now - last_error > 5:
                        print(f"Ingest unavailable: {error}")
                        last_error = now
            if args.preview:
                cv2.imshow("Vlad tracker calibration", overlay(frame, point, args.roi, status))
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        capture.release()
        if args.preview:
            cv2.destroyAllWindows()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
