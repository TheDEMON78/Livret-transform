/**
 * Papeterie: configurable ruled/gridded/dotted paper generator.
 * Renders an SVG page (1 SVG user unit = 1mm) so on-screen preview,
 * SVG export and @page-sized printing all stay physically accurate.
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const PAGE_SIZES = {
    A4: [210, 297],
    A5: [148, 210],
    Letter: [215.9, 279.4],
  };

  const RULING_TYPES = [
    {
      id: "lignes",
      label: "Lignes simples",
      icon: iconLines,
      defaults: {
        interligne: 8,
        lineColor: "#2b2620",
        thickness: 0.3,
        groupSize: 999,
        groupGap: 10,
        separatrice: { enabled: false, style: "tirets", color: "#9aa0a6" },
      },
      render: renderLignes,
    },
    {
      id: "seyes",
      label: "Séyès",
      icon: iconSeyes,
      defaults: seyesDefaults(),
      render: (root, t, area) => renderSeyes(root, t, area, t.gridEnabled),
    },
    {
      id: "seyesGrille",
      label: "Séyès quadrillé",
      icon: iconSeyesGrid,
      defaults: seyesDefaults(),
      render: (root, t, area) => renderSeyes(root, t, area, true),
    },
    {
      id: "serpodile",
      label: "Serpodile (Terre-Herbe-Ciel)",
      icon: iconSerpodile,
      defaults: {
        interligne: 6,
        cielColor: "#cfe8fa",
        herbeColor: "#dcf3dc",
        terreColor: "#f1e3d3",
        ligneColor: "#2e7d32",
        margeEnabled: true,
        margeColor: "#e53935",
        margeOffset: 20,
      },
      render: renderSerpodile,
    },
    {
      id: "quadrillage",
      label: "Quadrillage",
      icon: iconGrid,
      defaults: { interligne: 5, lineColor: "#2b2620", thickness: 0.25 },
      render: (root, t, area) => renderGrid(root, t, area, false),
    },
    {
      id: "quadrillageColore",
      label: "Quadrillage coloré",
      icon: iconGridColor,
      defaults: { interligne: 5, lineColor: "#c7cdd6", accentColor: "#3d6fd9", thickness: 0.2 },
      render: (root, t, area) => renderGrid(root, t, area, true),
    },
    {
      id: "croisillons",
      label: "Croisillons",
      icon: iconCross,
      defaults: { interligne: 6, lineColor: "#8a94a6", thickness: 0.2 },
      render: renderCrosshatch,
    },
    {
      id: "points",
      label: "Points",
      icon: iconDots,
      defaults: { interligne: 6, lineColor: "#2b2620", dotRadius: 0.4 },
      render: renderDots,
    },
  ];

  function seyesDefaults() {
    return {
      interligne: 2,
      hampeColor: "#8ab4e8",
      corpsColor: "#8ab4e8",
      baseColor: "#5b3fa0",
      jambageColor: "#8ab4e8",
      interHampe: true,
      interJambage: true,
      zonesFill: false,
      zoneHampe: "#eaf1fb",
      zoneCorps: "#dff2ef",
      zoneJambage: "#eaf1fb",
      amitie: { enabled: false, color: "#e05a5a" },
      gridEnabled: false,
      gridColor: "#c9d6e8",
    };
  }

  const PRESETS = [
    { name: "Cahier Séyès (CP/CE1)", type: "seyes", trame: { interligne: 2 }, page: { size: "A4", orientation: "portrait" } },
    { name: "Séyès + quadrillage", type: "seyesGrille", trame: { interligne: 2 }, page: { size: "A4", orientation: "portrait" } },
    { name: "Grands carreaux 5mm", type: "quadrillage", trame: { interligne: 5 }, page: { size: "A4", orientation: "portrait" } },
    { name: "Petits carreaux 3mm", type: "quadrillage", trame: { interligne: 3 }, page: { size: "A4", orientation: "portrait" } },
    { name: "Papier pointillé", type: "points", trame: { interligne: 6 }, page: { size: "A4", orientation: "portrait" } },
    { name: "Lignes simples 7mm", type: "lignes", trame: { interligne: 7 }, page: { size: "A4", orientation: "portrait" } },
    { name: "Serpodile (dys)", type: "serpodile", trame: { interligne: 7 }, page: { size: "A4", orientation: "portrait" } },
  ];

  const state = {
    typeId: "seyes",
    trame: cloneDefaults("seyes"),
    page: {
      size: "A4",
      orientation: "portrait",
      margins: { top: 10, left: 10, right: 10, bottom: 10 },
      marginsLinked: true,
      header: false,
      comments: false,
    },
  };

  function cloneDefaults(typeId) {
    const type = RULING_TYPES.find((t) => t.id === typeId);
    return JSON.parse(JSON.stringify(type.defaults));
  }

  // ---------- Tool tabs (Brochure A5 / Papeterie) ----------

  const toolTabs = document.querySelectorAll(".tool-tab");
  toolTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      toolTabs.forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("tool-brochure").classList.toggle("hidden", btn.dataset.tool !== "brochure");
      document.getElementById("tool-papeterie").classList.toggle("hidden", btn.dataset.tool !== "papeterie");
    });
  });

  // ---------- Papeterie: only wire things up if the panel exists ----------

  const paperSvg = document.getElementById("paper-svg");
  if (!paperSvg) return;

  const reglureGrid = document.getElementById("reglure-grid");
  const interligneInput = document.getElementById("paper-interligne");
  const interligneValue = document.getElementById("interligne-value");
  const dynamicFields = document.getElementById("paper-dynamic-fields");

  const subtabButtons = document.querySelectorAll(".paper-subtab");
  subtabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      subtabButtons.forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("paper-panel-trame").classList.toggle("hidden", btn.dataset.subtab !== "trame");
      document.getElementById("paper-panel-page").classList.toggle("hidden", btn.dataset.subtab !== "page");
    });
  });

  buildReglureGrid();
  buildPageControls();
  loadFromLink();
  selectType(state.typeId, true);

  // ---------- Réglure picker ----------

  function buildReglureGrid() {
    reglureGrid.innerHTML = "";
    RULING_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "reglure-btn";
      btn.dataset.type = type.id;
      btn.title = type.label;
      btn.innerHTML = type.icon();
      btn.addEventListener("click", () => selectType(type.id, false));
      reglureGrid.appendChild(btn);
    });
  }

  function selectType(typeId, keepTrame) {
    state.typeId = typeId;
    if (!keepTrame) state.trame = cloneDefaults(typeId);
    reglureGrid.querySelectorAll(".reglure-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === typeId);
    });
    interligneInput.value = state.trame.interligne;
    interligneValue.textContent = `${state.trame.interligne} mm`;
    buildDynamicFields();
    render();
  }

  interligneInput.addEventListener("input", () => {
    state.trame.interligne = parseFloat(interligneInput.value);
    interligneValue.textContent = `${state.trame.interligne} mm`;
    render();
  });

  // ---------- Dynamic fields per réglure type ----------

  function buildDynamicFields() {
    dynamicFields.innerHTML = "";
    const t = state.trame;

    switch (state.typeId) {
      case "lignes": {
        addColorFields(dynamicFields, [["lineColor", "Lignes"]]);
        addRangeField(dynamicFields, "Épaisseur", 0.1, 1.5, 0.05, t.thickness, "mm", (v) => (t.thickness = v));
        addRangeField(dynamicFields, "Entre portées", 0, 30, 1, t.groupGap, "mm", (v) => (t.groupGap = v));
        addSeparatriceField(dynamicFields, t);
        break;
      }
      case "seyes":
      case "seyesGrille": {
        addColorFields(dynamicFields, [
          ["hampeColor", "Hampe"],
          ["corpsColor", "Corps"],
          ["baseColor", "Base"],
          ["jambageColor", "Jambage"],
        ]);
        addCheckboxField(dynamicFields, "Intermédiaire hampe", t.interHampe, (v) => (t.interHampe = v));
        addCheckboxField(dynamicFields, "Intermédiaire jambage", t.interJambage, (v) => (t.interJambage = v));
        if (state.typeId === "seyes") {
          addCheckboxField(dynamicFields, "Quadrillage (carreaux)", t.gridEnabled, (v) => (t.gridEnabled = v));
        }
        addColorFields(dynamicFields, [["gridColor", "Quadrillage"]]);
        addAmitieField(dynamicFields, t);
        addCheckboxField(dynamicFields, "Zones colorées", t.zonesFill, (v) => (t.zonesFill = v));
        addColorFields(dynamicFields, [
          ["zoneHampe", "Fond hampe"],
          ["zoneCorps", "Fond corps"],
          ["zoneJambage", "Fond jambage"],
        ]);
        break;
      }
      case "serpodile": {
        addColorFields(dynamicFields, [
          ["cielColor", "Ciel"],
          ["herbeColor", "Herbe"],
          ["terreColor", "Terre"],
          ["ligneColor", "Ligne d'écriture"],
        ]);
        addCheckboxField(dynamicFields, "Marge", t.margeEnabled, (v) => (t.margeEnabled = v));
        addColorFields(dynamicFields, [["margeColor", "Marge"]]);
        break;
      }
      case "quadrillage": {
        addColorFields(dynamicFields, [["lineColor", "Lignes"]]);
        addRangeField(dynamicFields, "Épaisseur", 0.05, 1, 0.05, t.thickness, "mm", (v) => (t.thickness = v));
        break;
      }
      case "quadrillageColore": {
        addColorFields(dynamicFields, [
          ["lineColor", "Lignes"],
          ["accentColor", "Ligne forte (×5)"],
        ]);
        addRangeField(dynamicFields, "Épaisseur", 0.05, 1, 0.05, t.thickness, "mm", (v) => (t.thickness = v));
        break;
      }
      case "croisillons": {
        addColorFields(dynamicFields, [["lineColor", "Lignes"]]);
        addRangeField(dynamicFields, "Épaisseur", 0.05, 1, 0.05, t.thickness, "mm", (v) => (t.thickness = v));
        break;
      }
      case "points": {
        addColorFields(dynamicFields, [["lineColor", "Points"]]);
        addRangeField(dynamicFields, "Taille du point", 0.1, 1.2, 0.05, t.dotRadius, "mm", (v) => (t.dotRadius = v));
        break;
      }
    }
  }

  function addColorFields(container, entries) {
    const grid = document.createElement("div");
    grid.className = "color-fields-grid";
    entries.forEach(([key, label]) => {
      const field = document.createElement("label");
      field.className = "color-field";
      const input = document.createElement("input");
      input.type = "color";
      input.value = normalizeColorForInput(state.trame[key]);
      input.addEventListener("input", () => {
        state.trame[key] = input.value;
        render();
      });
      field.appendChild(input);
      const span = document.createElement("span");
      span.textContent = label;
      field.appendChild(span);
      grid.appendChild(field);
    });
    container.appendChild(grid);
  }

  function normalizeColorForInput(color) {
    return color && color.startsWith("#") ? color : "#ffffff";
  }

  function addRangeField(container, label, min, max, step, value, unit, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "paper-field";
    const labelEl = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = `${value} ${unit}`;
    labelEl.textContent = label + " ";
    labelEl.appendChild(span);
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      span.textContent = `${v} ${unit}`;
      onChange(v);
      render();
    });
    wrap.appendChild(labelEl);
    wrap.appendChild(input);
    container.appendChild(wrap);
  }

  function addCheckboxField(container, label, checked, onChange) {
    const row = document.createElement("label");
    row.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => {
      onChange(input.checked);
      render();
    });
    row.appendChild(input);
    row.appendChild(document.createTextNode(label));
    container.appendChild(row);
  }

  function addSeparatriceField(container, t) {
    const row = document.createElement("label");
    row.className = "checkbox-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.separatrice.enabled;
    cb.addEventListener("change", () => {
      t.separatrice.enabled = cb.checked;
      render();
    });
    row.appendChild(cb);
    row.appendChild(document.createTextNode("Séparatrice"));
    container.appendChild(row);

    const inline = document.createElement("div");
    inline.className = "inline-fields";

    const select = document.createElement("select");
    ["tirets", "pleine"].forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v === "tirets" ? "Tirets" : "Pleine";
      if (t.separatrice.style === v) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      t.separatrice.style = select.value;
      render();
    });
    inline.appendChild(select);

    const count = document.createElement("input");
    count.type = "number";
    count.min = 1;
    count.max = 20;
    count.value = t.groupSize >= 999 ? 4 : t.groupSize;
    count.title = "Nombre de lignes entre chaque séparatrice";
    count.addEventListener("input", () => {
      t.groupSize = Math.max(1, parseInt(count.value, 10) || 1);
      render();
    });
    inline.appendChild(count);

    const color = document.createElement("input");
    color.type = "color";
    color.value = normalizeColorForInput(t.separatrice.color);
    color.addEventListener("input", () => {
      t.separatrice.color = color.value;
      render();
    });
    inline.appendChild(color);

    container.appendChild(inline);
  }

  function addAmitieField(container, t) {
    const row = document.createElement("label");
    row.className = "checkbox-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.amitie.enabled;
    cb.addEventListener("change", () => {
      t.amitie.enabled = cb.checked;
      render();
    });
    row.appendChild(cb);
    row.appendChild(document.createTextNode("Marge"));
    container.appendChild(row);

    const color = document.createElement("input");
    color.type = "color";
    color.value = normalizeColorForInput(t.amitie.color);
    color.style.marginBottom = "0.8rem";
    color.style.display = "block";
    color.addEventListener("input", () => {
      t.amitie.color = color.value;
      render();
    });
    container.appendChild(color);
  }

  // ---------- Page controls ----------

  function buildPageControls() {
    const sizeSelect = document.getElementById("paper-size");
    sizeSelect.value = state.page.size;
    sizeSelect.addEventListener("change", () => {
      state.page.size = sizeSelect.value;
      render();
    });

    const orientationButtons = document.querySelectorAll(".orientation-toggle button");
    orientationButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.orientation === state.page.orientation);
      btn.addEventListener("click", () => {
        state.page.orientation = btn.dataset.orientation;
        orientationButtons.forEach((b) => b.classList.toggle("active", b === btn));
        render();
      });
    });

    const marginInputs = {
      top: document.getElementById("page-margin-top"),
      left: document.getElementById("page-margin-left"),
      right: document.getElementById("page-margin-right"),
      bottom: document.getElementById("page-margin-bottom"),
    };
    Object.keys(marginInputs).forEach((k) => {
      marginInputs[k].value = state.page.margins[k];
      marginInputs[k].addEventListener("input", () => {
        const v = parseFloat(marginInputs[k].value) || 0;
        if (state.page.marginsLinked) {
          Object.keys(marginInputs).forEach((k2) => {
            state.page.margins[k2] = v;
            marginInputs[k2].value = v;
          });
        } else {
          state.page.margins[k] = v;
        }
        render();
      });
    });

    const linkBtn = document.getElementById("margin-link-btn");
    linkBtn.classList.toggle("active", state.page.marginsLinked);
    linkBtn.addEventListener("click", () => {
      state.page.marginsLinked = !state.page.marginsLinked;
      linkBtn.classList.toggle("active", state.page.marginsLinked);
    });

    const headerCb = document.getElementById("page-header");
    headerCb.checked = state.page.header;
    headerCb.addEventListener("change", () => {
      state.page.header = headerCb.checked;
      render();
    });

    const commentsCb = document.getElementById("page-comments");
    commentsCb.checked = state.page.comments;
    commentsCb.addEventListener("change", () => {
      state.page.comments = commentsCb.checked;
      render();
    });
  }

  // ---------- Layout ----------

  function computeLayout() {
    const [w0, h0] = PAGE_SIZES[state.page.size];
    const landscape = state.page.orientation === "landscape";
    const pageW = landscape ? Math.max(w0, h0) : Math.min(w0, h0);
    const pageH = landscape ? Math.min(w0, h0) : Math.max(w0, h0);

    const m = state.page.margins;
    const headerH = state.page.header ? 16 : 0;
    const commentsH = state.page.comments ? 22 : 0;

    const area = {
      x: m.left,
      y: m.top + headerH,
      width: pageW - m.left - m.right,
      height: pageH - m.top - m.bottom - headerH - commentsH,
    };

    return {
      pageW,
      pageH,
      area,
      header: state.page.header ? { x: m.left, y: m.top, width: pageW - m.left - m.right, height: headerH } : null,
      comments: state.page.comments
        ? { x: m.left, y: pageH - m.bottom - commentsH, width: pageW - m.left - m.right, height: commentsH }
        : null,
    };
  }

  // ---------- SVG rendering ----------

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) {
      if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  function line(x1, y1, x2, y2, color, width, dash) {
    return svgEl("line", {
      x1: round(x1),
      y1: round(y1),
      x2: round(x2),
      y2: round(y2),
      stroke: color,
      "stroke-width": width,
      "stroke-dasharray": dash || undefined,
    });
  }

  function rect(x, y, w, h, fill, extra) {
    return svgEl("rect", Object.assign({ x: round(x), y: round(y), width: round(w), height: round(h), fill: fill || "none" }, extra || {}));
  }

  function circle(cx, cy, r, fill) {
    return svgEl("circle", { cx: round(cx), cy: round(cy), r, fill });
  }

  function round(n) {
    return Math.round(n * 1000) / 1000;
  }

  function render() {
    const { pageW, pageH, area, header, comments } = computeLayout();

    paperSvg.setAttribute("width", `${pageW}mm`);
    paperSvg.setAttribute("height", `${pageH}mm`);
    paperSvg.setAttribute("viewBox", `0 0 ${pageW} ${pageH}`);
    paperSvg.innerHTML = "";

    paperSvg.appendChild(rect(0, 0, pageW, pageH, "#ffffff"));

    const type = RULING_TYPES.find((t) => t.id === state.typeId);
    type.render(paperSvg, state.trame, area);

    if (header) {
      paperSvg.appendChild(rect(header.x, header.y, header.width, header.height, "none", { stroke: "#c7cdd6", "stroke-width": 0.3 }));
      paperSvg.appendChild(line(header.x, header.y + header.height, header.x + header.width, header.y + header.height, "#8a94a6", 0.4));
    }
    if (comments) {
      paperSvg.appendChild(rect(comments.x, comments.y, comments.width, comments.height, "none", { stroke: "#8a94a6", "stroke-width": 0.4, "stroke-dasharray": "2,1.5" }));
    }

    updatePrintPageSize(pageW, pageH);
  }

  function renderLignes(root, t, area) {
    let y = area.y;
    let count = 0;
    while (y <= area.y + area.height + 0.01) {
      root.appendChild(line(area.x, y, area.x + area.width, y, t.lineColor, t.thickness));
      count++;
      y += t.interligne;
      if (t.separatrice.enabled && t.groupSize < 999 && count % t.groupSize === 0 && y <= area.y + area.height) {
        const sepY = y + t.groupGap / 2;
        const dash = t.separatrice.style === "tirets" ? `${t.thickness * 3},${t.thickness * 3}` : null;
        root.appendChild(line(area.x, sepY, area.x + area.width, sepY, t.separatrice.color, t.thickness, dash));
        y += t.groupGap;
      }
    }
  }

  function renderSeyes(root, t, area, withGrid) {
    const unit = t.interligne;
    let y = area.y;
    let n = 0;
    while (y <= area.y + area.height + 0.01) {
      const pos = n % 4;
      let draw = true;
      let color = t.corpsColor;
      let width = t.thickness || 0.25;

      if (pos === 3) {
        color = t.baseColor;
        width = (t.thickness || 0.25) * 1.8;
      } else if (pos === 0) {
        color = t.hampeColor;
        draw = t.interHampe;
      } else if (pos === 2) {
        color = t.jambageColor;
        draw = t.interJambage;
      }

      if (t.zonesFill) {
        const bandColor = pos === 0 ? t.zoneHampe : pos === 1 ? t.zoneCorps : pos === 2 ? t.zoneJambage : null;
        if (bandColor) root.appendChild(rect(area.x, y, area.width, unit, bandColor));
      }
      if (draw) root.appendChild(line(area.x, y, area.x + area.width, y, color, width));

      y += unit;
      n++;
    }

    if (withGrid) {
      let x = area.x;
      while (x <= area.x + area.width + 0.01) {
        root.appendChild(line(x, area.y, x, area.y + area.height, t.gridColor || "#c9d6e8", (t.thickness || 0.25) * 0.7));
        x += unit;
      }
    }

    if (t.amitie && t.amitie.enabled) {
      const ax = area.x + 20;
      if (ax < area.x + area.width) {
        root.appendChild(line(ax, area.y, ax, area.y + area.height, t.amitie.color, 0.4, "2,2"));
      }
    }
  }

  function renderGrid(root, t, area, colored) {
    let y = area.y;
    let i = 0;
    while (y <= area.y + area.height + 0.01) {
      const accent = colored && i % 5 === 0;
      root.appendChild(line(area.x, y, area.x + area.width, y, accent ? t.accentColor : t.lineColor, accent ? t.thickness * 2 : t.thickness));
      y += t.interligne;
      i++;
    }
    let x = area.x;
    i = 0;
    while (x <= area.x + area.width + 0.01) {
      const accent = colored && i % 5 === 0;
      root.appendChild(line(x, area.y, x, area.y + area.height, accent ? t.accentColor : t.lineColor, accent ? t.thickness * 2 : t.thickness));
      x += t.interligne;
      i++;
    }
  }

  function renderCrosshatch(root, t, area) {
    const clipId = "clip-" + Math.random().toString(36).slice(2);
    const clipPath = svgEl("clipPath", { id: clipId });
    clipPath.appendChild(rect(area.x, area.y, area.width, area.height));
    root.appendChild(clipPath);

    const g = svgEl("g", { "clip-path": `url(#${clipId})` });
    const cx = area.x + area.width / 2;
    const cy = area.y + area.height / 2;
    const diag = Math.hypot(area.width, area.height);

    [45, -45].forEach((angle) => {
      const gg = svgEl("g", { transform: `rotate(${angle} ${cx} ${cy})` });
      for (let yy = cy - diag; yy <= cy + diag; yy += t.interligne) {
        gg.appendChild(line(cx - diag, yy, cx + diag, yy, t.lineColor, t.thickness));
      }
      g.appendChild(gg);
    });
    root.appendChild(g);
  }

  function renderDots(root, t, area) {
    let y = area.y;
    while (y <= area.y + area.height + 0.01) {
      let x = area.x;
      while (x <= area.x + area.width + 0.01) {
        root.appendChild(circle(x, y, t.dotRadius, t.lineColor));
        x += t.interligne;
      }
      y += t.interligne;
    }
  }

  /**
   * "Serpodile" (Terre-Herbe-Ciel): a dyslexia/dyspraxia-friendly ruling
   * that colors three horizontal bands per line of writing — Ciel (sky,
   * blue, where ascenders reach), Herbe (grass, green, the x-height body
   * of letters, bottom edge = the writing line), Terre (earth, brown,
   * where descenders dip) — so children can spatially anchor letters
   * ("feet on the ground, heads in the sky"). An optional red vertical
   * line marks the start-of-line margin, as on traditional French
   * school notebooks.
   */
  function renderSerpodile(root, t, area) {
    const bandH = t.interligne;
    let y = area.y;
    let i = 0;
    while (y < area.y + area.height - 0.01) {
      const kind = i % 3;
      const color = kind === 0 ? t.cielColor : kind === 1 ? t.herbeColor : t.terreColor;
      const h = Math.min(bandH, area.y + area.height - y);
      root.appendChild(rect(area.x, y, area.width, h, color));
      y += bandH;
      i++;
    }

    let ligneY = area.y + bandH * 2;
    while (ligneY <= area.y + area.height + 0.01) {
      root.appendChild(line(area.x, ligneY, area.x + area.width, ligneY, t.ligneColor, 0.5));
      ligneY += bandH * 3;
    }

    if (t.margeEnabled) {
      const mx = area.x + (t.margeOffset || 20);
      if (mx < area.x + area.width) {
        root.appendChild(line(mx, area.y, mx, area.y + area.height, t.margeColor, 0.5));
      }
    }
  }

  // ---------- Icons for the réglure picker ----------

  function iconLines() {
    let s = "";
    for (let y = 6; y <= 34; y += 7) s += `<line x1="4" y1="${y}" x2="36" y2="${y}" stroke="#2b2620" stroke-width="1.5"/>`;
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }
  function iconSeyes() {
    let s = "";
    const colors = ["#8ab4e8", "#8ab4e8", "#8ab4e8", "#5b3fa0"];
    for (let i = 0, y = 5; y <= 35; y += 4, i++) {
      s += `<line x1="4" y1="${y}" x2="36" y2="${y}" stroke="${colors[i % 4]}" stroke-width="${i % 4 === 3 ? 1.6 : 0.8}"/>`;
    }
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }
  function iconSeyesGrid() {
    let s = iconSeyesInner();
    for (let x = 4; x <= 36; x += 8) s += `<line x1="${x}" y1="4" x2="${x}" y2="36" stroke="#c9d6e8" stroke-width="0.6"/>`;
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }
  function iconSeyesInner() {
    let s = "";
    const colors = ["#8ab4e8", "#8ab4e8", "#8ab4e8", "#5b3fa0"];
    for (let i = 0, y = 5; y <= 35; y += 4, i++) {
      s += `<line x1="4" y1="${y}" x2="36" y2="${y}" stroke="${colors[i % 4]}" stroke-width="${i % 4 === 3 ? 1.6 : 0.8}"/>`;
    }
    return s;
  }
  function iconGrid() {
    let s = "";
    for (let y = 4; y <= 36; y += 6.4) s += `<line x1="4" y1="${y}" x2="36" y2="${y}" stroke="#2b2620" stroke-width="0.6"/>`;
    for (let x = 4; x <= 36; x += 6.4) s += `<line x1="${x}" y1="4" x2="${x}" y2="36" stroke="#2b2620" stroke-width="0.6"/>`;
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }
  function iconGridColor() {
    let s = "";
    let i = 0;
    for (let y = 4; y <= 36; y += 6.4, i++) s += `<line x1="4" y1="${y}" x2="36" y2="${y}" stroke="${i % 3 === 0 ? "#3d6fd9" : "#c7cdd6"}" stroke-width="${i % 3 === 0 ? 1.2 : 0.6}"/>`;
    i = 0;
    for (let x = 4; x <= 36; x += 6.4, i++) s += `<line x1="${x}" y1="4" x2="${x}" y2="36" stroke="${i % 3 === 0 ? "#3d6fd9" : "#c7cdd6"}" stroke-width="${i % 3 === 0 ? 1.2 : 0.6}"/>`;
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }
  function iconCross() {
    let s = "";
    for (let d = -30; d <= 30; d += 6) {
      s += `<line x1="${4 + d}" y1="4" x2="${36 + d}" y2="36" stroke="#8a94a6" stroke-width="0.6"/>`;
      s += `<line x1="${36 - d}" y1="4" x2="${4 - d}" y2="36" stroke="#8a94a6" stroke-width="0.6"/>`;
    }
    return `<svg viewBox="0 0 40 40"><clipPath id="ic"><rect x="4" y="4" width="32" height="32"/></clipPath><g clip-path="url(#ic)">${s}</g></svg>`;
  }
  function iconDots() {
    let s = "";
    for (let y = 6; y <= 34; y += 6) for (let x = 6; x <= 34; x += 6) s += `<circle cx="${x}" cy="${y}" r="1" fill="#2b2620"/>`;
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }
  function iconSerpodile() {
    let s = "";
    const colors = ["#cfe8fa", "#dcf3dc", "#f1e3d3"];
    for (let i = 0, y = 4; y < 36; y += 5.3, i++) {
      s += `<rect x="4" y="${y}" width="32" height="5.3" fill="${colors[i % 3]}"/>`;
    }
    s += `<line x1="4" y1="14.6" x2="36" y2="14.6" stroke="#2e7d32" stroke-width="0.8"/>`;
    s += `<line x1="4" y1="30.5" x2="36" y2="30.5" stroke="#2e7d32" stroke-width="0.8"/>`;
    s += `<line x1="8" y1="4" x2="8" y2="36" stroke="#e53935" stroke-width="0.8"/>`;
    return `<svg viewBox="0 0 40 40">${s}</svg>`;
  }

  // ---------- Top bar actions ----------

  document.getElementById("paper-print-btn").addEventListener("click", () => {
    render();
    window.print();
  });

  document.getElementById("paper-svg-btn").addEventListener("click", () => {
    const serializer = new XMLSerializer();
    const svgText = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(paperSvg);
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "papeterie.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.getElementById("paper-link-btn").addEventListener("click", async () => {
    const payload = { typeId: state.typeId, trame: state.trame, page: state.page };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `${location.origin}${location.pathname}?papeterie=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Lien copié !");
    } catch (e) {
      toast("Impossible de copier le lien");
    }
  });

  document.getElementById("paper-help-btn").addEventListener("click", () => {
    document.getElementById("paper-help").classList.toggle("hidden");
  });

  const modelsBtn = document.getElementById("paper-models-btn");
  const modelsPanel = document.getElementById("paper-models-panel");
  modelsPanel.innerHTML = PRESETS.map((p, i) => `<button type="button" class="paper-model-item" data-preset="${i}">${p.name}</button>`).join("");
  modelsBtn.addEventListener("click", () => modelsPanel.classList.toggle("hidden"));
  modelsPanel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    applyPreset(PRESETS[parseInt(btn.dataset.preset, 10)]);
    modelsPanel.classList.add("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".paper-models")) modelsPanel.classList.add("hidden");
  });

  function applyPreset(preset) {
    state.typeId = preset.type;
    state.trame = Object.assign(cloneDefaults(preset.type), preset.trame);
    state.page = Object.assign(
      { size: "A4", orientation: "portrait", margins: { top: 10, left: 10, right: 10, bottom: 10 }, marginsLinked: true, header: false, comments: false },
      preset.page
    );
    refreshControlsFromState();
    selectType(state.typeId, true);
  }

  function refreshControlsFromState() {
    document.getElementById("paper-size").value = state.page.size;
    document.querySelectorAll(".orientation-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.orientation === state.page.orientation));
    document.getElementById("page-margin-top").value = state.page.margins.top;
    document.getElementById("page-margin-left").value = state.page.margins.left;
    document.getElementById("page-margin-right").value = state.page.margins.right;
    document.getElementById("page-margin-bottom").value = state.page.margins.bottom;
    document.getElementById("margin-link-btn").classList.toggle("active", state.page.marginsLinked);
    document.getElementById("page-header").checked = state.page.header;
    document.getElementById("page-comments").checked = state.page.comments;
  }

  function loadFromLink() {
    const params = new URLSearchParams(location.search);
    const encoded = params.get("papeterie");
    if (!encoded) return;
    try {
      const payload = JSON.parse(decodeURIComponent(atob(encoded)));
      state.typeId = payload.typeId;
      state.trame = Object.assign(cloneDefaults(payload.typeId), payload.trame);
      state.page = Object.assign(state.page, payload.page);
      refreshControlsFromState();
      const papTab = document.querySelector('.tool-tab[data-tool="papeterie"]');
      if (papTab) papTab.click();
    } catch (e) {
      // Ignore malformed/foreign query params.
    }
  }

  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById("paper-toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  function updatePrintPageSize(pageW, pageH) {
    let styleEl = document.getElementById("dynamic-page-size");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-page-size";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${pageW}mm ${pageH}mm; margin: 0; }`;
  }
})();
