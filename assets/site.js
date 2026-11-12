/* global document, window, setInterval, IntersectionObserver */
// The four seats under the hero's mark: one is pressed at a time, on its own until the reader
// clicks one. hero.js, when it has loaded, brings that seat's tile forward in the 3D mark.
(function () {
  var tabs = document.querySelectorAll('[data-tab]');
  if (tabs.length === 0) return;
  var seat = 0;
  var manual = false;
  function show(i) {
    seat = i;
    for (var k = 0; k < tabs.length; k++) {
      tabs[k].setAttribute('aria-pressed', k === i ? 'true' : 'false');
    }
    if (window.swarmupHero) window.swarmupHero.show(i);
  }
  for (var k = 0; k < tabs.length; k++) {
    tabs[k].addEventListener(
      'click',
      (function (i) {
        return function () {
          manual = true;
          show(i);
        };
      })(k),
    );
  }
  show(0);
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(function () {
    if (!manual && !document.hidden) show((seat + 1) % tabs.length);
  }, 3400);
})();

// Blocks marked data-reveal fade up when they scroll into view. The class on <html> turns the
// hidden state on, so a browser that never runs this shows everything.
(function () {
  var blocks = document.querySelectorAll('[data-reveal]');
  if (blocks.length === 0 || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('reveal-on');
  var seen = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        entries[i].target.classList.add('in');
        seen.unobserve(entries[i].target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (var k = 0; k < blocks.length; k++) seen.observe(blocks[k]);
})();
