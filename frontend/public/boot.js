// Startup helpers, loaded synchronously from index.html (external so the CSP needs no unsafe-inline).
// 1) Non-render-blocking Google Fonts  2) Font-loading classes  3) Early LCP image preload.

// Google Fonts stylesheets are cross-origin; as <link rel=stylesheet> in the HTML they
// blocked first paint (~600 ms on slow 4G). Inserted from script they download at the
// same time but do not block rendering. Fonts use display=swap. <noscript> keeps them
// for visitors without JS.
(function () {
  var fonts = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0..1,0&display=swap',
  ];
  for (var i = 0; i < fonts.length; i++) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = fonts[i];
    document.head.appendChild(l);
  }
})();

// Add a class while fonts are loading, and replace it when they succeed or fail
if ('fonts' in document) {
  document.documentElement.classList.add('fonts-loading');
  Promise.all([
    document.fonts.load('24px "Material Symbols Outlined"'),
    document.fonts.load('16px "Inter"'),
  ])
    .then(function () {
      document.documentElement.classList.remove('fonts-loading');
      document.documentElement.classList.add('fonts-loaded');
    })
    .catch(function () {
      document.documentElement.classList.remove('fonts-loading');
      document.documentElement.classList.add('fonts-failed');
    });
} else {
  document.documentElement.classList.add('fonts-loaded');
}

(function () {
  try {
    var path = window.location.pathname;
    var bgImg = '';
    var cached = localStorage.getItem('siri_arts_website_content');
    var parsed = cached ? JSON.parse(cached) : null;

    if (path === '/collections' || path === '/collections/') {
      bgImg =
        parsed && parsed.shopPage && parsed.shopPage.hero && parsed.shopPage.hero.backgroundImage
          ? parsed.shopPage.hero.backgroundImage
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Cy1TlK9jjSUwKlKlXEL_AKlV3Ff5c2VdyViS7GGN3dgR1UB3SgmAto5fKc__pxujkfieY8wFl8MLAhbv7fZHW-oIWdXX0Xqg7SaMj5Szj9w6aGsuChZguzRLBppvcE_7OyVd9N7Ldchm0izPUhXOQGyYaQUsd43cUxBLr5ift2YUa0I_rr4_34hldd6L-V9MeNbxa-BUn2gvZq7JQypKg2Wl6-8TPta6D_ZooOmuUfcwSJJUjNe8-voUHsu7mBKM_CeD9YFd204';
    } else if (
      path === '/events/collections' ||
      path === '/events/collections/' ||
      path === '/events' ||
      path === '/events/'
    ) {
      bgImg =
        parsed &&
        parsed.eventsPage &&
        parsed.eventsPage.hero &&
        parsed.eventsPage.hero.backgroundImage
          ? parsed.eventsPage.hero.backgroundImage
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g';
    }

    // Homepage: the hero image URL is only known after CMS + product data load. For
    // returning visitors, preload the exact URL the hero showed last time (saved by
    // HeroCarousel as the image's currentSrc, so the browser reuses this download).
    if (path === '/' && !bgImg) {
      var heroSrc = localStorage.getItem('siri_hero_lcp_src');
      if (heroSrc && /^https:\/\/res\.cloudinary\.com\//.test(heroSrc)) {
        var heroLink = document.createElement('link');
        heroLink.rel = 'preload';
        heroLink.as = 'image';
        heroLink.href = heroSrc;
        heroLink.setAttribute('fetchpriority', 'high');
        document.head.appendChild(heroLink);
      }
    }

    if (bgImg) {
      var link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.setAttribute('fetchpriority', 'high');

      if (bgImg.indexOf('cloudinary.com') !== -1) {
        var urlParts = bgImg.split('/upload/');
        if (urlParts.length === 2) {
          var pathPart = urlParts[1];
          var firstSlash = pathPart.indexOf('/');
          if (firstSlash > 0) {
            var potentialTransforms = pathPart.substring(0, firstSlash);
            if (potentialTransforms.indexOf('_') !== -1 && !potentialTransforms.startsWith('v')) {
              pathPart = pathPart.substring(firstSlash + 1);
            }
          }
          var breakpoints = [240, 320, 400, 500, 640, 800, 1024, 1280, 1536];
          var srcsetArr = [];
          for (var i = 0; i < breakpoints.length; i++) {
            var w = breakpoints[i];
            var t = 'w_' + w + ',c_limit,q_auto:good,f_auto,dpr_auto,fl_strip_profile';
            srcsetArr.push(urlParts[0] + '/upload/' + t + '/' + pathPart + ' ' + w + 'w');
          }
          link.setAttribute('imagesrcset', srcsetArr.join(', '));
          link.setAttribute('imagesizes', '100vw');
        } else {
          link.href = bgImg;
        }
      } else if (bgImg.indexOf('googleusercontent.com') !== -1 && bgImg.indexOf('=') === -1) {
        if (path === '/collections' || path === '/collections/') {
          link.href = bgImg + '=w1920-h600-rw';
        } else {
          link.href = bgImg + '=w1920-rw';
        }
      } else {
        link.href = bgImg;
      }
      document.head.appendChild(link);
    }
  } catch (e) {}
})();
