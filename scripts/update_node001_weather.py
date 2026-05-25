import os
import json
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

# NODE 001 — Atmospheric Monitoring Station
# Fetches current Weather Underground data and updates:
# - current.json
# - history.json
# - daily-summary.json

API_KEY = os.environ["WU_API_KEY"]
STATION_ID = os.environ.get("WU_STATION_ID", "IPIOTR18")

DATA_DIR = Path("data/nodes/node001")
CURRENT_FILE = DATA_DIR / "current.json"
HISTORY_FILE = DATA_DIR / "history.json"
SUMMARY_FILE = DATA_DIR / "daily-summary.json"

URL = (
    "https://api.weather.com/v2/pws/observations/current"
    f"?stationId={STATION_ID}&format=json&units=m&apiKey={API_KEY}"
)

DATA_DIR.mkdir(parents=True, exist_ok=True)

with urllib.request.urlopen(URL, timeout=20) as response:
    raw_data = json.loads(response.read().decode("utf-8"))

obs = raw_data["observations"][0]
metric = obs["metric"]

current = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "station_id": obs.get("stationID"),
    "updated_utc": datetime.now(timezone.utc).isoformat(),
    "observed_utc": obs.get("obsTimeUtc"),
    "observed_local": obs.get("obsTimeLocal"),

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

CURRENT_FILE.write_text(
    json.dumps(current, indent=2),
    encoding="utf-8"
)

if HISTORY_FILE.exists():
    history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
else:
    history = []

# Evita duplicar a mesma observação se correres o script várias vezes no mesmo minuto.
last_observed = history[-1].get("observed_utc") if history else None

if current["observed_utc"] != last_observed:
    history.append(current)

# Mantém até 30 dias se corrermos de 15 em 15 minutos:
# 96 leituras/dia * 30 dias = 2880 registos.
history = history[-2880:]

HISTORY_FILE.write_text(
    json.dumps(history, indent=2),
    encoding="utf-8"
)

# Resumo diário baseado no dia local da estação.
today_local = current["observed_local"].split(" ")[0]

today_records = [
    record for record in history
    if record.get("observed_local", "").startswith(today_local)
]

def valid_records(key):
    return [
        record for record in today_records
        if record.get(key) is not None
    ]

def min_record(key):
    records = valid_records(key)
    return min(records, key=lambda record: record[key]) if records else None

def max_record(key):
    records = valid_records(key)
    return max(records, key=lambda record: record[key]) if records else None

temp_min = min_record("temperature_c")
temp_max = max_record("temperature_c")
gust_max = max_record("wind_gust_kmh")
uv_max = max_record("uv_index")
pressure_min = min_record("pressure_hpa")
pressure_max = max_record("pressure_hpa")

summary = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "date_local": today_local,
    "updated_utc": datetime.now(timezone.utc).isoformat(),

    "temperature": {
        "min_c": temp_min.get("temperature_c") if temp_min else None,
        "min_time_local": temp_min.get("observed_local") if temp_min else None,
        "max_c": temp_max.get("temperature_c") if temp_max else None,
        "max_time_local": temp_max.get("observed_local") if temp_max else None,
        "delta_c": (
            round(temp_max["temperature_c"] - temp_min["temperature_c"], 1)
            if temp_min and temp_max else None
        )
    },

    "wind": {
        "max_gust_kmh": gust_max.get("wind_gust_kmh") if gust_max else None,
        "max_gust_time_local": gust_max.get("observed_local") if gust_max else None
    },

    "pressure": {
        "min_hpa": pressure_min.get("pressure_hpa") if pressure_min else None,
        "min_time_local": pressure_min.get("observed_local") if pressure_min else None,
        "max_hpa": pressure_max.get("pressure_hpa") if pressure_max else None,
        "max_time_local": pressure_max.get("observed_local") if pressure_max else None
    },

    "uv": {
        "max_index": uv_max.get("uv_index") if uv_max else None,
        "max_time_local": uv_max.get("observed_local") if uv_max else None
    }
}

SUMMARY_FILE.write_text(
    json.dumps(summary, indent=2),
    encoding="utf-8"
)

print("NODE 001 telemetry updated successfully.")
print(f"Station: {current['station_id']}")
print(f"Observed local: {current['observed_local']}")
print(f"Temperature: {current['temperature_c']} °C")
print(f"History records: {len(history)}")