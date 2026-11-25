// Generates the static binary assets (alert WAV, plugin icon PNGs) and SVG icons.
// Run with: npm run assets
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "com.peterneave.streamdeck-plugin-airsquats.sdPlugin");
const out = (p) => {
	const full = join(root, p);
	mkdirSync(dirname(full), { recursive: true });
	return full;
};

// ---------------------------------------------------------------- WAV beep
// Three rising double-beeps, clearly audible, with short fades to avoid clicks.
function makeWav() {
	const rate = 44100;
	const segments = [
		[880, 0.16], [0, 0.06], [1175, 0.16], [0, 0.06], [1568, 0.28],
	];
	const samples = [];
	for (const [freq, secs] of segments) {
		const n = Math.floor(rate * secs);
		for (let i = 0; i < n; i++) {
			const fade = Math.min(1, i / 300, (n - i) / 300);
			// square-ish wave (sine + 3rd harmonic) cuts through office noise better than a pure sine
			const t = (2 * Math.PI * freq * i) / rate;
			const v = freq === 0 ? 0 : (Math.sin(t) + Math.sin(3 * t) / 3) * 0.75 * fade;
			samples.push(Math.max(-1, Math.min(1, v)));
		}
	}
	const data = Buffer.alloc(samples.length * 2);
	samples.forEach((s, i) => data.writeInt16LE(Math.round(s * 32767 * 0.9), i * 2));
	const header = Buffer.alloc(44);
	header.write("RIFF", 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVEfmt ", 8);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // mono
	header.writeUInt32LE(rate, 24);
	header.writeUInt32LE(rate * 2, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write("data", 36);
	header.writeUInt32LE(data.length, 40);
	return Buffer.concat([header, data]);
}
writeFileSync(out("sounds/alert.wav"), makeWav());

// ---------------------------------------------------------------- PNG icon
const crcTable = new Uint32Array(256).map((_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc32 = (buf) => {
	let c = 0xffffffff;
	for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
};
function png(size, pixel) {
	const raw = Buffer.alloc((size * 4 + 1) * size);
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0;
		for (let x = 0; x < size; x++) {
			const [r, g, b, a] = pixel(x / size, y / size, size);
			const o = y * (size * 4 + 1) + 1 + x * 4;
			raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
	]);
}

// Stick figure mid-squat (coordinates in 0..1 space) on a rounded teal tile.
const segs = [
	[0.5, 0.32, 0.5, 0.55], // torso
	[0.5, 0.4, 0.3, 0.3],   // left arm forward
	[0.5, 0.4, 0.7, 0.3],   // right arm forward
	[0.5, 0.55, 0.36, 0.64], [0.36, 0.64, 0.4, 0.8], // left leg
	[0.5, 0.55, 0.64, 0.64], [0.64, 0.64, 0.6, 0.8], // right leg
];
const distSeg = (px, py, [x1, y1, x2, y2]) => {
	const dx = x2 - x1, dy = y2 - y1;
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
	return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};
const iconPixel = (u, v, size) => {
	const aa = 1.5 / size;
	// rounded square mask
	const cx = Math.abs(u - 0.5) - 0.38, cy = Math.abs(v - 0.5) - 0.38;
	const rd = Math.hypot(Math.max(cx, 0), Math.max(cy, 0)) - 0.1;
	if (rd > aa) return [0, 0, 0, 0];
	const bgA = Math.round(255 * Math.min(1, Math.max(0, 1 - rd / aa)));
	let cover = 0;
	const head = Math.hypot(u - 0.5, v - 0.22) - 0.07;
	cover = Math.max(cover, Math.min(1, Math.max(0, 0.5 - head / aa)));
	for (const s of segs) {
		const d = distSeg(u, v, s) - 0.035;
		cover = Math.max(cover, Math.min(1, Math.max(0, 0.5 - d / aa)));
	}
	const mix = (bg, fg) => Math.round(bg + (fg - bg) * cover);
	return [mix(0x0f, 255), mix(0x8a, 255), mix(0x7d, 255), bgA];
};
writeFileSync(out("imgs/plugin/icon.png"), png(256, iconPixel));
writeFileSync(out("imgs/plugin/icon@2x.png"), png(512, iconPixel));

// ---------------------------------------------------------------- SVG icons
const figure = (stroke, w) => `
  <circle cx="50" cy="22" r="7" fill="${stroke}"/>
  <g stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M50 32 L50 55"/><path d="M50 40 L30 30"/><path d="M50 40 L70 30"/>
    <path d="M50 55 L36 64 L40 80"/><path d="M50 55 L64 64 L60 80"/>
  </g>`;
writeFileSync(
	out("imgs/category/icon.svg"),
	`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100">${figure("#FFFFFF", 7)}</svg>\n`,
);
writeFileSync(
	out("imgs/actions/squats/icon.svg"),
	`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100">${figure("#FFFFFF", 7)}</svg>\n`,
);
writeFileSync(
	out("imgs/actions/squats/key.svg"),
	`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f8a7d"/>${figure("#FFFFFF", 6)}
</svg>\n`,
);
console.log("Assets generated.");
