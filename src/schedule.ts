/** Clamp/parse the user's configured minute-past-the-hour. Anything invalid falls back to 0 (on the hour). */
export function parseMinute(value: unknown): number {
	const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
	return Number.isInteger(n) && n >= 0 && n <= 59 ? n : 0;
}

export const DEFAULT_SQUATS = 10;
const MAX_SQUATS = 999;

/** Parse the configured number of air squats. Anything invalid or below 1 falls back to 10. */
export function parseCount(value: unknown): number {
	const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
	return Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_SQUATS) : DEFAULT_SQUATS;
}

/** The next time the clock reads `minute` past the hour, strictly after `now`. */
export function nextHourlySlot(now: Date, minute: number): Date {
	const next = new Date(now);
	next.setMinutes(minute, 0, 0);
	if (next.getTime() <= now.getTime()) {
		next.setHours(next.getHours() + 1);
	}
	return next;
}

/** Format as local HH:MM. */
export function formatTime(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
