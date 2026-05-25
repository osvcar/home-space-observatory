import json
import urllib.request
from pathlib import Path

# NODE 001 — Atmospheric Monitoring Station
# Local test script.
# This script fetches current data from Weather Underground
# and writes it into the public HSO telemetry file.

API_KEY = "7af6222d15dc4201b6222d15dce2010d"
STATION_ID = "IPIOTR18"

OUTPUT_FILE = Path("data/nodes/node001/current.json")

URL = (
    "https://api.weather.com/v2/pws/observations/current"
    f"?stationId={STATION_ID}&format=json&units=m&apiKey={API_KEY}"
)

with urllib.request.urlopen(URL, timeout=20) as response:
    raw_data = json.loads(response.read().decode("utf-8"))

obs = raw_data["observations"][0]
metric = obs["metric"]

current = {
    "node": "NODE 001",
    "name": "Atmospheric Monitoring Station",
    "station_id": obs.get("stationID"),
    "updated_utc": obs.get("obsTimeUtc"),
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

OUTPUT_FILE.write_text(
    json.dumps(current, indent=2),
    encoding="utf-8"
)

print("NODE 001 telemetry updated successfully.")
print(f"Station: {current['station_id']}")
print(f"Observed UTC: {current['observed_utc']}")
print(f"Temperature: {current['temperature_c']} °C")