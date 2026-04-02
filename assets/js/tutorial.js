(function () {
    var cfg = window.TUTORIAL_CONFIG;
    if (!cfg || !cfg.key || !cfg.steps) return;
    if (localStorage.getItem(cfg.key)) return;

    var STEPS  = cfg.steps;
    var SKIP   = cfg.skip   || 'Skip';
    var NEXT   = cfg.next   || 'Next →';
    var PREV   = cfg.prev   || '← Back';
    var FINISH = cfg.finish || 'Start 🎉';
    var OF     = cfg.of     || 'of';

    var current = 0;
    var spotlight, tooltip;

    function init() {
        spotlight = document.createElement('div');
        spotlight.style.cssText = [
            'position:fixed', 'z-index:9001', 'border-radius:8px',
            'transition:top .3s,left .3s,width .3s,height .3s,box-shadow .3s',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(spotlight);

        tooltip = document.createElement('div');
        tooltip.style.cssText = [
            'position:fixed', 'z-index:9002',
            'background:var(--bg2)', 'border:1px solid var(--border)',
            'border-radius:10px', 'padding:1.25rem 1.5rem',
            'max-width:320px', 'width:calc(100vw - 2rem)',
            'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
            'font-family:var(--font)', 'color:var(--text)',
            'transition:opacity .2s',
        ].join(';');
        document.body.appendChild(tooltip);

        showStep(0);
    }

    function showStep(index) {
        current = index;
        var step = STEPS[index];
        var el = step.selector ? document.querySelector(step.selector) : null;

        // Spotlight
        if (el) {
            var r = el.getBoundingClientRect();
            var pad = 8;
            spotlight.style.top    = (r.top  - pad) + 'px';
            spotlight.style.left   = (r.left - pad) + 'px';
            spotlight.style.width  = (r.width  + pad * 2) + 'px';
            spotlight.style.height = (r.height + pad * 2) + 'px';
            spotlight.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.75)';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            spotlight.style.width  = '0';
            spotlight.style.height = '0';
            spotlight.style.top    = '50%';
            spotlight.style.left   = '50%';
            spotlight.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.75)';
        }

        // Tooltip
        var isLast = index === STEPS.length - 1;
        tooltip.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:.6rem">' +
                '<strong style="font-size:1rem;line-height:1.3">' + step.title + '</strong>' +
                '<button id="tut-skip" style="' + btnStyle('link') + '">' + SKIP + '</button>' +
            '</div>' +
            '<p style="font-size:.88rem;color:var(--text-muted);line-height:1.55;margin-bottom:1rem">' + step.text + '</p>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">' +
                '<span style="font-size:.78rem;color:var(--text-muted)">' + (index + 1) + ' ' + OF + ' ' + STEPS.length + '</span>' +
                '<div style="display:flex;gap:.5rem">' +
                    (index > 0 ? '<button id="tut-prev" style="' + btnStyle('ghost') + '">' + PREV + '</button>' : '') +
                    '<button id="tut-next" style="' + btnStyle('primary') + '">' + (isLast ? FINISH : NEXT) + '</button>' +
                '</div>' +
            '</div>';

        positionTooltip(step, el);

        tooltip.querySelector('#tut-skip').onclick = finish;
        tooltip.querySelector('#tut-next').onclick = function () {
            isLast ? finish() : showStep(current + 1);
        };
        var prev = tooltip.querySelector('#tut-prev');
        if (prev) prev.onclick = function () { showStep(current - 1); };
    }

    function positionTooltip(step, el) {
        tooltip.style.opacity = '0';
        setTimeout(function () {
            var tw = tooltip.offsetWidth;
            var th = tooltip.offsetHeight;
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var top, left;

            if (!el || step.position === 'center') {
                top  = (vh - th) / 2;
                left = (vw - tw) / 2;
            } else {
                var r = el.getBoundingClientRect();
                left = Math.min(Math.max(r.left, 12), vw - tw - 12);
                if (step.position === 'bottom') {
                    top = r.bottom + 16;
                    if (top + th > vh - 12) top = r.top - th - 16;
                } else {
                    top = r.top - th - 16;
                    if (top < 12) top = r.bottom + 16;
                }
            }

            tooltip.style.top  = Math.max(12, top)  + 'px';
            tooltip.style.left = Math.max(12, left) + 'px';
            tooltip.style.opacity = '1';
        }, 60);
    }

    function btnStyle(type) {
        var base = 'border:none;border-radius:6px;font-size:.85rem;font-weight:600;cursor:pointer;font-family:var(--font);';
        if (type === 'primary') return base + 'padding:.45rem 1rem;background:var(--accent);color:#fff;';
        if (type === 'ghost')   return base + 'padding:.45rem 1rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);';
        return 'background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.8rem;padding:0;font-family:var(--font);';
    }

    function finish() {
        localStorage.setItem(cfg.key, '1');
        spotlight.remove();
        tooltip.remove();
    }

    window.addEventListener('resize', function () { positionTooltip(STEPS[current], STEPS[current].selector ? document.querySelector(STEPS[current].selector) : null); });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
