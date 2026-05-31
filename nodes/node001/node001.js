// File: nodes/node001/node001.js
// NODE 001 — Atmospheric Monitoring Station
// Frontend telemetry renderer.
// Author: Migus in collaboration with ChatGPT

const NODE001_DATA_BASE = "/data/nodes/node001";
const NODE001_TIME_ZONE = "Europe/Warsaw";

let latestObservationTime = null;

loadNode001Telemetry();
updateLiveClocks();

setInterval(loadNode001Telemetry, 60000);
setInterval(updateLiveClocks, 1000);

async function loadNode001Telemetry() {
  try {
    await loadCurrentTelemetry();
    await loadObservationWindow();
    await loadDailySummary();
    await loadLongTermSummary();
  } catch (error) {
    console.error("NODE 001 telemetry error:", error);
    setText("node-last-update", "DATA LINK ERROR");
  }
}

async function fetchJson(path) {
  const response = await fetch(`${path}?ts=${Date.now()}`);

  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }

  return response.json();
}

async function loadCurrentTelemetry() {
  const data = await fetchJson(`${NODE001_DATA_BASE}/current.json`);

  setText("node-temp", formatValue(data.temperature_c, " °C"));
  setText("node-humidity", formatValue(data.humidity_percent, " %"));
  setText("node-dewpoint", formatValue(data.dewpoint_c, " °C"));
  setText("node-pressure", formatValue(data.pressure_hpa, " hPa"));
  setText("node-wind-speed", formatValue(data.wind_speed_kmh, " km/h"));
  setText("node-wind-gust", formatValue(data.wind_gust_kmh, " km/h"));
  setText("node-wind-dir", formatValue(data.wind_direction_deg, " °"));
  setText("node-rain", formatValue(data.precip_total_mm, " mm"));
  setText("node-uv", formatValue(data.uv_index, ""));

  latestObservationTime = parseTimestamp(data.observed_utc || data.updated_utc);

  updateCondensationRisk(data.condensation_risk);
  updateLiveClocks();
}

async function loadObservationWindow() {
  const summary = await fetchJson(`${NODE001_DATA_BASE}/observation-window.json`);

  setText("window-label", `Last ${summary.window_hours || 12} hours`);
  fillSummaryBlock(summary, "window");
}

async function loadDailySummary() {
  const summary = await fetchJson(`${NODE001_DATA_BASE}/daily-summary.json`);
  fillSummaryBlock(summary, "daily");
}

async function loadLongTermSummary() {
  const summary = await fetchJson(`${NODE001_DATA_BASE}/long-term-summary.json`);

  fillLongTermBlock(summary.month, "month");
  fillLongTermBlock(summary.year, "year");
  fillLongTermBlock(summary.since_launch, "launch");
}

function fillSummaryBlock(summary, prefix) {
  const temperature = summary.temperature || {};
  const wind = summary.wind || {};
  const pressure = summary.pressure || {};
  const uv = summary.uv || {};

  setText(`${prefix}-min-temp`, formatExtreme(temperature.min_c, " °C", temperature.min_time_local));
  setText(`${prefix}-max-temp`, formatExtreme(temperature.max_c, " °C", temperature.max_time_local));
  setText(`${prefix}-delta-temp`, formatValue(temperature.delta_c, " °C"));
  setText(`${prefix}-thermal-drop`, formatValue(temperature.thermal_drop_c, " °C"));
  setText(`${prefix}-max-gust`, formatExtreme(wind.max_gust_kmh, " km/h", wind.max_gust_time_local));

  if (
    pressure.min_hpa !== null &&
    pressure.min_hpa !== undefined &&
    pressure.max_hpa !== null &&
    pressure.max_hpa !== undefined
  ) {
    setText(`${prefix}-pressure`, `${pressure.min_hpa} → ${pressure.max_hpa} hPa`);
  } else {
    setText(`${prefix}-pressure`, "--");
  }

  setText(`${prefix}-pressure-trend`, pressure.trend || "--");
  setText(`${prefix}-max-uv`, formatExtreme(uv.max_index, "", uv.max_time_local));
}

function fillLongTermBlock(summary, prefix) {
  if (!summary) {
    return;
  }

  const temperature = summary.temperature || {};

  setText(`${prefix}-max-temp`, formatExtreme(temperature.max_c, " °C", temperature.max_time_local));
  setText(`${prefix}-min-temp`, formatExtreme(temperature.min_c, " °C", temperature.min_time_local));
  setText(`${prefix}-delta-temp`, formatValue(temperature.delta_c, " °C"));
}

function updateCondensationRisk(riskData) {
  if (!riskData) {
    return;
  }

  setText("condensation-spread", formatValue(riskData.spread_c, " °C"));
  setText("condensation-current", riskData.state || "--");

  ["low", "moderate", "high", "critical"].forEach((level) => {
    const element = document.getElementById(`condensation-risk-${level}`);

    if (element) {
      element.classList.remove("active");
      element.classList.remove("risk-active");
    }
  });

  if (!riskData.state) {
    return;
  }

  const activeElement = document.getElementById(
    `condensation-risk-${riskData.state.toLowerCase()}`
  );

  if (activeElement) {
    activeElement.classList.add("active");
    activeElement.classList.add("risk-active");
  }
}

function updateLiveClocks() {
  const now = new Date();

  setText("node-date-local", formatDateInTimeZone(now, NODE001_TIME_ZONE));
  setText("node-time-local", formatTimeInTimeZone(now, NODE001_TIME_ZONE));
  setText("node-time-utc", formatTimeUTC(now));

  if (!latestObservationTime) {
    setText("node-last-update", "T+n/a");
    return;
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((now.getTime() - latestObservationTime.getTime()) / 1000)
  );

  setText("node-last-update", formatDuration(diffSeconds));
}

function parseTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function formatValue(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  return `${value}${unit}`;
}

function formatExtreme(value, unit, timestampLocal) {
  if (value === null || value === undefined || value === "") {
    return "--";
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

  const parts = timestampLocal.split(" ");

  if (parts.length < 2) {
    return "";
  }

  return parts[1].slice(0, 5);
}

function formatDateInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatTimeInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function formatTimeUTC(date) {
  return `${date.toISOString().slice(11, 19)} UTC`;
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `T+${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `T+${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}