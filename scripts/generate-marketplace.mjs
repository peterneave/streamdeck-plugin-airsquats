// Generates Marketplace promo images (app icon, thumbnail, 3 gallery images) into ./marketplace.
// Renders HTML to PNG with headless Microsoft Edge (or Chrome). Run with: npm run marketplace
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "marketplace");
const tmpDir = join(outDir, ".build");
mkdirSync(tmpDir, { recursive: true });

const browser = [
	process.env.BROWSER_PATH,
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));
if (!browser) throw new Error("No Edge or Chrome found. Set BROWSER_PATH.");

// ------------------------------------------------------------ shared artwork
const TEAL = "#0f8a7d";
const RED = "#e11d2e";
// Drawn slightly smaller than on the real key so the legs clear the text in large mock-ups.
const FIGURE = (stroke = "#FFFFFF", w = 5) => `
  <g transform="translate(50 10) scale(.86) translate(-50 -10)">
  <circle cx="50" cy="20" r="6" fill="${stroke}"/>
  <g stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M50 28 L50 46"/><path d="M50 34 L34 26"/><path d="M50 34 L66 26"/>
    <path d="M50 46 L39 53 L42 66"/><path d="M50 46 L61 53 L58 66"/>
  </g></g>`;
const txt = (t, size, y, fill = "#FFFFFF") =>
	`<text x="50" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${size}" fill="${fill}" text-anchor="middle">${t}</text>`;

// Same layouts the plugin draws on the key (src/render.ts).
const keySvg = (bg, body) =>
	`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${bg}"/>${body}</svg>`;
const idleKey = (time) => keySvg(TEAL, FIGURE() + txt("NEXT", 11, 80) + txt(time, 20, 96));
const alertKey = (n) => keySvg(RED, FIGURE() + txt(`${n} AIR`, 17, 78) + txt("SQUATS!", 17, 96));
const flashKey = (n) => keySvg("#ffffff", txt(`${n} AIR`, 19, 48, RED) + txt("SQUATS!", 19, 72, RED));
const niceKey = (next) => keySvg("#15803d", FIGURE() + txt("NICE!", 16, 80) + txt(`Next ${next}`, 14, 97));
const snoozeKey = (at) => keySvg("#b45309", FIGURE() + txt("+5 MIN", 16, 80) + txt(`At ${at}`, 14, 97));

const key = (svg, size, extra = "") =>
	`<div class="key" style="width:${size}px;height:${size}px;${extra}">${svg}</div>`;

const baseCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; }
body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #fff; overflow: hidden;
  background: radial-gradient(1200px 800px at 85% 20%, #14b3a2 0%, rgba(20,179,162,0) 60%),
              linear-gradient(135deg, #07302c 0%, #0a1f1d 55%, #0b1413 100%); }
.key { border-radius: 14%; overflow: hidden; background: #000;
  box-shadow: 0 0 0 10px #1b1f23, 0 0 0 12px #2c3238, 0 30px 60px rgba(0,0,0,.55); }
.key svg { display: block; width: 100%; height: 100%; }
h1 { font-size: 150px; line-height: 1; font-weight: 800; letter-spacing: -2px; }
h2 { font-size: 92px; line-height: 1.05; font-weight: 800; letter-spacing: -1px; }
.sub { font-size: 52px; line-height: 1.25; color: #d4f3ef; font-weight: 500; }
.label { font-size: 46px; font-weight: 700; text-align: center; line-height: 1.2; }
.label small { display: block; font-size: 36px; font-weight: 500; color: #bfe6e1; margin-top: 8px; }
.accent { color: #5eead4; }
`;

const page = (w, h, css, body) =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${baseCss}body{width:${w}px;height:${h}px;}${css}</style></head><body>${body}</body></html>`;

// ------------------------------------------------------------ pages
const pages = [];

// App icon (288 x 288, transparent corners), same artwork as the plugin icon.
pages.push({
	file: "app-icon-288.png", w: 288, h: 288, transparent: true,
	html: `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:288px;height:288px;background:transparent;overflow:hidden}
svg{display:block}</style></head><body>
<svg width="288" height="288" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="100" height="100" rx="20" fill="${TEAL}"/>
<g transform="translate(50 50) scale(1.15) translate(-50 -46)">
<circle cx="50" cy="22" r="7" fill="#fff"/>
<g stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
<path d="M50 32 L50 55"/><path d="M50 40 L30 30"/><path d="M50 40 L70 30"/>
<path d="M50 55 L36 64 L40 80"/><path d="M50 55 L64 64 L60 80"/></g></g></svg></body></html>`,
});

// Thumbnail (1920 x 960).
pages.push({
	file: "thumbnail-1920x960.png", w: 1920, h: 960,
	html: page(1920, 960, `
.wrap { display:flex; align-items:center; height:100%; padding:0 130px; gap:80px; }
.left { flex: 1; }
.left .sub { margin-top: 36px; max-width: 900px; }
.right { position: relative; width: 640px; height: 640px; flex: none; }
.right .a { position:absolute; right:0; top:0; }
.right .b { position:absolute; left:-70px; bottom:-30px; }
`, `<div class="wrap">
  <div class="left"><h1>Air <span class="accent">Squats</span></h1>
  <div class="sub">An hourly reminder to get up and move, right on your Stream Deck key.</div></div>
  <div class="right">
    <div class="a">${key(alertKey(10), 480)}</div>
    <div class="b">${key(idleKey("11:00"), 260)}</div>
  </div></div>`),
});

// Gallery 1: the reminder cycle.
pages.push({
	file: "gallery-1-reminder-1920x960.png", w: 1920, h: 960,
	html: page(1920, 960, `
.wrap { padding: 80px 110px; height:100%; display:flex; flex-direction:column; }
h2 { max-width: 1500px; }
.sub { margin-top: 22px; }
.row { flex:1; display:flex; align-items:center; justify-content:space-between; padding: 0 30px; }
.col { display:flex; flex-direction:column; align-items:center; gap: 40px; }
.arrow { font-size: 110px; color:#5eead4; font-weight:700; padding-bottom: 80px; }
`, `<div class="wrap">
  <h2>A reminder every hour</h2>
  <div class="sub">Choose the minute. The key flashes and beeps until you respond.</div>
  <div class="row">
    <div class="col">${key(idleKey("10:00"), 330)}<div class="label">Waiting<small>Shows the next time</small></div></div>
    <div class="arrow">&rarr;</div>
    <div class="col">${key(alertKey(10), 330)}<div class="label">Reminder<small>Beeps every 30 seconds</small></div></div>
    <div class="arrow">&rarr;</div>
    <div class="col">${key(flashKey(10), 330)}<div class="label">Flashing<small>Red and white</small></div></div>
  </div></div>`),
});

// Gallery 2: press, hold, preview.
pages.push({
	file: "gallery-2-controls-1920x960.png", w: 1920, h: 960,
	html: page(1920, 960, `
.wrap { padding: 80px 110px; height:100%; display:flex; flex-direction:column; }
.sub { margin-top: 22px; }
.row { flex:1; display:flex; align-items:center; justify-content:space-between; padding: 0 30px; }
.col { display:flex; flex-direction:column; align-items:center; gap: 40px; width: 480px; }
`, `<div class="wrap">
  <h2>Press to finish. Hold to snooze.</h2>
  <div class="sub">One key, two gestures, no menus.</div>
  <div class="row">
    <div class="col">${key(niceKey("11:00"), 330)}<div class="label">Press<small>Acknowledge the reminder</small></div></div>
    <div class="col">${key(snoozeKey("10:05"), 330)}<div class="label">Hold for 0.7 seconds<small>Snooze for 5 minutes</small></div></div>
    <div class="col">${key(alertKey(10), 330)}<div class="label">Press when idle<small>Preview for 4 seconds</small></div></div>
  </div></div>`),
});

// Gallery 3: settings (mirrors the real property inspector fields).
const row = (label, control) => `<div class="r"><div class="l">${label}</div><div class="c">${control}</div></div>`;
pages.push({
	file: "gallery-3-settings-1920x960.png", w: 1920, h: 960,
	html: page(1920, 960, `
.wrap { display:flex; align-items:center; height:100%; padding: 0 110px; gap: 90px; }
.left { flex: 1; }
.left .sub { margin-top: 28px; }
ul { list-style:none; margin-top: 50px; font-size: 46px; line-height: 1.5; color:#fff; font-weight:600; }
li::before { content:""; display:inline-block; width:18px; height:18px; border-radius:50%; background:#5eead4; margin-right:24px; vertical-align:middle; }
.panel { width: 760px; background:#2d2d2d; border-radius: 28px; padding: 44px 44px 36px; box-shadow: 0 40px 80px rgba(0,0,0,.55); border:2px solid #444; }
.ph { font-size: 30px; color:#aaa; margin-bottom: 26px; letter-spacing: 1px; text-transform: uppercase; }
.r { display:flex; align-items:center; margin-bottom: 30px; font-size: 32px; }
.l { width: 250px; color:#cfcfcf; flex:none; }
.c { flex:1; color:#fff; }
.box { background:#1f1f1f; border:2px solid #555; border-radius:10px; padding: 10px 18px; }
.slider { position:relative; height: 10px; background:#555; border-radius:5px; margin: 14px 0 10px; }
.slider i { position:absolute; left:25%; top:-9px; width:28px; height:28px; border-radius:50%; background:#5eead4; margin-left:-14px; }
.val { font-size: 26px; color:#aaa; display:flex; justify-content:space-between; }
.chk { display:flex; align-items:center; gap: 16px; }
.chk b { width: 34px; height:34px; border-radius:8px; background:#5eead4; color:#06302b; display:inline-flex; align-items:center; justify-content:center; font-size: 26px; }
.btn { display:inline-block; background:#444; border-radius:10px; padding: 10px 24px; }
.muted { color:#aaa; }
`, `<div class="wrap">
  <div class="left">
    <h2>Set it up<br>your way</h2>
    <ul>
      <li>Any minute past the hour</li>
      <li>1 to 999 air squats</li>
      <li>Custom sound or silent</li>
    </ul>
  </div>
  <div class="panel">
    <div class="ph">Key settings</div>
    ${row("Minutes past", `<div class="slider"><i></i></div><div class="val"><span>0</span><span>15</span><span>59</span></div>`)}
    ${row("Reminds at", `<span class="muted">10:15, 11:15, 12:15...</span>`)}
    ${row("Air squats", `<div class="box">20</div>`)}
    ${row("Sound", `<div class="chk"><b>&#10003;</b> Play alert sound</div>`)}
    ${row("Alert sound", `<div class="box muted">Choose a file...</div>`)}
    ${row("", `<span class="btn">Use default sound</span>`)}
  </div></div>`),
});

// ------------------------------------------------------------ render
for (const p of pages) {
	const htmlPath = join(tmpDir, p.file.replace(/\.png$/, ".html"));
	writeFileSync(htmlPath, p.html);
	const args = [
		"--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
		`--window-size=${p.w},${p.h}`, `--screenshot=${join(outDir, p.file)}`,
	];
	if (p.transparent) args.push("--default-background-color=00000000");
	args.push(pathToFileURL(htmlPath).href);
	execFileSync(browser, args, { stdio: "ignore" });
	console.log("wrote", p.file);
}
rmSync(tmpDir, { recursive: true, force: true });
