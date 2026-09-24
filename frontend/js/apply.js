/**
 * apply.js — IMPACTFRAME Audition & Roles Dynamic Form Application
 * Complete Google Forms replacement for public applications:
 * renders Section Dividers, Multiple Choice, Checkboxes with "Other" write-in,
 * Linear Scales (Ratings), Dropdowns, Date/Time, File links, and handles
 * real-time "Accepting Responses" open/closed logic.
 */

(function () {
  const container = document.getElementById("dynamic-fields-container");
  const form = document.getElementById("audition-dynamic-form");
  const successAlert = document.getElementById("apply-success-alert");
  const refCodeSpan = document.getElementById("application-ref-code");
  const successMsgP = document.getElementById("apply-success-message");
  const errorAlert = document.getElementById("apply-error-alert");
  const submitBtn = document.getElementById("apply-submit-btn");

  const formDisplayTitle = document.getElementById("form-display-title");
  const formDisplayDesc = document.getElementById("form-display-desc");
  const formClosedNotice = document.getElementById("form-closed-notice");
  const formClosedMessageText = document.getElementById("form-closed-message-text");
  const formStatusIndicator = document.getElementById("form-status-indicator");

  if (!container || !form) return;

  let loadedFields = [];
  let formSettings = null;

  async function initForm() {
    try {
      // 1. Load Form Header & Behavior Settings
      formSettings = await window.impactframeApi.getFormSettings();

      if (formDisplayTitle && formSettings.form_title) {
        formDisplayTitle.textContent = formSettings.form_title;
        document.title = `${formSettings.form_title} — IMPACTFRAME`;
      }
      if (formDisplayDesc && formSettings.form_description) {
        formDisplayDesc.textContent = formSettings.form_description;
      }

      // Check if form is currently accepting responses
      if (formSettings && formSettings.is_accepting_responses === false) {
        if (formClosedNotice) {
          formClosedNotice.style.display = "block";
          if (formClosedMessageText) {
            formClosedMessageText.textContent =
              formSettings.closed_message ||
              "This audition form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!";
          }
        }
        form.style.display = "none";
        if (formStatusIndicator) {
          formStatusIndicator.innerHTML = '<span style="color: #fca5a5;">○</span> FORM CLOSED';
          formStatusIndicator.style.borderColor = "#fca5a5";
        }
        return;
      }

      // Form is open: proceed to load fields
      if (formClosedNotice) formClosedNotice.style.display = "none";
      form.style.display = "block";
      if (formStatusIndicator) {
        formStatusIndicator.innerHTML = '<span class="rec-dot"></span> LIVE APPLICATION FORM';
      }

      await loadFields();
    } catch (err) {
      console.warn("Notice during form init:", err);
      await loadFields();
    }
  }

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
      renderForm([
        { field_key: "full_name", label: "Full Name", type: "text", required: true },
        { field_key: "email", label: "Email Address", type: "email", required: true },
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
            "Generative AI Visual Artist"
          ]
        },
        { field_key: "portfolio_url", label: "Audition Reel or Portfolio Link", type: "url", required: false },
        { field_key: "motivation", label: "Why do you want to work with IMPACTFRAME?", type: "textarea", required: true }
      ]);
    }
  }

  function renderForm(fields) {
    container.innerHTML = "";

    fields.forEach((field, index) => {
      const fType = (field.type || "text").toLowerCase();

      // ==========================================
      // SECTION DIVIDER / HEADER
      // ==========================================
      if (fType === "section") {
        const sectionCard = document.createElement("div");
        sectionCard.className = "form-section-banner sprocket-frame";
        sectionCard.style.cssText = `
          background: rgba(22, 38, 32, 0.85);
          border-left: 4px solid var(--leaf);
          border-top: 1px solid var(--navy-mid);
          border-right: 1px solid var(--navy-mid);
          border-bottom: 1px solid var(--navy-mid);
          border-radius: var(--radius);
          padding: 20px 24px;
          margin-top: 12px;
          margin-bottom: 6px;
        `;
        sectionCard.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="hud-pill" style="font-size: 0.72rem; padding: 2px 8px; background: var(--amber); color: #000; font-weight: 700;">SECTION</span>
            <h4 style="margin: 0; color: var(--paper); font-size: 1.25rem; letter-spacing: 0.02em;">${escapeHtml(field.label)}</h4>
          </div>
          ${field.description ? `<p style="margin: 6px 0 0; color: var(--parchment-dim); font-size: 0.92rem; line-height: 1.5;">${escapeHtml(field.description)}</p>` : ""}
        `;
        container.appendChild(sectionCard);
        return;
      }

      // ==========================================
      // STANDARD QUESTION CARD
      // ==========================================
      const group = document.createElement("div");
      group.className = "form-group question-card";
      group.id = `q-card-${field.field_key}`;
      group.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: rgba(14, 26, 23, 0.45);
        border: 1px solid var(--navy-mid);
        border-radius: var(--radius);
        padding: 18px 20px;
        transition: border-color 0.2s ease;
      `;

      // Question Title & Asterisk
      const label = document.createElement("label");
      label.setAttribute("for", `field-${field.field_key}`);
      label.style.cssText = "font-weight: 600; font-size: 0.98rem; color: var(--paper); line-height: 1.4; display: block;";
      label.innerHTML = `
        ${escapeHtml(field.label)}
        ${field.required ? '<span style="color: #ef4444; font-weight: 700; margin-left: 4px;" title="Required">*</span>' : '<span style="font-weight: normal; font-size: 0.8rem; color: var(--parchment-dim); margin-left: 6px;">(Optional)</span>'}
      `;
      group.appendChild(label);

      // Question Helper Description
      if (field.description && field.description.trim()) {
        const descEl = document.createElement("p");
        descEl.style.cssText = "margin: -2px 0 6px; font-size: 0.85rem; color: var(--parchment-dim); line-height: 1.5;";
        descEl.textContent = field.description.trim();
        group.appendChild(descEl);
      }

      // Parse options
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

      // Render Question Types
      if (fType === "radio") {
        // ================= MULTIPLE CHOICE (RADIO) =================
        const choicesContainer = document.createElement("div");
        choicesContainer.className = "choices-list";
        choicesContainer.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin-top: 4px;";

        optionsList.forEach((optText, optIdx) => {
          const optLabel = document.createElement("label");
          optLabel.style.cssText = "display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--paper); font-size: 0.92rem;";
          optLabel.innerHTML = `
            <input type="radio" name="${field.field_key}" value="${escapeHtml(optText)}" style="accent-color: var(--leaf); width: 18px; height: 18px; cursor: pointer;" />
            <span>${escapeHtml(optText)}</span>
          `;
          choicesContainer.appendChild(optLabel);
        });

        // "Other" write-in option
        if (field.allow_other) {
          const otherWrap = document.createElement("div");
          otherWrap.style.cssText = "display: flex; align-items: center; gap: 10px; flex-wrap: wrap;";
          otherWrap.innerHTML = `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--paper); font-size: 0.92rem; white-space: nowrap;">
              <input type="radio" name="${field.field_key}" value="__other__" id="radio-other-${field.field_key}" style="accent-color: var(--leaf); width: 18px; height: 18px; cursor: pointer;" />
              <span>Other:</span>
            </label>
            <input type="text" id="other-input-${field.field_key}" class="input" placeholder="Please specify..." style="flex: 1; min-width: 180px; padding: 6px 12px; font-size: 0.88rem;" />
          `;
          const otherRadio = otherWrap.querySelector(`#radio-other-${field.field_key}`);
          const otherInput = otherWrap.querySelector(`#other-input-${field.field_key}`);
          otherInput.addEventListener("focus", () => {
            otherRadio.checked = true;
          });
          choicesContainer.appendChild(otherWrap);
        }

        group.appendChild(choicesContainer);
      } else if (fType === "checkbox") {
        // ================= CHECKBOXES (MULTI SELECT) =================
        const choicesContainer = document.createElement("div");
        choicesContainer.className = "choices-list";
        choicesContainer.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin-top: 4px;";

        optionsList.forEach((optText, optIdx) => {
          const optLabel = document.createElement("label");
          optLabel.style.cssText = "display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--paper); font-size: 0.92rem;";
          optLabel.innerHTML = `
            <input type="checkbox" name="${field.field_key}[]" value="${escapeHtml(optText)}" style="accent-color: var(--leaf); width: 18px; height: 18px; cursor: pointer;" />
            <span>${escapeHtml(optText)}</span>
          `;
          choicesContainer.appendChild(optLabel);
        });

        // "Other" write-in option
        if (field.allow_other) {
          const otherWrap = document.createElement("div");
          otherWrap.style.cssText = "display: flex; align-items: center; gap: 10px; flex-wrap: wrap;";
          otherWrap.innerHTML = `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--paper); font-size: 0.92rem; white-space: nowrap;">
              <input type="checkbox" id="checkbox-other-${field.field_key}" style="accent-color: var(--leaf); width: 18px; height: 18px; cursor: pointer;" />
              <span>Other:</span>
            </label>
            <input type="text" id="checkbox-other-input-${field.field_key}" class="input" placeholder="Please specify..." style="flex: 1; min-width: 180px; padding: 6px 12px; font-size: 0.88rem;" />
          `;
          const otherCb = otherWrap.querySelector(`#checkbox-other-${field.field_key}`);
          const otherInput = otherWrap.querySelector(`#checkbox-other-input-${field.field_key}`);
          otherInput.addEventListener("focus", () => {
            otherCb.checked = true;
          });
          choicesContainer.appendChild(otherWrap);
        }

        group.appendChild(choicesContainer);
      } else if (fType === "scale") {
        // ================= LINEAR SCALE (RATING) =================
        const minVal = Number(field.scale_min ?? 1);
        const maxVal = Number(field.scale_max ?? 5);

        const scaleWrap = document.createElement("div");
        scaleWrap.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(10, 20, 18, 0.5);
          border-radius: var(--radius);
          border: 1px solid var(--navy-mid);
          gap: 12px;
          flex-wrap: wrap;
        `;

        if (field.scale_min_label) {
          const minLbl = document.createElement("span");
          minLbl.style.cssText = "font-size: 0.85rem; color: var(--parchment-dim); max-width: 140px; text-align: left;";
          minLbl.textContent = field.scale_min_label;
          scaleWrap.appendChild(minLbl);
        }

        const buttonsRow = document.createElement("div");
        buttonsRow.style.cssText = "display: flex; gap: 12px; align-items: center; justify-content: center; flex: 1;";

        for (let i = minVal; i <= maxVal; i++) {
          const radioItem = document.createElement("label");
          radioItem.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; color: var(--paper); font-size: 0.9rem; font-weight: 600;";
          radioItem.innerHTML = `
            <span>${i}</span>
            <input type="radio" name="${field.field_key}" value="${i}" style="accent-color: var(--leaf); width: 18px; height: 18px; cursor: pointer;" />
          `;
          buttonsRow.appendChild(radioItem);
        }
        scaleWrap.appendChild(buttonsRow);

        if (field.scale_max_label) {
          const maxLbl = document.createElement("span");
          maxLbl.style.cssText = "font-size: 0.85rem; color: var(--parchment-dim); max-width: 140px; text-align: right;";
          maxLbl.textContent = field.scale_max_label;
          scaleWrap.appendChild(maxLbl);
        }

        group.appendChild(scaleWrap);
      } else if (fType === "select") {
        // ================= DROPDOWN SELECT =================
        const selectEl = document.createElement("select");
        selectEl.id = `field-${field.field_key}`;
        selectEl.name = field.field_key;
        selectEl.className = "input";
        if (field.required) selectEl.required = true;

        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "-- Choose an Option --";
        selectEl.appendChild(defaultOpt);

        optionsList.forEach((optText) => {
          const opt = document.createElement("option");
          opt.value = optText;
          opt.textContent = optText;
          selectEl.appendChild(opt);
        });

        group.appendChild(selectEl);
      } else if (fType === "textarea") {
        // ================= PARAGRAPH =================
        const textareaEl = document.createElement("textarea");
        textareaEl.id = `field-${field.field_key}`;
        textareaEl.name = field.field_key;
        textareaEl.className = "input";
        textareaEl.rows = 4;
        textareaEl.placeholder = field.placeholder || "Your answer...";
        if (field.required) textareaEl.required = true;
        group.appendChild(textareaEl);
      } else {
        // ================= SHORT ANSWER / DATE / TIME / NUMBER / EMAIL / TEL / URL / FILE =================
        const inputEl = document.createElement("input");
        inputEl.id = `field-${field.field_key}`;
        inputEl.name = field.field_key;
        inputEl.className = "input";

        if (fType === "date") {
          inputEl.type = "date";
        } else if (fType === "time") {
          inputEl.type = "time";
        } else if (fType === "number") {
          inputEl.type = "number";
          inputEl.placeholder = field.placeholder || "Enter number...";
        } else if (fType === "email") {
          inputEl.type = "email";
          inputEl.placeholder = field.placeholder || "you@charusat.ac.in";
        } else if (fType === "tel") {
          inputEl.type = "tel";
          inputEl.placeholder = field.placeholder || "+91 98765 43210";
        } else if (fType === "file") {
          inputEl.type = "url";
          inputEl.placeholder = field.placeholder || "Paste Google Drive, Dropbox, or portfolio link...";
        } else if (fType === "url") {
          inputEl.type = "url";
          inputEl.placeholder = field.placeholder || "https://...";
        } else {
          inputEl.type = "text";
          inputEl.placeholder = field.placeholder || "Your answer...";
        }

        if (field.required) inputEl.required = true;
        group.appendChild(inputEl);
      }

      container.appendChild(group);
    });
  }

  // ==========================================
  // FORM SUBMISSION HANDLER
  // ==========================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorAlert) {
      errorAlert.style.display = "none";
      errorAlert.textContent = "";
    }
    if (successAlert) {
      successAlert.style.display = "none";
    }

    const formData = {};
    let missingRequiredField = null;

    // Collect and validate all fields based on loaded question types
    loadedFields.forEach((field) => {
      const fType = (field.type || "text").toLowerCase();
      if (fType === "section") return; // dividers have no values

      const key = field.field_key;

      if (fType === "radio") {
        const checkedRadio = form.querySelector(`input[name="${key}"]:checked`);
        let val = "";
        if (checkedRadio) {
          if (checkedRadio.value === "__other__") {
            const otherInput = document.getElementById(`other-input-${key}`);
            val = otherInput ? otherInput.value.trim() : "Other";
          } else {
            val = checkedRadio.value;
          }
        }
        if (field.required && !val && !missingRequiredField) {
          missingRequiredField = field.label;
        }
        if (val) formData[key] = val;
      } else if (fType === "checkbox") {
        const checkedBoxes = Array.from(form.querySelectorAll(`input[name="${key}[]"]:checked`)).map((cb) => cb.value);
        const otherCb = document.getElementById(`checkbox-other-${key}`);
        if (otherCb && otherCb.checked) {
          const otherInput = document.getElementById(`checkbox-other-input-${key}`);
          const otherVal = otherInput && otherInput.value.trim() ? otherInput.value.trim() : "Other";
          checkedBoxes.push(otherVal);
        }
        if (field.required && checkedBoxes.length === 0 && !missingRequiredField) {
          missingRequiredField = field.label;
        }
        if (checkedBoxes.length > 0) {
          formData[key] = checkedBoxes;
        }
      } else if (fType === "scale") {
        const checkedScale = form.querySelector(`input[name="${key}"]:checked`);
        const val = checkedScale ? checkedScale.value : "";
        if (field.required && !val && !missingRequiredField) {
          missingRequiredField = field.label;
        }
        if (val) formData[key] = val;
      } else {
        const el = document.getElementById(`field-${key}`);
        const val = el ? el.value.trim() : "";
        if (field.required && !val && !missingRequiredField) {
          missingRequiredField = field.label;
        }
        if (val) formData[key] = val;
      }
    });

    if (missingRequiredField) {
      if (errorAlert) {
        errorAlert.style.display = "block";
        errorAlert.textContent = `Please answer required question: "${missingRequiredField}"`;
        errorAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return;
    }

    // Standard fallback mapping
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
        // Hide form inputs on completed submission for clean experience
        if (successAlert) {
          successAlert.style.display = "block";
          if (refCodeSpan) {
            refCodeSpan.textContent = `Reference ID: ${res.reference_id || "IF-APPLICATION-RECORDED"}`;
          }
          if (successMsgP) {
            successMsgP.textContent =
              res.confirmation_message ||
              formSettings?.confirmation_message ||
              "Thank you! Your response has been recorded. Our production directors will review your application and contact you soon.";
          }
          successAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else {
        throw new Error(res?.error || "Submission failed. Please check inputs and try again.");
      }
    } catch (err) {
      console.error("Audition submission error:", err);
      if (err.message && err.message.includes("closed")) {
        if (formClosedNotice) {
          formClosedNotice.style.display = "block";
          if (formClosedMessageText) formClosedMessageText.textContent = err.message;
        }
        form.style.display = "none";
      } else if (errorAlert) {
        errorAlert.style.display = "block";
        errorAlert.textContent = err.message || "Unable to send your submission. Please try again or reach out to impactframe.ee@charusat.ac.in.";
        errorAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  // Initialize form and settings
  initForm();
})();
