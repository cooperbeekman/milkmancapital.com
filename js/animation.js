(function () {
  var el = document.getElementById('chart');
  var cols, rows, cw = 7.8, ch = 13;

  var span = document.createElement('span');
  span.style.cssText = "font-family:'IBM Plex Mono',monospace;font-size:13px;line-height:13px;visibility:hidden;position:absolute";
  span.textContent = 'X';
  document.body.appendChild(span);
  cw = span.getBoundingClientRect().width;
  document.body.removeChild(span);

  function resize() {
    cols = Math.floor(window.innerWidth / cw);
    rows = Math.floor(window.innerHeight / ch);
    cols = Math.max(cols, 40);
    rows = Math.max(rows, 20);
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Price simulation ──
  var price = 100;
  var candles = [];
  var currentCandle = null;
  var candleDuration = 2500;
  var candleStart = 0;
  var frameCount = 0;

  function startCandle(t) {
    if (currentCandle) candles.push(currentCandle);
    if (candles.length > 400) candles.shift();
    currentCandle = { o: price, h: price, l: price, c: price };
    candleStart = t;
  }

  function tickPrice() {
    var vol = 0.12 + Math.random() * 0.18;
    var drift = (Math.random() - 0.49) * vol;
    if (price > 130) drift -= 0.06;
    if (price < 70) drift += 0.06;
    price += drift;
    if (currentCandle) {
      currentCandle.c = price;
      if (price > currentCandle.h) currentCandle.h = price;
      if (price < currentCandle.l) currentCandle.l = price;
    }
  }

  // Seed
  for (var i = 0; i < 150; i++) {
    startCandle(0);
    for (var j = 0; j < 40; j++) tickPrice();
  }
  startCandle(0);

  // ── Cached output — only rebuild when data changes ──
  var lastHTML = '';
  var needsRedraw = true;

  function render(time) {
    if (!candleStart) candleStart = time;

    // Tick price a few times per frame for smoothness
    tickPrice();
    tickPrice();
    needsRedraw = true;

    // New candle
    if (time - candleStart > candleDuration) {
      startCandle(time);
    }

    // Only redraw every 3rd frame to reduce flicker
    frameCount++;
    if (frameCount % 3 !== 0) {
      requestAnimationFrame(render);
      return;
    }

    if (!needsRedraw) {
      requestAnimationFrame(render);
      return;
    }
    needsRedraw = false;

    var spacing = 3;
    var visibleCount = Math.floor(cols / spacing);
    var all = candles.concat([currentCandle]);
    var visible = all.slice(-visibleCount);
    if (visible.length === 0) { requestAnimationFrame(render); return; }

    // Price range
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < visible.length; i++) {
      if (visible[i].l < lo) lo = visible[i].l;
      if (visible[i].h > hi) hi = visible[i].h;
    }
    var pad = Math.max((hi - lo) * 0.15, 1);
    lo -= pad; hi += pad;
    var range = hi - lo;
    if (range < 1) range = 1;

    var top = 1, bot = rows - 2, chartH = bot - top;

    function p2r(p) {
      return top + Math.round((1 - (p - lo) / range) * chartH);
    }

    // Build output lines directly — much faster than grid
    var lines = [];
    for (var y = 0; y < rows; y++) {
      lines[y] = [];
      for (var x = 0; x < cols; x++) {
        lines[y][x] = 0; // char type: 0=space, 1=wick, 2=body, 3=doji
      }
    }
    var clrs = []; // 0=none, 1=green, 2=red
    for (var y = 0; y < rows; y++) {
      clrs[y] = [];
      for (var x = 0; x < cols; x++) clrs[y][x] = 0;
    }

    for (var i = 0; i < visible.length; i++) {
      var c = visible[i];
      var cx = i * spacing + 1;
      if (cx >= cols) break;

      var bull = c.c >= c.o;
      var cl = bull ? 1 : 2;
      var rH = p2r(c.h), rL = p2r(c.l);
      var rO = p2r(c.o), rC = p2r(c.c);
      var bT = Math.min(rO, rC), bB = Math.max(rO, rC);

      // Wick
      for (var y = rH; y <= rL; y++) {
        if (y >= 0 && y < rows) { lines[y][cx] = 1; clrs[y][cx] = cl; }
      }
      // Body overwrites wick
      if (bT === bB) {
        if (bT >= 0 && bT < rows) { lines[bT][cx] = 3; clrs[bT][cx] = cl; }
      } else {
        for (var y = bT; y <= bB; y++) {
          if (y >= 0 && y < rows) { lines[y][cx] = 2; clrs[y][cx] = cl; }
        }
      }
    }

    // Render HTML
    var charMap = [' ', '|', '#', '-'];
    var clsMap = ['', 'g', 'r'];
    var parts = [];
    var cur = '';

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var v = lines[y][x];
        var c = v ? clsMap[clrs[y][x]] : '';
        if (c !== cur) {
          if (cur) parts.push('</span>');
          if (c) parts.push('<span class="' + c + '">');
          cur = c;
        }
        parts.push(charMap[v]);
      }
      if (y < rows - 1) parts.push('\n');
    }
    if (cur) parts.push('</span>');

    el.innerHTML = parts.join('');
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
