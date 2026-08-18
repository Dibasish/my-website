/* ─── app.js ─── */
'use strict';

/* ═══════════════════════════════
   CONSTANTS — Update these!
═══════════════════════════════ */
const CONFIG = {
  whatsappNumber:  '916002929539',
  upiId:           '8822309768-2@axl',
  artistName:      'Dibasish Borah',
  artistEmail:     'borahdibasish@gmail.com',
  instagramUrl:    'https://www.instagram.com/dibasish_borah/',
  // ─── EmailJS — see SETUP.md for step-by-step instructions ───
  emailjsPublicKey:        '',   // ← Your EmailJS Public Key
  emailjsServiceId:        '',   // ← Your EmailJS Service ID
  emailjsAdminTemplateId:  '',   // ← Template ID for admin notification
  emailjsClientTemplateId: '',   // ← Template ID for client receipt
  // ─── Webhook (Make.com / Zapier / n8n) ───
  webhookUrl: '',
};

// NOTE: Instagram does not allow frontend websites to fetch live view counts or covers automatically 
// without a complex backend API. You will need to manually update these view counts from time to time.
const REELS = [
  { id: 'C-p7XpdIfvb', title: 'Original Composition 1', views: '24.5K' },
  { id: 'DL7wAdLM8QN', title: 'Original Composition 2', views: '18.2K' },
  { id: 'DWMWl3AE3y0', title: 'Original Composition 3', views: '12.8K' },
  { id: 'DJcDw63znXv', title: 'Original Composition 4', views: '45.1K' },
  { id: 'C6ZjoOQLPsy', title: 'Original Composition 5', views: '9.3K'  },
  { id: 'DA3ss5cIAms', title: 'Original Composition 6', views: '32.7K' },
  { id: 'DDCh8dYoXLi', title: 'Original Composition 7', views: '8.4K'  },
  { id: 'C8xIUMLyhnv', title: 'Original Composition 8', views: '15.6K' },
  { id: 'C46ODPMsGeX', title: 'Original Composition 9', views: '21.0K' },
];

/* ═══════════════════════════════
   DOM ELEMENTS
═══════════════════════════════ */
const $ = (id) => document.getElementById(id);

const header       = $('site-header');
const form         = $('booking-form');
const amountInput  = $('project-amount');
const depositDisp  = $('deposit-display');
const depositAmt   = $('deposit-amount');
const copyBtn      = $('copy-upi-btn');
const copyIcon     = $('copy-icon');
const copiedIcon   = $('copied-icon');
const submitBtn    = $('submit-btn');
const formSuccess  = $('form-success');
const bottomBar    = $('bottom-bar');
const bottomBook   = $('bottom-book-btn');
const reelsGrid    = $('reels-grid');

/* ═══════════════════════════════
   HEADER SCROLL EFFECT
═══════════════════════════════ */
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 10);
  lastScroll = y;
}, { passive: true });

/* ═══════════════════════════════
   BOTTOM BAR — hide/show on scroll
═══════════════════════════════ */
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      // Always show bottom bar (subtle hide/show removed for UX simplicity)
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

/* ═══════════════════════════════
   BOTTOM BAR — Book Now scroll
═══════════════════════════════ */
bottomBook?.addEventListener('click', () => {
  document.getElementById('booking-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ═══════════════════════════════
   UPI DEEP LINK — Build URL
═══════════════════════════════ */
let paymentConfirmed = false;   // tracks "I Have Completed Payment" tap
let currentDeposit   = 0;       // current calculated deposit amount

function buildUpiUrl(depositAmount) {
  const name = encodeURIComponent(CONFIG.artistName);
  return `upi://pay?pa=${CONFIG.upiId}&pn=${name}&am=${depositAmount}&cu=INR`;
}

function updateUpiDeepLink(deposit) {
  const upiPayBtn     = $('upi-pay-btn');
  const upiPayBtnText = $('upi-pay-btn-text');
  const upiQrLink     = $('upi-qr-link');
  const deepSection   = $('upi-deeplink-section');

  if (!upiPayBtn) return;

  if (deposit > 0) {
    const upiUrl = buildUpiUrl(deposit);
    upiPayBtn.href    = upiUrl;
    upiQrLink.href    = upiUrl;
    if (upiPayBtnText) upiPayBtnText.textContent = `Open UPI App to Pay ₹${deposit.toLocaleString('en-IN')}`;
    if (deepSection)  deepSection.classList.add('active');
  } else {
    upiPayBtn.href    = '#';
    upiQrLink.href    = '#';
    if (upiPayBtnText) upiPayBtnText.textContent = `Open UPI App to Pay ₹—`;
    if (deepSection)  deepSection.classList.remove('active');
  }
}

/* ═══════════════════════════════
   DEPOSIT CALCULATOR
═══════════════════════════════ */
amountInput?.addEventListener('input', () => {
  const val = parseFloat(amountInput.value);
  const totalDisplay   = $('total-amount-display');
  const balanceDisplay = $('balance-amount-display');

  if (val && val >= 1) {
    const deposit = Math.ceil(val * 0.30);
    const balance = val - deposit;
    currentDeposit = deposit;

    // Update three-row breakdown
    if (totalDisplay)   totalDisplay.textContent   = '₹ ' + val.toLocaleString('en-IN');
    depositAmt.textContent                         = '₹ ' + deposit.toLocaleString('en-IN');
    if (balanceDisplay) balanceDisplay.textContent = '₹ ' + balance.toLocaleString('en-IN');

    depositDisp.classList.add('visible');
    updateUpiDeepLink(deposit);
  } else {
    currentDeposit = 0;
    if (totalDisplay)   totalDisplay.textContent   = '₹ —';
    depositAmt.textContent                         = '₹ —';
    if (balanceDisplay) balanceDisplay.textContent = '₹ —';
    depositDisp.classList.remove('visible');
    updateUpiDeepLink(0);
  }
});

/* ═══════════════════════════════
   UPI MODAL LOGIC
═══════════════════════════════ */
let currentPaymentContext = null; // 'deposit' or 'final'

const upiModal = $('upi-modal');
const modalAmountDisplay = $('modal-amount-display');
const modalLaunchBtn = $('modal-launch-btn');
const modalPaymentDoneBtn = $('modal-payment-done-btn');

function openUpiModal(type, amount) {
  if (amount <= 0) {
    showToast('⚠️ Enter your project amount first');
    return;
  }
  currentPaymentContext = type;
  if (modalAmountDisplay) modalAmountDisplay.textContent = '₹' + amount.toLocaleString('en-IN');
  if (modalLaunchBtn) modalLaunchBtn.href = buildUpiUrl(amount);

  if (upiModal) upiModal.classList.add('active');
}

$('upi-modal-close')?.addEventListener('click', () => {
  if (upiModal) upiModal.classList.remove('active');
});

$('open-upi-modal-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  openUpiModal('deposit', currentDeposit);
});

$('open-final-upi-modal-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  openUpiModal('final', currentBalance);
});

modalPaymentDoneBtn?.addEventListener('click', () => {
  if (upiModal) upiModal.classList.remove('active');
  
  if (currentPaymentContext === 'deposit') {
    paymentConfirmed = true;
    $('payment-confirmed-badge')?.classList.add('visible');
    submitBtn?.classList.add('payment-ready');
    showToast('✅ Payment confirmed! Fill the form and submit.');
  } else if (currentPaymentContext === 'final') {
    $('final-confirmed-badge')?.classList.add('visible');
    const finalBtn = $('final-submit-btn');
    if (finalBtn) {
      finalBtn.disabled = false;
      finalBtn.classList.add('payment-ready');
    }
    $('final-submit-hint')?.remove();
    showToast('✅ Final payment confirmed! Submit to get your master files.');
  }
});

$('final-submit-btn')?.addEventListener('click', async () => {
  const finalBtn = $('final-submit-btn');
  if (!finalBtn || finalBtn.disabled) return;
  finalBtn.classList.add('loading');
  finalBtn.disabled = true;

  // Send final payment notification emails
  const finalPayload = {
    client_name:    $('client-name')?.value?.trim() || 'Client',
    client_email:   $('client-email')?.value?.trim() || '',
    balance_amount: '₹' + (currentBalance || 0).toLocaleString('en-IN'),
    artist:         CONFIG.artistName,
    type:           'final_payment',
    submitted_at:   new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  await Promise.allSettled([
    sendWebhook(finalPayload),
    sendFinalPaymentEmails(finalPayload),
  ]);

  finalBtn.classList.remove('loading');
  finalBtn.style.display = 'none';
  $('final-success')?.classList.add('visible');
  $('final-success')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('🎵 All done! Master files on the way!', 4000);
});

/* ═══════════════════════════════
   UPI ID COPY BUTTON
═══════════════════════════════ */
const modalCopyBtn = $('modal-copy-upi-btn');
const modalCopyIcon = $('modal-copy-icon');
const modalCopiedIcon = $('modal-copied-icon');

modalCopyBtn?.addEventListener('click', async () => {
  const text = $('modal-upi-id-text')?.textContent?.trim() || CONFIG.upiId;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  // Show copied state
  if (modalCopyIcon) modalCopyIcon.style.display    = 'none';
  if (modalCopiedIcon) modalCopiedIcon.style.display  = '';
  modalCopyBtn.style.color       = 'var(--success)';
  modalCopyBtn.style.background  = 'rgba(34,197,94,0.12)';
  modalCopyBtn.style.borderColor = 'rgba(34,197,94,0.25)';
  showToast('UPI ID copied!');
  setTimeout(() => {
    if (modalCopyIcon) modalCopyIcon.style.display    = '';
    if (modalCopiedIcon) modalCopiedIcon.style.display  = 'none';
    modalCopyBtn.style.color       = '';
    modalCopyBtn.style.background  = '';
    modalCopyBtn.style.borderColor = '';
  }, 2500);
});

/* ═══════════════════════════════
   TOAST
═══════════════════════════════ */
let toastTimer;
function showToast(msg, duration = 2800) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  clearTimeout(toastTimer);
  toast.classList.remove('show');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
      toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    });
  });
}

/* ═══════════════════════════════
   FORM VALIDATION
═══════════════════════════════ */
function validateField(input) {
  const val = input.value.trim();
  let ok = true;
  if (!val) { ok = false; }
  if (input.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { ok = false; }
  if (input.type === 'tel'   && val && val.replace(/\D/g,'').length < 8)         { ok = false; }
  if (input.id === 'utr-number' && val && val.replace(/\D/g,'').length < 12)     { ok = false; }
  if (input.type === 'number' && val && parseFloat(val) < 1)                     { ok = false; }
  input.classList.toggle('error',   !ok && val !== '');
  input.classList.toggle('success',  ok && val !== '');
  return ok || val === '';
}

document.querySelectorAll('.field-input').forEach(inp => {
  inp.addEventListener('blur', () => validateField(inp));
  inp.addEventListener('input', () => {
    if (inp.classList.contains('error')) validateField(inp);
  });
});

/* ═══════════════════════════════
   FORM SUBMISSION
═══════════════════════════════ */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect values
  const name    = $('client-name')?.value.trim()  || '';
  const phone   = $('client-phone')?.value.trim() || '';
  const email   = $('client-email')?.value.trim() || '';
  const amount  = parseFloat($('project-amount')?.value) || 0;
  const deposit = Math.ceil(amount * 0.30);
  const agreed  = $('terms-agree')?.checked;

  // Validation
  let valid = true;
  if (!name)            { showToast('⚠️ Please enter your name'); valid = false; }
  else if (!phone)      { showToast('⚠️ Please enter your WhatsApp number'); valid = false; }
  else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                        { showToast('⚠️ Please enter a valid email'); valid = false; }
  else if (amount <= 0) { showToast('⚠️ Please enter a valid project amount'); valid = false; }
  else if (!agreed)     { showToast('⚠️ Please agree to the terms'); valid = false; }
  else if (!paymentConfirmed)
                        { showToast('⚠️ Please complete UPI payment and tap "I Have Completed Payment"'); valid = false; }

  if (!valid) return;

  // Loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  const payload = {
    name, phone, email,
    project_amount:  amount,
    deposit_amount:  deposit,
    upi_id:          CONFIG.upiId,
    artist:          CONFIG.artistName,
    submitted_at:    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  try {
    await Promise.allSettled([
      sendWebhook(payload),
      sendEmailJS(payload),
    ]);
    showSuccess(amount, deposit);
  } catch (err) {
    console.error('Submission error:', err);
    showSuccess(amount, deposit);
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

/* ─── Webhook (Make.com / Zapier / n8n) ─── */
async function sendWebhook(data) {
  if (!CONFIG.webhookUrl) return;
  return fetch(CONFIG.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/* ─── Load EmailJS SDK (once) ─── */
async function loadEmailJS() {
  if (window.emailjs) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  window.emailjs.init({ publicKey: CONFIG.emailjsPublicKey });
}

/* ─── Send Deposit Emails (admin + client receipt) ─── */
async function sendEmailJS(data) {
  if (!CONFIG.emailjsServiceId || !CONFIG.emailjsPublicKey) return;
  await loadEmailJS();

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const sharedVars = {
    client_name:    data.name,
    client_email:   data.email,
    client_phone:   data.phone,
    project_amount: fmt(data.project_amount),
    deposit_amount: fmt(data.deposit_amount),
    balance_amount: fmt(data.project_amount - data.deposit_amount),
    artist_name:    data.artist,
    artist_email:   CONFIG.artistEmail,
    upi_id:         data.upi_id,
    submitted_at:   data.submitted_at,
  };

  return Promise.allSettled([
    // 1️⃣  Admin notification → borahdibasish@gmail.com
    CONFIG.emailjsAdminTemplateId
      ? window.emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsAdminTemplateId, {
          ...sharedVars,
          to_email: CONFIG.artistEmail,
          to_name:  CONFIG.artistName,
        })
      : Promise.resolve(),

    // 2️⃣  Client receipt → their email
    CONFIG.emailjsClientTemplateId
      ? window.emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsClientTemplateId, {
          ...sharedVars,
          to_email: data.email,
          to_name:  data.name,
        })
      : Promise.resolve(),
  ]);
}

/* ─── Send Final Payment Emails ─── */
async function sendFinalPaymentEmails(data) {
  if (!CONFIG.emailjsServiceId || !CONFIG.emailjsPublicKey || !CONFIG.emailjsAdminTemplateId) return;
  await loadEmailJS();
  return window.emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsAdminTemplateId, {
    to_email:       CONFIG.artistEmail,
    to_name:        CONFIG.artistName,
    client_name:    data.client_name,
    client_email:   data.client_email,
    balance_amount: data.balance_amount,
    artist_name:    CONFIG.artistName,
    submitted_at:   data.submitted_at,
    type:           'FINAL PAYMENT CONFIRMED',
  });
}

/* ─── Show Deposit Success + Reveal Final Payment Card ─── */
let currentBalance = 0;

function showSuccess(amount, deposit) {
  // Hide form fields; form-success is OUTSIDE <form> so stays visible
  form.style.display = 'none';
  formSuccess.classList.add('visible');

  // Calculate and store balance for final payment card
  currentBalance = amount - deposit;

  // Populate final payment card
  const finalCard         = $('final-payment-card');
  const finalBalanceEl    = $('final-balance-amount');
  const finalPayBtn       = $('final-pay-btn');
  const finalPayBtnText   = $('final-pay-btn-text');
  const finalQrLink       = $('final-upi-qr-link');

  if (finalBalanceEl) finalBalanceEl.textContent = '₹ ' + currentBalance.toLocaleString('en-IN');

  if (currentBalance > 0) {
    const finalUrl = buildUpiUrl(currentBalance);
    if (finalPayBtn)     finalPayBtn.href     = finalUrl;
    if (finalQrLink)     finalQrLink.href     = finalUrl;
    if (finalPayBtnText) finalPayBtnText.textContent = `Open UPI App to Pay ₹${currentBalance.toLocaleString('en-IN')}`;
  }

  // Reveal final payment card with smooth animation
  if (finalCard) {
    finalCard.classList.add('visible');
    setTimeout(() => {
      finalCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }

  showToast('🎵 Deposit confirmed! Check email for receipt.', 4000);
}


/* ═══════════════════════════════
   INSTAGRAM REELS GRID
═══════════════════════════════ */
function buildReelsGrid() {
  if (!reelsGrid) return;
  reelsGrid.innerHTML = '';

  REELS.forEach(({ id, title, views }, index) => {
    const card = document.createElement('a');
    card.className = 'reel-card fade-up';
    card.href = `https://www.instagram.com/reel/${id}/`;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `Watch ${title} on Instagram`);
    
    card.innerHTML = `
      <img src="https://www.instagram.com/p/${id}/media/?size=l" alt="Reel Cover" class="reel-img" loading="lazy" onerror="this.style.display='none'">
      <div class="reel-overlay-gradient"></div>
      
      <!-- Top right views -->
      <div class="reel-views-badge">
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        ${views}
      </div>

      <!-- Center play button -->
      <div class="reel-play-center">
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>

      <!-- Bottom Instagram logo -->
      <div class="reel-bottom-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      </div>
    `;

    reelsGrid.appendChild(card);
  });

  // Intersection Observer for fade-up
  observeFadeUp(reelsGrid.querySelectorAll('.fade-up'));
}

/* ═══════════════════════════════
   INTERSECTION OBSERVER — Fade-up
═══════════════════════════════ */
function observeFadeUp(elements) {
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => io.observe(el));
}

/* ═══════════════════════════════
   SMOOTH INERTIA SCROLL (mobile feel)
═══════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  });
});

/* ═══════════════════════════════
   UTR INPUT — Numeric only
═══════════════════════════════ */
$('utr-number')?.addEventListener('keypress', (e) => {
  if (!/\d/.test(e.key) && !['Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
});

/* ═══════════════════════════════
   UPDATE EXTERNAL LINKS
═══════════════════════════════ */
function updateLinks() {
  // WhatsApp links
  document.querySelectorAll('[id*="whatsapp"], [id*="wa"]').forEach(el => {
    if (el.tagName === 'A' && el.href.includes('wa.me')) {
      el.href = `https://wa.me/${CONFIG.whatsappNumber}`;
    }
  });
  // Instagram links
  const instaBtn = $('insta-btn');
  if (instaBtn) instaBtn.href = CONFIG.instagramUrl;
  const viewMore = $('view-more-btn');
  if (viewMore) viewMore.href = CONFIG.instagramUrl;

  // UPI ID
  const upiText = $('upi-id-text');
  if (upiText) upiText.textContent = CONFIG.upiId;
}

/* ═══════════════════════════════
   INIT
═══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateLinks();
  buildReelsGrid();

  // Fade-up for sections
  document.querySelectorAll('.step-card, .about-card, .form-card').forEach(el => {
    el.classList.add('fade-up');
  });
  observeFadeUp(document.querySelectorAll('.fade-up'));

  // PWA service worker registration (optional)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {/* no SW needed */});
  }
});
