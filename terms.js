
const TERMS_VERSION="DOMZOR-TC-2026-07-20-v1";

const year=document.querySelector("#year");
if(year) year.textContent=new Date().getFullYear();

document.querySelector("#print-terms")?.addEventListener("click",()=>window.print());

const form=document.querySelector("#terms-acceptance-form");
const statusEl=document.querySelector("#acceptance-status");

function getReturnUrl(){
  const params=new URLSearchParams(window.location.search);
  const fromQuery=params.get("return");
  const fromSession=sessionStorage.getItem("domzorTermsReturnUrl");
  const candidate=fromQuery || fromSession || "pricing.html#booking";

  // Only allow local relative destinations.
  if(candidate.startsWith("http:") || candidate.startsWith("https:") || candidate.startsWith("//")){
    return "pricing.html#booking";
  }
  return candidate;
}

form?.addEventListener("submit",(event)=>{
  event.preventDefault();
  if(!form.reportValidity()) return;

  const acceptance={
    version:TERMS_VERSION,
    acceptedAt:new Date().toISOString(),
    fullName:document.querySelector("#accept-name")?.value.trim() || "",
    email:document.querySelector("#accept-email")?.value.trim() || "",
    phone:document.querySelector("#accept-phone")?.value.trim() || "",
    readTerms:Boolean(document.querySelector("#accept-read")?.checked),
    electronicConsent:Boolean(document.querySelector("#accept-electronic")?.checked),
    acceptedTerms:Boolean(document.querySelector("#accept-terms")?.checked),
    marketingPhotoConsent:Boolean(document.querySelector("#accept-marketing-photos")?.checked)
  };

  try{
    localStorage.setItem("domzorTermsAcceptance",JSON.stringify(acceptance));
    localStorage.setItem("domzorTermsVersion",TERMS_VERSION);
    sessionStorage.setItem("domzorTermsAccepted","true");
  }catch(error){
    if(statusEl){
      statusEl.textContent=document.documentElement.lang==="es"
        ?"No fue posible guardar la aceptación en este navegador. Active el almacenamiento del sitio e inténtelo nuevamente."
        :"The acceptance could not be saved in this browser. Enable site storage and try again.";
    }
    return;
  }

  if(statusEl){
    statusEl.textContent=document.documentElement.lang==="es"
      ?"Aceptación guardada. Volviendo al formulario de reserva…"
      :"Acceptance saved. Returning to the booking form…";
  }

  const returnUrl=getReturnUrl();
  sessionStorage.removeItem("domzorTermsReturnUrl");
  window.setTimeout(()=>window.location.assign(returnUrl),500);
});
