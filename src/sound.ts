import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import streamDeck from "@elgato/streamdeck";

// The bundle lives in <plugin>.sdPlugin/bin/plugin.js; the sound is in <plugin>.sdPlugin/sounds/.
const alertPath = fileURLToPath(new URL("../sounds/alert.wav", import.meta.url));

/** Play the bundled alert sound through the OS. Fire and forget; never throws. */
export function playAlert(): void {
	try {
		let child;
		if (process.platform === "win32") {
			const escaped = alertPath.replace(/'/g, "''");
			child = spawn(
				"powershell.exe",
				[
					"-NoProfile",
					"-NonInteractive",
					"-WindowStyle",
					"Hidden",
					"-Command",
					`(New-Object System.Media.SoundPlayer '${escaped}').PlaySync()`,
				],
				{ windowsHide: true, stdio: "ignore" },
			);
		} else if (process.platform === "darwin") {
			child = spawn("afplay", [alertPath], { stdio: "ignore" });
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
