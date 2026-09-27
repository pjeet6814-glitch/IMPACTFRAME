/**
 * form-engine.js — IMPACTFRAME Universal Dynamic Form Engine
 * Powers Auditions, Join Crew, and Event Seat Reservation forms.
 * Supports:
 * - Dynamic Form Settings (Title, Description, Banner, Accepting Responses toggle)
 * - QR Code Photo display with custom instructions (UPI, WhatsApp, Registration)
 * - Photo / File Upload with instant client-side preview & compression
 * - Question types: Short Answer, Paragraph, Multiple Choice, Checkboxes (with Other write-in),
 *   Dropdown, Linear Scales / Ratings (1-5, 1-10), Date, Time, Number, Tel, Email, URL, File, Photo, Section Headers
 * - Presets and pre-fills (e.g. clicking "Register" on an event pre-selects the event in dropdown)
 */

(function () {
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initFormEngine() {
    const containers = document.querySelectorAll("[data-form-type]");
    if (!containers || containers.length === 0) return;

    containers.forEach((container) => {
      setupFormInstance(container);
    });
  }

  async function setupFormInstance(container) {
    const formType = (container.dataset.formType || "auditions").toLowerCase().trim();

    const form = container.querySelector("form.modal-form") || container.querySelector("form");
    const fieldsContainer = container.querySelector("#dynamic-fields-container");
    const qrContainer = container.querySelector("#form-qr-container");
    const formDisplayTitle = container.querySelector("#form-display-title");
    const formDisplayDesc = container.querySelector("#form-display-desc");
    const formClosedNotice = container.querySelector("#form-closed-notice");
    const formClosedMessageText = container.querySelector("#form-closed-message-text");
    const formStatusIndicator = container.querySelector("#form-status-indicator");
    const successAlert = container.querySelector("#form-success-alert") || container.querySelector("#apply-success-alert");
    const refCodeSpan = container.querySelector("#form-ref-code") || container.querySelector("#application-ref-code");
    const successMsgP = container.querySelector("#form-success-message") || container.querySelector("#apply-success-message");
    const errorAlert = container.querySelector("#form-error-alert") || container.querySelector("#apply-error-alert");
    const submitBtn = container.querySelector("#form-submit-btn") || container.querySelector("#apply-submit-btn");

    if (!form || !fieldsContainer) return;

    let loadedFields = [];
    let formSettings = null;
    const uploadedFiles = {}; // field_key -> base64 data URL

    try {
      // 1. Load Form Header & Behavior Settings
      formSettings = await window.impactframeApi.getFormSettings(formType);

      if (formDisplayTitle && formSettings.form_title) {
        formDisplayTitle.textContent = formSettings.form_title;
        if (formType === "auditions" && document.title.includes("Auditions")) {
          document.title = `${formSettings.form_title} — IMPACTFRAME`;
        }
      }
      if (formDisplayDesc && formSettings.form_description) {
        formDisplayDesc.textContent = formSettings.form_description;
      }

      // 2. Render QR Code Photo Banner if configured
      if (qrContainer) {
        if (formSettings.qr_code_image && formSettings.qr_code_image.trim()) {
          qrContainer.style.display = "block";
          qrContainer.innerHTML = `
            <div class="form-qr-card sprocket-frame" style="background: rgba(18, 34, 28, 0.85); border: 1px solid var(--navy-mid); border-radius: var(--radius); padding: 18px 22px; margin-bottom: 24px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
              <div style="background: #ffffff; padding: 10px; border-radius: 8px; line-height: 0; box-shadow: 0 4px 14px rgba(0,0,0,0.5); flex-shrink: 0;">
                <img src="${escapeHtml(formSettings.qr_code_image)}" alt="QR Code" style="width: 140px; height: 140px; object-fit: contain; display: block;" />
              </div>
              <div style="flex: 1; min-width: 220px;">
                <div class="hud-pill" style="margin-bottom: 6px;"><span class="rec-dot"></span> SCAN QR CODE</div>
                <h4 style="margin: 0 0 6px; color: var(--paper); font-size: 1.2rem;">${escapeHtml(formSettings.qr_code_title || "Official IMPACTFRAME QR Code")}</h4>
                <p style="margin: 0; color: var(--parchment-dim); font-size: 0.9rem; line-height: 1.5;">${escapeHtml(formSettings.qr_code_instruction || "Scan with your phone camera or payment app to complete this step.")}</p>
              </div>
            </div>
          `;
        } else {
          qrContainer.style.display = "none";
          qrContainer.innerHTML = "";
        }
      }

      // 3. Check if form is currently accepting responses
      if (formSettings && formSettings.is_accepting_responses === false) {
        if (formClosedNotice) {
          formClosedNotice.style.display = "block";
          if (formClosedMessageText) {
            formClosedMessageText.textContent =
              formSettings.closed_message ||
              "This form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!";
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
        formStatusIndicator.innerHTML = '<span class="rec-dot"></span> LIVE FORM';
      }

      await loadQuestions();
    } catch (err) {
      console.warn("Notice during form init:", err);
      await loadQuestions();
    }

    async function loadQuestions() {
      try {
        fieldsContainer.innerHTML = '<p class="state-msg" style="color: var(--parchment-dim);">Loading questions…</p>';
        loadedFields = await window.impactframeApi.getFormFields(formType);

        if (!loadedFields || loadedFields.length === 0) {
          fieldsContainer.innerHTML = '<p class="state-msg" style="color: var(--parchment-dim);">No active questions found. Please check back shortly.</p>';
          return;
        }

        renderQuestions(loadedFields);
        checkUrlPrefills();
      } catch (err) {
        console.error("Failed to load questions:", err);
        fieldsContainer.innerHTML = '<p class="state-msg" style="color: #ff9999;">Could not connect to live form service.</p>';
      }
    }

    function checkUrlPrefills() {
      // If URL has ?event=... or ?track=... prefill the corresponding input
      const params = new URLSearchParams(window.location.search);
      const eventParam = params.get("event");
      const trackParam = params.get("track");

      if (eventParam) {
        const eventSelect = form.querySelector('[name="event_selected"]') || form.querySelector("#field-event_selected");
        if (eventSelect) {
          Array.from(eventSelect.options).forEach((opt) => {
            if (opt.text.toLowerCase().includes(eventParam.toLowerCase()) || opt.value.toLowerCase().includes(eventParam.toLowerCase())) {
              eventSelect.value = opt.value;
            }
          });
        }
      }

      if (trackParam) {
        const trackSelect = form.querySelector('[name="track_interest"]') || form.querySelector("#field-track_interest");
        if (trackSelect) {
          Array.from(trackSelect.options).forEach((opt) => {
            if (opt.text.toLowerCase().includes(trackParam.toLowerCase()) || opt.value.toLowerCase().includes(trackParam.toLowerCase())) {
              trackSelect.value = opt.value;
            }
          });
        }
      }
    }

    function renderQuestions(fields) {
      fieldsContainer.innerHTML = "";

      fields.forEach((field) => {
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
          fieldsContainer.appendChild(sectionCard);
          return;
        }

        // ==========================================
        // QUESTION CARD
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

        // Helper description
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

        // ==========================================
        // QUESTION TYPES RENDERING
        // ==========================================
        if (fType === "photo" || fType === "file") {
          // ================= PHOTO / FILE UPLOAD =================
          const uploadWrap = document.createElement("div");
          uploadWrap.style.cssText = "margin-top: 4px;";
          uploadWrap.innerHTML = `
            <div id="dropzone-${field.field_key}" style="border: 2px dashed var(--navy-mid); border-radius: var(--radius); padding: 22px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(10, 20, 18, 0.35);">
              <input type="file" id="file-input-${field.field_key}" accept="image/*,.pdf,.doc,.docx" style="display: none;" />
              <div id="prompt-${field.field_key}">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--leaf-light)" stroke-width="1.8" style="margin: 0 auto 8px; display: block;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <div style="font-weight: 600; color: var(--paper); font-size: 0.95rem;">Click or drag to upload photo / file</div>
                <div style="color: var(--parchment-dim); font-size: 0.82rem; margin-top: 4px;">Supports PNG, JPG, WEBP, or screenshot (max 10MB)</div>
              </div>
              <div id="preview-${field.field_key}" style="display: none; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;">
                <img id="img-prev-${field.field_key}" src="" style="max-height: 140px; max-width: 200px; object-fit: contain; border-radius: 6px; border: 1px solid var(--navy-mid); background: #000;" />
                <div style="text-align: left;">
                  <div id="file-name-${field.field_key}" style="font-weight: 600; color: var(--paper); font-size: 0.9rem;"></div>
                  <div id="file-size-${field.field_key}" style="color: var(--parchment-dim); font-size: 0.8rem; margin: 2px 0 6px;"></div>
                  <button type="button" class="btn btn-ghost btn-sm" id="remove-file-${field.field_key}" style="padding: 4px 10px; font-size: 0.78rem; color: #ff8888; border-color: rgba(255, 136, 136, 0.4);">
                    &times; Remove Photo
                  </button>
                </div>
              </div>
            </div>
            <input type="hidden" id="field-${field.field_key}" name="${field.field_key}" value="" />
          `;

          const dropzone = uploadWrap.querySelector(`#dropzone-${field.field_key}`);
          const fileInput = uploadWrap.querySelector(`#file-input-${field.field_key}`);
          const promptEl = uploadWrap.querySelector(`#prompt-${field.field_key}`);
          const previewEl = uploadWrap.querySelector(`#preview-${field.field_key}`);
          const imgPrev = uploadWrap.querySelector(`#img-prev-${field.field_key}`);
          const fileNameEl = uploadWrap.querySelector(`#file-name-${field.field_key}`);
          const fileSizeEl = uploadWrap.querySelector(`#file-size-${field.field_key}`);
          const removeBtn = uploadWrap.querySelector(`#remove-file-${field.field_key}`);
          const hiddenInput = uploadWrap.querySelector(`#field-${field.field_key}`);

          dropzone.addEventListener("click", (e) => {
            if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
              fileInput.click();
            }
          });

          dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "var(--leaf)";
            dropzone.style.background = "rgba(42, 75, 48, 0.3)";
          });

          dropzone.addEventListener("dragleave", () => {
            dropzone.style.borderColor = "var(--navy-mid)";
            dropzone.style.background = "rgba(10, 20, 18, 0.35)";
          });

          dropzone.addEventListener("drop", async (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "var(--navy-mid)";
            dropzone.style.background = "rgba(10, 20, 18, 0.35)";
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              await handleFile(e.dataTransfer.files[0]);
            }
          });

          fileInput.addEventListener("change", async () => {
            if (fileInput.files && fileInput.files[0]) {
              await handleFile(fileInput.files[0]);
            }
          });

          async function handleFile(file) {
            try {
              promptEl.style.display = "none";
              previewEl.style.display = "flex";
              fileNameEl.textContent = file.name;
              fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;

              const dataUrl = await window.impactframeApi.fileToDataUrl(file);
              uploadedFiles[field.field_key] = dataUrl;
              hiddenInput.value = dataUrl;
              if (file.type.startsWith("image/")) {
                imgPrev.src = dataUrl;
                imgPrev.style.display = "block";
              } else {
                imgPrev.style.display = "none";
              }
            } catch (err) {
              alert("Failed to process file: " + err.message);
            }
          }

          removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInput.value = "";
            hiddenInput.value = "";
            delete uploadedFiles[field.field_key];
            promptEl.style.display = "block";
            previewEl.style.display = "none";
            imgPrev.src = "";
          });

          group.appendChild(uploadWrap);
        } else if (fType === "radio") {
          // ================= MULTIPLE CHOICE (RADIO) =================
          const choicesContainer = document.createElement("div");
          choicesContainer.className = "choices-list";
          choicesContainer.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin-top: 4px;";

          optionsList.forEach((optText) => {
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

          optionsList.forEach((optText) => {
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
          // ================= LINEAR SCALE / RATING =================
          const scaleWrap = document.createElement("div");
          scaleWrap.className = "linear-scale-wrap";
          scaleWrap.style.cssText = "display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 8px;";

          if (field.scale_min_label) {
            const minLbl = document.createElement("span");
            minLbl.style.cssText = "font-size: 0.85rem; color: var(--parchment-dim); max-width: 140px;";
            minLbl.textContent = field.scale_min_label;
            scaleWrap.appendChild(minLbl);
          }

          const buttonsRow = document.createElement("div");
          buttonsRow.style.cssText = "display: flex; align-items: center; gap: 12px; flex-wrap: wrap;";
          const min = field.scale_min ?? 1;
          const max = field.scale_max ?? 5;

          for (let i = min; i <= max; i++) {
            const radioItem = document.createElement("label");
            radioItem.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; color: var(--paper); font-size: 0.88rem;";
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
          // ================= SHORT ANSWER / DATE / TIME / NUMBER / EMAIL / TEL / URL =================
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

        fieldsContainer.appendChild(group);
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

      loadedFields.forEach((field) => {
        const fType = (field.type || "text").toLowerCase();
        if (fType === "section") return;

        const key = field.field_key;

        if (fType === "photo" || fType === "file") {
          const val = uploadedFiles[key] || "";
          if (field.required && !val && !missingRequiredField) {
            missingRequiredField = field.label;
          }
          if (val) formData[key] = val;
        } else if (fType === "radio") {
          const checkedRadio = form.querySelector(`input[name="${key}"]:checked`);
          let val = "";
          if (checkedRadio) {
            if (checkedRadio.value === "__other__") {
              const otherInput = form.querySelector(`#other-input-${key}`);
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
          const otherCb = form.querySelector(`#checkbox-other-${key}`);
          if (otherCb && otherCb.checked) {
            const otherInput = form.querySelector(`#checkbox-other-input-${key}`);
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
          const el = form.querySelector(`#field-${key}`);
          const val = el ? el.value.trim() : "";
          if (field.required && !val && !missingRequiredField) {
            missingRequiredField = field.label;
          }
          if (val) formData[key] = val;
        }
      });

      if (missingRequiredField) {
        if (errorAlert) {
          errorAlert.textContent = `Please complete the required field: "${missingRequiredField}"`;
          errorAlert.style.display = "block";
          errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // Check name & email if they exist under standard aliases
      const nameVal = formData.full_name || formData.name || formData.applicant_name || formData.your_name;
      const emailVal = formData.email || formData.applicant_email || formData.email_address;
      if (!nameVal || !emailVal) {
        // Fallback: auto-populate from first text/email field if not named full_name/email
        const textKey = Object.keys(formData).find((k) => typeof formData[k] === "string" && formData[k].length > 2);
        if (textKey && !nameVal) formData.full_name = formData[textKey];
        const emailKey = Object.keys(formData).find((k) => typeof formData[k] === "string" && formData[k].includes("@"));
        if (emailKey && !emailVal) formData.email = formData[emailKey];
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting…";
      }

      try {
        const res = await window.impactframeApi.submitApplication(formData, formType);
        if (res.success) {
          form.reset();
          Object.keys(uploadedFiles).forEach((k) => delete uploadedFiles[k]);
          form.style.display = "none";
          if (qrContainer) qrContainer.style.display = "none";

          if (successAlert) {
            if (refCodeSpan) {
              refCodeSpan.textContent = `Reference ID: ${res.reference_id || "IF-CONFIRMED"}`;
            }
            if (successMsgP) {
              successMsgP.textContent = res.confirmation_message || formSettings?.confirmation_message || "Thank you! Your response has been recorded.";
            }
            successAlert.style.display = "block";
            successAlert.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      } catch (err) {
        if (errorAlert) {
          errorAlert.textContent = err.message || "Failed to submit. Please check your network connection.";
          errorAlert.style.display = "block";
          errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Application \u2192";
        }
      }
    });
  }

  // Auto-init on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFormEngine);
  } else {
    initFormEngine();
  }
})();
