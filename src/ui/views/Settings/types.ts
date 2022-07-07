export type Key =
	| "numGames"
	| "numGamesDiv"
	| "numGamesConf"
	| "numPeriods"
	| "quarterLength"
	| "minRosterSize"
	| "maxRosterSize"
	| "numGamesPlayoffSeries"
	| "numPlayoffByes"
	| "draftType"
	| "numSeasonsFutureDraftPicks"
	| "draftAges"
	| "salaryCap"
	| "minPayroll"
	| "luxuryPayroll"
	| "luxuryTax"
	| "minContract"
	| "maxContract"
	| "minContractLength"
	| "maxContractLength"
	| "salaryCapType"
	| "budget"
	| "aiTradesFactor"
	| "playersRefuseToNegotiate"
	| "injuryRate"
	| "tragicDeathRate"
	| "brotherRate"
	| "sonRate"
	| "forceRetireAge"
	| "homeCourtAdvantage"
	| "rookieContractLengths"
	| "rookiesCanRefuse"
	| "allStarGame"
	| "foulRateFactor"
	| "foulsNeededToFoulOut"
	| "foulsUntilBonus"
	| "threePointers"
	| "pace"
	| "threePointTendencyFactor"
	| "threePointAccuracyFactor"
	| "twoPointAccuracyFactor"
	| "blockFactor"
	| "stealFactor"
	| "turnoverFactor"
	| "orbFactor"
	| "challengeNoDraftPicks"
	| "challengeNoFreeAgents"
	| "challengeNoRatings"
	| "challengeNoTrades"
	| "challengeLoseBestPlayer"
	| "challengeFiredLuxuryTax"
	| "challengeFiredMissPlayoffs"
	| "challengeThanosMode"
	| "realPlayerDeterminism"
	| "repeatSeason"
	| "ties"
	| "otl"
	| "spectator"
	| "elam"
	| "elamASG"
	| "elamMinutes"
	| "elamPoints"
	| "playerMoodTraits"
	| "numPlayersOnCourt"
	| "numDraftRounds"
	| "tradeDeadline"
	| "autoDeleteOldBoxScores"
	| "difficulty"
	| "stopOnInjuryGames"
	| "stopOnInjury"
	| "aiJerseyRetirement"
	| "tiebreakers"
	| "pointsFormula"
	| "equalizeRegions"
	| "noStartingInjuries"
	| "realDraftRatings"
	| "randomization"
	| "realStats"
	| "hideDisabledTeams"
	| "hofFactor"
	| "injuries"
	| "inflationAvg"
	| "inflationMax"
	| "inflationMin"
	| "inflationStd"
	| "playoffsByConf"
	| "playoffsNumTeamsDiv"
	| "playoffsReseed"
	| "playerBioInfo"
	| "playIn"
	| "numPlayersDunk"
	| "numPlayersThree"
	| "fantasyPoints"
	| "tragicDeaths"
	| "goatFormula"
	| "draftPickAutoContract"
	| "draftPickAutoContractPercent"
	| "draftPickAutoContractRounds"
	| "dh"
	| "draftLotteryCustomNumPicks"
	| "draftLotteryCustomChances";

export type Category =
	| "New League"
	| "General"
	| "Schedule"
	| "Standings"
	| "Playoffs"
	| "Teams"
	| "Draft"
	| "Finances"
	| "Inflation"
	| "Contracts"
	| "Rookie Contracts"
	| "Events"
	| "Injuries"
	| "Game Simulation"
	| "Elam Ending"
	| "Challenge Modes"
	| "Game Modes"
	| "Players"
	| "UI"
	| "All-Star Contests";

export type FieldType =
	| "bool"
	| "float"
	| "float1000"
	| "floatOrNull"
	| "int"
	| "intOrNull"
	| "jsonString"
	| "string"
	| "rangePercent"
	| "floatValuesOrCustom"
	| "custom";

export type Decoration = "currency" | "percent";

export type Values = {
	key: string;
	value: string;
}[];
