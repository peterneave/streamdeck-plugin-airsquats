import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

import streamDeck from "@elgato/streamdeck";

// The bundle lives in <plugin>.sdPlugin/bin/plugin.js; the sound is in <plugin>.sdPlugin/sounds/.
const defaultSound = fileURLToPath(new URL("../sounds/alert.wav", import.meta.url));

/** Custom sounds longer than this are cut off, so a full song doesn't play over your squats. */
const MAX_CUSTOM_MS = 10_000;

/**
 * Turn the Property Inspector's file setting into a real path.
 * sdpi-file stores `C:\fakepath\` followed by the URI-encoded path.
 */
export function parseSoundSetting(value: unknown): string | undefined {
	if (typeof value !== "string" || value.trim() === "") return undefined;
	const stripped = value.replace(/^C:\\fakepath\\/, "");
	try {
		return decodeURIComponent(stripped);
	} catch {
		return stripped;
	}
}

const psQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;

function windowsCommand(file: string, custom: boolean): string {
	if (!custom || extname(file).toLowerCase() === ".wav") {
		return `(New-Object System.Media.SoundPlayer ${psQuote(file)}).PlaySync()`;
	}
	// MediaPlayer handles mp3, wma, aac, etc. Wait for it to load, then play up to the cap.
	return [
		"Add-Type -AssemblyName PresentationCore",
		"$p = New-Object System.Windows.Media.MediaPlayer",
		`$p.Open([Uri]::new(${psQuote(file)}))`,
		"$p.Play()",
		"$i = 0; while (-not $p.NaturalDuration.HasTimeSpan -and $i -lt 50) { Start-Sleep -Milliseconds 100; $i++ }",
		`if ($p.NaturalDuration.HasTimeSpan) { Start-Sleep -Milliseconds ([Math]::Min([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds + 200, ${MAX_CUSTOM_MS})) }`,
		"$p.Close()",
	].join("; ");
}

/**
 * Play the user's chosen sound, or the bundled default if none is set or the file is missing.
 * Fire and forget; never throws.
 */
export function playAlert(customSetting?: unknown): void {
	try {
		let file = defaultSound;
		let custom = false;
		const requested = parseSoundSetting(customSetting);
		if (requested) {
			if (existsSync(requested)) {
				file = requested;
				custom = true;
			} else {
				streamDeck.logger.warn(`Custom sound not found, using default: ${requested}`);
			}
		}

		let child: ChildProcess;
		if (process.platform === "win32") {
			child = spawn(
				"powershell.exe",
				["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", windowsCommand(file, custom)],
				{ windowsHide: true, stdio: "ignore" },
			);
		} else if (process.platform === "darwin") {
			const player = spawn("afplay", [file], { stdio: "ignore" });
			child = player;
			if (custom) setTimeout(() => player.kill(), MAX_CUSTOM_MS).unref();
		} else {
			streamDeck.logger.warn(`Sound playback is not supported on ${process.platform}.`);
			return;
		}
		child.on("error", (err) => streamDeck.logger.error(`Failed to play alert: ${err.message}`));
		child.unref();
	} catch (err) {
		streamDeck.logger.error(`Failed to play alert: ${String(err)}`);
	}
}
