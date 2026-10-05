// Local player profiles, per-profile saves, settings and portable save codes.
// Everything lives in this browser's localStorage; save codes move a game between devices.
(function (g) {
  const DG = (g.DG = g.DG || {});
  const K_PROFILES = 'mies-atelier-profiles';
  const K_SETTINGS = 'mies-atelier-settings';
  const K_LEGACY = 'mies-atelier-save-v1';
  const slotKey = id => `mies-atelier-save-${id}`;

  const get = k => { try { const s = g.localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const set = (k, v) => { try { g.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const del = k => { try { g.localStorage.removeItem(k); } catch (e) { /* ignore */ } };

  const DEFAULT_SETTINGS = { lang: /^da\b/i.test((g.navigator && g.navigator.language) || '') ? 'da' : 'en', theme: 'auto', music: 0.3, sfx: 0.7, anim: true, minigames: 'full', tips: true };

  // unicode-safe base64
  const b64e = str => g.btoa(unescape(encodeURIComponent(str)));
  const b64d = str => decodeURIComponent(escape(g.atob(str)));

  DG.Profiles = {
    data() {
      let d = get(K_PROFILES);
      if (!d) {
        d = { active: null, list: [] };
        // migrate the single save from earlier versions into a profile
        const legacy = get(K_LEGACY);
        if (legacy) {
          const id = 'p' + Date.now().toString(36);
          d.list.push({ id, name: 'Player 1', created: Date.now(), lastPlayed: Date.now(), day: legacy.day, money: legacy.money });
          d.active = id;
          set(slotKey(id), legacy);
          del(K_LEGACY);
        }
        set(K_PROFILES, d);
      }
      return d;
    },
    list() { return this.data().list; },
    active() { const d = this.data(); return d.list.find(p => p.id === d.active) || null; },
    create(name, game) {
      const d = this.data();
      const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      d.list.push({ id, name: (name || 'Player').trim().slice(0, 24) || 'Player', created: Date.now(), lastPlayed: Date.now(), day: game ? game.day : 0, money: game ? game.money : 0 });
      d.active = id;
      set(K_PROFILES, d);
      if (game) set(slotKey(id), game);
      return id;
    },
    switchTo(id) { const d = this.data(); if (d.list.some(p => p.id === id)) { d.active = id; set(K_PROFILES, d); } },
    rename(id, name) { const d = this.data(); const p = d.list.find(x => x.id === id); if (p && name.trim()) { p.name = name.trim().slice(0, 24); set(K_PROFILES, d); } },
    remove(id) {
      const d = this.data();
      d.list = d.list.filter(p => p.id !== id);
      if (d.active === id) d.active = d.list.length ? d.list[0].id : null;
      set(K_PROFILES, d);
      del(slotKey(id));
    },
    loadGame() { const p = this.active(); return p ? get(slotKey(p.id)) : null; },
    saveGame(G) {
      const d = this.data();
      const p = d.list.find(x => x.id === d.active);
      if (!p) return false;
      p.lastPlayed = Date.now(); p.day = G.day; p.money = Math.round(G.money);
      set(K_PROFILES, d);
      return set(slotKey(p.id), G);
    },
    // Save codes: "MIE1:" + base64(JSON)
    exportCode(G) { return 'MIE1:' + b64e(JSON.stringify(G)); },
    parseCode(code) {
      const c = String(code || '').trim().replace(/\s+/g, '');
      if (!c.startsWith('MIE1:')) throw new Error('That does not look like a save code from Life of Mie. It should start with MIE1:');
      let G;
      try { G = JSON.parse(b64d(c.slice(5))); } catch (e) { throw new Error('The save code is incomplete or damaged. Copy the whole code and try again.'); }
      if (!G || G.version !== 1 || typeof G.day !== 'number') throw new Error('The save code is not a valid game.');
      return G;
    },
    settings() { return Object.assign({}, DEFAULT_SETTINGS, get(K_SETTINGS) || {}); },
    saveSettings(s) { set(K_SETTINGS, s); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
