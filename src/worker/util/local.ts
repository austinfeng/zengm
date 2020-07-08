import type { Local } from "../../common/types";

// These variables are transient and will be reset every refresh. See lock.js for more.
const defaultLocal: Local = {
	autoPlayUntil: undefined,
	autoSave: true,
	fantasyDraftResults: [],
	goldUntil: Infinity, // Default is to assume Gold, until told otherwise by server
	mailingList: false, // Default, until told otherwise by server
	leagueLoaded: false,
	phaseText: "",
	playerNames: undefined,
	playingUntilEndOfRound: false,
	statusText: "Idle",
	unviewedSeasonSummary: false, // Set to true when a live game sim of the final game prevents an automatic redirect to the season summary page
};
const local: Local & {
	reset: () => void;
} = {
	autoPlayUntil: defaultLocal.autoPlayUntil,
	autoSave: defaultLocal.autoSave,
	fantasyDraftResults: defaultLocal.fantasyDraftResults,
	goldUntil: defaultLocal.goldUntil,
	leagueLoaded: defaultLocal.leagueLoaded,
	mailingList: defaultLocal.mailingList,
	phaseText: defaultLocal.phaseText,
	playerNames: defaultLocal.playerNames,
	playingUntilEndOfRound: defaultLocal.playingUntilEndOfRound,
	statusText: defaultLocal.statusText,
	unviewedSeasonSummary: defaultLocal.unviewedSeasonSummary,
	reset: () => {
		// These variables will be reset if the user switches leagues
		local.autoPlayUntil = defaultLocal.autoPlayUntil;
		local.autoSave = defaultLocal.autoSave;
		local.fantasyDraftResults = defaultLocal.fantasyDraftResults;
		local.leagueLoaded = defaultLocal.leagueLoaded;
		local.phaseText = defaultLocal.phaseText;
		local.playerNames = defaultLocal.playerNames;
		local.playingUntilEndOfRound = defaultLocal.playingUntilEndOfRound;
		local.statusText = defaultLocal.statusText;
		local.unviewedSeasonSummary = defaultLocal.unviewedSeasonSummary;

		// Don't reset goldUntil because that persists across leagues. Probably it shouldn't be in this file, but should
		// be somewhere else (like how g used to have some variables not persisted to database).
	},
};

export default local;
