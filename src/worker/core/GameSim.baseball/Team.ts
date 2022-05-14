import orderBy from "lodash-es/orderBy";
import type { Position } from "../../../common/types.baseball";
import { getStartingPitcher } from "./getStartingPitcher";
import type { PlayerGameSim, TeamGameSim } from "./types";

type GamePositions<DH extends boolean> =
	| Exclude<Position, "SP" | "RP" | "DH">
	| "P"
	| (DH extends true ? "DH" : never);

type PlayerInGame<DH extends boolean> = {
	p: PlayerGameSim;
	battingOrder: number;
	pos: GamePositions<DH>;
};

const NUM_BATTERS_PER_SIDE = 9;

class Team<DH extends boolean> {
	t: TeamGameSim;
	dh: DH;
	playersByPid: Record<number, PlayerGameSim>;
	playersInGame: Record<number, PlayerInGame<DH>>;
	playersInGameByPos: Record<GamePositions<DH>, PlayerInGame<DH>>;
	playersInGameByBattingOrder: [
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
	];

	atBat: number;
	subIndex: number;
	saveEligibleWhenEnteredGame: boolean;

	constructor(t: TeamGameSim, dh: DH) {
		this.t = t;
		this.dh = dh;

		this.playersInGame = {};

		// Starting pitcher
		const startingPitcher = getStartingPitcher(this.t.depth.P);

		this.playersInGame = this.getStartingPlayersInGame(startingPitcher);

		this.atBat = -1;
		this.subIndex = -1;
		this.saveEligibleWhenEnteredGame = false;

		this.playersByPid = {} as any;
		for (const p of this.t.player) {
			this.playersByPid[p.id] = p;
		}

		this.playersInGameByPos = {} as any;
		this.playersInGameByBattingOrder = [] as any;
		this.rebuildIndexes();
	}

	getStartingPlayersInGame(startingPitcher: PlayerGameSim) {
		const playersInGame: Team<DH>["playersInGame"] = {};

		const lineup = this.dh ? this.t.depth.L : this.t.depth.LP;
		const roster = this.dh ? this.t.depth.D : this.t.depth.DP;

		// -1 if not found
		const pitcherBattingOrder = lineup.findIndex(p => p.id === -1);

		playersInGame[startingPitcher.id] = {
			p: startingPitcher,
			battingOrder: pitcherBattingOrder,
			pos: "P",
		};

		const numPositionPlayers = this.dh
			? NUM_BATTERS_PER_SIDE
			: NUM_BATTERS_PER_SIDE - 1;
		const bench = roster.slice(numPositionPlayers);
		for (let i = 0; i < numPositionPlayers; i++) {
			let p = lineup[i];
			if (!p) {
				throw new Error("Not enough players");
			}

			if (p.id === -1) {
				// Pitcher was already handled above
				continue;
			}

			const pos = p.lineupPos as GamePositions<DH>;

			if (pos === "P") {
				throw new Error("Should never happen");
			}

			if (playersInGame[p.id]) {
				// Player is already in game at another position (maybe pitcher), pick someone off the bench
				const sortedBench = orderBy(
					bench,
					[p => (p.injured ? 1 : 0), p => p.ovrs[pos]],
					["asc", "desc"],
				);
				const p2 = sortedBench.find(p => !playersInGame[p.id]);
				if (!p2) {
					throw new Error("Not enough players");
				} else {
					p = p2;
				}
			}

			if (p.id === -1) {
				playersInGame[startingPitcher.id] = {
					p: startingPitcher,
					battingOrder: i,
					pos: "P",
				};
			} else {
				playersInGame[p.id] = {
					p,
					battingOrder: i,
					pos,
				};
			}
		}

		return playersInGame;
	}

	rebuildIndexes() {
		for (const playerInGame of Object.values(this.playersInGame)) {
			this.playersInGameByPos[playerInGame.pos] = playerInGame;
			if (playerInGame.battingOrder >= 0) {
				this.playersInGameByBattingOrder[playerInGame.battingOrder] =
					playerInGame;

				playerInGame.p.battingOrder = playerInGame.battingOrder;
			}

			if (playerInGame.p.subIndex === undefined) {
				this.subIndex += 1;
				playerInGame.p.subIndex = this.subIndex;
			}

			// If players can switch positions mid game, this doens't make sense. Would need to store an array to track all positions
			playerInGame.p.pos = playerInGame.pos;
		}
	}

	getBatter() {
		return this.playersInGameByBattingOrder[this.atBat];
	}

	getOnDeck() {
		return this.playersInGameByBattingOrder[
			(this.atBat + 1) % NUM_BATTERS_PER_SIDE
		];
	}

	getPitcher() {
		return this.playersInGameByPos.P;
	}

	advanceToNextBatter() {
		this.atBat = (this.atBat + 1) % NUM_BATTERS_PER_SIDE;
	}

	moveToPreviousBatter() {
		this.atBat -= 1;
		if (this.atBat < 0) {
			this.atBat = NUM_BATTERS_PER_SIDE - 1;
		}
	}
}

export default Team;