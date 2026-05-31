// NODE 001 — Atmospheric Monitoring Station
// Reads public telemetry JSON files and updates the node page.
// Author: Migus in collaboration with ChatGPT

async function loadNode001Telemetry() {
  try {
    await loadCurrentTelemetry();
    await loadObservationSummary();
    await loadCalendarSummary();

  } catch (error) {

    console.error("NODE 001 telemetry error:", error);

    const lastUpdateElement =
      document.getElementById("node-last-update");

    if (lastUpdateElement) {
      lastUpdateElement.textContent = "DATA LINK ERROR";
    }
  }
}

async function loadCurrentTelemetry() {

  const response =
    await fetch("../../data/nodes/node001/current.json");

  if (!response.ok) {
    throw new Error(
      "Could not load NODE 001 current telemetry file."
    );
  }

  const data = await response.json();

  // ------------------------------------------------------------------
  // LIVE TELEMETRY
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
    data.temperature_c,
    data.dewpoint_c
  );
}

async function loadObservationSummary() {

  const response =
    await fetch("../../data/nodes/node001/history.json");

  if (!response.ok) {
    throw new Error(
      "Could not load NODE 001 observation history."
    );
  }

  const history = await response.json();

  const now = new Date();

  const last12h = history.filter((entry) => {

    const entryDate =
      new Date(entry.observed_utc);

    return (
      (now - entryDate) <= 12 * 60 * 60 * 1000
    );
  });

  if (last12h.length === 0) {
    return;
  }

  // ------------------------------------------------------------------
  // TEMPERATURE
  // ------------------------------------------------------------------

  const temps =
    last12h.map(e => e.temperature_c);

  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  const minEntry =
    last12h.find(e => e.temperature_c === minTemp);

  const maxEntry =
    last12h.find(e => e.temperature_c === maxTemp);

  setText(
    "obs-min-temp",
    formatExtreme(
      minTemp,
      " °C",
      minEntry.observed_local
    )
  );

  setText(
    "obs-max-temp",
    formatExtreme(
      maxTemp,
      " °C",
      maxEntry.observed_local
    )
  );

  setText(
    "obs-temp-drop",
    formatValue(
      (maxTemp - minTemp).toFixed(1),
      " °C"
    )
  );

  // ------------------------------------------------------------------
  // WIND
  // ------------------------------------------------------------------

  const gusts =
    last12h.map(e => e.wind_gust_kmh || 0);

  const maxGust = Math.max(...gusts);

  const gustEntry =
    last12h.find(
      e => (e.wind_gust_kmh || 0) === maxGust
    );

  setText(
    "obs-max-gust",
    formatExtreme(
      maxGust,
      " km/h",
      gustEntry.observed_local
    )
  );

  // ------------------------------------------------------------------
  // PRESSURE
  // ------------------------------------------------------------------

  const pressures =
    last12h.map(e => e.pressure_hpa);

  const minPressure =
    Math.min(...pressures);

  const maxPressure =
    Math.max(...pressures);

  setText(
    "obs-pressure-range",
    `${minPressure} → ${maxPressure} hPa`
  );

  const pressureTrend =
    pressures[pressures.length - 1] -
    pressures[0];

  let trendText = "Stable";

  if (pressureTrend > 1) {
    trendText = "Rising";
  }

  if (pressureTrend < -1) {
    trendText = "Falling";
  }

  setText(
    "obs-pressure-trend",
    trendText
  );
}

async function loadCalendarSummary() {

  const response =
    await fetch("../../data/nodes/node001/daily-summary.json");

  if (!response.ok) {
    throw new Error(
      "Could not load NODE 001 daily summary file."
    );
  }

  const summary =
    await response.json();

  const temperature =
    summary.temperature || {};

  const wind =
    summary.wind || {};

  const pressure =
    summary.pressure || {};

  const uv =
    summary.uv || {};

  // ------------------------------------------------------------------
  // DAILY THERMAL RANGE
  // ------------------------------------------------------------------

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
    formatValue(
      temperature.delta_c,
      " °C"
    )
  );

  // ------------------------------------------------------------------
  // DAILY WIND
  // ------------------------------------------------------------------

  setText(
    "summary-max-gust",
    formatExtreme(
      wind.max_gust_kmh,
      " km/h",
      wind.max_gust_time_local
    )
  );

  // ------------------------------------------------------------------
  // DAILY PRESSURE
  // ------------------------------------------------------------------

  if (
    pressure.min_hpa !== null &&
    pressure.max_hpa !== null
  ) {

    setText(
      "summary-pressure",
      `${pressure.min_hpa} → ${pressure.max_hpa} hPa`
    );

  } else {

    setText(
      "summary-pressure",
      "n/a"
    );
  }

  // ------------------------------------------------------------------
  // DAILY UV
  // ------------------------------------------------------------------

  setText(
    "summary-max-uv",
    formatExtreme(
      uv.max_index,
      "",
      uv.max_time_local
    )
  );
}

// ======================================================================
// CONDENSATION RISK
// ======================================================================

function updateCondensationRisk(
  temperature,
  dewpoint
) {

  if (
    temperature === null ||
    dewpoint === null
  ) {
    return;
  }

  const spread =
    temperature - dewpoint;

  setText(
    "condensation-spread",
    `${spread.toFixed(1)} °C`
  );

  let risk = "LOW";

  if (spread <= 6) {
    risk = "MODERATE";
  }

  if (spread <= 3) {
    risk = "HIGH";
  }

  if (spread <= 1) {
    risk = "CRITICAL";
  }

  setText(
    "condensation-state",
    risk
  );

  document
    .querySelectorAll(".risk-level")
    .forEach(el => {
      el.classList.remove("risk-active");
    });

  const active =
    document.getElementById(
      `risk-${risk.toLowerCase()}`
    );

  if (active) {
    active.classList.add("risk-active");
  }
}

// ======================================================================
// GENERIC HELPERS
// ======================================================================

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
    formatLocalTimeOnly(timestampLocal);

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

// ======================================================================
// INITIAL LOAD
// ======================================================================

loadNode001Telemetry();

setInterval(
  loadNode001Telemetry,
  60000
);