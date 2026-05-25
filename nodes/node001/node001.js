// NODE 001 — Atmospheric Monitoring Station
// Reads public telemetry JSON files and updates the node page.
// Author: Migus in collaboration with ChatGPT

async function loadNode001Telemetry() {
  try {
    await loadCurrentTelemetry();
    await loadDailySummary();
  } catch (error) {
    console.error("NODE 001 telemetry error:", error);

    const lastUpdateElement = document.getElementById("node-last-update");

    if (lastUpdateElement) {
      lastUpdateElement.textContent = "DATA LINK ERROR";
    }
  }
}

async function loadCurrentTelemetry() {
  const response = await fetch("../../data/nodes/node001/current.json");

  if (!response.ok) {
    throw new Error("Could not load NODE 001 current telemetry file.");
  }

  const data = await response.json();

  setText("node-temp", formatValue(data.temperature_c, " °C"));
  setText("node-humidity", formatValue(data.humidity_percent, " %"));
  setText("node-dewpoint", formatValue(data.dewpoint_c, " °C"));
  setText("node-pressure", formatValue(data.pressure_hpa, " hPa"));

  setText("node-wind-speed", formatValue(data.wind_speed_kmh, " km/h"));
  setText("node-wind-gust", formatValue(data.wind_gust_kmh, " km/h"));
  setText("node-wind-dir", formatValue(data.wind_direction_deg, " °"));

  setText("node-rain", formatValue(data.precip_total_mm, " mm"));
  setText("node-uv", formatValue(data.uv_index, ""));

  setText(
    "node-last-update",
    formatLastUpdate(data.observed_utc || data.updated_utc)
  );
}

async function loadDailySummary() {
  const response = await fetch("../../data/nodes/node001/daily-summary.json");

  if (!response.ok) {
    throw new Error("Could not load NODE 001 daily summary file.");
  }

  const summary = await response.json();

  const temperature = summary.temperature || {};
  const wind = summary.wind || {};
  const pressure = summary.pressure || {};
  const uv = summary.uv || {};

  setText(
    "summary-min-temp",
    formatExtreme(
      temperature.min_c,
      " °C",
      temperature.min_time_local
    )
  );

  setText(
    "summary-max-temp",
    formatExtreme(
      temperature.max_c,
      " °C",
      temperature.max_time_local
    )
  );

  setText(
    "summary-delta-temp",
    formatValue(temperature.delta_c, " °C")
  );

  setText(
    "summary-max-gust",
    formatExtreme(
      wind.max_gust_kmh,
      " km/h",
      wind.max_gust_time_local
    )
  );

  if (pressure.min_hpa !== null && pressure.min_hpa !== undefined &&
      pressure.max_hpa !== null && pressure.max_hpa !== undefined) {
    setText(
      "summary-pressure",
      `${pressure.min_hpa} → ${pressure.max_hpa} hPa`
    );
  } else {
    setText("summary-pressure", "n/a");
  }

  setText(
    "summary-max-uv",
    formatExtreme(
      uv.max_index,
      "",
      uv.max_time_local
    )
  );
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function formatValue(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  return `${value}${unit}`;
}

function formatExtreme(value, unit, timestampLocal) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  const time = formatLocalTimeOnly(timestampLocal);

  if (!time) {
    return `${value}${unit}`;
  }

  return `${value}${unit} at ${time}`;
}

function formatLocalTimeOnly(timestampLocal) {
  if (!timestampLocal) {
    return "";
  }

  // Expected format from Weather Underground:
  // "2026-05-25 19:40:18"
  const parts = timestampLocal.split(" ");

  if (parts.length < 2) {
    return "";
  }

  return parts[1].slice(0, 5);
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