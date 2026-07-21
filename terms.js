
const TERMS_VERSION="DOMZOR-TC-2026-07-20-v1";
document.querySelector("#year").textContent=new Date().getFullYear();
document.querySelector("#print-terms")?.addEventListener("click",()=>window.print());
const form=document.querySelector("#terms-acceptance-form");
const statusEl=document.querySelector("#acceptance-status");
form?.addEventListener("submit",(event)=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const acceptance={
    version:TERMS_VERSION,
    acceptedAt:new Date().toISOString(),
    fullName:document.querySelector("#accept-name").value.trim(),
    email:document.querySelector("#accept-email").value.trim(),
    phone:document.querySelector("#accept-phone").value.trim(),
    readTerms:document.querySelector("#accept-read").checked,
    electronicConsent:document.querySelector("#accept-electronic").checked,
    acceptedTerms:document.querySelector("#accept-terms").checked,
    marketingPhotoConsent:document.querySelector("#accept-marketing-photos").checked
  };
  localStorage.setItem("domzorTermsAcceptance",JSON.stringify(acceptance));
  localStorage.setItem("domzorTermsVersion",TERMS_VERSION);
  statusEl.textContent="Acceptance saved on this device. You may now continue to the booking form. A confirmed appointment still requires DOMZOR's written acceptance and project-specific agreement.";
  setTimeout(()=>{window.location.href="pricing.html#booking";},1200);
});
