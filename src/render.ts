const FIGURE = `
  <circle cx="50" cy="20" r="6" fill="#FFFFFF"/>
  <g stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M50 28 L50 46"/><path d="M50 34 L34 26"/><path d="M50 34 L66 26"/>
    <path d="M50 46 L39 53 L42 66"/><path d="M50 46 L61 53 L58 66"/>
  </g>`;

function toDataUrl(svg: string): string {
	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function key(bg: string, lines: { text: string; size: number; y: number }[], figure = true): string {
	const text = lines
		.map(
			(l) =>
				`<text x="50" y="${l.y}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${l.size}" fill="#FFFFFF" text-anchor="middle">${l.text}</text>`,
		)
		.join("");
	return toDataUrl(
		`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/>${figure ? FIGURE : ""}${text}</svg>`,
	);
}

/** Waiting for the next reminder. */
export const idleImage = (nextTime: string) =>
	key("#0f8a7d", [
		{ text: "NEXT", size: 11, y: 80 },
		{ text: nextTime, size: 20, y: 96 },
	]);

/** Reminder is active; `on` toggles to produce the flash. */
export const alertImage = (on: boolean) =>
	on
		? key("#e11d2e", [
				{ text: "10 AIR", size: 17, y: 78 },
				{ text: "SQUATS!", size: 17, y: 96 },
			])
		: toDataUrl(
				`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/><text x="50" y="48" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="19" fill="#e11d2e" text-anchor="middle">10 AIR</text><text x="50" y="72" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="19" fill="#e11d2e" text-anchor="middle">SQUATS!</text></svg>`,
			);

/** Short feedback message (acknowledged, snoozed). */
export const messageImage = (bg: string, line1: string, line2: string) =>
	key(
		bg,
		[
			{ text: line1, size: 16, y: 80 },
			{ text: line2, size: 14, y: 97 },
		],
		true,
	);
