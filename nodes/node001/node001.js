// NODE 001 — Atmospheric Monitoring Station
// Frontend telemetry renderer
// Author: Migus in collaboration with ChatGPT

const NODE001_DATA_BASE = "/data/nodes/node001";

// ======================================================================
// INITIAL LOAD
// ======================================================================

loadNode001Telemetry();

setInterval(
  loadNode001Telemetry,
  60000
);

// ======================================================================
// MAIN LOADER
// ======================================================================

async function loadNode001Telemetry() {

  try {

    await loadCurrentTelemetry();
    await loadObservationWindow();
    await loadDailySummary();
    await loadLongTermSummary();

  } catch (error) {

    console.error(
      "NODE 001 telemetry error:",
      error
    );

    setText(
      "node-last-update",
      "DATA LINK ERROR"
    );
  }
}

// ======================================================================
// CURRENT TELEMETRY
// ======================================================================

async function loadCurrentTelemetry() {

  const response = await fetch(
    `${NODE001_DATA_BASE}/current.json`
  );

  if (!response.ok) {

    throw new Error(
      "Could not load current telemetry."
    );
  }

  const data = await response.json();

  // ------------------------------------------------------------------
  // LIVE DATA
  // ------------------------------------------------------------------

  setText(
    "node-temp",
    formatValue(data.temperature_c, " °C")
  );

  setText(
    "node-humidity",
    formatValue(data.humidity_percent, " %")
  );

  setText(
    "node-dewpoint",
    formatValue(data.dewpoint_c, " °C")
  );

  setText(
    "node-pressure",
    formatValue(data.pressure_hpa, " hPa")
  );

  setText(
    "node-wind-speed",
    formatValue(data.wind_speed_kmh, " km/h")
  );

  setText(
    "node-wind-gust",
    formatValue(data.wind_gust_kmh, " km/h")
  );

  setText(
    "node-wind-dir",
    formatValue(data.wind_direction_deg, " °")
  );

  setText(
    "node-rain",
    formatValue(data.precip_total_mm, " mm")
  );

  setText(
    "node-uv",
    formatValue(data.uv_index, "")
  );

  // ------------------------------------------------------------------
  // DATE / TIME
  // ------------------------------------------------------------------

  setText(
    "node-date-local",
    formatLocalDate(data.observed_local)
  );

  setText(
    "node-time-local",
    formatLocalTimeOnly(data.observed_local)
  );

  setText(
    "node-time-utc",
    formatUTCTime(data.observed_utc)
  );

  setText(
    "node-last-update",
    formatLastUpdate(
      data.observed_utc || data.updated_utc
    )
  );

  // ------------------------------------------------------------------
  // CONDENSATION RISK
  // ------------------------------------------------------------------

  updateCondensationRisk(
    data.condensation_risk
  );
}

// ======================================================================
// OBSERVATION WINDOW
// ======================================================================

async function loadObservationWindow() {

  const response = await fetch(
    `${NODE001_DATA_BASE}/observation-window.json`
  );

  if (!response.ok) {

    throw new Error(
      "Could not load observation window."
    );
  }

  const summary = await response.json();

  setText(
    "window-label",
    `Last ${summary.window_hours} hours`
  );

  fillSummaryBlock(
    summary,
    "window"
  );
}

// ======================================================================
// DAILY SUMMARY
// ======================================================================

async function loadDailySummary() {

  const response = await fetch(
    `${NODE001_DATA_BASE}/daily-summary.json`
  );

  if (!response.ok) {

    throw new Error(
      "Could not load daily summary."
    );
  }

  const summary = await response.json();

  fillSummaryBlock(
    summary,
    "daily"
  );
}

// ======================================================================
// LONG TERM SUMMARY
// ======================================================================

async function loadLongTermSummary() {

  const response = await fetch(
    `${NODE001_DATA_BASE}/long-term-summary.json`
  );

  if (!response.ok) {

    throw new Error(
      "Could not load long-term summary."
    );
  }

  const summary = await response.json();

  fillLongTermBlock(
    summary.month,
    "month"
  );

  fillLongTermBlock(
    summary.year,
    "year"
  );

  fillLongTermBlock(
    summary.since_launch,
    "launch"
  );
}

// ======================================================================
// GENERIC SUMMARY BLOCK
// ======================================================================

function fillSummaryBlock(
  summary,
  prefix
) {

  const temperature =
    summary.temperature || {};

  const wind =
    summary.wind || {};

  const pressure =
    summary.pressure || {};

  const uv =
    summary.uv || {};

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

    setText(
      `${prefix}-pressure`,
      "--"
    );
  }

  setText(
    `${prefix}-pressure-trend`,
    pressure.trend || "--"
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

// ======================================================================
// LONG TERM BLOCK
// ======================================================================

function fillLongTermBlock(
  summary,
  prefix
) {

  const temperature =
    summary.temperature || {};

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

// ======================================================================
// CONDENSATION RISK
// ======================================================================

function updateCondensationRisk(
  riskData
) {

  if (!riskData) {
    return;
  }

  setText(
    "condensation-spread",
    formatValue(
      riskData.spread_c,
      " °C"
    )
  );

  setText(
    "condensation-current",
    riskData.state || "--"
  );

  const ids = [
    "low",
    "moderate",
    "high",
    "critical"
  ];

  ids.forEach(level => {

    const element =
      document.getElementById(
        `condensation-risk-${level}`
      );

    if (element) {
      element.classList.remove(
        "risk-active"
      );
    }
  });

  const activeId =
    `condensation-risk-${riskData.state.toLowerCase()}`;

  const activeElement =
    document.getElementById(activeId);

  if (activeElement) {

    activeElement.classList.add(
      "risk-active"
    );
  }
}

// ======================================================================
// GENERIC HELPERS
// ======================================================================

function setText(
  elementId,
  value
) {

  const element =
    document.getElementById(elementId);

  if (element) {

    element.textContent =
      value;
  }
}

function formatValue(
  value,
  unit
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  return `${value}${unit}`;
}

function formatExtreme(
  value,
  unit,
  timestampLocal
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  const time =
    formatLocalTimeOnly(
      timestampLocal
    );

  if (!time) {

    return `${value}${unit}`;
  }

  return `${value}${unit} at ${time}`;
}

function formatLocalDate(
  timestampLocal
) {

  if (!timestampLocal) {
    return "--";
  }

  const parts =
    timestampLocal.split(" ");

  return parts[0] || "--";
}

function formatLocalTimeOnly(
  timestampLocal
) {

  if (!timestampLocal) {
    return "";
  }

  const parts =
    timestampLocal.split(" ");

  if (parts.length < 2) {
    return "";
  }

  return parts[1].slice(0, 5);
}

function formatUTCTime(
  timestampUTC
) {

  if (!timestampUTC) {
    return "--";
  }

  const date =
    new Date(timestampUTC);

  return (
    date
      .toUTCString()
      .slice(17, 22) + " UTC"
  );
}

function formatLastUpdate(
  timestamp
) {

  if (!timestamp) {
    return "T+n/a";
  }

  const observedTime =
    new Date(timestamp);

  const now =
    new Date();

  const diffMs =
    now - observedTime;

  const diffSeconds =
    Math.max(
      0,
      Math.floor(diffMs / 1000)
    );

  const minutes =
    Math.floor(diffSeconds / 60);

  const seconds =
    diffSeconds % 60;

  return (
    `T+${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
}