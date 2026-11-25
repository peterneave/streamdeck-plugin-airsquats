import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { alertImage, idleImage, messageImage } from "../render";
import { formatTime, nextHourlySlot, parseCount, parseMinute } from "../schedule";
import { playAlert } from "../sound";

type Settings = {
	/** Minute past the hour to remind at (0-59). Defaults to 0 (on the hour). */
	minute?: number | string;
	/** Number of air squats to do each time (1-999). Defaults to 10. */
	count?: number | string;
	/** Optional custom alert sound (path from the file picker). Empty means the bundled default. */
	soundFile?: string;
};

const TICK_MS = 500; // flash rate and scheduler resolution
const LONG_PRESS_MS = 700; // hold this long to snooze
const SNOOZE_MS = 5 * 60 * 1000;
const REBEEP_MS = 30 * 1000; // repeat the sound while the reminder is unacknowledged
const TOAST_MS = 2500;
const PREVIEW_MS = 4000; // how long a single press previews the reminder

type Instance = {
	key: KeyAction<Settings> | undefined;
	minute: number;
	count: number;
	soundFile?: string;
	/** While set and in the future, the key shows (and sounds) the reminder as a demo. */
	previewUntil?: number;
	nextDue: Date;
	alerting: boolean;
	flashOn: boolean;
	lastBeep: number;
	toast?: { image: string; until: number };
	timer?: NodeJS.Timeout;
	holdTimer?: NodeJS.Timeout;
	longFired: boolean;
	lastImage?: string;
};

@action({ UUID: "com.peterneave.streamdeck-plugin-airsquats.action" })
export class AirSquats extends SingletonAction<Settings> {
	/** Kept across disappear/appear so a snooze or pending reminder survives a page switch. */
	private readonly instances = new Map<string, Instance>();

	override onWillAppear(ev: WillAppearEvent<Settings>): void {
		if (!ev.action.isKey()) return;
		const minute = parseMinute(ev.payload.settings.minute);

		let inst = this.instances.get(ev.action.id);
		if (!inst) {
			inst = {
				key: ev.action,
				minute,
				count: parseCount(ev.payload.settings.count),
				soundFile: ev.payload.settings.soundFile,
				nextDue: nextHourlySlot(new Date(), minute),
				alerting: false,
				flashOn: true,
				lastBeep: 0,
				longFired: false,
			};
			this.instances.set(ev.action.id, inst);
		} else {
			inst.key = ev.action;
			inst.count = parseCount(ev.payload.settings.count);
			inst.soundFile = ev.payload.settings.soundFile;
			inst.lastImage = undefined;
			if (inst.minute !== minute) this.reschedule(inst, minute);
		}

		clearInterval(inst.timer);
		const current = inst;
		current.timer = setInterval(() => this.tick(current), TICK_MS);
		this.tick(current);
	}

	override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
		const inst = this.instances.get(ev.action.id);
		if (!inst) return;
		clearInterval(inst.timer);
		clearTimeout(inst.holdTimer);
		inst.timer = undefined;
		inst.key = undefined;
		// Stop alerting while hidden/removed; a still-due reminder re-fires when the key reappears.
		inst.alerting = false;
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): void {
		const inst = this.instances.get(ev.action.id);
		if (!inst) return;
		inst.soundFile = ev.payload.settings.soundFile;
		inst.count = parseCount(ev.payload.settings.count);
		inst.lastImage = undefined; // redraw so a changed count shows straight away
		const minute = parseMinute(ev.payload.settings.minute);
		if (minute !== inst.minute) {
			this.reschedule(inst, minute);
			this.tick(inst);
		}
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		const inst = this.instances.get(ev.action.id);
		if (!inst) return;
		inst.longFired = false;
		clearTimeout(inst.holdTimer);
		inst.holdTimer = setTimeout(() => {
			inst.longFired = true;
			this.snooze(inst);
		}, LONG_PRESS_MS);
	}

	override onKeyUp(ev: KeyUpEvent<Settings>): void {
		const inst = this.instances.get(ev.action.id);
		if (!inst) return;
		clearTimeout(inst.holdTimer);
		if (inst.longFired) return; // already handled as a snooze

		if (inst.alerting) {
			// Short press while alerting: acknowledged, wait for the next hourly slot.
			inst.alerting = false;
			inst.nextDue = nextHourlySlot(new Date(), inst.minute);
			this.showToast(inst, messageImage("#15803d", "NICE!", `Next ${formatTime(inst.nextDue)}`));
		} else if (inst.previewUntil && Date.now() < inst.previewUntil) {
			// Press during a preview just ends it.
			inst.previewUntil = undefined;
		} else {
			// Not due: preview what the reminder looks and sounds like (the schedule is untouched).
			inst.previewUntil = Date.now() + PREVIEW_MS;
			inst.flashOn = true;
			inst.toast = undefined;
			playAlert(inst.soundFile);
		}
		this.tick(inst);
	}

	/** Long press: +5 minutes. Silences an active reminder, or pushes back a pending one. */
	private snooze(inst: Instance): void {
		const now = Date.now();
		inst.previewUntil = undefined;
		if (inst.alerting) {
			inst.alerting = false;
			inst.nextDue = new Date(now + SNOOZE_MS);
		} else {
			inst.nextDue = new Date(inst.nextDue.getTime() + SNOOZE_MS);
		}
		this.showToast(inst, messageImage("#b45309", "+5 MIN", `At ${formatTime(inst.nextDue)}`));
		this.tick(inst);
	}

	private reschedule(inst: Instance, minute: number): void {
		inst.minute = minute;
		inst.alerting = false;
		inst.nextDue = nextHourlySlot(new Date(), minute);
	}

	private showToast(inst: Instance, image: string): void {
		inst.toast = { image, until: Date.now() + TOAST_MS };
	}

	private tick(inst: Instance): void {
		const now = Date.now();

		if (!inst.alerting && now >= inst.nextDue.getTime()) {
			inst.alerting = true;
			inst.flashOn = true;
			inst.lastBeep = 0;
			inst.toast = undefined;
			inst.previewUntil = undefined; // a real reminder takes over from any preview
		}

		let image: string;
		if (inst.alerting) {
			if (now - inst.lastBeep >= REBEEP_MS) {
				inst.lastBeep = now;
				playAlert(inst.soundFile);
			}
			inst.flashOn = !inst.flashOn;
			image = alertImage(inst.flashOn, inst.count);
		} else if (inst.previewUntil && now < inst.previewUntil) {
			inst.flashOn = !inst.flashOn;
			image = alertImage(inst.flashOn, inst.count);
		} else if (inst.toast && now < inst.toast.until) {
			image = inst.toast.image;
		} else {
			inst.toast = undefined;
			image = idleImage(formatTime(inst.nextDue));
		}

		if (image !== inst.lastImage && inst.key) {
			inst.lastImage = image;
			inst.key.setImage(image).catch((err) => streamDeck.logger.error(`setImage failed: ${String(err)}`));
		}
	}
}
