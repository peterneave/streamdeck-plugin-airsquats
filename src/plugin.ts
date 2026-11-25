import streamDeck from "@elgato/streamdeck";

import { AirSquats } from "./actions/air-squats";

streamDeck.actions.registerAction(new AirSquats());

streamDeck.connect();
