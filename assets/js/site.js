/* Michele Pozzo · personal site
   Mobile menu, header shadow, reveal on scroll, click-to-load YouTube. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Header ----------
  var header = document.querySelector('.site-header');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Mobile menu ----------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    toggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  };
  toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });

  // ---------- Current section in the nav ----------
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) spy.observe(target);
    });
  }

  // ---------- Reveal on scroll ----------
  var reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // ---------- YouTube, loaded only on click ----------
  var youtubeId = function (url) {
    var m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : '';
  };
  document.querySelectorAll('[data-youtube-url]').forEach(function (talk) {
    var url = talk.getAttribute('data-youtube-url');
    var id = youtubeId(url);
    var play = talk.querySelector('[data-video-play]');
    var link = talk.querySelector('[data-video-link]');
    var label = talk.querySelector('[data-video-label]');

    if (!id) {
      play.disabled = true;
      label.textContent = 'Video in pubblicazione';
      link.parentElement.hidden = true;
      return;
    }
    link.href = url;
    play.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = talk.querySelector('.video-title').textContent;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      play.replaceWith(iframe);
      iframe.focus();
    });
  });

  // ---------- Footer year ----------
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
