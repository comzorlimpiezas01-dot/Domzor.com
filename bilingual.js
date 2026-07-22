
(function(){
  const KEY='domzorLanguage';
  const getLang=()=>localStorage.getItem(KEY)||document.documentElement.lang||'en';
  function apply(lang){
    lang = lang === 'es' ? 'es' : 'en';
    localStorage.setItem(KEY,lang);
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-en][data-es]').forEach(el=>{
      const value=el.getAttribute(lang==='es'?'data-es':'data-en');
      if(el.matches('input,textarea')) el.placeholder=value;
      else if(el.tagName==='OPTION') el.textContent=value;
      else el.textContent=value;
    });
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      const active=btn.dataset.lang===lang;
      btn.setAttribute('aria-pressed',active?'true':'false');
      btn.classList.toggle('active',active);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    let buttons=document.querySelectorAll('.lang-btn');
    if(!buttons.length){
      const holder=document.createElement('div');
      holder.className='global-language-switcher';
      holder.innerHTML='<button class="lang-btn" data-lang="en" type="button">EN</button><button class="lang-btn" data-lang="es" type="button">ES</button>';
      const target=document.querySelector('.header-inner')||document.querySelector('header')||document.body;
      target.appendChild(holder);
      buttons=holder.querySelectorAll('.lang-btn');
    }
    buttons.forEach(btn=>btn.addEventListener('click',()=>apply(btn.dataset.lang)));
    apply(getLang());
  });
})();
