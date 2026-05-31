// NODE 001 — Atmospheric Monitoring Station
// Observatory telemetry frontend.
// Author: Migus in collaboration with ChatGPT

const NODE001_DATA_BASE = "/data/nodes/node001";

let latestObservationTime = null;

async function loadNode001Telemetry() {

  try {

    await loadCurrentTelemetry();
    await loadDailySummary();
    await loadObservationWindow();
    await loadLongTermSummary();

  } catch (error) {

    console.error("NODE 001 telemetry error:", error);

    const lastUpdateElement =
      document.getElementById("node-last-update");

    if (lastUpdateElement) {
      lastUpdateElement.textContent = "DATA LINK ERROR";
    }
  }
}

async function fetchJson(path) {

  const response =
    await fetch(`${path}?ts=${Date.now()}`);

  if (!response.ok) {
    throw new Error(`Could not load: ${path}`);
  }

  return response.json();
}

async function loadCurrentTelemetry() {

  const data =
    await fetchJson(`${NODE001_DATA_BASE}/current.json`);

  setText("node-temp",
    formatValue(data.temperature_c, " °C"));

  setText("node-humidity",
    formatValue(data.humidity_percent, " %"));

  setText("node-dewpoint",
    formatValue(data.dewpoint_c, " °C"));

  setText("node-pressure",
    formatValue(data.pressure_hpa, " hPa"));

  setText("node-wind-speed",
    formatValue(data.wind_speed_kmh, " km/h"));

  setText("node-wind-gust",
    formatValue(data.wind_gust_kmh, " km/h"));

  setText("node-wind-dir",
    formatValue(data.wind_direction_deg, " °"));

  setText("node-rain",
    formatValue(data.precip_total_mm, " mm"));

  setText("node-uv",
    formatValue(data.uv_index, ""));

  setText("node-date-local",
    formatDateOnly(data.node_date_local));

  setText("node-time-local",
    formatTimeOnly(data.node_time_local));

  setText("node-time-utc",
    formatUtcTimeOnly(data.observed_utc));

  latestObservationTime =
    parseTimestamp(data.observed_utc || data.updated_utc);

  updateLiveDataAge();

  if (data.condensation_risk) {
    updateCondensationRisk(data.condensation_risk);
  }
}

async function loadDailySummary() {

  const summary =
    await fetchJson(`${NODE001_DATA_BASE}/daily-summary.json`);

  fillSummaryBlock(
    "daily",
    summary
  );
}

async function loadObservationWindow() {

  const summary =
    await fetchJson(`${NODE001_DATA_BASE}/observation-window.json`);

  fillSummaryBlock(
    "window",
    summary
  );

  setText("window-label", "Last 12 hours");

  if (summary.condensation) {
    updateCondensationRisk(summary.condensation);
  }
}

async function loadLongTermSummary() {

  const summary =
    await fetchJson(`${NODE001_DATA_BASE}/long-term-summary.json`);

  fillLongTermBlock("month", summary.month);
  fillLongTermBlock("year", summary.year);
  fillLongTermBlock("launch", summary.since_launch);
}

function fillSummaryBlock(prefix, summary) {

  const temperature = summary.temperature || {};
  const wind = summary.wind || {};
  const pressure = summary.pressure || {};
  const uv = summary.uv || {};

  setText(
    `${prefix}-min-temp`,
    formatExtreme(
      temperature.min_c,
      " °C",
      temperature.min_time_local
    )
  );

  setText(
    `${prefix}-max-temp`,
    formatExtreme(
      temperature.max_c,
      " °C",
      temperature.max_time_local
    )
  );

  setText(
    `${prefix}-delta-temp`,
    formatValue(
      temperature.delta_c,
      " °C"
    )
  );

  setText(
    `${prefix}-thermal-drop`,
    formatValue(
      temperature.thermal_drop_c,
      " °C"
    )
  );

  setText(
    `${prefix}-max-gust`,
    formatExtreme(
      wind.max_gust_kmh,
      " km/h",
      wind.max_gust_time_local
    )
  );

  if (
    pressure.min_hpa !== null &&
    pressure.max_hpa !== null &&
    pressure.min_hpa !== undefined &&
    pressure.max_hpa !== undefined
  ) {

    setText(
      `${prefix}-pressure`,
      `${pressure.min_hpa} → ${pressure.max_hpa} hPa`
    );

  } else {

    setText(`${prefix}-pressure`, "n/a");
  }

  setText(
    `${prefix}-pressure-trend`,
    pressure.trend || "n/a"
  );

  setText(
    `${prefix}-max-uv`,
    formatExtreme(
      uv.max_index,
      "",
      uv.max_time_local
    )
  );
}

function fillLongTermBlock(prefix, summary) {

  if (!summary) {
    return;
  }

  const temperature = summary.temperature || {};

  setText(
    `${prefix}-max-temp`,
    formatExtreme(
      temperature.max_c,
      " °C",
      temperature.max_time_local
    )
  );

  setText(
    `${prefix}-min-temp`,
    formatExtreme(
      temperature.min_c,
      " °C",
      temperature.min_time_local
    )
  );

  setText(
    `${prefix}-delta-temp`,
    formatValue(
      temperature.delta_c,
      " °C"
    )
  );
}

function updateCondensationRisk(risk) {

  setText(
    "condensation-spread",
    formatValue(risk.spread_c, " °C")
  );

  setText(
    "condensation-current",
    risk.state || "UNKNOWN"
  );

  const states = [
    "LOW",
    "MODERATE",
    "HIGH",
    "CRITICAL"
  ];

  states.forEach((state) => {

    const element =
      document.getElementById(
        `condensation-risk-${state.toLowerCase()}`
      );

    if (!element) {
      return;
    }

    element.classList.remove("active");

    if (risk.state === state) {
      element.classList.add("active");
    }
  });
}

function updateLiveDataAge() {

  if (!latestObservationTime) {

    setText("node-last-update", "T+n/a");
    return;
  }

  const now = new Date();

  const diffMs =
    now.getTime() - latestObservationTime.getTime();

  const diffSeconds =
    Math.max(0, Math.floor(diffMs / 1000));

  setText(
    "node-last-update",
    formatDuration(diffSeconds)
  );
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

  const element =
    document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function formatValue(value, unit) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "n/a";
  }

  return `${value}${unit}`;
}

function formatExtreme(value, unit, timestampLocal) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "n/a";
  }

  const time =
    formatLocalTimeOnly(timestampLocal);

  if (!time) {
    return `${value}${unit}`;
  }

  return `${value}${unit} at ${time}`;
}

function formatDateOnly(dateText) {

  if (!dateText) {
    return "n/a";
  }

  return dateText;
}

function formatTimeOnly(timeText) {

  if (!timeText) {
    return "n/a";
  }

  return timeText.slice(0, 5);
}

function formatUtcTimeOnly(timestampUtc) {

  if (!timestampUtc) {
    return "n/a";
  }

  const date = new Date(timestampUtc);

  if (Number.isNaN(date.getTime())) {
    return "n/a";
  }

  return date.toISOString().slice(11, 16);
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

function formatDuration(totalSeconds) {

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor((totalSeconds % 3600) / 60);

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {

    return `T+${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `T+${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

loadNode001Telemetry();

setInterval(loadNode001Telemetry, 60000);
setInterval(updateLiveDataAge, 1000);