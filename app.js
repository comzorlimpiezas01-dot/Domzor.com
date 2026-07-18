const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
const dateField = document.querySelector('input[type="date"]');
if (dateField) dateField.min = new Date().toISOString().split('T')[0];
const form = document.querySelector('#estimate-form');
const status = document.querySelector('.form-status');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const lines = [
      'Hello DOMZOR, I would like a free estimate.',
      '',
      `Name: ${data.get('name') || ''}`,
      `Phone: ${data.get('phone') || ''}`,
      `Email: ${data.get('email') || 'Not provided'}`,
      `Service: ${data.get('service') || ''}`,
      `Preferred date: ${data.get('date') || 'Flexible'}`,
      `Preferred time: ${data.get('time') || 'Flexible'}`,
      `Address: ${data.get('address') || ''}`,
      `Project details: ${data.get('message') || ''}`
    ];
    const url = `https://wa.me/13127784975?text=${encodeURIComponent(lines.join('\n'))}`;
    if (status) status.textContent = 'Opening WhatsApp with your request…';
    window.open(url, '_blank', 'noopener');
  });
}
