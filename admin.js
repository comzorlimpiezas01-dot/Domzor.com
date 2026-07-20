(() => {
  if (!window.supabase || !window.DOMZOR_SUPABASE_URL || window.DOMZOR_SUPABASE_URL.startsWith("PASTE_")) return;
  const client = window.supabase.createClient(window.DOMZOR_SUPABASE_URL, window.DOMZOR_SUPABASE_ANON_KEY);
  const login = document.querySelector('#admin-login'), panel = document.querySelector('#admin-panel'), list = document.querySelector('#admin-list'), loginStatus = document.querySelector('#login-status');
  const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function refresh(){
    const {data,error}=await client.from('community_submissions').select('*').order('created_at',{ascending:false});
    if(error){list.innerHTML=`<p>${esc(error.message)}</p>`;return;}
    list.innerHTML=(data||[]).map(x=>`<article class="admin-item" data-id="${x.id}"><h3>${esc(x.customer_name)} · ${esc(x.service_type)}</h3><p>${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</p><p>${esc(x.comment)}</p><p><strong>Status:</strong> ${esc(x.status)}</p><div class="admin-photos">${x.before_url?`<a href="${encodeURI(x.before_url)}" target="_blank"><img src="${encodeURI(x.before_url)}" alt="Before"></a>`:''}${x.after_url?`<a href="${encodeURI(x.after_url)}" target="_blank"><img src="${encodeURI(x.after_url)}" alt="After"></a>`:''}</div><label>DOMZOR reply<textarea class="reply" rows="3">${esc(x.admin_reply||'')}</textarea></label><div class="admin-actions"><button class="approve" data-action="approved">Approve</button><button class="reject" data-action="rejected">Reject</button><button class="delete" data-action="delete">Delete</button></div></article>`).join('') || '<p>No submissions yet.</p>';
  }
  async function show(session){login.hidden=!!session;panel.hidden=!session;if(session) refresh();}
  document.querySelector('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const {error}=await client.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});loginStatus.textContent=error?error.message:'';});
  document.querySelector('#logout')?.addEventListener('click',()=>client.auth.signOut());
  list?.addEventListener('click',async e=>{const b=e.target.closest('button[data-action]');if(!b)return;const item=b.closest('.admin-item');const id=item.dataset.id;const action=b.dataset.action;if(action==='delete'){if(confirm('Delete permanently?'))await client.from('community_submissions').delete().eq('id',id);}else{await client.from('community_submissions').update({status:action,admin_reply:item.querySelector('.reply').value.trim()||null}).eq('id',id);}refresh();});
  client.auth.onAuthStateChange((_e,s)=>show(s));client.auth.getSession().then(({data})=>show(data.session));
})();
