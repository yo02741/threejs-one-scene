// 這本教材的檢查腳本。先 npm run build，再執行：
//
//   node tests/run.cjs shots [章號…]   逐段截圖到 tests/out/，並回報執行期錯誤
//   node tests/run.cjs practice        每一題練習按「看答案」後都要能被判定為達成
//   node tests/run.cjs ch1             第 1 章和 reference/chapter-01.html（r128）逐像素比對
//   node tests/run.cjs all             以上全部
//
// 需要 Playwright：npm i -D playwright && npx playwright install chromium
// 環境變數：
//   WAIT=3000         每段等幾毫秒再截圖（沒有顯示卡的機器，後製章節要調高）
//   THREE_R128=路徑   three.js r128 的 three.min.js；不給就從 CDN 載入
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('找不到 Playwright。請先執行：npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const WAIT = +process.env.WAIT || 1500;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png' };

// 靜態伺服器：/ → dist/，/reference/ → reference/
function serve() {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url.endsWith('/')) url += 'index.html';
    const file = url.startsWith('/reference/') ? path.join(ROOT, url) : path.join(ROOT, 'dist', url);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((ok) => server.listen(0, () => ok({ url: `http://localhost:${server.address().port}`, close: () => server.close() })));
}

const NOISE = /fonts\.g|Failed to load resource|GPU stall|swiftshader|Automatic fallback/i;
function watch(page, errors) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text()); });
}

/* ---------- shots：逐段截圖 ---------- */
async function shots(browser, base, only) {
  fs.mkdirSync(OUT, { recursive: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  watch(page, errors);
  await page.goto(base + '/');
  await page.waitForTimeout(600);
  const secs = await page.evaluate(() => Array.from(document.querySelectorAll('section[data-chapter]'))
    .map((s) => ({ ch: s.dataset.chapter, step: s.dataset.step })));
  for (const { ch, step } of secs) {
    if (only.length && !only.includes(ch)) continue;
    await page.evaluate(([c, s]) => document.querySelector(`section[data-chapter="${c}"][data-step="${s}"]`)
      .scrollIntoView({ block: 'center', behavior: 'instant' }), [ch, step]);
    await page.waitForTimeout(WAIT);
    await page.screenshot({ path: path.join(OUT, `c${ch}-s${step.replace('.', '_')}.png`) });
    console.log(`  ${ch}-${step}  ${await page.textContent('#hud')}`);
  }
  await page.context().close();
  return errors;
}

/* ---------- practice：每一題的答案都要能通過 ---------- */
async function practice(browser, base) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  watch(page, errors);
  await page.goto(base + '/');
  await page.waitForTimeout(600);
  const results = await page.evaluate(async () => {
    const out = [];
    for (const task of document.querySelectorAll('.task')) {
      const was = task.classList.contains('ok');
      task.querySelector('button').click();
      await new Promise((r) => setTimeout(r, 50));
      out.push({ ch: task.closest('.chapter').id, q: task.querySelector('.q').textContent.slice(0, 24), was, ok: task.classList.contains('ok') });
    }
    return out;
  });
  results.forEach((r) => {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.ch}  ${r.q}…${r.was ? '（一開始就達成了，題目沒有鑑別度）' : ''}`);
    if (!r.ok) errors.push(`${r.ch}：按了「看答案」仍未達成 — ${r.q}`);
    if (r.was) errors.push(`${r.ch}：預設值就已經達成 — ${r.q}`);
  });
  await page.context().close();
  return errors;
}

/* ---------- ch1：和 r128 的單檔原版逐像素比對 ---------- */
async function ch1(browser, base) {
  const errors = [];
  const sizes = [['桌面', { width: 1280, height: 800 }, [460, 0, 820, 800]], ['手機', { width: 390, height: 844 }, [0, 0, 390, 354]]];
  const compare = await (await browser.newContext()).newPage();
  for (const [name, viewport, box] of sizes) {
    const grab = async (url) => {
      // 減少動態：迴圈預設暫停、星星不轉，兩邊的畫面才會完全一樣
      const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      watch(page, errors);
      if (process.env.THREE_R128) {
        await page.route('**/three.min.js', (r) => r.fulfill({ path: process.env.THREE_R128, contentType: 'text/javascript' }));
      }
      await page.goto(url);
      await page.waitForTimeout(800);
      const shots = [];
      for (let i = 0; i <= 4; i++) { // 第 0～4 段；最後一段新版會回到定稿值，本來就不同
        await page.evaluate((i) => document.querySelectorAll('section')[i].scrollIntoView({ block: 'center', behavior: 'instant' }), i);
        await page.waitForTimeout(600);
        if (i === 3) { await page.click('button[data-fov="95"]'); await page.waitForTimeout(300); }
        shots.push((await page.screenshot()).toString('base64'));
      }
      await ctx.close();
      return shots;
    };
    const ref = await grab(base + '/reference/chapter-01.html');
    const now = await grab(base + '/');
    for (let i = 0; i < ref.length; i++) {
      // 在瀏覽器裡把兩張圖解開來比，省得另外裝影像函式庫
      const diff = await compare.evaluate(async ([a, b, box]) => {
        const load = (d) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = 'data:image/png;base64,' + d; });
        const px = async (d) => {
          const im = await load(d), c = document.createElement('canvas');
          c.width = box[2]; c.height = box[3];
          const g = c.getContext('2d');
          g.drawImage(im, -box[0], -box[1]);
          return g.getImageData(0, 0, box[2], box[3]).data;
        };
        const [pa, pb] = [await px(a), await px(b)];
        let n = 0;
        for (let k = 0; k < pa.length; k += 4) {
          if (Math.max(Math.abs(pa[k] - pb[k]), Math.abs(pa[k + 1] - pb[k + 1]), Math.abs(pa[k + 2] - pb[k + 2])) > 24) n++;
        }
        return n / (pa.length / 4);
      }, [ref[i], now[i], box]);
      // 容許 0.5%：線條的反鋸齒，以及座標軸漸層中段的色彩管理差異（見 HANDOFF.md）
      const ok = diff < 0.005;
      console.log(`  ${ok ? '✓' : '✗'} ${name} 第 ${i} 段：${(diff * 100).toFixed(3)}% 的像素不同`);
      if (!ok) errors.push(`第 1 章 ${name} 第 ${i} 段和原版差了 ${(diff * 100).toFixed(2)}%`);
    }
  }
  return errors;
}

(async () => {
  const [what = 'all', ...only] = process.argv.slice(2);
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) { console.error('找不到 dist/，請先 npm run build'); process.exit(2); }
  const server = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const run = async (name, fn) => {
    if (what !== 'all' && what !== name) return;
    console.log(`\n[${name}]`);
    errors.push(...await fn());
  };
  await run('practice', () => practice(browser, server.url));
  await run('ch1', () => ch1(browser, server.url));
  await run('shots', () => shots(browser, server.url, only));
  await browser.close();
  server.close();
  const unique = [...new Set(errors)];
  console.log(unique.length ? `\n有 ${unique.length} 個問題：\n` + unique.map((e) => '  - ' + e).join('\n') : '\n全部通過。');
  process.exit(unique.length ? 1 : 0);
})();
