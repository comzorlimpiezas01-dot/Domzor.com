
document.querySelectorAll(".year").forEach(el=>el.textContent=new Date().getFullYear());
const current=document.body.dataset.page;
document.querySelectorAll(".legal-topnav a").forEach(a=>{
  const href=a.getAttribute("href")||"";
  if((current==="index"&&href==="index.html")||(current==="privacy"&&href==="privacy.html")||(current==="cancellation"&&href==="cancellation-policy.html")||(current==="photos"&&href==="photo-release.html")||(current==="esign"&&href==="electronic-signature.html")){a.setAttribute("aria-current","page");}
});
