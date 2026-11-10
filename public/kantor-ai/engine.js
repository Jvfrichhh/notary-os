/*
 * Kantor AI — kantor virtual 12 agen untuk Nexora.
 * Engine kanvas mandiri tanpa dependensi. Dipasang oleh komponen
 * src/components/kantor-ai/KantorAiOffice.tsx lewat window.KantorAI.mount().
 * Data berasal dari /api/kantor-ai (tanpa nama klien / NIK).
 */
(function () {
  "use strict";
  var CSS = ' .kai{\n  --bg:#F4EFE7; --panel:#FFFDF9; --ink:#1F2433; --muted:#6B6F7B; --line:#E7E0D4;\n  --blue:#3B7BF6; --red:#EA4F3D; --yellow:#F6B92B; --green:#2FA86A; --navy:#082A21;\n}\n.kai{display:flex;height:100%;width:100%;position:relative;overflow:hidden;background:var(--bg);color:var(--ink);font-family:inherit;border-radius:inherit}\n.kai *{box-sizing:border-box}\n.kai-stage{position:relative;flex:1;min-width:0}\n.kai canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none}\n.kai canvas.drag{cursor:grabbing}\n.kai .hud{position:absolute;left:16px;top:14px;display:flex;flex-direction:column;gap:8px;pointer-events:none}\n.kai .brand{background:rgba(255,253,249,.92);backdrop-filter:blur(6px);border:1px solid var(--line);border-radius:16px;padding:10px 14px;pointer-events:auto;box-shadow:0 6px 20px rgba(40,30,10,.07)}\n.kai .brand .dots{display:flex;gap:4px;margin-bottom:6px}\n.kai .brand .dots i{width:8px;height:8px;border-radius:50%;display:block}\n.kai .brand h1{margin:0;font-size:15px;font-weight:800;letter-spacing:-.01em}\n.kai .brand p{margin:2px 0 0;font-size:11.5px;color:var(--muted)}\n.kai .clock{display:inline-flex;align-items:center;gap:8px;background:var(--navy);color:#fff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;pointer-events:auto;width:max-content}\n.kai .clock b{font-variant-numeric:tabular-nums;font-size:13px}\n.kai .zoom{position:absolute;right:14px;bottom:14px;display:flex;flex-direction:column;gap:6px}\n.kai .zoom button{width:36px;height:36px;border-radius:12px;border:1px solid var(--line);background:var(--panel);font-size:17px;font-weight:600;font-family:inherit;color:var(--ink);cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.06)}\n.kai .zoom button:hover{background:#fff}\n.kai-panel{width:340px;flex:none;background:var(--panel);border-left:1px solid var(--line);display:flex;flex-direction:column;min-height:0}\n.kai .ph{padding:16px 16px 10px;border-bottom:1px solid var(--line)}\n.kai .ph h2{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}\n.kai .actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}\n.kai .actions button{border:1px solid var(--line);background:#fff;border-radius:12px;padding:8px 8px;font-size:12px;font-weight:600;font-family:inherit;color:var(--ink);cursor:pointer;text-align:left;display:flex;gap:6px;align-items:center}\n.kai .actions button:hover{border-color:#cfc6b6}\n.kai .actions button.wide{grid-column:span 2}\n.kai .actions button:disabled{opacity:.5;cursor:default}\n.kai .scroll{overflow:auto;flex:1;min-height:0}\n.kai .sec{padding:12px 16px}\n.kai .sec h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}\n.kai .agent{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:12px;cursor:pointer;border:1px solid transparent}\n.kai .agent:hover{background:#F7F2EA}\n.kai .agent.sel{background:#EEF3FF;border-color:#C9D8FF}\n.kai .av{width:30px;height:30px;border-radius:10px;flex:none;display:grid;place-items:center;font-size:15px}\n.kai .agent .t{min-width:0;flex:1}\n.kai .agent .n{font-size:13px;font-weight:700;display:flex;justify-content:space-between;gap:6px;align-items:baseline}.agent .n i{font-style:normal}\n.kai .agent .n span{font-weight:500;color:var(--muted);font-size:11px;white-space:nowrap}\n.kai .agent .s{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.kai .card{margin:0 16px 12px;border:1px solid #C9D8FF;background:#F5F8FF;border-radius:14px;padding:12px 14px;display:none}\n.kai .card.on{display:block}\n.kai .card h4{margin:0;font-size:15px}\n.kai .card .pic{font-size:12px;color:var(--muted);margin-top:2px}\n.kai .card .skill{display:inline-block;margin-top:8px;font:600 11px ui-monospace,Menlo,monospace;background:#fff;border:1px solid #DCE5FF;border-radius:8px;padding:3px 7px;color:#2B4FB3}\n.kai .card p{font-size:12.5px;line-height:1.5;margin:8px 0}\n.kai .card .ex{background:#fff;border:1px dashed #BFD0FF;border-radius:10px;padding:8px 10px;font-size:12px;display:flex;gap:8px;align-items:center;justify-content:space-between}\n.kai .card .ex button{border:none;background:var(--blue);color:#fff;border-radius:8px;padding:5px 9px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;flex:none}\n.kai .log{font-size:12px;display:flex;flex-direction:column;gap:6px}\n.kai .log div{display:flex;gap:8px;line-height:1.4}\n.kai .log time{color:var(--muted);font-variant-numeric:tabular-nums;flex:none}\n.kai .log em{font-style:normal;font-weight:700}\n.kai .empty{font-size:12px;color:var(--muted)}\n.kai .nx{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}\n.kai .nx div{background:#F7F2EA;border-radius:12px;padding:8px 9px}\n.kai .nx b{display:block;font-size:18px;font-weight:800;letter-spacing:-.02em}\n.kai .nx span{font-size:10.5px;color:var(--muted);line-height:1.25;display:block}\n.kai .nx .src{grid-column:span 3;background:none;padding:0 2px;font-size:11px;color:var(--muted)}\n.kai .nx .src i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-right:5px}\n.kai .actions button.primary{background:var(--navy);color:#fff;border-color:var(--navy);justify-content:center}\n.kai .badge{font-size:10.5px;font-weight:700;background:#24304D;color:#fff;border-radius:999px;padding:1px 7px;margin-left:6px}\n.kai .badge.zero{background:#E7E0D4;color:var(--muted)}\n.kai .jobs{margin:8px 0 0;padding:0;list-style:none;font-size:11.5px;display:flex;flex-direction:column;gap:3px;max-height:150px;overflow:auto}\n.kai .jobs li{background:#fff;border:1px solid #E1E8FA;border-radius:8px;padding:4px 7px}\n.kai .jobs li b{font-variant-numeric:tabular-nums}\n@media (max-width:820px){\n  .kai{flex-direction:column}\n  .kai-panel{width:auto;height:44%;border-left:none;border-top:1px solid var(--line)}\n  .kai .brand h1{font-size:13px}\n  .kai .brand p{display:none}\n}\n.kai .kai-stage{overflow:hidden}\n.kai canvas{position:absolute;inset:0}\n.kai .jobs li a{color:inherit;text-decoration:none;display:block}\n.kai .jobs li a:hover b{text-decoration:underline}\n.kai .kai-panel{min-height:0}\n.kai .clock{background:var(--navy)}\n';
  var HTML = '\n  <div class="kai-stage">\n    <canvas data-k="c" aria-label="Kantor virtual 12 agen AI"></canvas>\n    <div class="hud">\n      <div class="brand">\n        <div class="dots"><i style="background:var(--blue)"></i><i style="background:var(--red)"></i><i style="background:var(--yellow)"></i><i style="background:var(--green)"></i></div>\n        <h1>Kantor AI · Notaris &amp; PPAT</h1>\n        <p>Ari Yudani Aprianti, S.H., M.Kn. — Kota Bogor</p>\n      </div>\n      <div class="clock">🕘 <b data-k="clock">08:30</b><span data-k="phase">Jam kerja</span></div>\n    </div>\n    <div class="zoom">\n      <button data-k="zin" title="Perbesar">+</button>\n      <button data-k="zout" title="Perkecil">−</button>\n      <button data-k="zfit" title="Lihat semua">⤢</button>\n    </div>\n  </div>\n  <aside class="kai-panel">\n    <div class="ph">\n      <h2>Data Nexora</h2>\n      <div class="nx" data-k="nx"></div>\n      <div class="actions">\n        <button data-k="replayBtn" class="wide primary">▶ Putar ulang hari ini</button>\n      </div>\n      <h2 style="margin-top:12px">Simulasi</h2>\n      <div class="actions">\n        <button data-k="flowNot">📜 Alur PKR</button>\n        <button data-k="flowPpat">🏠 Alur AJB</button>\n        <button data-k="flowLeg">✍️ Legalisasi</button>\n        <button data-k="breakBtn">☕ Istirahat</button>\n        <button data-k="speedBtn" class="wide">⏩ Kecepatan: 1×</button>\n      </div>\n    </div>\n    <div class="scroll">\n      <div class="card" data-k="card"></div>\n      <div class="sec">\n        <h3>Agen (12)</h3>\n        <div data-k="agents"></div>\n      </div>\n      <div class="sec">\n        <h3>Aktivitas berkas</h3>\n        <div class="log" data-k="log"><div class="empty">Klik “Putar ulang hari ini” untuk melihat pekerjaan Nexora hari ini masuk satu per satu.</div></div>\n      </div>\n    </div>\n  </aside>\n';
  function mount(root, data, opts) {
    opts = opts || {};
    if (!document.getElementById("kai-style")) {
      var st = document.createElement("style");
      st.id = "kai-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    root.classList.add("kai");
    root.innerHTML = HTML;
    var $ = function (k) { return root.querySelector('[data-k="' + k + '"]'); };
    const TW = 64, TH = 32;           // ukuran tile isometrik
    const W = 32, H = 24;             // ukuran denah (tile)
    const WALL_H = 96;
    const cv = $('c');
    const ctx = cv.getContext('2d');
    let DPR = Math.max(1, window.devicePixelRatio || 1);
    const cam = { x: 0, y: 0, z: 1 };

    const iso = (x, y, z = 0) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 - z });

    function shade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
      r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
      return `rgb(${r},${g},${b})`;
    }
    function poly(pts, fill, stroke, lw = 1) {
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    }
    function box(x, y, w, d, z0, h, col, opt = {}) {
      const top = opt.top || shade(col, 0.18), left = opt.left || col, right = opt.right || shade(col, -0.18);
      const s = opt.stroke || 'rgba(0,0,0,.10)';
      poly([iso(x, y + d, z0), iso(x + w, y + d, z0), iso(x + w, y + d, z0 + h), iso(x, y + d, z0 + h)], left, s);
      poly([iso(x + w, y, z0), iso(x + w, y + d, z0), iso(x + w, y + d, z0 + h), iso(x + w, y, z0 + h)], right, s);
      poly([iso(x, y, z0 + h), iso(x + w, y, z0 + h), iso(x + w, y + d, z0 + h), iso(x, y + d, z0 + h)], top, s);
    }
    function ellipse(cx, cy, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
    function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    // ---------- ZONA ----------
    const zones = [
      { id: 'notaris', label: 'Ruang Notaris', x: 0, y: 0, w: 7, h: 6, c: '#D9B48A', c2: '#D2AB80' },
      { id: 'ttd', label: 'Ruang Tanda Tangan', x: 8, y: 0, w: 7, h: 6, c: '#CBD6E4', c2: '#C4D0DF' },
      { id: 'legal', label: 'Legal Hub', x: 16, y: 0, w: 10, h: 8, c: '#DCE6F6', c2: '#D5E0F2' },
      { id: 'kopi', label: 'Coffee Bar', x: 26, y: 0, w: 6, h: 6, c: '#C9A27E', c2: '#C09775' },
      { id: 'admin', label: 'Admin & Keuangan', x: 0, y: 7, w: 8, h: 8, c: '#E0EDDC', c2: '#D8E7D3' },
      { id: 'ppat', label: 'PPAT & Arsip', x: 8, y: 7, w: 8, h: 8, c: '#F2E4C5', c2: '#ECDCBA' },
      { id: 'lounge', label: 'Lounge', x: 16, y: 8, w: 8, h: 8, c: '#F4D5CC', c2: '#EFCDC3' },
      { id: 'game', label: 'Game Room', x: 25, y: 7, w: 7, h: 8, c: '#2F3A58', c2: '#36425F', dark: true },
      { id: 'kantin', label: 'Kafetaria', x: 16, y: 16, w: 16, h: 8, c: '#F8F4EC', c2: '#E8DFCF' },
      { id: 'lobby', label: 'Lobby & Front Office', x: 0, y: 16, w: 16, h: 8, c: '#ECE7DE', c2: '#E4DED2' },
    ];
    const zoneAt = (x, y) => zones.find(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);

    // ---------- DINDING KACA (tile penghalang) ----------
    const walls = new Set();
    const addWall = (x, y) => walls.add(x + ',' + y);
    for (let y = 0; y <= 6; y++) if (y !== 4) addWall(7, y);
    for (let x = 0; x <= 6; x++) if (x !== 4) addWall(x, 6);
    for (let y = 0; y <= 6; y++) if (y !== 4) addWall(15, y);
    for (let x = 8; x <= 14; x++) if (x !== 11) addWall(x, 6);
    for (let y = 8; y <= 15; y++) if (y !== 11 && y !== 12) addWall(24, y);
    for (let x = 25; x <= 31; x++) if (x !== 27 && x !== 28) addWall(x, 15);

    // ---------- FURNITUR ----------
    const objects = [];   // {x,y,w,d,block,draw,key}
    const blocked = new Set();
    function add(x, y, w, d, draw, block = true, keyAdj = 0) {
      const o = { x, y, w, d, draw, block, key: x + w + y + d - 1 + keyAdj };
      objects.push(o);
      if (block) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) blocked.add((x + i) + ',' + (y + j));
      return o;
    }
    const WOOD = '#B9835A', WOOD_L = '#E6C8A2', WHITE = '#F4F1EC';

    function desk(x, y, w = 2, col = WOOD_L, screen = '#7CC4FF') {
      add(x, y, w, 1, () => {
        box(x + 0.06, y + 0.18, w - 0.12, 0.64, 0, 17, col, { top: shade(col, 0.25) });
        box(x + w / 2 - 0.36, y + 0.22, 0.72, 0.07, 17, 16, '#2A2F3A');
        poly([iso(x + w / 2 - 0.32, y + 0.29, 19), iso(x + w / 2 + 0.32, y + 0.29, 19), iso(x + w / 2 + 0.32, y + 0.29, 31), iso(x + w / 2 - 0.32, y + 0.29, 31)], screen);
        box(x + 0.2, y + 0.55, 0.14, 0.14, 17, 6, '#FFFFFF');
        box(x + w - 0.5, y + 0.45, 0.3, 0.22, 17, 3, '#F6F6F6');
      });
    }
    function chair(x, y, col = '#3D4660') {
      add(x, y, 1, 1, () => {
        box(x + 0.3, y + 0.3, 0.4, 0.4, 5, 4, col);
        box(x + 0.3, y + 0.24, 0.4, 0.07, 5, 16, col);
      }, false, -0.6);
    }
    function plant(x, y, big = false) {
      add(x, y, 1, 1, () => {
        box(x + 0.3, y + 0.3, 0.4, 0.4, 0, 12, '#C86F48');
        const p = iso(x + 0.5, y + 0.5, big ? 30 : 22);
        ellipse(p.x, p.y + 4, 15, 10, '#2E8B57'); ellipse(p.x - 7, p.y - 2, 10, 9, '#3BA369'); ellipse(p.x + 7, p.y - 4, 10, 9, '#47B877');
        if (big) { ellipse(p.x, p.y - 12, 11, 10, '#56C584'); }
      });
    }
    function shelf(x, y, w, d, label) {
      add(x, y, w, d, () => {
        box(x + 0.05, y + 0.1, w - 0.1, d - 0.2, 0, 54, '#8C6142');
        const cols = ['#EA4F3D', '#3B7BF6', '#F6B92B', '#2FA86A', '#F2EDE4', '#7E57C2'];
        for (let r = 0; r < 3; r++) for (let i = 0; i < w * 5; i++) {
          const u = x + 0.1 + i * (w - 0.2) / (w * 5);
          const yy = y + d - 0.1;
          poly([iso(u, yy, 6 + r * 16), iso(u + (w - 0.2) / (w * 5) - 0.02, yy, 6 + r * 16), iso(u + (w - 0.2) / (w * 5) - 0.02, yy, 17 + r * 16), iso(u, yy, 17 + r * 16)], cols[(i * 7 + r * 3) % cols.length]);
        }
      });
    }

    // Ruang Notaris
    shelf(1, 0, 3, 1);
    desk(2, 2, 2, '#8E5B3C', '#9AD0FF'); chair(2, 1, '#5A3A28');
    desk(5, 2, 1, WOOD_L); chair(5, 1);
    plant(6, 5, true); plant(0, 5);
    add(0, 3, 1, 2, () => { box(0.1, 3.1, 0.8, 1.8, 0, 9, '#6B4E3D'); box(0.1, 3.1, 0.25, 1.8, 9, 12, '#6B4E3D'); });
    // Ruang Tanda Tangan
    add(9, 2, 5, 2, () => { box(9.1, 2.15, 4.8, 1.7, 0, 16, '#F5F2EE', { top: '#FFFFFF' }); const p = iso(11.5, 3, 16); ellipse(p.x, p.y, 14, 7, 'rgba(59,123,246,.25)'); });
    for (let x = 9; x <= 13; x++) { chair(x, 1, '#2C3550'); chair(x, 4, '#2C3550'); }
    plant(14, 5);
    // Legal Hub
    desk(17, 3); chair(17, 2); desk(20, 3); chair(20, 2); desk(23, 3); chair(23, 2);
    desk(17, 6); chair(17, 5); desk(20, 6, 2, WOOD_L, '#2A2F3A'); desk(23, 6, 2, WOOD_L, '#2A2F3A');
    plant(25, 7); plant(16, 0);
    // Coffee Bar
    add(27, 2, 4, 1, () => {
      box(27, 2.1, 4, 0.8, 0, 22, '#3B2C25', { top: '#D9C3A5' });
      box(27.3, 2.2, 0.6, 0.45, 22, 16, '#C9CED6'); box(27.4, 2.15, 0.4, 0.1, 30, 6, '#EA4F3D');
      for (let i = 0; i < 4; i++) box(28.3 + i * 0.6, 2.4, 0.16, 0.16, 22, 6, i % 2 ? '#FFFFFF' : '#F6B92B');
    });
    for (let x = 27; x <= 30; x++) add(x, 3, 1, 1, () => { box(x + 0.35, 3.35, 0.3, 0.3, 0, 13, '#2C2C2C', { top: '#F6B92B' }); }, false, -0.6);
    add(26, 0, 1, 1, () => { box(26.1, 0.1, 0.8, 0.8, 0, 46, '#E9E4DA'); box(26.2, 0.85, 0.6, 0.05, 22, 18, '#3B2C25'); });
    plant(31, 5, true);
    // Admin & Keuangan
    desk(1, 9); chair(1, 8); desk(4, 9); chair(4, 8); desk(1, 12, 2, WOOD_L, '#9BE3B5'); chair(1, 11);
    add(5, 12, 1, 1, () => { box(5.15, 12.15, 0.7, 0.7, 0, 30, '#5C6573'); const p = iso(5.5, 12.85, 18); ellipse(p.x, p.y, 4, 4, '#F6B92B'); });
    add(0, 7, 1, 2, () => { box(0.1, 7.1, 0.8, 1.8, 0, 36, '#9AA3B0'); for (let i = 0; i < 3; i++) poly([iso(0.9, 7.3, 8 + i * 10), iso(0.9, 8.7, 8 + i * 10), iso(0.9, 8.7, 10 + i * 10), iso(0.9, 7.3, 10 + i * 10)], '#5C6573'); });
    plant(7, 14); plant(6, 8);
    // PPAT & Arsip
    desk(9, 9); chair(9, 8); desk(12, 9); chair(12, 8);
    shelf(9, 13, 5, 1);
    add(15, 8, 1, 1, () => { box(15.4, 8.1, 0.1, 0.8, 0, 2, '#555'); box(15.1, 8.15, 0.15, 0.7, 14, 34, '#FFFFFF', { left: '#FFFFFF' }); }, true);
    plant(8, 14); plant(15, 14);
    // Lounge
    add(16, 9, 7, 5, () => { poly([iso(16.3, 9.3), iso(22.7, 9.3), iso(22.7, 13.7), iso(16.3, 13.7)], '#EBA898'); poly([iso(16.6, 9.6), iso(22.4, 9.6), iso(22.4, 13.4), iso(16.6, 13.4)], null, 'rgba(255,255,255,.6)', 2); }, false, -50);
    add(17, 10, 3, 1, () => { box(17, 10.15, 3, 0.75, 0, 9, '#3B7BF6'); box(17, 10.05, 3, 0.25, 9, 14, '#2F67D6'); box(17, 10.15, 0.25, 0.75, 9, 6, '#2F67D6'); box(19.75, 10.15, 0.25, 0.75, 9, 6, '#2F67D6'); });
    add(17, 14, 3, 1, () => { box(17.2, 14.3, 2.6, 0.4, 0, 10, '#3A3A3A'); box(17.4, 14.45, 2.2, 0.1, 10, 26, '#111'); poly([iso(17.5, 14.55, 13), iso(19.5, 14.55, 13), iso(19.5, 14.55, 33), iso(17.5, 14.55, 33)], '#53A7FF'); });
    add(21, 10, 1, 1, () => { const p = iso(21.5, 10.5); ellipse(p.x, p.y - 6, 20, 13, '#F6B92B'); ellipse(p.x - 3, p.y - 11, 13, 8, '#FFD15A'); });
    add(21, 13, 1, 1, () => { const p = iso(21.5, 13.5); ellipse(p.x, p.y - 6, 20, 13, '#EA4F3D'); ellipse(p.x - 3, p.y - 11, 13, 8, '#FF7A66'); });
    plant(23, 15, true); plant(16, 15);
    // Game Room
    add(26, 9, 3, 2, () => {
      box(26.05, 9.1, 2.9, 1.8, 0, 16, '#5B3A26');
      poly([iso(26.25, 9.3, 16.2), iso(28.75, 9.3, 16.2), iso(28.75, 10.7, 16.2), iso(26.25, 10.7, 16.2)], '#1F9D57');
      [[26.6, 9.7, '#fff'], [27.6, 10.1, '#EA4F3D'], [27.8, 9.8, '#F6B92B'], [28.1, 10.3, '#3B7BF6'], [27.4, 10.4, '#111']].forEach(b => { const p = iso(b[0], b[1], 18); ellipse(p.x, p.y, 3.4, 2.4, b[2]); });
      for (const c of [[26.25, 9.3], [28.75, 9.3], [28.75, 10.7], [26.25, 10.7]]) { const p = iso(c[0], c[1], 16.5); ellipse(p.x, p.y, 3, 2, '#111'); }
    });
    add(26, 13, 3, 1, () => {
      box(26.1, 13.15, 2.8, 0.7, 0, 14, '#1D4E9E', { top: '#2363C9' });
      poly([iso(26.15, 13.2, 14.3), iso(28.85, 13.2, 14.3), iso(28.85, 13.8, 14.3), iso(26.15, 13.8, 14.3)], null, '#fff', 1);
      poly([iso(27.5, 13.12, 14), iso(27.5, 13.88, 14), iso(27.5, 13.88, 21), iso(27.5, 13.12, 21)], 'rgba(255,255,255,.8)');
    });
    function arcade(x, y, c) { add(x, y, 1, 1, () => { box(x + 0.15, y + 0.15, 0.7, 0.7, 0, 44, c); poly([iso(x + 0.25, y + 0.85, 26), iso(x + 0.75, y + 0.85, 26), iso(x + 0.75, y + 0.85, 40), iso(x + 0.25, y + 0.85, 40)], '#7CF7FF'); box(x + 0.25, y + 0.6, 0.5, 0.3, 18, 4, '#222'); }); }
    arcade(31, 9, '#EA4F3D'); arcade(31, 11, '#7E57C2');
    add(25, 8, 1, 1, () => { const p = iso(25.5, 8.5, 0); ellipse(p.x, p.y - 4, 14, 8, '#F6B92B'); ellipse(p.x, p.y - 12, 11, 7, '#FFD15A'); });
    // Kafetaria
    const tables = [[18, 18], [22, 18], [26, 18], [18, 21], [22, 21], [26, 21]];
    for (const [x, y] of tables) {
      add(x, y, 2, 1, () => { box(x + 0.15, y + 0.2, 1.7, 0.6, 0, 15, '#FFFFFF', { top: '#FFFFFF', left: '#EDE8DF', right: '#DAD3C7' }); const p = iso(x + 1, y + 0.5, 15); ellipse(p.x, p.y, 6, 3, '#F6B92B'); });
      chair(x - 1, y, '#EA4F3D'); chair(x + 2, y, '#3B7BF6');
    }
    add(30, 17, 2, 4, () => {
      box(30.1, 17.1, 1.8, 3.8, 0, 22, '#B8C0CC', { top: '#E7EBF0' });
      const foods = ['#EA4F3D', '#F6B92B', '#2FA86A', '#E8833A', '#8BC34A', '#F48FB1'];
      for (let i = 0; i < 6; i++) { const p = iso(30.6 + (i % 2) * 0.8, 17.6 + Math.floor(i / 2) * 1.2, 22); ellipse(p.x, p.y, 8, 4, foods[i]); }
    });
    add(31, 22, 1, 1, () => { box(31.1, 22.1, 0.8, 0.8, 0, 48, '#EA4F3D'); poly([iso(31.2, 22.9, 16), iso(31.75, 22.9, 16), iso(31.75, 22.9, 42), iso(31.2, 22.9, 42)], '#BDE6FF'); });
    plant(16, 23, true); plant(24, 16); plant(29, 23);
    // Lobby
    add(4, 19, 4, 1, () => {
      box(4, 19.1, 4, 0.8, 0, 22, '#FFFFFF', { left: '#F1EEE9', right: '#DCD6CC', top: '#E8D9C3' });
      poly([iso(4.4, 19.9, 6), iso(7.6, 19.9, 6), iso(7.6, 19.9, 17), iso(4.4, 19.9, 17)], '#24304D');
      for (let i = 0; i < 4; i++) { const p = iso(5 + i * 0.7, 19.9, 11.5); ellipse(p.x, p.y, 3, 3, ['#3B7BF6', '#EA4F3D', '#F6B92B', '#2FA86A'][i]); }
      box(6.6, 19.3, 0.6, 0.06, 22, 12, '#2A2F3A');
    });
    chair(5, 18, '#24304D');
    add(10, 18, 3, 1, () => { box(10, 18.15, 3, 0.75, 0, 9, '#2FA86A'); box(10, 18.05, 3, 0.25, 9, 14, '#268F59'); });
    add(10, 21, 3, 1, () => { box(10, 21.15, 3, 0.75, 0, 9, '#2FA86A'); box(10, 21.65, 3, 0.25, 9, 14, '#268F59'); });
    add(10, 20, 3, 1, () => { box(10.6, 20.25, 1.8, 0.5, 0, 9, '#E6C8A2'); }, true);
    add(6, 22, 3, 2, () => { poly([iso(6.1, 22.2), iso(8.9, 22.2), iso(8.9, 23.9), iso(6.1, 23.9)], '#C6BBA8'); }, false, -50);
    plant(0, 16, true); plant(15, 16); plant(0, 23); plant(14, 23, true); plant(3, 16);

    const isFree = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !walls.has(x + ',' + y) && !blocked.has(x + ',' + y);

    // ---------- TEMPAT SANTAI ----------
    const spots = [
      ...[27, 28, 29, 30].map(x => ({ x, y: 3, label: 'Ngopi di coffee bar', e: '☕', kind: 'kopi' })),
      { x: 25, y: 10, label: 'Main biliar', e: '🎱', kind: 'game' }, { x: 29, y: 9, label: 'Main biliar', e: '🎱', kind: 'game' }, { x: 27, y: 11, label: 'Main biliar', e: '🎱', kind: 'game' },
      { x: 25, y: 13, label: 'Main ping pong', e: '🏓', kind: 'game' }, { x: 29, y: 13, label: 'Main ping pong', e: '🏓', kind: 'game' },
      { x: 30, y: 9, label: 'Main arcade', e: '🕹️', kind: 'game' }, { x: 30, y: 11, label: 'Main arcade', e: '🕹️', kind: 'game' },
      { x: 17, y: 11, label: 'Santai di sofa', e: '🛋️', kind: 'lounge' }, { x: 18, y: 11, label: 'Nonton TV', e: '📺', kind: 'lounge' }, { x: 19, y: 11, label: 'Santai di sofa', e: '🛋️', kind: 'lounge' },
      { x: 22, y: 10, label: 'Rebahan di bean bag', e: '😌', kind: 'lounge' }, { x: 22, y: 13, label: 'Baca buku di bean bag', e: '📖', kind: 'lounge' },
      { x: 29, y: 18, label: 'Ambil camilan', e: '🍩', kind: 'kantin' }, { x: 30, y: 21, label: 'Beli minuman', e: '🥤', kind: 'kantin' },
      { x: 11, y: 17, label: 'Ngobrol di lobby', e: '💬', kind: 'lobby' }, { x: 12, y: 17, label: 'Ngobrol di lobby', e: '💬', kind: 'lobby' },
      { x: 24, y: 17, label: 'Siram tanaman', e: '🌿', kind: 'lain' }, { x: 15, y: 15, label: 'Siram tanaman', e: '🌿', kind: 'lain' },
    ];
    const lunchSeats = [];
    for (const [x, y] of tables) { lunchSeats.push({ x: x - 1, y, label: 'Makan siang di kafetaria', e: '🍜' }); lunchSeats.push({ x: x + 2, y, label: 'Makan siang di kafetaria', e: '🍛' }); }

    // ---------- AGEN ----------
    const AG = [
      { id: 'kepala', name: 'Kepala Kantor', pic: 'Bu Ari Yudani (Notaris)', skill: 'kepala-kantor-notaris', seat: [2, 1], shirt: '#24304D', hair: 'hijab', hc: '#7E57C2', skin: '#E8B98F', icon: '👩‍⚖️',
        desc: 'Pintu depan kantor: membaca permintaan, membagi tugas ke unit, dan menjalankan alur sampai siap ditandatangani.', ex: 'kantor notaris, ada klien baru mau ganti direksi PT',
        tasks: ['Bagi tugas berkas baru', 'Cek jadwal tanda tangan', 'Review memo telaah', 'Tanda tangan salinan'] },
      { id: 'front', name: 'Front Office', pic: 'Hana', skill: 'front-office-klien', seat: [5, 18], shirt: '#EA4F3D', hair: 'hijab', hc: '#F48FB1', skin: '#F0C7A0', icon: '🛎️',
        desc: 'Menerima klien, menentukan jenis akta, checklist dokumen, dan membuka nomor pekerjaan JOB di Nexora.', ex: 'ada klien mau jual rumah, dokumen apa saja yang perlu dibawa?',
        tasks: ['Terima tamu klien', 'Kirim checklist dokumen via WA', 'Buka nomor JOB baru', 'Scan KTP & KK klien'] },
      { id: 'pmpj', name: 'PMPJ & Kepatuhan', pic: 'Notaris / staf ditunjuk', skill: 'pmpj-kepatuhan', seat: [17, 5], shirt: '#2FA86A', hair: 'short', hc: '#2B1D16', skin: '#C98E64', icon: '🛡️',
        desc: 'Prinsip Mengenali Pengguna Jasa: identifikasi, pemilik manfaat, penilaian risiko, indikasi transaksi mencurigakan.', ex: 'buat formulir PMPJ dan cek pemilik manfaat PT ini',
        tasks: ['Isi formulir PMPJ', 'Cek pemilik manfaat PT', 'Nilai risiko transaksi', 'Cek data PEP'] },
      { id: 'riset', name: 'Riset Hukum', pic: 'Bu Ari Yudani', skill: 'riset-hukum-notaris', seat: [17, 2], shirt: '#3B7BF6', hair: 'long', hc: '#3A2418', skin: '#E3B48A', icon: '📚',
        desc: 'Mencari dan memverifikasi dasar hukum: UUJN, UUPT, aturan ATR/BPN, tarif pajak, Perda Kota Bogor.', ex: 'dasar hukum PKR maksimal 30 hari sejak RUPS apa?',
        tasks: ['Cek Perda BPHTB Kota Bogor', 'Cari pasal UUPT', 'Verifikasi aturan ATR/BPN', 'Update peta regulasi'] },
      { id: 'telaah', name: 'Telaah Berkas', pic: 'Bu Ari Yudani', skill: 'telaah-berkas', seat: [20, 2], shirt: '#7E57C2', hair: 'short', hc: '#1A1A1A', skin: '#D7A07A', icon: '🔍',
        desc: 'Due diligence: kewenangan bertindak, harta bersama, status objek, risiko, dan rekomendasi akta yang tepat.', ex: 'telaah berkas jual beli ini, aman gak?',
        tasks: ['Telaah sertipikat & PBB', 'Cek kewenangan direksi', 'Cek status harta bersama', 'Tulis memo telaah'] },
      { id: 'drafter', name: 'Drafter Akta', pic: 'Bu Ari Yudani', skill: 'drafter-akta-notaris', seat: [23, 2], shirt: '#F6B92B', hair: 'bun', hc: '#2B1D16', skin: '#F0C7A0', icon: '✒️',
        desc: 'Menyusun minuta dan salinan akta autentik mengikuti standar baku kantor (format Branjangan).', ex: 'buatkan draf PKR RUPSLB PT Maju Jaya',
        tasks: ['Susun minuta PKR', 'Rapikan strip & garis akta', 'Draf PPJB lunas', 'Cek komparisi penghadap'] },
      { id: 'ppat', name: 'PPAT & Pertanahan', pic: 'Bu Ari Yudani (dibantu Fajar & Eko)', skill: 'ppat-pertanahan', seat: [9, 8], shirt: '#E8833A', hair: 'short', hc: '#2B1D16', skin: '#C98E64', icon: '🏠',
        desc: 'AJB, hibah, APHB, APHT/SKMHT, pengecekan sertipikat, validasi pajak, dan pendaftaran ke Kantor Pertanahan.', ex: 'siapkan AJB rumah di Bogor Barat harga 850 juta',
        tasks: ['Pengecekan sertipikat elektronik', 'Siapkan Lampiran 13', 'Validasi BPHTB', 'Antar berkas ke BPN'] },
      { id: 'legal', name: 'Legalisasi & Waarmerking', pic: 'Hana', skill: 'legalisasi-waarmerking', seat: [12, 8], shirt: '#00A3A3', hair: 'long', hc: '#4A2C1C', skin: '#E8B98F', icon: '✍️',
        desc: 'Legalisasi, waarmerking, copy collatione, pengesahan fotokopi, dan buku daftarnya.', ex: 'legalisasi surat kuasa ini, siapkan teks pengesahannya',
        tasks: ['Legalisasi surat kuasa', 'Waarmerking perjanjian', 'Pengesahan fotokopi', 'Isi buku daftar'] },
      { id: 'admin', name: 'Administrasi Online', pic: 'Fajar Buana Firdaus', skill: 'administrasi-online', seat: [1, 8], shirt: '#5C6BC0', hair: 'short', hc: '#111', skin: '#D7A07A', icon: '💻',
        desc: 'AHU Online, pendaftaran fidusia, Daftar Pusat Wasiat, laporan pemilik manfaat, dan NIB/OSS.', ex: 'buat lembar isian AHU untuk perubahan direksi',
        tasks: ['Input AHU Online', 'Daftar fidusia online', 'Lapor Daftar Pusat Wasiat', 'Lapor pemilik manfaat'] },
      { id: 'repert', name: 'Repertorium & Protokol', pic: 'Fajar Buana Firdaus', skill: 'repertorium-protokol', seat: [4, 8], shirt: '#8D6E63', hair: 'short', hc: '#2B1D16', skin: '#E3B48A', icon: '🗂️',
        desc: 'Nomor akta, repertorium, klapper, laporan bulanan MPD & PPAT, serta pantauan semua tenggat.', ex: 'tenggat AHU dan BPN minggu ini apa saja?',
        tasks: ['Catat repertorium', 'Susun klapper', 'Draf laporan bulanan MPD', 'Pantau tenggat 7 hari kerja'] },
      { id: 'keu', name: 'Keuangan & Pajak', pic: 'Eko Komarudin', skill: 'keuangan-pajak', seat: [1, 11], shirt: '#43A047', hair: 'short', hc: '#1A1A1A', skin: '#C98E64', icon: '💰',
        desc: 'Hitung PPh & BPHTB, honorarium, invoice INV, kuitansi KW, dan titipan pajak klien.', ex: 'hitung BPHTB dan PPh transaksi 850 juta di Kota Bogor',
        tasks: ['Hitung PPh & BPHTB', 'Terbitkan invoice INV', 'Catat titipan pajak', 'Rekap kas harian'] },
      { id: 'mutu', name: 'Kendali Mutu', pic: 'Bu Ari Yudani', skill: 'kendali-mutu-akta', seat: [5, 1], shirt: '#D81B60', hair: 'hijab', hc: '#24304D', skin: '#E8B98F', icon: '✅',
        desc: 'Pemeriksaan akhir akta & berkas: anatomi akta, saksi, konsistensi fakta, format baku, tenggat.', ex: 'cek akta ini sebelum penandatanganan',
        tasks: ['Cocokkan minuta & salinan', 'Cek saksi & sidik jari', 'Cek konsistensi NIK', 'Tandai temuan kritis'] },
    ];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const agents = AG.map((a, i) => ({
      ...a, i, px: a.seat[0] + 0.5, py: a.seat[1] + 0.5, path: [], state: 'work', timer: rnd(4, 14), status: pick(a.tasks), emoji: '💼',
      spot: null, forced: null, walkT: Math.random() * 10, bob: Math.random() * 6,
    }));
    const byId = Object.fromEntries(agents.map(a => [a.id, a]));

    // ---------- DATA NEXORA (tanpa nama klien/NIK) ----------
    let NEXORA = { taken: '', day: '', jobs: [] };
    const TASK_AGENT = t => /AHU|SABH|SABU|OSS|pengesahan badan hukum|Pendaftaran|Pemesanan nama/i.test(t) ? 'admin'
      : /Verifikasi kelengkapan/i.test(t) ? 'telaah'
      : /draft akta/i.test(t) ? 'drafter'
      : /Review draft/i.test(t) ? 'mutu'
      : /Jadwalkan penandatanganan/i.test(t) ? 'repert' : 'kepala';
    const ORDER = ['telaah', 'drafter', 'mutu', 'repert', 'admin'];
    function stageOf(j) {
      if (j.st === 'INBOX' || j.d < j.t) return { id: 'front', text: `Lengkapi dokumen klien (${j.d}/${j.t})` };
      const open = j.tasks.filter(t => t[1] !== 'DONE');
      const rank = t => { const i = ORDER.indexOf(TASK_AGENT(t)); return i < 0 ? 99 : i; };
      open.sort((a, b) => rank(a[0]) - rank(b[0]));
      return open.length ? { id: TASK_AGENT(open[0][0]), text: open[0][0] } : { id: 'kepala', text: 'Semua tugas selesai, siap diserahkan' };
    }
    let NX = { active: 0, inbox: 0, missing: 0, tasks: 0 };
    for (const a of agents) { a.cur = []; a.queue = 0; }
    const IDLE = { pmpj: 'Belum ada laporan PMPJ di Nexora', riset: 'Siaga, belum ada permintaan riset', ppat: 'Belum ada berkas PPAT di Nexora', legal: 'Buku legalisasi masih kosong', keu: 'Belum ada tagihan di Nexora' };
    function nexoraStatus(a) {
      if (a.id === 'kepala') return pick([`Memantau ${NX.active} pekerjaan aktif`, `${NX.inbox} pekerjaan masih di Inbox`, `${byId.mutu.queue} draf menunggu review Notaris`]);
      if (a.cur.length) { const c = a.cur[(a.curI = ((a.curI || 0) + 1) % a.cur.length)]; return `${c.job} · ${c.text}`; }
      if (a.queue) return `Antre ${a.queue} tugas di Nexora`;
      return IDLE[a.id] || pick(a.tasks);
    }
    let prevStage = null; // Map jobNumber -> stage id (untuk deteksi perubahan)
    function applyData(d, first) {
      NEXORA = d && Array.isArray(d.jobs) ? d : { taken: '', day: '', jobs: [] };
      NX = { active: NEXORA.jobs.length, inbox: 0, missing: 0, tasks: 0 };
      for (const a of agents) { a.cur = []; a.queue = 0; }
      const live = [];
      const nextStage = new Map();
      for (const j of NEXORA.jobs) {
        if (j.st === 'INBOX') NX.inbox++;
        if (j.d < j.t) NX.missing++;
        const sg = stageOf(j); j.stage = sg;
        nextStage.set(j.n, sg.id);
        byId[sg.id].cur.push({ id: j.id, job: j.n, svc: j.svc, text: sg.text });
        for (const t of j.tasks) if (t[1] !== 'DONE') { NX.tasks++; byId[TASK_AGENT(t[0])].queue++; }
        if (!first && prevStage) {
          const was = prevStage.get(j.n);
          if (was === undefined) {
            live.push({ id: 'front', job: j.n, time: j.c, text: `${j.n} baru masuk · ${j.svc}` });
            if (sg.id !== 'front') live.push({ id: sg.id, job: j.n, time: j.c, text: `${j.n}: ${sg.text}` });
          } else if (was !== sg.id) {
            live.push({ id: sg.id, job: j.n, text: `${j.n} pindah ke ${byId[sg.id].name}: ${sg.text}` });
          }
        }
      }
      if (!first && prevStage) for (const [n, was] of prevStage) if (!nextStage.has(n)) live.push({ id: 'kepala', job: n, text: `${n} selesai / keluar dari daftar aktif ✔` });
      prevStage = nextStage;
      byId.front.queue = NX.missing;
      for (const a of agents) if (!a.forced && (first || a.state === 'work')) a.status = nexoraStatus(a);
      buildReplay();
      renderNx(); renderAgentList();
      if (selected) select(selected, false);
      if (live.length) { liveQueue.push(...live); if (!flow) startLive(); }
    }

    // ---------- PATHFINDING ----------
    function findPath(sx, sy, tx, ty) {
      if (sx === tx && sy === ty) return [];
      const key = (x, y) => y * W + x;
      const prev = new Int32Array(W * H).fill(-2);
      const q = [key(sx, sy)]; prev[key(sx, sy)] = -1;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      const ok = (x, y) => (x === tx && y === ty) || (x === sx && y === sy) || isFree(x, y);
      for (let h = 0; h < q.length; h++) {
        const k = q[h], x = k % W, y = (k / W) | 0;
        if (x === tx && y === ty) break;
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nk = key(nx, ny);
          if (prev[nk] !== -2 || !ok(nx, ny)) continue;
          if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
          prev[nk] = k; q.push(nk);
        }
      }
      const end = key(tx, ty);
      if (prev[end] === -2) return null;
      const path = [];
      for (let k = end; k !== key(sx, sy); k = prev[k]) path.push([k % W, (k / W) | 0]);
      return path.reverse();
    }
    // cek denah
    (() => {
      const all = [...spots, ...lunchSeats, ...AG.map(a => ({ x: a.seat[0], y: a.seat[1], label: a.name }))];
      for (const s of all) {
        if (!isFree(s.x, s.y)) console.warn('Tile tidak bebas:', s.label, s.x, s.y);
        else if (!findPath(8, 15, s.x, s.y)) console.warn('Tidak terjangkau:', s.label, s.x, s.y);
      }
    })();

    function goTo(a, tx, ty) {
      const sx = Math.floor(a.px), sy = Math.floor(a.py);
      const p = findPath(sx, sy, tx, ty);
      if (p === null) { a.px = tx + 0.5; a.py = ty + 0.5; a.path = []; return; }
      a.path = p;
    }
    function releaseSpot(a) { if (a.spot) { a.spot.by = null; a.spot = null; } }

    // ---------- WAKTU ----------
    let simMin = 8 * 60 + 30;   // jam kantor simulasi
    let speed = 1;
    let breakUntil = 0;         // simMin sampai jam istirahat manual selesai
    const fmt = m => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
    const isLunch = () => simMin >= 12 * 60 && simMin < 13 * 60;
    const isBreak = () => isLunch() || simMin < breakUntil;

    // ---------- PERILAKU ----------
    function startWork(a, text) {
      releaseSpot(a);
      a.state = 'toDesk'; a.status = text || nexoraStatus(a); a.emoji = a.cur && a.cur.length ? '📂' : '💼';
      goTo(a, a.seat[0], a.seat[1]);
    }
    function goLeisure(a, pool) {
      const free = (pool || spots).filter(s => !s.by);
      if (!free.length) { a.timer = rnd(5, 10); return; }
      const s = pick(free);
      releaseSpot(a); s.by = a.id; a.spot = s;
      a.state = 'toFun'; a.status = s.label; a.emoji = s.e;
      goTo(a, s.x, s.y);
    }
    function visitColleague(a) {
      const other = pick(agents.filter(o => o !== a && o.state === 'work'));
      if (!other) return false;
      const [sx, sy] = other.seat;
      const cand = [[sx + 1, sy], [sx - 1, sy], [sx, sy - 1], [sx + 1, sy - 1], [sx - 1, sy - 1]].filter(([x, y]) => isFree(x, y) && !agents.some(o => o !== a && Math.floor(o.px) === x && Math.floor(o.py) === y));
      if (!cand.length) return false;
      const [x, y] = pick(cand);
      releaseSpot(a);
      a.state = 'toVisit'; a.status = 'Diskusi dengan ' + other.name; a.emoji = '💬';
      goTo(a, x, y);
      return true;
    }

    function updateAgent(a, dt) {
      // jalan
      if (a.path.length) {
        const [tx, ty] = a.path[0];
        const gx = tx + 0.5, gy = ty + 0.5;
        const dx = gx - a.px, dy = gy - a.py, dist = Math.hypot(dx, dy);
        const v = 2.4 * dt;
        a.walkT += dt * 10;
        if (dist <= v) { a.px = gx; a.py = gy; a.path.shift(); }
        else { a.px += dx / dist * v; a.py += dy / dist * v; }
        if (a.path.length) return;
        // tiba
        if (a.state === 'toDesk') { a.state = 'work'; a.timer = a.forced ? 999 : rnd(10, 22); }
        else if (a.state === 'toFun') { a.state = 'fun'; a.timer = rnd(10, 20); }
        else if (a.state === 'toVisit') { a.state = 'visit'; a.timer = rnd(5, 9); }
        else if (a.state === 'toLunch') { a.state = 'lunch'; }
        else if (a.state === 'toTarget') { a.state = 'atTarget'; }
        return;
      }
      if (a.forced) return;
      if (isBreak()) {
        if (a.state !== 'lunch' && a.state !== 'toLunch') {
          const pool = isLunch() ? lunchSeats : [...spots, ...lunchSeats];
          const free = pool.filter(s => !s.by);
          if (free.length) {
            const s = pick(free); releaseSpot(a); s.by = a.id; a.spot = s;
            a.state = 'toLunch'; a.status = s.label; a.emoji = s.e; goTo(a, s.x, s.y);
          }
        }
        return;
      }
      if (a.state === 'lunch' || a.state === 'toLunch') { startWork(a); return; }
      a.timer -= dt;
      if (a.timer > 0) return;
      if (a.state === 'work') {
        const r = Math.random();
        const fun = a.cur.length ? 0.15 : (a.queue || a.id === 'kepala') ? 0.3 : 0.6;
        if (r < fun) goLeisure(a);
        else if (r < fun + 0.12 && visitColleague(a)) {}
        else { a.status = nexoraStatus(a); a.timer = rnd(10, 20); }
      } else {
        startWork(a);
      }
    }

    // ---------- ALUR BERKAS ----------
    const S = (id, text, target, also) => ({ id, text, target, also });
    const FLOWS = {
      not: { title: 'Simulasi akta PKR', job: 'DEMO-PKR', steps: [
        S('front', 'Terima klien, buka nomor JOB baru'), S('pmpj', 'PMPJ pemegang saham & cek pemilik manfaat'),
        S('riset', 'Cek UUPT Pasal 21: PKR maks. 30 hari sejak RUPS'), S('telaah', 'Telaah notulen RUPS & SK AHU terakhir'),
        S('drafter', 'Susun minuta & salinan PKR (format baku)'), S('mutu', 'Kendali mutu: cocokkan notulen ↔ PKR'),
        S('kepala', 'Bacakan & tandatangani akta di ruang tanda tangan', [11, 1], [['front', 11, 4]]),
        S('repert', 'Catat nomor akta di repertorium'), S('admin', 'Input pemberitahuan perubahan di AHU Online'), S('keu', 'Terbitkan tagihan INV'),
      ] },
      ppat: { title: 'Simulasi AJB', job: 'DEMO-AJB', steps: [
        S('front', 'Terima berkas jual beli rumah'), S('pmpj', 'PMPJ penjual & pembeli'), S('ppat', 'Pengecekan sertipikat ke Kantor Pertanahan'),
        S('telaah', 'Cek status perkawinan penjual'), S('keu', 'Hitung PPh 2,5% & BPHTB 5%'), S('ppat', 'Susun draf AJB (templat kantor)'),
        S('mutu', 'Kendali mutu AJB & bukti bayar pajak'), S('kepala', 'Penandatanganan AJB di ruang tanda tangan', [10, 1], [['ppat', 10, 4]]),
        S('repert', 'Daftar akta PPAT, tenggat 7 hari kerja ke BPN'),
      ] },
      leg: { title: 'Simulasi legalisasi', job: 'DEMO-LEG', steps: [
        S('front', 'Terima surat kuasa untuk dilegalisasi'), S('legal', 'Cek KTP penanda tangan, siapkan teks legalisasi'),
        S('kepala', 'Tanda tangan di hadapan Notaris'), S('repert', 'Catat di buku daftar legalisasi'), S('keu', 'Terbitkan kuitansi KW'),
      ] },
    };
    // putar ulang aktivitas nyata hari ini
    FLOWS.replay = { title: 'Aktivitas Nexora hari ini', fast: true, steps: [], jobs: 0 };
    function buildReplay() {
      const today = NEXORA.jobs.filter(j => !j.day || j.day === NEXORA.day).sort((a, b) => a.c.localeCompare(b.c));
      FLOWS.replay.jobs = today.length;
      FLOWS.replay.steps = [];
      for (const j of today) {
        FLOWS.replay.steps.push({ id: 'front', job: j.n, time: j.c, text: `${j.n} dibuat · ${j.svc}` });
        if (j.st === 'INBOX' || j.d < j.t) FLOWS.replay.steps.push({ id: 'front', job: j.n, time: j.c, text: `${j.n}: dokumen ${j.d}/${j.t}, menunggu kelengkapan` });
        else FLOWS.replay.steps.push({ id: j.stage.id, job: j.n, time: j.c, text: `${j.n}: ${j.stage.text}` });
      }
    }
    const liveQueue = [];
    function startLive() {
      if (flow || !liveQueue.length) return;
      FLOWS.live = { title: 'Perubahan di Nexora', fast: true, live: true, steps: liveQueue.splice(0) };
      startFlow('live');
    }
    let flow = null;
    const logEl = $('log');
    function log(html, time) {
      if (logEl.querySelector('.empty')) logEl.innerHTML = '';
      const d = document.createElement('div');
      d.innerHTML = `<time>${time || fmt(simMin)}</time><span>${html}</span>`;
      logEl.prepend(d);
      while (logEl.children.length > 80) logEl.lastChild.remove();
    }
    const FLOW_BTNS = ['flowNot', 'flowPpat', 'flowLeg'];
    function startFlow(k) {
      if (flow) return;
      const def = FLOWS[k];
      if (!def.steps.length) { log('Belum ada pekerjaan baru di Nexora hari ini'); return; }
      flow = { def, i: -1, phase: 'next', t: 0, tok: null };
      log(def.live ? `🔔 Ada perubahan di Nexora (${def.steps.length} langkah)` : def.fast ? `▶ Putar ulang <em>${def.jobs} pekerjaan</em> dari Nexora` : `<em>${def.job}</em> — ${def.title}`);
      FLOW_BTNS.forEach(id => { $(id).disabled = true; });
      $('replayBtn').textContent = '⏹ Hentikan';
    }
    function stopFlow(msg) {
      freeForced(); flow = null;
      FLOW_BTNS.forEach(id => { $(id).disabled = false; });
      $('replayBtn').textContent = '▶ Putar ulang hari ini';
      if (msg) log(msg);
      if (liveQueue.length) setTimeout(startLive, 400);
    }
    function freeForced() { agents.forEach(a => { if (a.forced) { a.forced = null; startWork(a); } }); }
    function updateFlow(dt) {
      if (!flow) return;
      const fast = flow.def.fast;
      const st = flow.def.steps[flow.i];
      if (flow.phase === 'next') {
        if (!fast) freeForced();
        flow.i++;
        if (flow.i >= flow.def.steps.length) { stopFlow(fast ? '✔ Putar ulang selesai' : `<em>${flow.def.job}</em> selesai ✔`); return; }
        const n = flow.def.steps[flow.i];
        const a = byId[n.id];
        const [tx, ty] = n.target || a.seat;
        if (!fast || a.state !== 'work' || a.path.length) {
          releaseSpot(a); a.forced = n.text;
          a.state = n.target ? 'toTarget' : 'toDesk';
          goTo(a, tx, ty);
        }
        a.status = n.text; a.emoji = '📄';
        (n.also || []).forEach(([oid, ox, oy]) => { const o = byId[oid]; releaseSpot(o); o.forced = 'Mendampingi penandatanganan'; o.status = o.forced; o.emoji = '🤝'; o.state = 'toTarget'; goTo(o, ox, oy); });
        const from = flow.tok ? { x: flow.tok.x, y: flow.tok.y } : { x: 8.5, y: 23.5 };
        flow.tok = { x: from.x, y: from.y, fx: from.x, fy: from.y, tx: tx + 0.5, ty: ty + 0.5, label: n.job || flow.def.job };
        if (fast && from.x === tx + 0.5 && from.y === ty + 0.5) { flow.tok.fx = 8.5; flow.tok.fy = 23.5; }
        flow.phase = 'fly'; flow.t = 0;
        return;
      }
      const a = byId[st.id];
      if (flow.phase === 'fly') {
        flow.t += dt / (fast ? 0.8 : 1.3);
        const t = Math.min(1, flow.t), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        flow.tok.x = flow.tok.fx + (flow.tok.tx - flow.tok.fx) * e;
        flow.tok.y = flow.tok.fy + (flow.tok.ty - flow.tok.fy) * e;
        flow.tok.arc = Math.sin(t * Math.PI) * 60;
        if (t >= 1) { flow.phase = 'wait'; flow.t = 0; }
      } else if (flow.phase === 'wait') {
        flow.t += dt;
        if (!a.path.length || flow.t > (fast ? 3 : 8)) { flow.phase = 'hold'; flow.t = 0; log(`${a.icon} <em>${a.name}</em>: ${st.text}`, st.time); }
      } else if (flow.phase === 'hold') {
        flow.t += dt;
        flow.tok.x = a.px; flow.tok.y = a.py; flow.tok.arc = 0;
        if (flow.t > (fast ? 1.1 : 2.6)) { if (fast && a.forced) { a.forced = null; a.state = 'work'; a.timer = rnd(6, 12); } flow.phase = 'next'; }
      }
    }

    // ---------- GAMBAR ----------
    function drawWalls() {
      // dinding belakang kanan (sepanjang sumbu x, y=0)
      poly([iso(0, 0), iso(W, 0), iso(W, 0, WALL_H), iso(0, 0, WALL_H)], '#F7F3EC', 'rgba(0,0,0,.08)');
      // dinding belakang kiri (sepanjang sumbu y, x=0)
      poly([iso(0, 0), iso(0, H), iso(0, H, WALL_H), iso(0, 0, WALL_H)], '#ECE6DC', 'rgba(0,0,0,.08)');
      // lis atas
      poly([iso(0, 0, WALL_H), iso(W, 0, WALL_H), iso(W, -0.25, WALL_H), iso(0, -0.25, WALL_H)], '#24304D');
      poly([iso(0, 0, WALL_H), iso(0, H, WALL_H), iso(-0.25, H, WALL_H), iso(-0.25, 0, WALL_H)], '#1C2640');
      // jendela kanan
      for (let x = 1; x < W - 1; x += 3) {
        if (x >= 16 && x <= 24) continue;
        poly([iso(x, 0, 28), iso(x + 2, 0, 28), iso(x + 2, 0, 80), iso(x, 0, 80)], '#BFE3FA', 'rgba(255,255,255,.9)', 2);
        poly([iso(x + 0.2, 0, 60), iso(x + 0.9, 0, 75), iso(x + 1.1, 0, 75), iso(x + 0.4, 0, 60)], 'rgba(255,255,255,.55)');
      }
      // jendela kiri
      for (let y = 7; y < H - 1; y += 3) {
        poly([iso(0, y, 28), iso(0, y + 2, 28), iso(0, y + 2, 80), iso(0, y, 80)], '#B3DAF2', 'rgba(255,255,255,.9)', 2);
      }
      // papan tulis Legal Hub
      poly([iso(17, 0, 30), iso(21, 0, 30), iso(21, 0, 70), iso(17, 0, 70)], '#FFFFFF', '#9AA3B0', 2);
      wallText(17.3, 64, 'ALUR AKTA', 11, '#24304D', 800);
      wallText(17.3, 50, 'Intake → PMPJ → Telaah', 9, '#3B7BF6', 600);
      wallText(17.3, 38, 'Draf → Mutu → TTD ✓', 9, '#2FA86A', 600);
      // logo kantor
      poly([iso(21.6, 0, 42), iso(25.8, 0, 42), iso(25.8, 0, 84), iso(21.6, 0, 84)], '#24304D');
      wallText(21.9, 74, 'NOTARIS & PPAT', 12, '#FFFFFF', 800);
      wallText(21.9, 60, 'ARI YUDANI APRIANTI', 10, '#F6B92B', 700);
      wallText(21.9, 49, 'S.H., M.Kn. · Kota Bogor', 8, '#C9D3E8', 600);
      // menu kopi
      poly([iso(27.2, 0, 50), iso(30.8, 0, 50), iso(30.8, 0, 82), iso(27.2, 0, 82)], '#2E2420');
      wallText(27.5, 73, 'COFFEE BAR', 11, '#F6B92B', 800);
      wallText(27.5, 60, 'Kopi susu · Teh', 8, '#EADBC8', 600);
      // layar ruang tanda tangan
      poly([iso(10, 0, 40), iso(13, 0, 40), iso(13, 0, 74), iso(10, 0, 74)], '#1E2533');
      poly([iso(10.15, 0, 43), iso(12.85, 0, 43), iso(12.85, 0, 71), iso(10.15, 0, 71)], '#3B7BF6');
      wallText(10.4, 61, 'Penandatanganan', 8, '#fff', 700);
      wallText(10.4, 50, 'Akta', 8, '#fff', 700);
      // papan ruang notaris
      wallTextL(1.2, 21.5, 'LOBBY', 14, '#24304D', 800);
    }
    function wallText(x, z, text, size, color, weight) {
      const p = iso(x, 0, z);
      ctx.save();
      ctx.transform(1, 0.5, 0, 1, p.x, p.y);
      ctx.font = `${weight} ${size}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = color; ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    function wallTextL(z, y, text, size, color, weight) {
      const p = iso(0, y, 60);
      ctx.save();
      ctx.transform(1, -0.5, 0, 1, p.x, p.y);
      ctx.font = `${weight} ${size}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = color; ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    function floorText(x, y, text, color) {
      const p = iso(x, y);
      ctx.save();
      ctx.transform(1, 0.5, -1, 0.5, p.x, p.y);
      ctx.font = `800 13px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = color; ctx.textBaseline = 'top';
      ctx.fillText(text.toUpperCase(), 0, 0);
      ctx.restore();
    }
    function drawFloor() {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const z = zoneAt(x, y);
        let c = '#EFE9DF';
        if (z) c = ((x + y) % 2) ? z.c : z.c2;
        poly([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c);
      }
      // tepi lantai depan
      poly([iso(0, H), iso(W, H), iso(W, H, -10), iso(0, H, -10)], '#CFC5B5');
      poly([iso(W, 0), iso(W, H), iso(W, H, -10), iso(W, 0, -10)], '#BDB2A0');
      for (const z of zones) floorText(z.x + 0.25, z.y + z.h - 0.85, z.label, z.dark ? 'rgba(255,255,255,.35)' : 'rgba(36,48,77,.28)');
    }
    function drawWall(x, y) {
      box(x + 0.4, y + 0.4, 0.2, 0.2, 0, 30, '#9FB7C9');
      poly([iso(x, y + 0.5, 0), iso(x + 1, y + 0.5, 0), iso(x + 1, y + 0.5, 30), iso(x, y + 0.5, 30)], 'rgba(170,210,235,.30)', 'rgba(120,160,190,.35)');
      poly([iso(x + 0.5, y, 0), iso(x + 0.5, y + 1, 0), iso(x + 0.5, y + 1, 30), iso(x + 0.5, y, 30)], 'rgba(170,210,235,.22)', 'rgba(120,160,190,.30)');
    }
    function wallTileDraw(x, y) {
      const horiz = walls.has((x - 1) + ',' + y) || walls.has((x + 1) + ',' + y);
      const vert = walls.has(x + ',' + (y - 1)) || walls.has(x + ',' + (y + 1));
      if (horiz && !vert) {
        poly([iso(x, y + 0.5, 0), iso(x + 1, y + 0.5, 0), iso(x + 1, y + 0.5, 30), iso(x, y + 0.5, 30)], 'rgba(170,210,235,.34)', 'rgba(110,150,185,.45)');
        poly([iso(x, y + 0.5, 30), iso(x + 1, y + 0.5, 30)], null, '#7F9DB5', 2);
      } else if (vert && !horiz) {
        poly([iso(x + 0.5, y, 0), iso(x + 0.5, y + 1, 0), iso(x + 0.5, y + 1, 30), iso(x + 0.5, y, 30)], 'rgba(170,210,235,.30)', 'rgba(110,150,185,.45)');
        poly([iso(x + 0.5, y, 30), iso(x + 0.5, y + 1, 30)], null, '#7F9DB5', 2);
      } else {
        box(x + 0.4, y + 0.4, 0.2, 0.2, 0, 32, '#7F9DB5');
        if (horiz) poly([iso(x, y + 0.5, 0), iso(x + 1, y + 0.5, 0), iso(x + 1, y + 0.5, 30), iso(x, y + 0.5, 30)], 'rgba(170,210,235,.30)');
        if (vert) poly([iso(x + 0.5, y, 0), iso(x + 0.5, y + 1, 0), iso(x + 0.5, y + 1, 30), iso(x + 0.5, y, 30)], 'rgba(170,210,235,.26)');
      }
    }

    let selected = null, hover = null;
    function drawAgent(a, t) {
      const sitting = (a.state === 'work' || a.state === 'lunch' || a.state === 'atTarget') && !a.path.length && (a.state !== 'atTarget' || true);
      const moving = a.path.length > 0;
      const p = iso(a.px, a.py);
      const lift = sitting ? 5 : 0;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1.3, 1.3); ctx.translate(-p.x, -p.y);
      // bayangan
      ellipse(p.x, p.y, 11, 5.5, 'rgba(0,0,0,.18)');
      if (a === selected || a === hover) { ctx.beginPath(); ctx.ellipse(p.x, p.y, 15, 7.5, 0, 0, Math.PI * 2); ctx.strokeStyle = a === selected ? '#3B7BF6' : 'rgba(59,123,246,.5)'; ctx.lineWidth = 2.5; ctx.stroke(); }
      const sw = moving ? Math.sin(a.walkT) * 3 : 0;
      const bob = moving ? Math.abs(Math.sin(a.walkT)) * 1.5 : (a.state === 'fun' ? Math.abs(Math.sin(t * 3 + a.bob)) * 1.5 : 0);
      const by = p.y - lift - bob;
      // kaki
      if (!sitting) {
        ctx.fillStyle = '#2B2F3A';
        rrect(p.x - 5 + sw * 0.3, by - 10, 4, 10 + sw * 0.2, 2); ctx.fill();
        rrect(p.x + 1 - sw * 0.3, by - 10, 4, 10 - sw * 0.2, 2); ctx.fill();
      } else {
        ctx.fillStyle = '#2B2F3A'; rrect(p.x - 6, by - 6, 12, 5, 2); ctx.fill();
      }
      // badan
      ctx.fillStyle = a.shirt; rrect(p.x - 8, by - 26, 16, 18, 6); ctx.fill();
      ctx.fillStyle = shade(a.shirt.length === 7 ? a.shirt : '#888888', -0.15); rrect(p.x - 8, by - 14, 16, 6, 3); ctx.fill();
      // tangan
      ctx.fillStyle = a.skin;
      const arm = moving ? Math.sin(a.walkT) * 2 : 0;
      rrect(p.x - 11, by - 23 + arm, 4, 11, 2); ctx.fill(); rrect(p.x + 7, by - 23 - arm, 4, 11, 2); ctx.fill();
      // kepala
      const hy = by - 34;
      if (a.hair === 'hijab') {
        ctx.fillStyle = a.hc; ctx.beginPath(); ctx.ellipse(p.x, hy + 1, 10, 11, 0, 0, Math.PI * 2); ctx.fill();
        rrect(p.x - 9, hy + 4, 18, 9, 4); ctx.fill();
        ellipse(p.x, hy + 2, 6, 6.5, a.skin);
      } else {
        ellipse(p.x, hy, 8, 8.5, a.skin);
        ctx.fillStyle = a.hc;
        ctx.beginPath(); ctx.ellipse(p.x, hy - 3, 8.5, 6, 0, Math.PI, Math.PI * 2); ctx.fill();
        if (a.hair === 'long') { rrect(p.x - 9, hy - 4, 4, 15, 2); ctx.fill(); rrect(p.x + 5, hy - 4, 4, 15, 2); ctx.fill(); }
        if (a.hair === 'bun') { ellipse(p.x, hy - 10, 4.5, 4, a.hc); }
      }
      ctx.fillStyle = '#2B2F3A';
      ellipse(p.x - 2.8, hy + 1.5, 1.2, 1.4, '#2B2F3A'); ellipse(p.x + 2.8, hy + 1.5, 1.2, 1.4, '#2B2F3A');
      ctx.restore();
      const S = 1.3;
      a._sx = p.x; a._sy = p.y - (p.y - (by - 20)) * S; a._hy = p.y - (p.y - hy) * S;
    }
    function drawBubble(a, full) {
      const x = a._sx, y = a._hy - 16;
      ctx.font = `700 12px 'Plus Jakarta Sans', sans-serif`;
      if (!full) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath(); ctx.arc(x, y - 2, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = `12px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a.emoji, x, y - 1);
        ctx.textAlign = 'left';
        return;
      }
      const t1 = a.name, t2 = a.emoji + ' ' + a.status;
      ctx.font = `800 11px 'Plus Jakarta Sans', sans-serif`; const w1 = ctx.measureText(t1).width;
      ctx.font = `500 11px 'Plus Jakarta Sans', sans-serif`; const w2 = ctx.measureText(t2).width;
      const w = Math.max(w1, w2) + 18, h = 38;
      const bx = x - w / 2, byy = y - h - 4;
      ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,.15)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
      rrect(bx, byy, w, h, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 6, byy + h); ctx.lineTo(x + 6, byy + h); ctx.lineTo(x, byy + h + 7); ctx.closePath(); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = a.shirt; ctx.fillRect(bx + 8, byy + 9, 3, 9);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1F2433'; ctx.font = `800 11px 'Plus Jakarta Sans', sans-serif`; ctx.fillText(t1, bx + 15, byy + 13);
      ctx.fillStyle = '#5A5F6B'; ctx.font = `500 11px 'Plus Jakarta Sans', sans-serif`; ctx.fillText(t2, bx + 9, byy + 28);
    }
    function drawToken() {
      if (!flow || !flow.tok) return;
      const p = iso(flow.tok.x, flow.tok.y, 52 + (flow.tok.arc || 0));
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFFFFF'; rrect(-11, -14, 22, 28, 3); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#3B7BF6'; ctx.fillRect(-7, -9, 14, 3);
      ctx.fillStyle = '#C9D3E8'; ctx.fillRect(-7, -3, 14, 2); ctx.fillRect(-7, 1, 10, 2); ctx.fillRect(-7, 5, 12, 2);
      ctx.fillStyle = '#EA4F3D'; ctx.beginPath(); ctx.arc(6, 9, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.font = `800 10px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = '#24304D'; ctx.fillText(flow.tok.label, p.x, p.y + 26);
      ctx.textAlign = 'left';
    }

    function render(t) {
      const cw = cv.width, ch = cv.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#F7F2EA'); g.addColorStop(1, '#EDE5D8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(cam.z * DPR, 0, 0, cam.z * DPR, cam.x * DPR, cam.y * DPR);
      drawWalls();
      drawFloor();
      const list = [];
      for (const o of objects) list.push({ k: o.key, f: o.draw });
      for (const w of walls) { const [x, y] = w.split(',').map(Number); list.push({ k: x + y + 0.02, f: () => wallTileDraw(x, y) }); }
      for (const a of agents) list.push({ k: a.px + a.py - 1 + 0.03, f: () => drawAgent(a, t) });
      list.sort((p, q) => p.k - q.k);
      for (const it of list) it.f();
      // gelembung di atas segalanya
      const flowAgent = flow && flow.phase !== 'next' && flow.i >= 0 ? byId[flow.def.steps[flow.i].id] : null;
      const fulls = new Set([selected, hover, flowAgent].filter(Boolean));
      for (const a of agents) if (!fulls.has(a)) drawBubble(a, false);
      for (const a of fulls) drawBubble(a, true);
      drawToken();
    }

    // ---------- KAMERA & INPUT ----------
    function resize() {
      DPR = Math.max(1, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR);
    }
    function fit() {
      const r = cv.getBoundingClientRect();
      const minX = iso(0, H).x - 20, maxX = iso(W, 0).x + 20, minY = iso(0, 0, WALL_H).y - 30, maxY = iso(W, H).y + 20;
      const top = r.width < 600 ? 96 : 40;
      const z = Math.min(r.width / (maxX - minX), (r.height - top - 10) / (maxY - minY));
      cam.z = Math.max(0.3, Math.min(2.2, z));
      cam.x = r.width / 2 - (minX + maxX) / 2 * cam.z;
      cam.y = top + (r.height - top - (maxY - minY) * cam.z) / 2 - minY * cam.z;
    }
    function zoomAt(f, sx, sy) {
      const nz = Math.max(0.3, Math.min(3, cam.z * f));
      cam.x = sx - (sx - cam.x) * nz / cam.z; cam.y = sy - (sy - cam.y) * nz / cam.z; cam.z = nz;
    }
    function centerOn(a) {
      const r = cv.getBoundingClientRect();
      const p = iso(a.px, a.py, 20);
      if (cam.z < 1.1) cam.z = 1.3;
      camTarget = { x: r.width / 2 - p.x * cam.z, y: r.height / 2 - p.y * cam.z };
    }
    let camTarget = null;
    const toWorld = (sx, sy) => ({ x: (sx - cam.x) / cam.z, y: (sy - cam.y) / cam.z });
    function agentAt(sx, sy) {
      const w = toWorld(sx, sy);
      let best = null, bd = 22;
      for (const a of agents) { if (a._sx == null) continue; const d = Math.hypot(a._sx - w.x, (a._sy - w.y) * 0.8); if (d < bd) { bd = d; best = a; } }
      return best;
    }
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; cv.classList.add('drag'); camTarget = null; }
        if (drag.moved) { cam.x = drag.cx + dx; cam.y = drag.cy + dy; }
      } else {
        hover = agentAt(e.clientX - r.left, e.clientY - r.top);
        cv.style.cursor = hover ? 'pointer' : '';
      }
    });
    cv.addEventListener('pointerup', e => {
      const r = cv.getBoundingClientRect();
      if (drag && !drag.moved) { const a = agentAt(e.clientX - r.left, e.clientY - r.top); select(a); }
      drag = null; cv.classList.remove('drag');
    });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); camTarget = null; }, { passive: false });
    $('zin').onclick = () => { const r = cv.getBoundingClientRect(); zoomAt(1.2, r.width / 2, r.height / 2); camTarget = null; };
    $('zout').onclick = () => { const r = cv.getBoundingClientRect(); zoomAt(1 / 1.2, r.width / 2, r.height / 2); camTarget = null; };
    $('zfit').onclick = () => { camTarget = null; fit(); };

    // ---------- PANEL ----------
    const listEl = $('agents');
    const cardEl = $('card');
    function renderAgentList() {
      listEl.innerHTML = agents.map(a => `
      <div class="agent${a === selected ? ' sel' : ''}" data-id="${a.id}">
        <div class="av" style="background:${a.shirt}22">${a.icon}</div>
        <div class="t"><div class="n"><div>${a.name}<i class="badge ${a.cur.length || a.queue || a.id === 'kepala' ? '' : 'zero'}" title="Berkas sedang dipegang / tugas antre di Nexora">${a.id === 'kepala' ? NX.active + ' dipantau' : a.cur.length ? a.cur.length + ' berkas' : a.queue ? a.queue + ' antre' : 'kosong'}</i></div><span>${a.pic.split(' (')[0]}</span></div><div class="s" data-k="s-${a.id}">${a.emoji} ${esc(a.status)}</div></div>
      </div>`).join('');
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
    listEl.addEventListener('click', e => { const el = e.target.closest('.agent'); if (el) { const a = byId[el.dataset.id]; select(selected === a ? null : a, true); } });
    function select(a, center) {
      selected = a;
      listEl.querySelectorAll('.agent').forEach(el => el.classList.toggle('sel', !!a && el.dataset.id === a.id));
      if (!a) { cardEl.classList.remove('on'); return; }
      cardEl.innerHTML = `
        <h4>${a.icon} ${a.name}</h4>
        <div class="pic">PIC: ${a.pic}</div>
        <span class="skill">${a.skill}</span>
        <p>${a.desc}</p>
        <div class="ex"><span>“${a.ex}”</span><button data-k="copyEx">Salin</button></div>
        ${a.cur.length ? `<p style="margin:10px 0 0"><b>Dipegang sekarang (Nexora):</b></p><ul class="jobs">${a.cur.map(c => `<li>${c.id && opts.jobHref ? `<a href="${opts.jobHref(c.id)}">` : ''}<b>${esc(c.job)}</b> · ${esc(c.svc)} — ${esc(c.text)}${c.id && opts.jobHref ? '</a>' : ''}</li>`).join('')}</ul>`
          : `<p style="margin:10px 0 0"><b>Nexora:</b> ${a.queue ? a.queue + ' tugas antre, menunggu tahap sebelumnya.' : 'belum ada tugas untuk unit ini.'}</p>`}`;
      cardEl.classList.add('on');
      $('copyEx').onclick = async ev => {
        try { await navigator.clipboard.writeText(a.ex); ev.target.textContent = 'Tersalin'; } catch { ev.target.textContent = 'Gagal'; }
        setTimeout(() => { ev.target.textContent = 'Salin'; }, 1400);
      };
      if (center) centerOn(a);
    }
    function renderNx() {
      $('nx').innerHTML = `
      <div><b>${NX.active}</b><span>pekerjaan aktif</span></div>
      <div><b>${NX.missing}</b><span>dokumen belum lengkap</span></div>
      <div><b>${NX.tasks}</b><span>tugas belum selesai</span></div>
      <div class="src"><i></i>${opts.live ? 'Live' : 'Snapshot'} · data ${esc(NEXORA.taken || '-')} · tanpa nama klien</div>`;
    }
    $('replayBtn').onclick = () => flow ? stopFlow('⏹ Dihentikan') : startFlow('replay');
    $('flowNot').onclick = () => startFlow('not');
    $('flowPpat').onclick = () => startFlow('ppat');
    $('flowLeg').onclick = () => startFlow('leg');
    $('breakBtn').onclick = () => { breakUntil = simMin + 25; log('☕ Jam istirahat 25 menit — semua ke kafetaria, game room & lounge'); };
    const speeds = [1, 2, 4];
    $('speedBtn').onclick = e => { speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]; e.target.textContent = `⏩ Kecepatan: ${speed}×`; };

    const clockEl = $('clock'), phaseEl = $('phase');
    let lastUI = 0, wasLunch = false;
    function updateUI(t) {
      if (t - lastUI < 0.4) return; lastUI = t;
      clockEl.textContent = fmt(simMin);
      phaseEl.textContent = isLunch() ? 'Makan siang 🍜' : (simMin < breakUntil ? 'Istirahat ☕' : 'Jam kerja');
      for (const a of agents) { const el = $('s-' + a.id); const s = a.emoji + ' ' + a.status; if (el && el.textContent !== s) el.textContent = s; }
    }

    // ---------- LOOP ----------
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000) * speed; last = now;
      simMin += dt * 1.0;           // 1 detik nyata = 1 menit kantor
      if (simMin >= 17 * 60) { simMin = 8 * 60; breakUntil = 0; log('🌅 Hari kerja baru dimulai'); }
      const lunch = isLunch();
      if (lunch && !wasLunch) log('🍜 Jam makan siang — semua ke kafetaria');
      if (!lunch && wasLunch) log('💼 Kembali bekerja');
      wasLunch = lunch;
      for (const a of agents) updateAgent(a, dt);
      updateFlow(dt);
      if (camTarget) { cam.x += (camTarget.x - cam.x) * 0.12; cam.y += (camTarget.y - cam.y) * 0.12; if (Math.abs(camTarget.x - cam.x) + Math.abs(camTarget.y - cam.y) < 0.5) camTarget = null; }
      render(now / 1000);
      updateUI(now / 1000);
      if (!destroyed) raf = requestAnimationFrame(frame);
    }
    let destroyed = false, raf = 0, fitted = false;
    const ro = new ResizeObserver(() => { const r = cv.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return; resize(); if (!fitted) { fit(); fitted = true; } });
    ro.observe(cv);
    resize(); fit();
    applyData(data, true);
    raf = requestAnimationFrame(frame);
    return {
      update(d) { if (!destroyed) applyData(d, false); },
      destroy() { destroyed = true; cancelAnimationFrame(raf); ro.disconnect(); root.innerHTML = ''; root.classList.remove('kai'); }
    };
  }
  window.KantorAI = { mount: mount };
})();
