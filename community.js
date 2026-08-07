(() => {
  const configured = window.DOMZOR_SUPABASE_URL
    && window.DOMZOR_SUPABASE_URL.startsWith("https://")
    && window.DOMZOR_SUPABASE_ANON_KEY
    && !window.DOMZOR_SUPABASE_ANON_KEY.includes("...");

  const status = document.querySelector("#community-status");
  if (!configured || !window.supabase) {
    if (status) status.textContent = "Community service is temporarily unavailable. / El servicio de la comunidad no está disponible temporalmente.";
    return;
  }

  const client = window.supabase.createClient(window.DOMZOR_SUPABASE_URL, window.DOMZOR_SUPABASE_ANON_KEY);
  const form = document.querySelector("#community-form");
  const reviews = document.querySelector("#community-reviews");
  const gallery = document.querySelector("#community-gallery");
  const submitButton = form?.querySelector('button[type="submit"]');
  const googleReviewBox = document.querySelector("#google-review-box");
  const googleReviewLink = document.querySelector("#google-review-link");
  if (googleReviewLink && window.DOMZOR_GOOGLE_REVIEW_URL) googleReviewLink.href = window.DOMZOR_GOOGLE_REVIEW_URL;

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const stars = n => "★".repeat(Math.max(0, Math.min(5, Number(n || 0)))) + "☆".repeat(Math.max(0, 5 - Number(n || 0)));
  const safePublicPhotoUrl = value => {
    if (!value) return "";
    try {
      const url = new URL(value);
      const expectedHost = new URL(window.DOMZOR_SUPABASE_URL).host;
      const expectedPath = "/storage/v1/object/public/community-photos/";
      return url.protocol === "https:" && url.host === expectedHost && url.pathname.startsWith(expectedPath) ? url.href : "";
    } catch { return ""; }
  };

  async function loadApproved() {
    const { data, error } = await client
      .from("community_submissions")
      .select("id,customer_name,service_type,rating,comment,before_url,after_url,admin_reply,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("Unable to load community submissions", error);
      if (reviews) reviews.innerHTML = '<p class="community-empty">Reviews are temporarily unavailable. / Las reseñas no están disponibles temporalmente.</p>';
      return;
    }

    const rows = data || [];
    const reviewRows = rows.filter(x => x.comment);
    if (reviews) {
      reviews.innerHTML = reviewRows.length
        ? reviewRows.map(x => `<blockquote><div class="stars" aria-label="${Number(x.rating)} out of 5 stars">${stars(x.rating)}</div><p>“${escapeHtml(x.comment)}”</p><footer>${escapeHtml(x.customer_name)} · ${escapeHtml(x.service_type)}</footer>${x.admin_reply ? `<div class="review-reply"><strong>DOMZOR:</strong> ${escapeHtml(x.admin_reply)}</div>` : ""}</blockquote>`).join("")
        : '<p class="community-empty">Be the first to share your experience. / Sé el primero en compartir tu experiencia.</p>';
    }

    const projects = rows.map(x => ({...x, before: safePublicPhotoUrl(x.before_url), after: safePublicPhotoUrl(x.after_url)})).filter(x => x.before || x.after);
    if (gallery) {
      gallery.innerHTML = projects.length
        ? projects.map(x => `<figure class="gallery-card community-project">${x.before && x.after ? `<div class="community-photo-pair"><div><span>Before / Antes</span><img src="${escapeHtml(x.before)}" alt="Before: ${escapeHtml(x.service_type)}" loading="lazy" decoding="async"></div><div><span>After / Después</span><img src="${escapeHtml(x.after)}" alt="After: ${escapeHtml(x.service_type)}" loading="lazy" decoding="async"></div></div>` : `<img src="${escapeHtml(x.after || x.before)}" alt="${escapeHtml(x.service_type)} project" loading="lazy" decoding="async">`}<figcaption>${escapeHtml(x.service_type)} · ${escapeHtml(x.customer_name)}</figcaption></figure>`).join("")
        : '<p class="community-empty">Project photos will appear here as customers share them. / Las fotos de proyectos aparecerán aquí cuando los clientes las compartan.</p>';
    }
  }

  async function upload(file, folder) {
    if (!file) return null;
    if (file.size > 8 * 1024 * 1024) throw new Error("Each image must be 8 MB or smaller. / Cada imagen debe pesar 8 MB o menos.");
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error("Only JPG, PNG and WebP images are allowed. / Solo se permiten imágenes JPG, PNG y WebP.");
    const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from("community-photos").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    return client.storage.from("community-photos").getPublicUrl(path).data.publicUrl;
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    status.textContent = "Publishing… / Publicando…";
    if (submitButton) submitButton.disabled = true;
    const fd = new FormData(form);
    try {
      const submissionId = crypto.randomUUID();
      const beforeFile = fd.get("before_photo");
      const afterFile = fd.get("after_photo");
      const [before_url, after_url] = await Promise.all([
        upload(beforeFile?.size ? beforeFile : null, `${submissionId}/before`),
        upload(afterFile?.size ? afterFile : null, `${submissionId}/after`)
      ]);
      const payload = {
        id: submissionId,
        customer_name: String(fd.get("customer_name") || "").trim(),
        email: String(fd.get("email") || "").trim().toLowerCase(),
        phone: String(fd.get("phone") || "").trim() || null,
        service_type: String(fd.get("service_type") || "").trim(),
        rating: Number(fd.get("rating")),
        comment: String(fd.get("comment") || "").trim(),
        before_url,
        after_url,
        consent: fd.get("consent") === "on",
        status: "approved",
        admin_reply: null
      };
      const { error } = await client.from("community_submissions").insert(payload);
      if (error) throw error;
      form.reset();
      status.textContent = "Published successfully. Thank you! / Publicado correctamente. ¡Gracias!";
      if (googleReviewBox) {
        googleReviewBox.hidden = false;
        googleReviewBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      await loadApproved();
    } catch (error) {
      console.error(error);
      status.textContent = `Unable to publish / No se pudo publicar: ${error.message}`;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  loadApproved();
})();
