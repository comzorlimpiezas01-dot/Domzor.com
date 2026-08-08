(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const status = $("#community-status");
  const form = $("#community-form");
  const approved = $("#community-approved");
  const empty = $("#approved-empty");
  const year = $("#community-year");
  if (year) year.textContent = new Date().getFullYear();

  let lang = "en";
  function t(en, es) { return lang === "es" ? es : en; }
  function setLang(next) {
    lang = next === "es" ? "es" : "en";
    document.documentElement.lang = lang;
    $$("[data-en][data-es]").forEach(el => {
      el.textContent = el.getAttribute(lang === "es" ? "data-es" : "data-en");
    });
    $$("[data-community-lang]").forEach(btn => {
      btn.setAttribute("aria-pressed", String(btn.dataset.communityLang === lang));
    });
  }
  $$("[data-community-lang]").forEach(btn => btn.addEventListener("click", () => setLang(btn.dataset.communityLang)));
  setLang("en");

  const configured =
    typeof window.DOMZOR_SUPABASE_URL === "string" &&
    /^https:\/\/.+\.supabase\.co$/i.test(window.DOMZOR_SUPABASE_URL) &&
    typeof window.DOMZOR_SUPABASE_ANON_KEY === "string" &&
    window.DOMZOR_SUPABASE_ANON_KEY.length > 20 &&
    !window.DOMZOR_SUPABASE_ANON_KEY.includes("PASTE_");

  if (!window.supabase || !configured) {
    if (status) {
      status.className = "community-status error";
      status.textContent = t(
        "Photo/review service is temporarily unavailable. DOMZOR's Supabase public configuration must be present.",
        "El servicio de fotos/reseñas no está disponible temporalmente. Debe estar presente la configuración pública de Supabase de DOMZOR."
      );
    }
    console.warn("DOMZOR community: Supabase is not configured.");
    return;
  }

  const client = window.supabase.createClient(
    window.DOMZOR_SUPABASE_URL,
    window.DOMZOR_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[ch]));

  const safeUrl = value => {
    try {
      const u = new URL(String(value || ""));
      return u.protocol === "https:" ? u.href : "";
    } catch { return ""; }
  };

  const stars = value => {
    const n = Math.max(1, Math.min(5, Number(value) || 5));
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  async function loadApproved() {
    if (!approved) return;
    approved.innerHTML = "";
    const { data, error } = await client
      .from("community_submissions")
      .select("id,customer_name,service_type,rating,comment,before_url,after_url,admin_reply,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("DOMZOR approved submissions:", error);
      if (empty) {
        empty.hidden = false;
        empty.textContent = t("Approved submissions could not be loaded right now.", "No se pudieron cargar las publicaciones aprobadas en este momento.");
      }
      return;
    }

    if (!data || !data.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    approved.innerHTML = data.map(item => {
      const before = safeUrl(item.before_url);
      const after = safeUrl(item.after_url);
      const photo = after || before;
      const image = photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(item.service_type || "DOMZOR project")}" loading="lazy" decoding="async">` : "";
      const links = before && after
        ? `<p><a href="${escapeHtml(before)}" target="_blank" rel="noopener noreferrer">Before</a> · <a href="${escapeHtml(after)}" target="_blank" rel="noopener noreferrer">After</a></p>`
        : "";
      const reply = item.admin_reply ? `<p><strong>DOMZOR:</strong> ${escapeHtml(item.admin_reply)}</p>` : "";
      return `<article class="approved-card">
        ${image}
        <div class="stars" aria-label="${Number(item.rating) || 5} out of 5 stars">${stars(item.rating)}</div>
        <p>${escapeHtml(item.comment || "")}</p>
        <p><strong>${escapeHtml(item.customer_name || "Customer")}</strong>${item.service_type ? ` · ${escapeHtml(item.service_type)}` : ""}</p>
        ${links}${reply}
      </article>`;
    }).join("");
  }

  async function uploadPhoto(file, submissionId, label) {
    if (!file || !file.size) return null;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      throw new Error(t("Only JPG, PNG and WebP images are allowed.", "Solo se permiten imágenes JPG, PNG y WebP."));
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(t("Each image must be 8 MB or smaller.", "Cada imagen debe pesar 8 MB o menos."));
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${submissionId}/${label}-${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from("community-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (error) throw error;
    const { data } = client.storage.from("community-photos").getPublicUrl(path);
    return data?.publicUrl || null;
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    status.className = "community-status";

    if (!form.checkValidity()) {
      form.reportValidity();
      status.className = "community-status error";
      status.textContent = t("Please complete all required fields.", "Complete todos los campos obligatorios.");
      return;
    }

    const fd = new FormData(form);
    const customerName = String(fd.get("customer_name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const comment = String(fd.get("comment") || "").trim();
    const consent = fd.get("consent") === "on";

    if (customerName.length < 2 || customerName.length > 80 || comment.length < 3 || comment.length > 1000 || !consent) {
      status.className = "community-status error";
      status.textContent = t("Please review the form fields and authorization.", "Revise los campos del formulario y la autorización.");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    status.textContent = t("Submitting securely…", "Enviando de forma segura…");

    try {
      const id = crypto.randomUUID();
      const beforeFile = fd.get("before_photo");
      const afterFile = fd.get("after_photo");
      const [before_url, after_url] = await Promise.all([
        uploadPhoto(beforeFile, id, "before"),
        uploadPhoto(afterFile, id, "after")
      ]);

      const payload = {
        id,
        customer_name: customerName,
        email,
        phone: String(fd.get("phone") || "").trim() || null,
        service_type: String(fd.get("service_type") || "").trim(),
        rating: Math.max(1, Math.min(5, Number(fd.get("rating")) || 5)),
        comment,
        before_url,
        after_url,
        consent: true,
        status: "pending",
        admin_reply: null
      };

      const { error } = await client.from("community_submissions").insert(payload);
      if (error) throw error;

      form.reset();
      status.className = "community-status success";
      status.textContent = t(
        "Thank you. Your submission is pending approval.",
        "Gracias. Tu publicación está pendiente de aprobación."
      );
    } catch (error) {
      console.error("DOMZOR community submit:", error);
      status.className = "community-status error";
      status.textContent = t(
        "We could not submit this right now. Please try again or contact DOMZOR.",
        "No pudimos enviar esto en este momento. Inténtalo de nuevo o comunícate con DOMZOR."
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  loadApproved();
})();
