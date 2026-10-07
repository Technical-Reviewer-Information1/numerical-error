(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const r8 = v => Math.round(v * 1e8) / 1e8;

  /* ===== STEP 1 有理数として厳密に展開する ===== */
  function toFrac(str) {                       // "0.4" → {n:2,d:5}
    const s = String(str).trim();
    if (!/^-?\d*(\.\d+)?$/.test(s) || s === '') return null;
    const neg = s[0] === '-', t = neg ? s.slice(1) : s;
    const dot = t.indexOf('.');
    if (dot < 0) return { n: (neg ? -1 : 1) * +t, d: 1 };
    const dec = t.length - dot - 1;
    let n = +(t.replace('.', '')), d = Math.pow(10, dec);
    const g = (a, b) => b ? g(b, a % b) : a;
    const k = g(n, d) || 1;
    return { n: (neg ? -1 : 1) * n / k, d: d / k };
  }
  function expand(fr, limit) {
    // 小数部を 2 倍しながら展開。分子/分母の整数演算で厳密に。
    let n = fr.n % fr.d, d = fr.d;
    const rows = [], seen = new Map();
    let bits = '', repStart = -1;
    for (let i = 0; i < limit; i++) {
      if (n === 0) break;
      if (seen.has(n)) { repStart = seen.get(n); break; }
      seen.set(n, i);
      const before = n / d;
      n = n * 2;
      const b = n >= d ? 1 : 0;
      if (b) n -= d;
      rows.push({ from: before, to: before * 2, bit: b, rest: n / d });
      bits += b;
    }
    return { bits: bits, rows: rows, repStart: repStart, finite: n === 0 && repStart < 0 };
  }
  function drawExpand() {
    const fr = toFrac($('decIn').value);
    const nt = $('expNote');
    if (!fr) { $('expBox').innerHTML = ''; $('binOut').textContent = '—'; nt.className = 'note ng'; nt.textContent = '0以上の小数を入れてください（例：0.2）。'; return; }
    const ip = Math.floor(Math.abs(fr.n) / fr.d);
    const e = expand({ n: Math.abs(fr.n), d: fr.d }, 24);
    $('expBox').innerHTML = e.rows.map((t, i) =>
      '<div' + (e.repStart >= 0 && i >= e.repStart ? ' class="rep"' : '') + '>' +
      r8(t.from) + ' × 2 ＝ ' + r8(t.to) + ' → <strong>' + t.bit + '</strong>' +
      (t.rest ? '（残り ' + r8(t.rest) + '）' : '（残り 0）') + '</div>').join('') ||
      '<div>小数部分がありません。</div>';
    let html = ip + '.';
    if (e.repStart >= 0) {
      html += e.bits.slice(0, e.repStart) + '<span class="r">' + e.bits.slice(e.repStart) + '</span>' +
        '<span class="r">' + e.bits.slice(e.repStart) + '</span>…';
    } else html += e.bits || '0';
    $('binOut').innerHTML = html + '（2）';
    nt.className = 'note ' + (e.finite ? 'ok' : 'ng');
    nt.innerHTML = e.finite
      ? '<strong>有限小数</strong>になりました。' + fr.n + '/' + fr.d + ' の分母が2の累乗なので、ぴったり表せます。コンピュータでも誤差は出ません。'
      : '<strong>循環小数</strong>です（色のついた部分がくり返し）。' + Math.abs(fr.n) + '/' + fr.d + ' の分母に2以外の素因数があるためです。' +
        'コンピュータは決められたビット数で打ち切るので、<strong>正確には表せません</strong>。';
  }

  /* ===== STEP 2 ===== */
  const Q1 = [
    { v: '0.4', ok: true, why: '0.4 ＝ 2/5。分母に5があるので2進法では循環します（0.0110011…）。' },
    { v: '0.5625', ok: false, why: '0.5625 ＝ 9/16 ＝ 9/2⁴。分母が2の累乗なので 0.1001（2）でぴったり表せます。' },
    { v: '0.625', ok: false, why: '0.625 ＝ 5/8 ＝ 5/2³。0.101（2）でぴったり表せます。' },
    { v: '0.875', ok: false, why: '0.875 ＝ 7/8 ＝ 7/2³。0.111（2）でぴったり表せます。' }
  ];
  function drawQ1() {
    const box = $('q1Choices'); box.innerHTML = '';
    Q1.forEach((q, i) => {
      const b = document.createElement('button');
      b.className = 'btn'; b.style.textAlign = 'center'; b.dataset.i = i;
      b.textContent = '⓪①②③'[i] + '　' + q.v;
      b.addEventListener('click', () => {
        box.classList.add('locked');
        [...box.children].forEach(x => { if (Q1[+x.dataset.i].ok) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
        const fb = $('q1Fb'); fb.hidden = false; fb.className = 'note ' + (q.ok ? 'ok' : 'ng');
        fb.innerHTML = (q.ok ? '正解（⓪）。' : '正解は <strong>⓪　0.4</strong>。選んだ ' + q.v + ' は…') + q.why +
          (q.ok ? '' : '<br>0.4 ＝ 2/5 だけが分母に5をもつので、循環小数になります。');
        $('decIn').value = q.v; drawExpand();
      });
      box.appendChild(b);
    });
  }

  /* ===== STEP 3 ===== */
  function bin64(x) {                          // 倍精度の中身をおおまかに見せる
    const e = expand(toFrac(String(x)), 30);
    const ip = Math.floor(x);
    if (e.repStart < 0) return ip + '.' + (e.bits || '0');
    const head = e.bits.slice(0, e.repStart), cyc = e.bits.slice(e.repStart);
    return ip + '.' + head + '<span class="r">' + cyc + '</span><span class="r">' + cyc + '</span>…';
  }
  function drawCalc() {
    const a = Number($('aIn').value), b = Number($('bIn').value);
    if (!isFinite(a) || !isFinite(b)) { $('handAns').textContent = '—'; $('compAns').textContent = '—'; return; }
    const fa = toFrac($('aIn').value), fb = toFrac($('bIn').value);
    let hand = '—';
    if (fa && fb) {
      const n = fa.n * fb.d - fb.n * fa.d, d = fa.d * fb.d;
      hand = String(Math.round(n / d * 1e12) / 1e12);
    }
    const comp = a - b;
    $('handAns').textContent = hand;
    $('compAns').textContent = String(comp);
    const same = String(comp) === hand;
    document.querySelectorAll('.cmpbox')[1].className = 'cmpbox ' + (same ? 'ok' : 'ng');
    const n = $('calcNote');
    n.className = 'note ' + (same ? 'ok' : 'ng');
    n.innerHTML = same
      ? 'この計算では誤差が出ませんでした。どちらの数も2進法でぴったり表せるためです。'
      : '答えがずれました。<strong>' + a + ' も ' + b + ' も2進法では正確に表せない</strong>ので、' +
        'コンピュータの中では「とても近い別の数」に置きかわっています。その差が答えに残りました。' +
        '<br><span class="small">表計算ソフトでも同じことが起こります（本文では 0.100000000000001 と表示されました）。</span>';
    $('innerTable').innerHTML = '<thead><tr><th></th><th>2進法にすると</th><th>コンピュータが実際に記憶している値</th></tr></thead><tbody>' +
      [[a, $('aIn').value], [b, $('bIn').value]].map(x =>
        '<tr><td class="mono">' + x[1] + '</td><td class="bitstr">' + bin64(x[0]) + '（2）</td>' +
        '<td class="mono">' + x[0].toPrecision(20) + '</td></tr>').join('') + '</tbody>';
  }

  /* ===== STEP 4 ===== */
  const BLANKS = [
    { k: 'イ', q: 'これはコンピュータの【　】によって起こる典型的な例である。',
      ch: ['桁あふれ誤差', '打ち切り誤差', '丸め誤差', '量子化誤差'], a: '丸め誤差',
      why: '表せる桁を超えた部分を四捨五入などで処理することで生じるのが丸め誤差です。計算を重ねると積み重なります。' },
    { k: 'ウ', q: 'その原因は',
      ch: ['コンピュータのバグによって、計算結果が偶然変わることがあるため', 'コンピュータが一定の時間内に計算を終えるように、処理を途中で打ち切られるため', 'コンピュータの画面上で表示できる桁数と内部で扱うことができる桁数が異なるため', 'コンピュータの内部で小数を扱うとき、正確に表しきれない数があるため'],
      a: 'コンピュータの内部で小数を扱うとき、正確に表しきれない数があるため',
      why: '5.4も5.3も2進法では循環小数になり、正確には表せません。STEP 1・3 で確かめたとおりです。' },
    { k: 'エ', q: 'その対策として考えられるのは',
      ch: ['10進法で表された小数それぞれを10ⁿ倍して整数に変換し、計算後に10ⁿで割ること', '10進法で表された小数それぞれを10ⁿで割って整数に変換し、計算後に10ⁿ倍すること', '10進法で表された小数それぞれを2ⁿ倍して整数に変換し、計算後に2ⁿで割ること', '10進法で表された小数それぞれを2ⁿで割って整数に変換し、計算後に2ⁿ倍すること'],
      a: '10進法で表された小数それぞれを10ⁿ倍して整数に変換し、計算後に10ⁿで割ること',
      why: '小数点を右にずらして整数にしてから計算すれば、誤差は生じません。10で割ると小数が増えるだけ、2ⁿ倍では整数になりません。STEP 5 で試せます。' }
  ];
  let bAns = {};
  function drawBlanks() {
    $('blankBox').innerHTML = BLANKS.map((b, i) => {
      const long = b.ch.some(c => c.length > 12);
      return '<div class="panel"' + (i ? ' style="margin-top:14px"' : '') + '>' +
        '<p class="pq">【' + b.k + '】　' + b.q + '</p>' +
        '<div class="choice4' + (long ? ' v' : '') + '" data-i="' + i + '">' + b.ch.map((c, j) =>
          '<button class="btn" data-i="' + i + '" data-c="' + c + '" style="text-align:' + (long ? 'left' : 'center') + '">' +
          '⓪①②③'[j] + '　' + c + '</button>').join('') +
        '</div><div class="note" id="bfb' + i + '" hidden></div></div>';
    }).join('');
    $('blankBox').querySelectorAll('button[data-c]').forEach(btn => btn.addEventListener('click', () => {
      const i = +btn.dataset.i, b = BLANKS[i], ok = btn.dataset.c === b.a;
      const row = $('blankBox').querySelector('.choice4[data-i="' + i + '"]');
      row.classList.add('locked');
      [...row.children].forEach(x => { if (x.dataset.c === b.a) x.classList.add('correct'); else if (x === btn) x.classList.add('wrong'); });
      const fb = $('bfb' + i); fb.hidden = false; fb.className = 'note ' + (ok ? 'ok' : 'ng');
      fb.innerHTML = (ok ? '正解。' : '正解は <strong>' + b.a + '</strong>。') + b.why;
      bAns[i] = ok;
      const done = Object.keys(bAns).length, right = Object.values(bAns).filter(Boolean).length;
      const n = $('blankNote');
      n.className = 'note ' + (done === BLANKS.length ? (right === done ? 'ok' : 'warn') : 'info');
      n.innerHTML = done + ' / ' + BLANKS.length + ' 問解答（正解 ' + right + ' 問）' +
        (done === BLANKS.length ? '<br>本文の答えは【イ】②　【ウ】③　【エ】⓪ です。' : '');
    }));
    $('blankNote').className = 'note info';
    $('blankNote').textContent = '0 / ' + BLANKS.length + ' 問解答';
  }
  function drawErrTable() {
    $('errTable').innerHTML = '<thead><tr><th>名称</th><th>説明</th></tr></thead><tbody>' +
      '<tr><td>桁あふれ誤差</td><td>扱える桁数を超えることで生じる誤差。最大値を上回るのが<strong>オーバーフロー</strong>、最小値を下回るのが<strong>アンダーフロー</strong>。</td></tr>' +
      '<tr style="background:var(--warn-bg)"><td><strong>丸め誤差</strong></td><td>表現できる桁数を超えたときに、四捨五入・切り上げ・切り捨てを行うことで生じる誤差。</td></tr>' +
      '<tr><td>情報落ち</td><td>絶対値の大きな値と小さな値で足し算・引き算を行うことで、小さいほうが無視されて生じる誤差。</td></tr>' +
      '<tr><td>桁落ち</td><td>絶対値がほぼ等しい数値の差を求めたときに、有効桁数が大きく減ることで生じる誤差。</td></tr>' +
      '<tr><td>打ち切り誤差</td><td>くり返し計算を途中で打ち切ることで生じる誤差。</td></tr></tbody>';
  }

  /* ===== STEP 5 ===== */
  function drawFix() {
    const p = +$('nPow').value, k = Math.pow(10, p);
    const a = Number($('aIn').value) || 5.4, b = Number($('bIn').value) || 5.3;
    $('nPowV').textContent = p; $('nPowN').textContent = k.toLocaleString();
    const ai = a * k, bi = b * k;
    const intOK = Number.isInteger(Math.round(ai * 1e6) / 1e6) && Number.isInteger(Math.round(bi * 1e6) / 1e6);
    const res = (Math.round(ai) - Math.round(bi)) / k;
    const plain = a - b;
    $('fixEq').innerHTML =
      a + ' × ' + k + ' ＝ ' + (Math.round(ai * 1e6) / 1e6) + '　／　' + b + ' × ' + k + ' ＝ ' + (Math.round(bi * 1e6) / 1e6) + '<br>' +
      (intOK ? '整数どうしの引き算：' + Math.round(ai) + ' − ' + Math.round(bi) + ' ＝ ' + (Math.round(ai) - Math.round(bi)) + '<br>' +
        'これを ' + k + ' で割って　<strong>' + res + '</strong>' : '<span style="color:#c0392b">まだ整数になっていません</span>');
    const n = $('fixNote');
    const fixed = intOK && String(res) !== String(plain);
    n.className = 'note ' + (intOK ? (fixed ? 'ok' : 'info') : 'warn');
    n.innerHTML = !intOK
      ? '10<sup>' + p + '</sup>倍しただけでは整数になりません。小数点以下の桁数だけ倍率を上げましょう。'
      : fixed
        ? 'そのまま計算すると <span class="mono">' + plain + '</span> ですが、整数に直してから計算すると <strong class="mono">' + res + '</strong> になりました。<strong>誤差が消えています。</strong>'
        : 'この計算はもともと誤差が出ないので、結果は同じです。5.4 − 5.3 で試してみましょう。';
  }

  function init() {
    $('decIn').addEventListener('input', drawExpand);
    document.querySelectorAll('button[data-d]').forEach(b => b.addEventListener('click', () => { $('decIn').value = b.dataset.d; drawExpand(); }));
    ['aIn', 'bIn'].forEach(i => $(i).addEventListener('input', () => { drawCalc(); drawFix(); }));
    document.querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.p.split(','); $('aIn').value = v[0]; $('bIn').value = v[1]; drawCalc(); drawFix();
    }));
    $('nPow').addEventListener('input', drawFix);
    window.Terms.glossary($('glossBox'), ['丸め誤差', '演算誤差', '桁落ち', '情報落ち', 'オーバーフロー', 'アンダーフロー', '浮動小数点数', '基数変換', '2進法']);
    drawExpand(); drawQ1(); drawCalc(); drawBlanks(); drawErrTable(); drawFix();
    window.Terms.attach();
  }
  if (window.Predict) Predict.make('pdE', {
    q: 'コンピュータで <span class="mono">0.1 ＋ 0.1 ＋ 0.1</span> を計算して、結果が <span class="mono">0.3</span> と等しいか調べました。どうなるでしょう？',
    type: 'pick',
    ch: ['等しい', '等しくない', '計算できずエラーになる', '0 になる'],
    answer: function () { return 1; },
    show: function () {
      return '実際の結果は <span class="mono">' + (0.1 + 0.1 + 0.1) + '</span> で、<strong>0.3 とは等しくありません</strong>。';
    },
    why: '10進法の 0.1 は、<strong>2進法では割り切れない循環小数</strong>になります。' +
         'どこかで打ち切るしかないので、ごくわずかな誤差が残り、足すほど積み重なります。' +
         'だからプログラムで小数を比べるときは「＝」を使わず、<strong>差が十分小さいかどうか</strong>で判定します。'
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
