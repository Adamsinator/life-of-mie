// Language support. The game is written in English; in Danish mode every piece of text that appears
// on screen is translated through a dictionary (js/lang-da.js) the moment it is added to the page.
// Numbers are masked so one entry like "Own {0} m" covers every amount, and decimals get a Danish comma.
(function (g) {
  const DG = (g.DG = g.DG || {});
  const I = (DG.I18N = { lang: 'en', exact: new Map(), patterns: [] });

  DG.addTranslations = function (dict, patterns) {
    for (const k in dict) I.exact.set(k, dict[k]);
    if (patterns) I.patterns.push(...patterns);
  };

  const NUM = /\d[\d.,]*\d|\d/g;
  const daNum = x => (/^\d+\.\d{1,2}$/.test(x) ? x.replace('.', ',') : x);

  // Translate one string (English → current language). Unknown strings come back unchanged.
  // Results are remembered, since the same labels are translated again on every screen update.
  const memo = new Map();
  function tr(s) {
    if (I.lang === 'en' || !s) return s;
    let r = memo.get(s);
    if (r === undefined) {
      r = trRaw(s);
      if (memo.size > 20000) memo.clear();
      memo.set(s, r);
    }
    return r;
  }
  function trRaw(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    const core = m[2];
    if (!core || !/[A-Za-z]/.test(core)) return core ? m[1] + core.replace(NUM, daNum) + m[3] : s;
    let out = I.exact.get(core);
    if (out == null) {
      const nums = [];
      const masked = core.replace(NUM, x => { nums.push(x); return `{${nums.length - 1}}`; });
      const t = nums.length ? I.exact.get(masked) : null;
      if (t != null) out = t.replace(/\{(\d+)\}/g, (_, i) => daNum(nums[+i]));
    }
    if (out == null) {
      for (const [re, rep] of I.patterns) {
        const mm = re.exec(core);
        if (mm) { out = rep.replace(/\$(\d)/g, (_, i) => tr(mm[+i] || '')); break; }
      }
    }
    // "🎯 Title ✓": translate the text between leading and trailing symbols
    if (out == null) {
      const sym = /^([^\p{L}\p{N}"“(+−-]+)?([\s\S]*?)([\s✓✗✕♥✨🌙]*[\p{Extended_Pictographic}✓✗✕♥✨🌙][\s\p{Extended_Pictographic}\uFE0F\u200D✓✗✕♥✨🌙]*)?$/u.exec(core);
      if (sym && (sym[1] || sym[3]) && sym[2] && /[A-Za-z]/.test(sym[2])) {
        const inner = tr(sym[2]);
        if (inner !== sym[2]) out = (sym[1] || '') + inner + (sym[3] || '');
      }
    }
    // lowercase use of a capitalised entry ("her new trench coat")
    if (out == null && /^[a-z]/.test(core)) {
      const cap = I.exact.get(core[0].toUpperCase() + core.slice(1));
      if (cap != null) out = cap[0].toLowerCase() + cap.slice(1);
    }
    // comma lists: "A-line, Wrap, Empire"
    if (out == null && core.includes(', ')) {
      const parts = core.split(', ');
      const t = parts.map(x => tr(x));
      if (t.some((x, i) => x !== parts[i])) out = t.join(', ');
    }
    if (out == null) out = core.replace(/\b\d+\.\d{1,2}\b/g, daNum);
    return m[1] + out + m[3];
  }
  DG.tr = tr;

  const ATTRS = ['placeholder', 'aria-label', 'title'];
  function translateTree(node) {
    if (I.lang === 'en' || !node) return;
    if (node.nodeType === 3) {
      const v = node.nodeValue, t = tr(v);
      if (t !== v) node.nodeValue = t;
      return;
    }
    if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    if (node.getAttribute('translate') === 'no') return;
    // drawings: only look inside when they have text in them
    if (node.tagName === 'svg') { if (!node.getElementsByTagName('text').length) return; }
    ATTRS.forEach(a => { const v = node.getAttribute(a); if (v) { const t = tr(v); if (t !== v) node.setAttribute(a, t); } });
    if (node.tagName === 'TEXTAREA') return;   // never touch what people type
    for (let c = node.firstChild; c; c = c.nextSibling) translateTree(c);
  }
  DG.translateTree = translateTree;
  // drop queued mutations (used after the screen has been patched with already-translated content)
  DG.i18nSkipPending = () => { if (observer) observer.takeRecords(); };

  let observer = null;
  DG.setLang = function (lang) {
    I.lang = lang === 'da' ? 'da' : 'en';
    memo.clear();
    if (!g.document) return;
    g.document.documentElement.lang = I.lang;
    if (!observer && g.MutationObserver) {
      observer = new g.MutationObserver(muts => {
        if (I.lang === 'en') return;
        for (const mu of muts) {
          if (mu.type === 'characterData') translateTree(mu.target);
          else mu.addedNodes.forEach(translateTree);
        }
      });
      observer.observe(g.document.body, { childList: true, subtree: true, characterData: true });
    }
    translateTree(g.document.body);
  };
})(typeof window !== 'undefined' ? window : globalThis);
