// NODE 001 — Atmospheric Monitoring Station
// Reads public telemetry JSON and updates the node page.
// Author: Migus in collaboration with ChatGPT

async function loadNode001Telemetry() {
  try {
    const response = await fetch("../../data/nodes/node001/current.json");

    if (!response.ok) {
      throw new Error("Could not load NODE 001 telemetry file.");
    }

    const data = await response.json();

    document.getElementById("node-temp").textContent =
      formatValue(data.temperature_c, " °C");

    document.getElementById("node-humidity").textContent =
      formatValue(data.humidity_percent, " %");

    document.getElementById("node-dewpoint").textContent =
      formatValue(data.dewpoint_c, " °C");

    document.getElementById("node-pressure").textContent =
      formatValue(data.pressure_hpa, " hPa");

    document.getElementById("node-wind-speed").textContent =
      formatValue(data.wind_speed_kmh, " km/h");

    document.getElementById("node-wind-gust").textContent =
      formatValue(data.wind_gust_kmh, " km/h");

    document.getElementById("node-wind-dir").textContent =
      formatValue(data.wind_direction_deg, " °");

    document.getElementById("node-rain").textContent =
      formatValue(data.precip_total_mm, " mm");

    document.getElementById("node-uv").textContent =
      formatValue(data.uv_index, "");

    document.getElementById("node-last-update").textContent =
      formatLastUpdate(data.observed_utc || data.updated_utc);

  } catch (error) {
    console.error("NODE 001 telemetry error:", error);

    document.getElementById("node-last-update").textContent =
      "DATA LINK ERROR";
  }
}

function formatValue(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  return `${value}${unit}`;
}

function formatLastUpdate(timestamp) {
  if (!timestamp) {
    return "T+n/a";
  }

  const observedTime = new Date(timestamp);
  const now = new Date();

  const diffMs = now - observedTime;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  return `T+${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

loadNode001Telemetry();

setInterval(loadNode001Telemetry, 60000);