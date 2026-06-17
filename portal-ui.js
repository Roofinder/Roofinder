/* ============================================================
   RooFinder — Shared Portal UI helpers
   Drop-in interactivity for admin / owner / agent portals.
   Exposes a global `RF` object:
     RF.toast(msg, {type, undo, duration})
     RF.confirm({title, msg, danger, okText, cancelText}) -> Promise<bool>
     RF.alert(msg, {type})                                -> Promise
     RF.drawer({title, html})  / RF.closeDrawer()
     RF.countUp(el, to, {duration, prefix, suffix})
     RF.ring(svgEl, pct)
     RF.dragList(container, itemSelector, onReorder)
   No dependencies. Safe to load once per page.
   ============================================================ */
(function(){
  if (window.RF) return;
  var RF = {};

  // ── Toasts ────────────────────────────────────────────
  function toastWrap(){
    var w = document.getElementById('rf-toast-wrap');
    if (!w){ w = document.createElement('div'); w.id='rf-toast-wrap'; document.body.appendChild(w); }
    return w;
  }
  var ICONS = { ok:'✓', info:'i', warn:'!', err:'✕' };
  RF.toast = function(msg, opts){
    opts = opts || {};
    var type = opts.type || 'ok';
    var el = document.createElement('div');
    el.className = 'rf-toast ' + type;
    el.innerHTML = '<span class="rf-toast-ic">' + (ICONS[type]||'✓') + '</span><span>' + msg + '</span>';
    if (opts.undo){
      var b = document.createElement('button');
      b.className = 'rf-toast-undo'; b.textContent = 'Undo';
      b.onclick = function(){ remove(); opts.undo(); };
      el.appendChild(b);
    }
    toastWrap().appendChild(el);
    void el.offsetWidth; el.classList.add('in');
    var dur = opts.duration || (opts.undo ? 5000 : 2600);
    var t = setTimeout(remove, dur);
    function remove(){ clearTimeout(t); el.classList.remove('in'); setTimeout(function(){ el.remove(); }, 320); }
    return remove;
  };

  // ── Confirm / alert sheet ─────────────────────────────
  function scrim(){
    var s = document.getElementById('rf-sheet-scrim');
    if (!s){
      s = document.createElement('div'); s.id = 'rf-sheet-scrim';
      s.innerHTML = '<div class="rf-sheet" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(s);
    }
    return s;
  }
  RF.confirm = function(o){
    o = o || {};
    return new Promise(function(resolve){
      var s = scrim(), sheet = s.querySelector('.rf-sheet');
      var danger = !!o.danger;
      sheet.innerHTML =
        '<div class="rf-sheet-ic ' + (danger?'danger':'ask') + '">' + (o.icon || (danger?'⚠️':'❓')) + '</div>'
        + '<div class="rf-sheet-title">' + (o.title||'Are you sure?') + '</div>'
        + (o.msg ? '<div class="rf-sheet-msg">' + o.msg + '</div>' : '<div style="height:6px"></div>')
        + '<div class="rf-sheet-actions">'
        +   '<button class="rf-btn rf-btn-ghost" data-rf="cancel">' + (o.cancelText||'Cancel') + '</button>'
        +   '<button class="rf-btn ' + (danger?'rf-btn-danger':'rf-btn-green') + '" data-rf="ok">' + (o.okText||(danger?'Delete':'Confirm')) + '</button>'
        + '</div>';
      open(s);
      function done(v){ close(s); resolve(v); }
      sheet.querySelector('[data-rf="ok"]').onclick = function(){ done(true); };
      sheet.querySelector('[data-rf="cancel"]').onclick = function(){ done(false); };
      s.onclick = function(e){ if(e.target===s) done(false); };
      document.addEventListener('keydown', escClose);
      function escClose(e){ if(e.key==='Escape'){ document.removeEventListener('keydown',escClose); done(false);} }
    });
  };
  RF.alert = function(msg, o){
    o = o || {};
    return new Promise(function(resolve){
      var s = scrim(), sheet = s.querySelector('.rf-sheet');
      var type = o.type || 'info';
      var ic = type==='err' ? '⚠️' : type==='ok' ? '✅' : 'ℹ️';
      sheet.innerHTML =
        '<div class="rf-sheet-ic ' + (type==='err'?'danger':'ask') + '">' + ic + '</div>'
        + '<div class="rf-sheet-title">' + (o.title || (type==='err'?'Something went wrong':'Heads up')) + '</div>'
        + '<div class="rf-sheet-msg">' + msg + '</div>'
        + '<div class="rf-sheet-actions"><button class="rf-btn rf-btn-green" data-rf="ok">' + (o.okText||'Got it') + '</button></div>';
      open(s);
      sheet.querySelector('[data-rf="ok"]').onclick = function(){ close(s); resolve(); };
      s.onclick = function(e){ if(e.target===s){ close(s); resolve(); } };
    });
  };
  function open(s){ s.style.display='flex'; void s.offsetWidth; s.classList.add('in'); }
  function close(s){ s.classList.remove('in'); setTimeout(function(){ s.style.display='none'; }, 240); }

  // ── Right drawer ──────────────────────────────────────
  RF.drawer = function(o){
    o = o || {};
    var scr = document.getElementById('rf-drawer-scrim');
    var dr  = document.getElementById('rf-drawer');
    if (!dr){
      scr = document.createElement('div'); scr.id='rf-drawer-scrim';
      dr  = document.createElement('div'); dr.id='rf-drawer';
      dr.innerHTML = '<div class="rf-drawer-head"><div class="rf-drawer-title"></div><button class="rf-drawer-x">✕</button></div><div class="rf-drawer-body"></div>';
      document.body.appendChild(scr); document.body.appendChild(dr);
      dr.querySelector('.rf-drawer-x').onclick = RF.closeDrawer;
      scr.onclick = RF.closeDrawer;
    }
    dr.querySelector('.rf-drawer-title').innerHTML = o.title || '';
    dr.querySelector('.rf-drawer-body').innerHTML = o.html || '';
    scr.style.display='block';
    void dr.offsetWidth; scr.classList.add('in'); dr.classList.add('in');
    return dr.querySelector('.rf-drawer-body');
  };
  RF.closeDrawer = function(){
    var scr = document.getElementById('rf-drawer-scrim');
    var dr  = document.getElementById('rf-drawer');
    if (!dr) return;
    dr.classList.remove('in'); scr.classList.remove('in');
    setTimeout(function(){ scr.style.display='none'; }, 340);
  };

  // ── Count-up ──────────────────────────────────────────
  RF.countUp = function(el, to, o){
    if (!el) return;
    o = o || {};
    to = Number(to) || 0;
    var from = Number(el.getAttribute('data-rf-val') || 0);
    if (from === to){ el.textContent = (o.prefix||'') + fmt(to,o) + (o.suffix||''); return; }
    el.setAttribute('data-rf-val', to);
    var dur = o.duration || 700, start = performance.now();
    var finalStr = (o.prefix||'') + fmt(to,o) + (o.suffix||'');
    el.classList.remove('rf-flash'); void el.offsetWidth; el.classList.add('rf-flash');
    function step(now){
      var p = Math.min(1, (now-start)/dur);
      var e = 1 - Math.pow(1-p, 3);
      var cur = Math.round(from + (to-from)*e);
      el.textContent = (o.prefix||'') + fmt(cur,o) + (o.suffix||'');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    // Guarantee the final value lands even if animation frames are throttled/never fire.
    setTimeout(function(){ if (el.textContent !== finalStr) el.textContent = finalStr; }, dur + 120);
  };
  function fmt(n,o){ return o.comma ? n.toLocaleString('en-US') : String(n); }

  // ── Progress ring ─────────────────────────────────────
  RF.ring = function(svg, pct){
    if (!svg) return;
    var fg = svg.querySelector('.rf-ring-fg');
    if (!fg) return;
    var r = parseFloat(fg.getAttribute('r'));
    var c = 2 * Math.PI * r;
    fg.style.strokeDasharray = c;
    fg.style.strokeDashoffset = c * (1 - Math.max(0,Math.min(1,pct/100)));
  };

  // ── Drag-to-reorder (pointer based, works on touch) ───
  RF.dragList = function(container, itemSel, onReorder){
    if (!container) return;
    var dragEl=null, startY=0, items=[];
    container.addEventListener('pointerdown', function(e){
      var handle = e.target.closest('.rf-drag-handle');
      if (!handle) return;
      var item = handle.closest(itemSel);
      if (!item) return;
      e.preventDefault();
      dragEl = item; startY = e.clientY;
      items = Array.prototype.slice.call(container.querySelectorAll(itemSel));
      item.classList.add('rf-dragging');
      item.setPointerCapture && item.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up, {once:true});
    });
    function move(e){
      if (!dragEl) return;
      var after = null;
      items.forEach(function(it){
        if (it===dragEl) return;
        var box = it.getBoundingClientRect();
        it.classList.remove('rf-drag-over');
        if (e.clientY > box.top && e.clientY < box.bottom){
          it.classList.add('rf-drag-over');
          after = (e.clientY < box.top + box.height/2) ? it : it.nextElementSibling;
        }
      });
      if (after !== null) container.insertBefore(dragEl, after);
    }
    function up(){
      document.removeEventListener('pointermove', move);
      if (dragEl) dragEl.classList.remove('rf-dragging');
      container.querySelectorAll('.rf-drag-over').forEach(function(it){ it.classList.remove('rf-drag-over'); });
      var order = Array.prototype.slice.call(container.querySelectorAll(itemSel)).map(function(it){ return it.getAttribute('data-rf-id'); });
      dragEl = null;
      if (onReorder) onReorder(order);
    }
  };

  window.RF = RF;
})();
