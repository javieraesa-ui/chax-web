/* Chax.chat lightweight click & conversion tracking for GoatCounter (no cookies, no third-party brands) */
(function () {
  'use strict';

  function sanitizeSlug(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  function classifyClick(el) {
    var explicit = el.getAttribute('data-gc-event');
    if (explicit) {
      var slug = sanitizeSlug(explicit);
      if (slug) {
        return {
          path: '/event/click/' + slug,
          label: el.getAttribute('data-gc-label') || explicit
        };
      }
    }

    var href = (el.getAttribute('href') || '').trim();
    if (!href || href.charAt(0) === '#') {
      return null;
    }

    var hrefLower = href.toLowerCase();
    var textContext = (
      (el.textContent || '') + ' ' +
      (el.getAttribute('aria-label') || '') + ' ' +
      (el.id || '')
    ).toLowerCase();

    if (hrefLower.indexOf('testflight.apple.com') !== -1) {
      if (/\bmac(os)?\b/.test(textContext)) {
        return { path: '/event/click/testflight-macos', label: 'TestFlight macOS' };
      }
      if (/\b(ios|iphone|ipad)\b/.test(textContext)) {
        return { path: '/event/click/testflight-ios', label: 'TestFlight iOS' };
      }
      return { path: '/event/click/testflight', label: 'TestFlight Apple' };
    }

    if (hrefLower.indexOf('apps.apple.com/app/testflight') !== -1) {
      return { path: '/event/click/appstore-testflight', label: 'App Store TestFlight' };
    }

    if (hrefLower.indexOf('groups.google.com/g/chaxters') !== -1) {
      return { path: '/event/click/google-play-step1-group', label: 'Google Play Paso 1 (Grupo Chaxters)' };
    }

    if (hrefLower.indexOf('play.google.com/apps/testing/') !== -1) {
      return { path: '/event/click/google-play-step2-testing', label: 'Google Play Paso 2 (Activar Prueba)' };
    }

    if (
      hrefLower.indexOf('play.google.com/store/apps/details') !== -1 ||
      hrefLower.indexOf('market://') === 0 ||
      hrefLower.indexOf('intent://details') === 0
    ) {
      return { path: '/event/click/google-play-step3-store', label: 'Google Play Paso 3 (App Play Store)' };
    }

    if (hrefLower.indexOf('play.google.com') !== -1) {
      return { path: '/event/click/google-play', label: 'Google Play Android' };
    }

    if (/\.(apk|aab)(\?.*)?$/i.test(hrefLower)) {
      return { path: '/event/click/android-apk', label: 'Descarga APK Android' };
    }

    if (hrefLower.indexOf('mailto:') === 0) {
      return { path: '/event/click/mailto', label: 'Contacto Email' };
    }

    var curPath = (window.location && window.location.pathname) || '/';
    var isOnDownloadPage = /^\/download/.test(curPath);
    if (!isOnDownloadPage && /(^|\/)(downloads?\/?|download\.html)(#.*|\?.*)?$/i.test(hrefLower)) {
      return { path: '/event/click/go-downloads', label: 'Ir a Descargas' };
    }

    if (/^https?:\/\//i.test(hrefLower)) {
      try {
        var parsed = new URL(href, window.location.href);
        if (parsed.hostname && window.location && parsed.hostname !== window.location.hostname) {
          var hostSlug = sanitizeSlug(parsed.hostname.replace(/^www\./, ''));
          if (hostSlug) {
            return { path: '/event/click/ext/' + hostSlug, label: 'Enlace externo: ' + parsed.hostname };
          }
        }
      } catch (err) {
        return null;
      }
    }

    return null;
  }

  document.addEventListener('click', function (e) {
    var target = e.target && e.target.closest ? e.target.closest('a, button, [data-gc-event]') : null;
    if (!target) return;

    if (!window.goatcounter || typeof window.goatcounter.count !== 'function') return;

    var info = classifyClick(target);
    if (!info) return;

    var originPath = (window.location && window.location.pathname) || '/';
    try {
      window.goatcounter.count({
        path: info.path,
        title: info.label + ' (desde ' + originPath + ')',
        event: true
      });
    } catch (err) {
      // Ignorar errores silenciosamente para nunca interferir con la navegación
    }
  }, true);
})();
