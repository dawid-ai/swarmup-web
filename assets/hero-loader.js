// Load the 3D hero only as a progressive enhancement: after the static mark has painted, on a
// wide screen, and when motion is welcome. The WebP in the page remains the fallback throughout.
(function () {
  var stage = document.querySelector('[data-hero]');
  if (!stage || !window.matchMedia || !window.requestAnimationFrame) return;

  var wide = window.matchMedia('(min-width: 900px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var requested = false;

  function load() {
    if (requested || !wide.matches || reduced.matches) return;
    requested = true;

    // A deferred script can still run before first paint. Two frames guarantee the module request
    // starts after the browser has had an opportunity to paint the static hero.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (!wide.matches || reduced.matches) {
          requested = false;
          return;
        }
        var script = document.createElement('script');
        script.type = 'module';
        script.src = 'hero.js';
        document.head.appendChild(script);
      });
    });
  }

  load();
  if (wide.addEventListener) wide.addEventListener('change', load);
  if (reduced.addEventListener) reduced.addEventListener('change', load);
})();
