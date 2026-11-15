const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [a, b, dir] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + __dirname + '/v3.html'); await p.evaluate(() => window.ready);
  for (let f = a; f < b; f += 10) {
    const imgs = await p.evaluate(([f, b]) => { const out = []; for (let i = f; i < Math.min(f + 10, b); i++) { renderAt(i / 60); out.push(document.getElementById('c').toDataURL('image/jpeg', 0.95).slice(23)); } return out; }, [f, b]);
    imgs.forEach((d, k) => fs.writeFileSync(`${dir}/f${String(f + k).padStart(5, '0')}.jpg`, Buffer.from(d, 'base64')));
    if (f % 600 === 0) console.log(a, f);
  }
  await br.close();
})();
