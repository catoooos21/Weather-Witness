"""Fetch the haze measure (aerosol optical depth, AOD_55) for the demo cities from NASA POWER.

Used by "The air: dust and haze" in the web app. The app fetches the same thing live for any other
city; these copies keep the demo cities working offline. Re-run to refresh.

Facts checked with real requests on 2026-11-14:
  - AOD_55 "Aerosol Optical Depth 55" is dimensionless, source CERES SYN1deg, local solar time
  - it starts on 2001-01-01 (earlier dates are fill values)
  - NASA POWER has no dust-only parameter: DUSMASS, DUCMASS, DUEXTTAU, TOTEXTTAU and PM25 are rejected

Usage: python scripts/fetch_demo_air.py     (standard library only)
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAM = "AOD_55"
FIRST, LAST = 2001, 2025
# Keep in sync with DEMO_CITIES in web/src/power.ts
CITIES = [
    ("kuwait-city", "Kuwait City", 29.3759, 47.9774),
    ("london", "London", 51.5085, -0.1257),
    ("sydney", "Sydney", -33.8679, 151.2073),
    ("delhi", "Delhi", 28.6519, 77.2315),
]
OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "demo"


def fetch(lat: float, lon: float) -> dict:
    q = urllib.parse.urlencode({
        "parameters": PARAM, "community": "AG", "longitude": lon, "latitude": lat,
        "start": f"{FIRST}0101", "end": f"{LAST}1231", "format": "JSON",
    })
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{URL}?{q}", timeout=180) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - retry on any network error
            last_error = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"NASA POWER did not answer: {last_error}")


def compact(j: dict) -> dict:
    fill = j["header"].get("fill_value", -999)
    d0 = date(FIRST, 1, 1)
    n = (date(LAST, 12, 31) - d0).days + 1
    arr: list[float | None] = [None] * n
    for k, v in j["properties"]["parameter"][PARAM].items():
        i = (date(int(k[:4]), int(k[4:6]), int(k[6:8])) - d0).days
        if 0 <= i < n and v is not None and v != fill:
            arr[i] = round(v, 2)
    return {
        "first": FIRST,
        "last": LAST,
        "timeStandard": j["header"].get("time_standard"),
        "sources": j["header"].get("sources"),
        "api": j["header"].get("api", {}).get("version"),
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "values": {PARAM: arr},
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for cid, name, lat, lon in CITIES:
        c = compact(fetch(lat, lon))
        path = OUT / f"{cid}.air.json"
        path.write_text(json.dumps(c, separators=(",", ":")), encoding="utf-8")
        arr = c["values"][PARAM]
        valid = [v for v in arr if v is not None]
        mean = sum(valid) / len(valid) if valid else float("nan")
        print(f"{name}: {path.name} {path.stat().st_size // 1024} KB, time standard {c['timeStandard']}, sources {c['sources']}, "
              f"missing days {len(arr) - len(valid)} of {len(arr)}, mean {mean:.2f}, "
              f"days >= 0.5: {sum(v >= 0.5 for v in valid)}, >= 1.0: {sum(v >= 1.0 for v in valid)}, < 0.1: {sum(v < 0.1 for v in valid)}")
        time.sleep(1)


if __name__ == "__main__":
    main()
