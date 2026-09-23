/**
 * apply.js — IMPACTFRAME Audition & Roles Dynamic Form Application
 * Dynamically renders form questions configured via Admin Panel,
 * collects candidate inputs, and submits to the backend datasheet.
 */

(function () {
  const container = document.getElementById("dynamic-fields-container");
  const form = document.getElementById("audition-dynamic-form");
  const successAlert = document.getElementById("apply-success-alert");
  const refCodeSpan = document.getElementById("application-ref-code");
  const errorAlert = document.getElementById("apply-error-alert");
  const submitBtn = document.getElementById("apply-submit-btn");

  if (!container || !form) return;

  let loadedFields = [];

  async function loadFields() {
    try {
      container.innerHTML = '<p class="state-msg" style="color: var(--parchment-dim);">Loading audition form fields…</p>';
      loadedFields = await window.impactframeApi.getFormFields();

      if (!loadedFields || loadedFields.length === 0) {
        container.innerHTML = '<p class="state-msg" style="color: var(--parchment-dim);">No active questions found. Please check back shortly.</p>';
        return;
      }

      renderForm(loadedFields);
    } catch (err) {
      console.error("Failed to load form fields:", err);
      container.innerHTML = '<p class="state-msg" style="color: #ff9999;">Could not connect to live form service. Using offline fallback questions.</p>';
      // Default fallback
      renderForm([
        { field_key: "full_name", label: "Full Name", type: "text", required: true },
        { field_key: "email", label: "Email Address (CHARUSAT / Personal)", type: "email", required: true },
        { field_key: "phone", label: "WhatsApp / Contact Number", type: "tel", required: true },
        { field_key: "department_sem", label: "Department & Current Semester", type: "text", required: true },
        {
          field_key: "role_interest",
          label: "Role of Interest (Acting or Crew)",
          type: "select",
          required: true,
          options: [
            "Actor / On-Screen Performer",
            "Voiceover Artist / Narrator",
            "Director & Screenwriter",
            "Cinematographer / Camera Operator",
            "Drone Pilot & Aerial Mapper",
            "Sound Recordist & Foley Designer",
            "Video Editor & Colorist",
            "Generative AI Visual Artist",
            "Field Ecological Researcher / Producer"
          ]
        },
        { field_key: "experience_portfolio", label: "Audition Reel, Instagram, or Portfolio Link", type: "url", required: false },
        { field_key: "motivation", label: "Why do you want to perform or work with IMPACTFRAME?", type: "textarea", required: true }
      ]);
    }
  }

  function renderForm(fields) {
    container.innerHTML = "";

    fields.forEach((field) => {
      const group = document.createElement("div");
      group.className = "form-group";
      group.style.display = "flex";
      group.style.flexDirection = "column";
      group.style.gap = "6px";

      const label = document.createElement("label");
      label.setAttribute("for", `field-${field.field_key}`);
      label.style.fontWeight = "600";
      label.style.fontSize = "0.92rem";
      label.style.color = "var(--paper)";
      label.innerHTML = `${escapeHtml(field.label)} ${field.required ? '<span style="color: #e5a93c;" title="Required">*</span>' : '<span style="font-weight: normal; font-size: 0.82rem; color: var(--parchment-dim);">(Optional)</span>'}`;
      group.appendChild(label);

      let inputEl;
      const fType = (field.type || "text").toLowerCase();

      if (fType === "textarea") {
        inputEl = document.createElement("textarea");
        inputEl.rows = 4;
        inputEl.placeholder = "Write your response here...";
      } else if (fType === "select") {
        inputEl = document.createElement("select");
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "-- Choose an Option --";
        inputEl.appendChild(defaultOpt);

        let optionsList = [];
        if (Array.isArray(field.options)) {
          optionsList = field.options;
        } else if (typeof field.options === "string") {
          try {
            optionsList = JSON.parse(field.options);
          } catch {
            optionsList = field.options.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }

        optionsList.forEach((optText) => {
          const opt = document.createElement("option");
          opt.value = optText;
          opt.textContent = optText;
          inputEl.appendChild(opt);
        });
      } else {
        inputEl = document.createElement("input");
        inputEl.type = ["text", "email", "tel", "url", "number", "date"].includes(fType) ? fType : "text";
        if (fType === "url") {
          inputEl.placeholder = "https://...";
        } else if (fType === "tel") {
          inputEl.placeholder = "+91 98765 43210";
        } else if (fType === "email") {
          inputEl.placeholder = "you@charusat.ac.in";
        } else {
          inputEl.placeholder = `Enter ${field.label.toLowerCase()}...`;
        }
      }

      inputEl.id = `field-${field.field_key}`;
      inputEl.name = field.field_key;
      inputEl.className = "input";
      if (field.required) {
        inputEl.required = true;
      }

      group.appendChild(inputEl);
      container.appendChild(group);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorAlert) {
      errorAlert.style.display = "none";
      errorAlert.textContent = "";
    }
    if (successAlert) {
      successAlert.style.display = "none";
    }

    // Collect all fields
    const formData = {};
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((inp) => {
      if (inp.name) {
        formData[inp.name] = inp.value.trim();
      }
    });

    // Special mappings for standard fields if keys differ slightly
    if (!formData.full_name && formData.name) formData.full_name = formData.name;
    if (!formData.role_interest && formData.role) formData.role_interest = formData.role;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Submitting Audition Sheet…";
    }

    try {
      const res = await window.impactframeApi.submitApplication(formData);
      if (res && res.success) {
        form.reset();
        if (successAlert) {
          successAlert.style.display = "block";
          if (refCodeSpan) {
            refCodeSpan.textContent = `Reference ID: ${res.reference_id || "IF-APPLICATION-RECORDED"}`;
          }
          successAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else {
        throw new Error(res?.error || "Submission failed. Please check inputs and try again.");
      }
    } catch (err) {
      console.error("Audition submission error:", err);
      if (errorAlert) {
        errorAlert.style.display = "block";
        errorAlert.textContent = err.message || "Unable to send your submission. Please try again or reach out to impactframe.ee@charusat.ac.in.";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Submit Audition Sheet &rarr;";
      }
    }
  });

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Load fields on startup
  loadFields();
})();
