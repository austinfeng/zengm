import { g, logEvent, helpers } from "../../util";
import type { Team } from "../../../common/types";
import generate from "./generate";
import genSeasonRow from "./genSeasonRow";
import genStatsRow from "./genStatsRow";
import { draft, league, finances } from "..";
import { idb } from "../../db";
import { PHASE, PLAYER } from "../../../common";

const addNewTeamToExistingLeague = async (
	teamInfo: {
		did: number;
		region: string;
		name: string;
		abbrev: string;
		pop: number;
		imgURL: string | undefined;
		firstSeasonAfterExpansion?: number;
		tid?: number;
	},
	{
		expansionDraft,
		fromScheduledEvent,
	}: {
		expansionDraft?: boolean;
		fromScheduledEvent?: boolean;
	} = {},
): Promise<Team> => {
	const div = g.get("divs", Infinity).find(d => d.did === teamInfo.did);
	if (!div) {
		throw new Error("Invalid division");
	}
	const cid = div.cid;

	const prevT =
		teamInfo.tid !== undefined
			? await idb.cache.teams.get(teamInfo.tid)
			: undefined;

	if (prevT && !prevT.disabled) {
		throw new Error(
			`Attempting to add new team with tid ${prevT.tid} but there is an existing active team with the same tid`,
		);
	}

	const popRanks = helpers.getPopRanks([
		...(await idb.cache.teams.getAll()),
		{
			tid: -1,
			pop: teamInfo.pop,
		},
	]);
	const popRank = popRanks[popRanks.length - 1];

	const t = prevT
		? {
				...prevT,
				cid,
				...teamInfo,
				disabled: false,
		  }
		: generate({
				...teamInfo,
				tid: g.get("numTeams"),
				cid,
				popRank,
		  });
	await idb.cache.teams.put(t);

	if (g.get("phase") <= PHASE.PLAYOFFS) {
		const teamSeason = genSeasonRow(t);
		const teamStats = genStatsRow(t.tid);
		await idb.cache.teamSeasons.put(teamSeason);
		await idb.cache.teamStats.put(teamStats);
	}

	const allTeams = await idb.cache.teams.getAll();
	await league.setGameAttributes({
		numActiveTeams: allTeams.filter(t => !t.disabled).length,
		numTeams: allTeams.length,
		teamInfoCache: allTeams.map(t => ({
			abbrev: t.abbrev,
			disabled: t.disabled,
			imgURL: t.imgURL,
			name: t.name,
			region: t.region,
		})),
	});

	await draft.createTeamPicks(t.tid);

	// Add new draft prospects to draft classes
	const draftClassTargetSize = Math.round(
		(g.get("numDraftRounds") * g.get("numActiveTeams") * 7) / 6,
	);
	const draftProspects = await idb.cache.players.indexGetAll(
		"playersByTid",
		PLAYER.UNDRAFTED,
	);

	const dpOffset = g.get("phase") > PHASE.DRAFT ? 1 : 0;
	for (let i = 0; i < 3; i++) {
		const draftYear = g.get("season") + dpOffset + i;

		const numPlayersAlreadyInDraftClass = draftProspects.filter(
			p => p.draft.year === draftYear,
		).length;

		const numNeeded = helpers.bound(
			draftClassTargetSize - numPlayersAlreadyInDraftClass,
			0,
			g.get("numDraftRounds"),
		);
		if (numNeeded > 0) {
			// Generate scrubs only!
			await draft.genPlayers(draftYear, undefined, numNeeded, true);
		}
	}

	await finances.updateRanks(["budget"]);

	logEvent({
		text: `A new team called the ${t.region} ${t.name} was created${
			expansionDraft ? " in an expansion draft" : ""
		}.`,
		type: "newTeam",
		tids: [t.tid],
		showNotification: false,
	});

	// Manually adding a new team can mess with scheduled events, because they are indexed on tid. Let's try to adjust them.
	if (!fromScheduledEvent && !prevT) {
		// This means a new team was added, with a newly generated tid. Increment tids in future scheduled events to account for this
		const scheduledEvents = await idb.getCopies.scheduledEvents();
		for (const scheduledEvent of scheduledEvents) {
			if (scheduledEvent.season < g.get("season")) {
				await idb.cache.scheduledEvents.delete(scheduledEvent.id);
			} else if (scheduledEvent.type === "expansionDraft") {
				let updated;
				for (const t2 of scheduledEvent.info.teams) {
					if (typeof t2.tid === "number" && t.tid <= t2.tid) {
						t2.tid += 1;
						updated = true;
					}
				}
				if (updated) {
					await idb.cache.scheduledEvents.put(scheduledEvent);
				}
			} else if (
				scheduledEvent.type == "contraction" ||
				scheduledEvent.type === "teamInfo"
			) {
				if (t.tid <= scheduledEvent.info.tid) {
					scheduledEvent.info.tid += 1;
					await idb.cache.scheduledEvents.put(scheduledEvent);
				}
			}
		}
	}

	return t;
};

export default addNewTeamToExistingLeague;
