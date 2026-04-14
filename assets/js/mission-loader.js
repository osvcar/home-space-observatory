(function () {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const missionFolder = pathParts[pathParts.length - 2];

  if (!missionFolder || !missionFolder.startsWith("mission")) {
    console.error("Mission folder not detected from URL.");
    return;
  }

  const metadataFile = `data/${missionFolder}_metadata.json`;

  fetch(metadataFile)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load metadata: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      fillHero(data);
      fillGallery(data.gallery || []);
      fillCaptureData(data.capture_data || {});
      fillLocation(data.location || {});
      fillEnvironment(data.environment || {});
      fillMissionProcess(data.mission_process || []);
      fillConclusion(data.conclusion || []);
      fillNotes(data.notes);
      fillDownload(data.images || {});
    })
    .catch((error) => {
      console.error("Mission metadata error:", error);
    });

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = normalizeValue(value);
  }

  function normalizeValue(value) {
    if (value === null || value === undefined || value === "") {
      return "n/a";
    }
    return value;
  }

  function formatValue(value, suffix = "") {
    if (value === null || value === undefined || value === "") {
      return "n/a";
    }
    return `${value}${suffix}`;
  }

  function formatFlash(value) {
    if (value === true) return "On";
    if (value === false) return "Off";
    return normalizeValue(value);
  }

  function formatDateTime(value) {
    if (value === null || value === undefined || value === "") {
      return "n/a";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  function fillHero(data) {
    setText("mission-kicker", data.mission_code || `Mission ${data.mission || "n/a"}`);
    setText("mission-title", data.title);
    setText("mission-summary", data.summary);
    setText("phase", data.phase);
    setText("status", data.status);
    setText("target", data.target);
    setText("constellation-field", data.constellation_field);
  }

  function fillGallery(gallery) {
    const container = document.getElementById("mission-gallery");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(gallery) || gallery.length === 0) {
      container.innerHTML = `
        <article class="image-card">
          <h2>No images</h2>
          <p class="caption">n/a</p>
        </article>
      `;
      return;
    }

    gallery.forEach((item) => {
      const article = document.createElement("article");
      article.className = "image-card";

      article.innerHTML = `
        <h2>${escapeHtml(normalizeValue(item.title))}</h2>
        <img
          src="${escapeAttribute(normalizeValue(item.file))}"
          alt="${escapeAttribute(normalizeValue(item.alt))}"
          loading="lazy"
        />
        <p class="caption">${escapeHtml(normalizeValue(item.caption))}</p>
      `;

      container.appendChild(article);
    });
  }

  function fillCaptureData(c) {
    setText("camera", c.camera);
    setText("focal-length", formatValue(c.focal_length_mm, " mm"));
    setText("iso", c.iso);
    setText("exposure", formatValue(c.exposure_s, " s"));
    setText("aperture", c.aperture);
    setText("capture-date", formatDateTime(c.capture_date));
    setText("frames-captured", c.frames_captured);
    setText("capture-mode", c.capture_mode);
    setText("flash", formatFlash(c.flash));
  }

  function fillLocation(location) {
    setText("location-name", location.name);
    setText("location-country", location.country);
    setText("location-latitude", location.latitude);
    setText("location-longitude", location.longitude);
  }

  function fillEnvironment(environment) {
    setText("temperature", environment.temperature_c);
    setText("humidity", environment.humidity_percent);
    setText("wind", environment.wind_kmh);
    setText("sky-condition", environment.sky_condition);
  }

  function fillMissionProcess(lines) {
    fillParagraphBlock("mission-process", lines);
  }

  function fillConclusion(lines) {
    fillParagraphBlock("mission-conclusion", lines);
  }

  function fillNotes(value) {
    setText("mission-notes", value);
  }

  function fillDownload(images) {
    const link = document.getElementById("full-download");
    if (!link) return;

    const href = images.full_resolution_download;

    if (!href || href === "n/a" || href === "in process") {
      link.textContent = normalizeValue(href);
      link.removeAttribute("href");
      return;
    }

    link.href = href;
    link.textContent = "Download full resolution";
  }

  function fillParagraphBlock(containerId, lines) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(lines) || lines.length === 0) {
      const p = document.createElement("p");
      p.textContent = "n/a";
      container.appendChild(p);
      return;
    }

    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = normalizeValue(line);
      container.appendChild(p);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();