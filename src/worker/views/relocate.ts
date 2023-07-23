import { g, helpers } from "../util";
import getTeamInfos from "../../common/getTeamInfos";
import { idb } from "../db";
import geographicCoordinates from "../../common/geographicCoordinates";
import { kmeansFixedSize, sortByDivs } from "../core/team/cluster";

const getRealignInfo = (
	teams: {
		tid: number;
		cid: number;
		did: number;
		region: string;
		name: string;
	}[],
	override: {
		tid: number;
		region: string;
		name: string;
	},
) => {
	const current: {
		tid: number;
		region: string;
		name: string;
	}[][][] = [];

	for (const t of teams) {
		if (!current[t.cid]) {
			current[t.cid] = [];
		}
		if (!current[t.cid][t.did]) {
			current[t.cid][t.did] = [];
		}

		const t2 = t.tid === override.tid ? override : t;

		current[t.cid][t.did].push({
			tid: t2.tid,
			region: t2.region,
			name: t2.name,
		});
	}

	return current;
};

const updateRelocate = async () => {
	const autoRelocate = g.get("autoRelocate");
	if (!autoRelocate) {
		// https://stackoverflow.com/a/59923262/786644
		const returnValue = {
			redirectUrl: helpers.leagueUrl([]),
		};
		return returnValue;
	}

	const t = await idb.cache.teams.get(autoRelocate.tid);
	if (!t) {
		throw new Error("Invalid tid");
	}

	const currentTeam = {
		tid: t.tid,
		abbrev: t.abbrev,
		region: t.region,
		name: t.name,
		imgURL: t.imgURL,
		pop: t.pop,
		colors: t.colors,
		jersey: t.jersey,
	};

	const newTeam: typeof currentTeam = getTeamInfos([
		{
			tid: t.tid,
			cid: -1,
			did: -1,
			abbrev: autoRelocate.abbrev,
		},
	])[0];

	const teams = (await idb.cache.teams.getAll()).filter(t => !t.disabled);

	// We can only automatically realign divisions if we know where every region is
	const canRealign = teams.every(
		t => !!geographicCoordinates[t.region] || t.tid === autoRelocate.tid,
	);
	let realignInfo;
	if (canRealign) {
		const current = getRealignInfo(teams, newTeam);
		const realigned: typeof current = [];

		const divs = g.get("divs");
		const numTeamsPerDiv = divs.map(
			div => teams.filter(t => t.did === div.did).length,
		);

		const coordinates = teams.map(temp => {
			const t = temp.tid === newTeam.tid ? newTeam : temp;
			return [
				geographicCoordinates[t.region].latitude,
				geographicCoordinates[t.region].longitude,
			] as [number, number];
		});

		const clusters = sortByDivs(
			kmeansFixedSize(coordinates, numTeamsPerDiv),
			divs,
			numTeamsPerDiv,
		);
		console.log("clusters", clusters);

		realignInfo = {
			current,
			realigned,
		};
	}

	return {
		currentTeam,
		godMode: g.get("godMode"),
		newTeam,
		realignInfo,
	};
};

export default updateRelocate;