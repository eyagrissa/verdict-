(() => {
  // Same-origin by default when frontend is served by Express.
  // Override with window.VERDICT_API_BASE if the UI is hosted separately.
  const API_BASE = window.VERDICT_API_BASE || "";

  const state = {
    versions: {
      gemini: { id: "gemini", source: "Gemini", content: "", error: null, generated: false },
      groq: { id: "groq", source: "Groq", content: "", error: null, generated: false },
      manual: { id: "manual", source: "Manuel", content: "", error: null, generated: false },
    },
    criteria: [],
    domain: null,
    criteriaLoaded: false,
  };

  const els = {
    task: document.getElementById("task-input"),
    btnGenerate: document.getElementById("btn-generate"),
    generateStatus: document.getElementById("generate-status"),
    versionsGrid: document.getElementById("versions-grid"),
    btnSuggest: document.getElementById("btn-suggest"),
    domainBadge: document.getElementById("domain-badge"),
    criteriaStatus: document.getElementById("criteria-status"),
    criteriaList: document.getElementById("criteria-list"),
    btnCompare: document.getElementById("btn-compare"),
    compareStatus: document.getElementById("compare-status"),
    resultsPanel: document.getElementById("results-panel"),
  };

  function setStatus(el, message, type = "") {
    el.textContent = message;
    el.className = "status" + (type ? ` ${type}` : "");
  }

  function setLoading(btn, loading, labelIdle) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Chargement…`;
    } else {
      btn.textContent = labelIdle || btn.dataset.label || btn.textContent;
    }
  }

  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || `Erreur HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function renderVersions() {
    const order = ["gemini", "groq", "manual"];
    els.versionsGrid.innerHTML = "";

    for (const key of order) {
      const v = state.versions[key];
      const card = document.createElement("div");
      card.className = "version-card" + (key === "manual" ? " manual" : "");

      const meta = document.createElement("div");
      meta.className = "version-meta";

      const sourceBadge = document.createElement("span");
      sourceBadge.className = `badge source-${key}`;
      sourceBadge.textContent = v.source;
      meta.appendChild(sourceBadge);

      if (v.generated && !v.error) {
        const genBadge = document.createElement("span");
        genBadge.className = "badge generated";
        genBadge.textContent = "généré";
        meta.appendChild(genBadge);
      }

      card.appendChild(meta);

      if (v.error) {
        const err = document.createElement("div");
        err.className = "version-error";
        err.textContent =
          "Génération indisponible — collez une version manuellement";
        card.appendChild(err);

        // Still allow paste via textarea below the error
        const ta = document.createElement("textarea");
        ta.rows = 5;
        ta.placeholder = "Coller une version manuellement (optionnel)";
        ta.value = v.content;
        ta.addEventListener("input", () => {
          state.versions[key].content = ta.value;
          if (state.versions[key].error) {
            state.versions[key].error = null;
            const errEl = card.querySelector(".version-error");
            if (errEl) errEl.remove();
          }
          updateCompareEnabled();
        });
        card.appendChild(ta);
      } else {
        const ta = document.createElement("textarea");
        ta.rows = key === "manual" ? 5 : 8;
        ta.placeholder =
          key === "manual"
            ? "Coller une version manuellement (optionnel)"
            : "Contenu de la version…";
        ta.value = v.content;
        ta.addEventListener("input", () => {
          state.versions[key].content = ta.value;
          updateCompareEnabled();
        });
        card.appendChild(ta);
      }

      els.versionsGrid.appendChild(card);
    }

    updateCompareEnabled();
  }

  function getNonEmptyVersions() {
    return Object.values(state.versions)
      .filter((v) => v.content && v.content.trim())
      .map((v) => ({
        id: v.id,
        source: v.source,
        content: v.content.trim(),
      }));
  }

  function getVersionsPreview() {
    return getNonEmptyVersions().map((v) =>
      v.content.slice(0, 400) + (v.content.length > 400 ? "…" : "")
    );
  }

  function renderCriteria() {
    els.criteriaList.innerHTML = "";

    if (!state.criteria.length) {
      const p = document.createElement("p");
      p.className = "placeholder-msg";
      p.textContent =
        "Générez des versions ou cliquez « Suggérer des critères ».";
      els.criteriaList.appendChild(p);
      return;
    }

    state.criteria.forEach((c, index) => {
      const row = document.createElement("div");
      row.className = "criterion";

      const header = document.createElement("div");
      header.className = "criterion-header";

      const name = document.createElement("span");
      name.className = "criterion-name";
      name.textContent = c.name;

      const weightLabel = document.createElement("span");
      weightLabel.className = "criterion-weight-label";
      weightLabel.textContent = `poids ${c.weight}`;

      header.appendChild(name);
      header.appendChild(weightLabel);

      const desc = document.createElement("p");
      desc.className = "criterion-desc";
      desc.textContent = c.short_description || "";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "10";
      slider.step = "1";
      slider.value = String(c.weight);
      slider.setAttribute("aria-label", `Poids pour ${c.name}`);
      slider.addEventListener("input", () => {
        state.criteria[index].weight = Number(slider.value);
        weightLabel.textContent = `poids ${slider.value}`;
        updateCompareEnabled();
      });

      row.appendChild(header);
      row.appendChild(desc);
      row.appendChild(slider);
      els.criteriaList.appendChild(row);
    });
  }

  function updateCompareEnabled() {
    const versions = getNonEmptyVersions();
    const hasCriteria = state.criteria.length > 0;
    const hasTask = els.task.value.trim().length > 0;
    els.btnCompare.disabled = !(versions.length >= 2 && hasCriteria && hasTask);
  }

  async function suggestCriteria({ silent = false } = {}) {
    const task = els.task.value.trim();
    if (!task) {
      if (!silent) {
        setStatus(els.criteriaStatus, "Indiquez d’abord une tâche.", "error");
      }
      return;
    }

    if (!silent) {
      setLoading(els.btnSuggest, true);
      setStatus(els.criteriaStatus, "Suggestion des critères…", "loading");
    }

    try {
      const data = await apiPost("/api/suggest-criteria", {
        task,
        versionsPreview: getVersionsPreview(),
      });

      state.domain = data.domain_detected || null;
      state.criteria = (data.criteria_suggested || []).map((c) => ({
        name: c.name,
        short_description: c.short_description,
        weight: Number(c.default_weight) || 0,
      }));
      state.criteriaLoaded = true;

      if (state.domain) {
        els.domainBadge.textContent = `Domaine : ${state.domain}`;
        els.domainBadge.classList.remove("hidden");
      } else {
        els.domainBadge.classList.add("hidden");
      }

      renderCriteria();
      setStatus(
        els.criteriaStatus,
        `${state.criteria.length} critères suggérés — ajustez les poids si besoin.`
      );
    } catch (err) {
      setStatus(
        els.criteriaStatus,
        err.message || "Impossible de suggérer les critères.",
        "error"
      );
    } finally {
      if (!silent) setLoading(els.btnSuggest, false, "Suggérer des critères");
      updateCompareEnabled();
    }
  }

  async function onGenerate() {
    const task = els.task.value.trim();
    if (!task) {
      setStatus(els.generateStatus, "Décrivez la tâche avant de générer.", "error");
      return;
    }

    setLoading(els.btnGenerate, true);
    setStatus(els.generateStatus, "Génération en cours (Gemini + Groq)…", "loading");

    // Reset provider versions (keep manual)
    state.versions.gemini = {
      id: "gemini",
      source: "Gemini",
      content: "",
      error: null,
      generated: false,
    };
    state.versions.groq = {
      id: "groq",
      source: "Groq",
      content: "",
      error: null,
      generated: false,
    };
    renderVersions();

    try {
      const data = await apiPost("/api/generate", { task });

      for (const v of data.versions || []) {
        if (state.versions[v.id]) {
          state.versions[v.id].content = v.content || "";
          state.versions[v.id].source = v.source || state.versions[v.id].source;
          state.versions[v.id].generated = true;
          state.versions[v.id].error = null;
        }
      }

      for (const e of data.errors || []) {
        const id = e.provider;
        if (state.versions[id]) {
          state.versions[id].error = e.message || true;
          state.versions[id].generated = false;
        }
      }

      renderVersions();

      const okCount = (data.versions || []).length;
      const errCount = (data.errors || []).length;
      if (okCount === 0) {
        setStatus(
          els.generateStatus,
          "Aucune version générée. Collez des versions manuellement ou réessayez.",
          "error"
        );
      } else {
        setStatus(
          els.generateStatus,
          `${okCount} version(s) reçue(s)${errCount ? `, ${errCount} erreur(s)` : ""}.`
        );
      }

      // Auto-suggest criteria once versions are ready
      await suggestCriteria({ silent: false });
    } catch (err) {
      setStatus(
        els.generateStatus,
        err.message || "Échec de la génération.",
        "error"
      );
    } finally {
      setLoading(els.btnGenerate, false, "Générer avec Gemini + Groq");
      updateCompareEnabled();
    }
  }

  function sourceForId(id) {
    return state.versions[id]?.source || id;
  }

  function renderResults(data) {
    els.resultsPanel.innerHTML = "";

    const confidence = (data.final_verdict?.confidence_level || "medium").toLowerCase();
    const confRow = document.createElement("div");
    confRow.className = "confidence-row";
    const confBadge = document.createElement("span");
    confBadge.className = `confidence-badge ${confidence}`;
    confBadge.textContent = `Confiance : ${confidence}`;
    confRow.appendChild(confBadge);
    els.resultsPanel.appendChild(confRow);

    const winnerId = data.final_verdict?.winner;
    const ranking = data.ranking || [];
    const byId = Object.fromEntries(
      (data.evaluations || []).map((e) => [e.version_id, e])
    );

    // Order by ranking if present, else by weighted_total
    let orderedIds = ranking.length
      ? ranking
      : (data.evaluations || [])
          .slice()
          .sort((a, b) => (b.weighted_total || 0) - (a.weighted_total || 0))
          .map((e) => e.version_id);

    // Ensure all evaluations appear
    for (const e of data.evaluations || []) {
      if (!orderedIds.includes(e.version_id)) orderedIds.push(e.version_id);
    }

    orderedIds.forEach((id, index) => {
      const ev = byId[id];
      if (!ev) return;

      const card = document.createElement("div");
      card.className =
        "result-card" + (id === winnerId || index === 0 ? " winner" : "");

      const top = document.createElement("div");
      top.className = "result-top";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "0.5rem";

      const rank = document.createElement("span");
      rank.className = "result-rank";
      rank.textContent = `#${index + 1}`;

      const badge = document.createElement("span");
      const src = sourceForId(id);
      const srcKey =
        id === "gemini" || id === "groq" || id === "manual" ? id : "manual";
      badge.className = `badge source-${srcKey}`;
      badge.textContent = src;

      left.appendChild(rank);
      left.appendChild(badge);

      const score = document.createElement("span");
      score.className = "result-score";
      const wt =
        typeof ev.weighted_total === "number"
          ? ev.weighted_total.toFixed(2)
          : "—";
      score.textContent = `${wt} / 10`;

      top.appendChild(left);
      top.appendChild(score);

      const strengths = document.createElement("p");
      strengths.className = "result-summary";
      strengths.innerHTML = `<strong>Points forts :</strong> ${escapeHtml(ev.strengths || "—")}`;

      const weaknesses = document.createElement("p");
      weaknesses.className = "result-summary";
      weaknesses.innerHTML = `<strong>Points faibles :</strong> ${escapeHtml(ev.weaknesses || "—")}`;

      card.appendChild(top);
      card.appendChild(strengths);
      card.appendChild(weaknesses);
      els.resultsPanel.appendChild(card);
    });

    const verdict = document.createElement("div");
    verdict.className = "verdict-box";
    const just = document.createElement("p");
    just.textContent = data.final_verdict?.justification || "";
    verdict.appendChild(just);

    if (
      confidence === "low" &&
      data.final_verdict?.note_if_low_confidence
    ) {
      const note = document.createElement("p");
      note.className = "verdict-note";
      note.textContent = data.final_verdict.note_if_low_confidence;
      verdict.appendChild(note);
    }

    els.resultsPanel.appendChild(verdict);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function onCompare() {
    const task = els.task.value.trim();
    const versions = getNonEmptyVersions();
    const weightedCriteria = state.criteria.map((c) => ({
      name: c.name,
      weight: c.weight,
    }));

    if (versions.length < 2) {
      setStatus(
        els.compareStatus,
        "Au moins 2 versions non vides sont nécessaires.",
        "error"
      );
      return;
    }

    setLoading(els.btnCompare, true);
    setStatus(els.compareStatus, "Comparaison en cours…", "loading");
    els.resultsPanel.innerHTML =
      '<p class="placeholder-msg status loading">Analyse en cours…</p>';

    try {
      const data = await apiPost("/api/compare", {
        task,
        weightedCriteria,
        versions,
      });
      renderResults(data);
      setStatus(els.compareStatus, "Comparaison terminée.");
      document.getElementById("block-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (err) {
      setStatus(
        els.compareStatus,
        err.message || "Échec de la comparaison.",
        "error"
      );
      els.resultsPanel.innerHTML = `<p class="placeholder-msg status error">${escapeHtml(err.message)}</p>`;
    } finally {
      setLoading(els.btnCompare, false, "Comparer");
      updateCompareEnabled();
    }
  }

  // Events
  els.btnGenerate.addEventListener("click", onGenerate);
  els.btnSuggest.addEventListener("click", () => suggestCriteria({ silent: false }));
  els.btnCompare.addEventListener("click", onCompare);
  els.task.addEventListener("input", updateCompareEnabled);

  // Initial render
  renderVersions();
  renderCriteria();
  updateCompareEnabled();
})();
