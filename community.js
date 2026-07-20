(() => {
  const configured = window.DOMZOR_SUPABASE_URL && !window.DOMZOR_SUPABASE_URL.startsWith("PASTE_") && window.DOMZOR_SUPABASE_ANON_KEY && !window.DOMZOR_SUPABASE_ANON_KEY.startsWith("PASTE_");
  if (!configured || !window.supabase) {
    console.info("DOMZOR community features are waiting for Supabase configuration.");
    return;
  }
  const client = window.supabase.createClient(window.DOMZOR_SUPABASE_URL, window.DOMZOR_SUPABASE_ANON_KEY);
  const form = document.querySelector("#community-form");
  const status = document.querySelector("#community-status");
  const reviews = document.querySelector("#community-reviews");
  const gallery = document.querySelector("#community-gallery");

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const stars = n => "★".repeat(Number(n || 0)) + "☆".repeat(5 - Number(n || 0));

  async function loadApproved() {
    const { data, error } = await client.from("community_submissions").select("id,customer_name,service_type,rating,comment,before_url,after_url,admin_reply,created_at").eq("status","approved").order("created_at",{ascending:false}).limit(30);
    if (error) { console.error(error); return; }
    if (data?.length) {
      reviews.innerHTML = data.filter(x => x.comment).map(x => `<blockquote><div class="stars">${stars(x.rating)}</div><p>“${escapeHtml(x.comment)}”</p><footer>${escapeHtml(x.customer_name)} · ${escapeHtml(x.service_type)}</footer>${x.admin_reply ? `<div class="review-reply"><strong>DOMZOR:</strong> ${escapeHtml(x.admin_reply)}</div>` : ""}</blockquote>`).join("");
      const projects = data.filter(x => x.before_url || x.after_url);
      if (projects.length) gallery.innerHTML = projects.map(x => `<figure class="gallery-card">${x.after_url ? `<img src="${encodeURI(x.after_url)}" alt="${escapeHtml(x.service_type)} result" loading="lazy" decoding="async">` : `<img src="${encodeURI(x.before_url)}" alt="${escapeHtml(x.service_type)} before" loading="lazy" decoding="async">`}<figcaption>${escapeHtml(x.service_type)}</figcaption><div class="gallery-meta">${x.before_url && x.after_url ? `<a href="${encodeURI(x.before_url)}" target="_blank" rel="noopener">Before</a> · <a href="${encodeURI(x.after_url)}" target="_blank" rel="noopener">After</a>` : ""}</div></figure>`).join("");
    }
  }

  async function upload(file, folder) {
    if (!file) return null;
    if (file.size > 8 * 1024 * 1024) throw new Error("Each image must be 8 MB or smaller.");
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error("Only JPG, PNG and WebP images are allowed.");
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from("community-photos").upload(path,file,{cacheControl:"3600",upsert:false});
    if (error) throw error;
    return client.storage.from("community-photos").getPublicUrl(path).data.publicUrl;
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "Uploading… / Subiendo…";
    const fd = new FormData(form);
    try {
      const submissionId = crypto.randomUUID();
      const [before_url, after_url] = await Promise.all([
        upload(fd.get("before_photo")?.size ? fd.get("before_photo") : null, `${submissionId}/before`),
        upload(fd.get("after_photo")?.size ? fd.get("after_photo") : null, `${submissionId}/after`)
      ]);
      const payload = {
        id: submissionId,
        customer_name: String(fd.get("customer_name") || "").trim(),
        email: String(fd.get("email") || "").trim().toLowerCase(),
        service_type: String(fd.get("service_type") || ""),
        rating: Number(fd.get("rating")),
        comment: String(fd.get("comment") || "").trim(),
        before_url, after_url,
        consent: fd.get("consent") === "on",
        status: "pending"
      };
      const { error } = await client.from("community_submissions").insert(payload);
      if (error) throw error;
      form.reset();
      status.textContent = "Thank you. Your submission is pending approval. / Gracias. Tu publicación está pendiente de aprobación.";
    } catch (error) {
      console.error(error);
      status.textContent = `Unable to submit: ${error.message}`;
    }
  });
  loadApproved();
})();
