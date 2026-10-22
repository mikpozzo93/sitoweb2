(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const motion = document.documentElement.classList.contains('motion');

  /* ---------- Header: scrolled state ---------- */
  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Hero: the insert is revised a couple of times, then settles ---------- */
  const rotator = $('#rotator');
  if (rotator && motion) {
    const drafts = ['dal primo wireframe.', 'dal primo sprint.', 'dal primo giorno.'];
    const text = rotator.lastChild;
    let i = 0;
    const next = () => {
      text.textContent = drafts[i];
      rotator.classList.remove('is-swapping');
      void rotator.offsetWidth;
      rotator.classList.add('is-swapping');
      i += 1;
      if (i < drafts.length) setTimeout(next, 2200);
    };
    setTimeout(next, 3600);
  }

  /* ---------- Scroll reveals, staggered inside each section ---------- */
  if (motion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.section, .band').forEach((section) => {
      $$('.reveal', section).forEach((el, n) => {
        el.style.setProperty('--d', `${Math.min(n, 5) * 0.08}s`);
        io.observe(el);
      });
    });
  }

  /* ---------- Sign-up: validate, send, stamp ---------- */
  const form = $('#resta-connesso');
  if (form) {
    const status = $('#form-status');
    const stamp = $('#stamp');
    const email = form.dataset.email;
    const emailField = $('#f-email');
    const consent = $('#f-consent');
    const consentLabel = consent.closest('.consent');

    const showStatus = (msg, tone = '') => {
      status.textContent = msg;
      status.dataset.tone = tone;
      status.hidden = false;
    };
    const signed = () => {
      stamp.querySelector('#stamp-date').textContent = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
      stamp.classList.add('is-on');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailOk = emailField.value.trim() !== '' && emailField.checkValidity();
      emailField.setAttribute('aria-invalid', String(!emailOk));
      consentLabel.dataset.invalid = String(!consent.checked);
      consent.setAttribute('aria-invalid', String(!consent.checked));

      if (!emailOk) {
        emailField.setAttribute('aria-describedby', 'form-status');
        showStatus(emailField.value.trim()
          ? "Controlla l'email: sembra incompleta, per esempio manca la @."
          : "Inserisci la tua email di lavoro, così possiamo scriverti.");
        emailField.focus();
        return;
      }
      emailField.removeAttribute('aria-describedby');
      if (!consent.checked) {
        consent.setAttribute('aria-describedby', 'form-status');
        showStatus('Spunta il consenso: senza, non possiamo scriverti.');
        consent.focus();
        return;
      }
      consent.removeAttribute('aria-describedby');

      const data = new FormData(form);
      // Spam bots fill the hidden field: pretend it worked and drop it.
      if (data.get('sito_web')) { form.reset(); signed(); return; }
      data.delete('sito_web');

      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        try {
          const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          signed();
          showStatus('Firmato e registrato. Ti scriviamo il giorno dell’apertura, promesso.', 'ok');
          return;
        } catch (err) {
          showStatus(`Non siamo riusciti a registrare la tua email. Riprova tra poco oppure scrivici a ${email}.`);
          return;
        }
      }

      const body = [
        'Vorrei restare connesso con Legal Product Studio.',
        '',
        `Email: ${data.get('email')}`,
        `Nome: ${data.get('nome') || '-'}`,
        `Azienda: ${data.get('azienda') || '-'}`,
        `Ruolo: ${data.get('ruolo') || '-'}`,
        `Interesse: ${data.get('interesse') || '-'}`,
        'Consenso a ricevere email sul lancio e sui servizi: sì'
      ].join('\n');
      const subject = `Resta connesso · ${data.get('azienda') || data.get('email')}`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      signed();
      showStatus(`Abbiamo preparato l'email nel tuo programma di posta: inviala e sei dei nostri. Se non si è aperto, scrivici a ${email}.`, 'ok');
    });

    emailField.addEventListener('input', () => {
      if (emailField.getAttribute('aria-invalid') === 'true' && emailField.value.trim() && emailField.checkValidity()) {
        emailField.setAttribute('aria-invalid', 'false');
        emailField.removeAttribute('aria-describedby');
      }
    });
    consent.addEventListener('change', () => {
      if (consent.checked) {
        consentLabel.dataset.invalid = 'false';
        consent.setAttribute('aria-invalid', 'false');
        consent.removeAttribute('aria-describedby');
      }
    });
  }

  /* ---------- Copy email ---------- */
  const copyBtn = $('#copy-email');
  if (copyBtn) {
    const label = copyBtn.querySelector('span');
    const target = $('#contact-email');
    copyBtn.addEventListener('click', () => {
      const done = (msg) => { label.textContent = msg; setTimeout(() => { label.textContent = 'Copia'; }, 2200); };
      const selectText = () => {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done('Selezionata');
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(target.textContent.trim()).then(() => done('Copiata'), selectText);
      } else {
        selectText();
      }
    });
  }

  /* ---------- Privacy dialog ---------- */
  const dialog = $('#privacy-dialog');
  $$('[data-open-privacy]').forEach((btn) => btn.addEventListener('click', () => {
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  }));

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
