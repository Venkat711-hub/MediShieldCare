// ═══════════════════════════════════════════════════════
//  MediShield Care — shared.js
//  Shared across all pages: Nav, SOS system, Storage, Animations
// ═══════════════════════════════════════════════════════

/* ─── NAV TOGGLE ─── */
const navToggle = document.getElementById('navToggle');
const mainNav   = document.getElementById('mainNav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    navToggle.textContent = open ? '✕' : '☰';
  });
  mainNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => { mainNav.classList.remove('open'); navToggle.textContent = '☰'; });
  });
}

/* ─── ACTIVE NAV LINK ─── */
(function highlightNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* ─── SCROLL ANIMATIONS ─── */
const style = document.createElement('style');
style.textContent = `
  .anim-in { opacity:0; transform:translateY(22px); transition: opacity .5s ease, transform .5s ease; }
  .anim-in.visible { opacity:1; transform:translateY(0); }
`;
document.head.appendChild(style);

const obsAnim = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), (parseInt(e.target.dataset.delay) || 0));
      obsAnim.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(
  '.card, .step-card, .emg-card, .check-row, .habit-card, .nav-tile, .reason-card, .contact-card, .maintain-step, .tip-item'
).forEach((el, i) => {
  el.classList.add('anim-in');
  el.dataset.delay = (i % 6) * 60;
  obsAnim.observe(el);
});

/* ─── SMOOTH SCROLL ─── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ═══════════════════════════════════════════════════════
   SOS SYSTEM
   - Gets GPS via browser Geolocation API
   - Reverse geocodes via OpenStreetMap Nominatim
   - Shows emergency call buttons (tel:)
   - Shares location via WhatsApp / Google Maps link
   - Reads saved emergency contact from localStorage
═══════════════════════════════════════════════════════ */

const SOS = {
  lat: null,
  lon: null,
  address: '',
  loading: false,

  /* Open the modal */
  open() {
    document.getElementById('sosOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.fetchLocation();
    this.loadSavedContact();
  },

  /* Close the modal */
  close() {
    document.getElementById('sosOverlay').classList.add('hidden');
    document.body.style.overflow = '';
  },

  /* Get GPS + reverse geocode */
  fetchLocation() {
    const statusEl = document.getElementById('sosLocationStatus');
    const coordsEl = document.getElementById('sosCoords');
    statusEl.textContent = '📡 Detecting your location…';
    coordsEl.textContent = '';

    if (!navigator.geolocation) {
      statusEl.textContent = '⚠️ Geolocation not supported on this device.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        this.lat = pos.coords.latitude.toFixed(6);
        this.lon = pos.coords.longitude.toFixed(6);
        coordsEl.textContent = `GPS: ${this.lat}, ${this.lon}`;
        statusEl.textContent = '🔍 Getting your address…';

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${this.lat}&lon=${this.lon}&format=json`)
          .then(r => r.json())
          .then(data => {
            this.address = data.display_name || `${this.lat}, ${this.lon}`;
            statusEl.textContent = '📍 ' + this.address;
            this.updateShareLinks();
          })
          .catch(() => {
            this.address = `Coordinates: ${this.lat}, ${this.lon}`;
            statusEl.textContent = '📍 Location obtained (address lookup failed).';
            this.updateShareLinks();
          });
      },
      err => {
        const msgs = {
          1: '🚫 Location access denied. Please allow location in browser settings.',
          2: '📡 Location unavailable. Share your address manually.',
          3: '⏱️ Location request timed out. Try again.',
        };
        statusEl.textContent = msgs[err.code] || '⚠️ Could not get location.';
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  },

  /* Build share URLs */
  updateShareLinks() {
    const emergencyMsg = encodeURIComponent(
      `🚨 EMERGENCY ALERT 🚨\nI need immediate help!\n\n📍 Location: ${this.address}\n\n🗺️ Google Maps: https://maps.google.com/?q=${this.lat},${this.lon}\n\nPlease send help or call emergency services (112/108).`
    );

    const waBtn = document.getElementById('sosWhatsApp');
    const savedContact = localStorage.getItem('med_emg_phone_1') || '';
    if (savedContact && savedContact.length > 5) {
      const cleanNum = savedContact.replace(/\D/g, '');
      waBtn.href = `https://wa.me/91${cleanNum}?text=${emergencyMsg}`;
      waBtn.title = `Send to saved contact: ${savedContact}`;
    } else {
      waBtn.href = `https://wa.me/?text=${emergencyMsg}`;
    }

    const mapsBtn = document.getElementById('sosMaps');
    if (this.lat) {
      mapsBtn.href = `https://maps.google.com/?q=${this.lat},${this.lon}`;
    }

    document.getElementById('sosLocationForMaps').href =
      this.lat ? `https://maps.google.com/maps?q=${this.lat},${this.lon}` : '#';
  },

  /* Load saved emergency contact name */
  loadSavedContact() {
    const name  = localStorage.getItem('med_emg_name_1')  || '';
    const phone = localStorage.getItem('med_emg_phone_1') || '';
    const row   = document.getElementById('sosSavedContact');
    if (row) {
      if (name || phone) {
        row.textContent = `📞 Saved contact: ${name || 'Emergency Contact'} — ${phone || 'No number saved'}`;
        row.style.display = 'block';
      } else {
        row.textContent = '💡 Tip: Save your emergency contact in the Directory page to auto-fill WhatsApp.';
        row.style.display = 'block';
      }
    }
  },

  /* Copy location to clipboard */
  copyLocation() {
    const text = this.address || 'Location not available';
    const full = `Emergency Location:\n${text}\nGPS: ${this.lat || '?'}, ${this.lon || '?'}`;
    navigator.clipboard.writeText(full).then(() => {
      const btn = document.getElementById('sosCopyBtn');
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  }
};

/* SOS button wiring */
window.addEventListener('DOMContentLoaded', () => {
  const fab   = document.getElementById('sosFab');
  const navSOS = document.getElementById('navSOSBtn');
  const closeBtn = document.getElementById('sosCloseBtn');
  const overlay  = document.getElementById('sosOverlay');

  if (fab) fab.addEventListener('click', () => SOS.open());
  if (navSOS) navSOS.addEventListener('click', e => { e.preventDefault(); SOS.open(); });
  if (closeBtn) closeBtn.addEventListener('click', () => SOS.close());
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) SOS.close(); });

  document.getElementById('sosGetLocation')?.addEventListener('click', () => SOS.fetchLocation());
  document.getElementById('sosCopyBtn')?.addEventListener('click', () => SOS.copyLocation());
});

/* ─── LOCALSTORAGE HELPERS ─── */
const Store = {
  set(key, val) { try { localStorage.setItem(key, val); } catch(e) {} },
  get(key)      { try { return localStorage.getItem(key) || ''; } catch(e) { return ''; } },
  del(key)      { try { localStorage.removeItem(key); } catch(e) {} },

  /* Auto-save all inputs with data-store attribute */
  bindInputs() {
    document.querySelectorAll('[data-store]').forEach(input => {
      const key = input.dataset.store;
      // Load saved value
      const saved = Store.get(key);
      if (saved) {
        input.value = saved;
        input.classList.add('saved');
      }
      // Save on change
      input.addEventListener('input', () => {
        Store.set(key, input.value);
        input.classList.add('saved');
        Store.showSaveStatus('saving');
        clearTimeout(input._saveTimer);
        input._saveTimer = setTimeout(() => Store.showSaveStatus('saved'), 600);
      });
    });
  },

  showSaveStatus(state) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    const states = {
      saving: { cls: 'saving', text: '💾 Saving…' },
      saved:  { cls: 'saved',  text: '✅ Saved automatically' },
      unsaved:{ cls: 'unsaved', text: '⚠️ Unsaved changes' },
    };
    const s = states[state] || states.saved;
    el.className = `save-status ${s.cls}`;
    el.textContent = s.text;
  },

  clearAll(prefix) {
    if (!confirm('Clear all saved contact information? This cannot be undone.')) return;
    Object.keys(localStorage).forEach(k => { if (k.startsWith(prefix)) Store.del(k); });
    document.querySelectorAll('[data-store]').forEach(el => { el.value = ''; el.classList.remove('saved'); });
    Store.showSaveStatus('unsaved');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Store.bindInputs();
});

/* ─── PRINT ─── */
function printPage() { window.print(); }

/* ─── EMG NUMBER COPY ─── */
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.emg-card').forEach(card => {
    card.title = 'Click to copy / call';
    card.addEventListener('click', () => {
      const num = card.querySelector('.emg-num')?.textContent?.replace(/[^0-9\-‑]/g, '').replace(/‑/g, '-');
      if (!num) return;
      navigator.clipboard.writeText(num).then(() => {
        const el = card.querySelector('.emg-copy-hint');
        if (el) { const orig = el.textContent; el.textContent = '✓ Copied!'; setTimeout(() => el.textContent = orig, 1800); }
      });
    });
  });
});

