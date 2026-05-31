import os
import json
import urllib.request
from pathlib import Path
from datetime import datetime, timezone, timedelta

# NODE 001 — Atmospheric Monitoring Station
# Updates current, historical, daily, observation-window and long-term summaries.
# Author: Migus in collaboration with ChatGPT

API_KEY = os.environ["WU_API_KEY"]
STATION_ID = os.environ.get("WU_STATION_ID", "IPIOTR18")

DATA_DIR = Path("data/nodes/node001")

CURRENT_FILE = DATA_DIR / "current.json"
HISTORY_FILE = DATA_DIR / "history.json"
DAILY_SUMMARY_FILE = DATA_DIR / "daily-summary.json"
OBSERVATION_WINDOW_FILE = DATA_DIR / "observation-window.json"
LONG_TERM_FILE = DATA_DIR / "long-term-summary.json"

URL = (
    "https://api.weather.com/v2/pws/observations/current"
    f"?stationId={STATION_ID}&format=json&units=m&apiKey={API_KEY}"
)

LAUNCH_DATE_LOCAL = "2026-05-25"


def read_json(path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def parse_utc(value):
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def valid(records, key):
    return [r for r in records if r.get(key) is not None]


def min_record(records, key):
    rows = valid(records, key)
    return min(rows, key=lambda r: r[key]) if rows else None


def max_record(records, key):
    rows = valid(records, key)
    return max(rows, key=lambda r: r[key]) if rows else None


def first_record(records):
    return records[0] if records else None


def last_record(records):
    return records[-1] if records else None


def pressure_trend(records):
    first = first_record(records)
    last = last_record(records)

    if not first or not last:
        return "INSUFFICIENT DATA"

    p1 = first.get("pressure_hpa")
    p2 = last.get("pressure_hpa")

    if p1 is None or p2 is None:
        return "INSUFFICIENT DATA"

    diff = round(p2 - p1, 2)

    if diff > 1:
        return "RISING"
    if diff < -1:
        return "FALLING"
    return "STABLE"


def condensation_risk(temp_c, dewpoint_c):
    if temp_c is None or dewpoint_c is None:
        return {
            "spread_c": None,
            "state": "UNKNOWN",
            "states": ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        }

    spread = round(temp_c - dewpoint_c, 1)

    if spread > 4:
        state = "LOW"
    elif spread > 2:
        state = "MODERATE"
    elif spread >= 1:
        state = "HIGH"
    else:
        state = "CRITICAL"

    return {
        "spread_c": spread,
        "state": state,
        "states": ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    }


def summary_from_records(records, label):
    temp_min = min_record(records, "temperature_c")
    temp_max = max_record(records, "temperature_c")
    gust_max = max_record(records, "wind_gust_kmh")
    uv_max = max_record(records, "uv_index")
    pressure_min = min_record(records, "pressure_hpa")
    pressure_max = max_record(records, "pressure_hpa")
    last = last_record(records)

    thermal_drop = None
    if temp_max and last:
        thermal_drop = round(temp_max["temperature_c"] - last["temperature_c"], 1)

    return {
        "label": label,
        "records": len(records),

        "temperature": {
            "min_c": temp_min.get("temperature_c") if temp_min else None,
            "min_time_local": temp_min.get("observed_local") if temp_min else None,
            "max_c": temp_max.get("temperature_c") if temp_max else None,
            "max_time_local": temp_max.get("observed_local") if temp_max else None,
            "delta_c": (
                round(temp_max["temperature_c"] - temp_min["temperature_c"], 1)
                if temp_min and temp_max else None
            ),
            "thermal_drop_c": thermal_drop
        },

        "wind": {
            "max_gust_kmh": gust_max.get("wind_gust_kmh") if gust_max else None,
            "max_gust_time_local": gust_max.get("observed_local") if gust_max else None
        },

        "pressure": {
            "min_hpa": pressure_min.get("pressure_hpa") if pressure_min else None,
            "min_time_local": pressure_min.get("observed_local") if pressure_min else None,
            "max_hpa": pressure_max.get("pressure_hpa") if pressure_max else None,
            "max_time_local": pressure_max.get("observed_local") if pressure_max else None,
            "trend": pressure_trend(records)
        },

        "uv": {
            "max_index": uv_max.get("uv_index") if uv_max else None,
            "max_time_local": uv_max.get("observed_local") if uv_max else None
        }
    }


DATA_DIR.mkdir(parents=True, exist_ok=True)

with urllib.request.urlopen(URL, timeout=20) as response:
    raw_data = json.loads(response.read().decode("utf-8"))

obs = raw_data["observations"][0]
metric = obs["metric"]

observed_local = obs.get("obsTimeLocal")
node_date_local = observed_local.split(" ")[0] if observed_local else None
node_time_local = observed_local.split(" ")[1] if observed_local and " " in observed_local else None

current = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "station_id": obs.get("stationID"),

    "updated_utc": datetime.now(timezone.utc).isoformat(),
    "observed_utc": obs.get("obsTimeUtc"),
    "observed_local": observed_local,
    "node_date_local": node_date_local,
    "node_time_local": node_time_local,

    "temperature_c": metric.get("temp"),
    "heat_index_c": metric.get("heatIndex"),
    "humidity_percent": obs.get("humidity"),
    "dewpoint_c": metric.get("dewpt"),
    "pressure_hpa": metric.get("pressure"),

    "wind_speed_kmh": metric.get("windSpeed"),
    "wind_gust_kmh": metric.get("windGust"),
    "wind_direction_deg": obs.get("winddir"),

    "precip_rate_mm": metric.get("precipRate"),
    "precip_total_mm": metric.get("precipTotal"),

    "uv_index": obs.get("uv"),
    "solar_radiation_wm2": obs.get("solarRadiation"),
    "qc_status": obs.get("qcStatus")
}

current["condensation_risk"] = condensation_risk(
    current["temperature_c"],
    current["dewpoint_c"]
)

write_json(CURRENT_FILE, current)

history = read_json(HISTORY_FILE, [])

last_observed = history[-1].get("observed_utc") if history else None

if current["observed_utc"] != last_observed:
    history.append(current)

# Guarda histórico suficiente para mês/ano e totais.
# 96 leituras/dia * 400 dias = 38400 registos.
history = history[-38400:]

write_json(HISTORY_FILE, history)

today_records = [
    r for r in history
    if r.get("observed_local", "").startswith(node_date_local)
]

daily_summary = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "date_local": node_date_local,
    "updated_utc": datetime.now(timezone.utc).isoformat(),
    **summary_from_records(today_records, "CALENDAR_DAY")
}

write_json(DAILY_SUMMARY_FILE, daily_summary)

current_time = parse_utc(current.get("observed_utc"))
window_start = current_time - timedelta(hours=12) if current_time else None

window_records = []
if window_start:
    for r in history:
        t = parse_utc(r.get("observed_utc"))
        if t and t >= window_start:
            window_records.append(r)

observation_window = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "window": "LAST_12_HOURS",
    "window_hours": 12,
    "updated_utc": datetime.now(timezone.utc).isoformat(),
    "start_utc": window_start.isoformat() if window_start else None,
    "end_utc": current.get("observed_utc"),
    "condensation": current["condensation_risk"],
    **summary_from_records(window_records, "OBSERVATION_WINDOW")
}

write_json(OBSERVATION_WINDOW_FILE, observation_window)

month_prefix = node_date_local[:7] if node_date_local else ""
year_prefix = node_date_local[:4] if node_date_local else ""

month_records = [
    r for r in history
    if r.get("observed_local", "").startswith(month_prefix)
]

year_records = [
    r for r in history
    if r.get("observed_local", "").startswith(year_prefix)
]

launch_records = [
    r for r in history
    if r.get("node_date_local", "") >= LAUNCH_DATE_LOCAL
]

long_term = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "launch_date_local": LAUNCH_DATE_LOCAL,
    "updated_utc": datetime.now(timezone.utc).isoformat(),
    "month": summary_from_records(month_records, "CURRENT_MONTH"),
    "year": summary_from_records(year_records, "CURRENT_YEAR"),
    "since_launch": summary_from_records(launch_records, "SINCE_LAUNCH")
}

write_json(LONG_TERM_FILE, long_term)

print("NODE 001 telemetry updated successfully.")
print(f"Station: {current['station_id']}")
print(f"Observed local: {current['observed_local']}")
print(f"Observed UTC: {current['observed_utc']}")
print(f"Temperature: {current['temperature_c']} °C")
print(f"Condensation risk: {current['condensation_risk']['state']}")
print(f"History records: {len(history)}")
print(f"Observation window records: {len(window_records)}")
print(f"Month records: {len(month_records)}")
print(f"Year records: {len(year_records)}")
print(f"Since launch records: {len(launch_records)}")