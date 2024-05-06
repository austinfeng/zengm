import type { View } from "../../../common/types";
import useTitleBar from "../../hooks/useTitleBar";
import { StatGraph, type TooltipData } from "../PlayerGraphs/ScatterPlot";
import useDropdownOptions, {
	type DropdownOption,
} from "../../hooks/useDropdownOptions";
import realtimeUpdate from "../../util/realtimeUpdate";
import { getCols, helpers, toWorker } from "../../util";
import { groupByUnique } from "../../../common/utils";
import type { Col } from "../../components/DataTable";
import classNames from "classnames";

const addPrefixForStat = (statType: string, stat: string) => {
	if (statType === "standings") {
		const overrides: Record<string, string | undefined> = {
			otl: "OTL",
			won: "W",
			lost: "L",
			tied: "T",
			winp: "%",
			pts: "PTS",
			ptsPct: "PTS%",
		};

		const suffixes = ["Home", "Away", "Conf", "Div"];
		for (const suffix of suffixes) {
			if (stat.endsWith(suffix)) {
				const statNoSuffix = stat.replace(suffix, "");
				return overrides[statNoSuffix] ?? statNoSuffix;
			}
		}

		return overrides[stat] ?? stat;
	}

	if (statType === "Opponent" && stat.startsWith("opp")) {
		return `stat:${stat.charAt(3).toLowerCase()}${stat.slice(4)}`;
	}

	return `stat:${stat.endsWith("Max") ? stat.replace("Max", "") : stat}`;
};

const getStatsWithLabels = (
	stats: string[],
	statType: string,
	prefixOpp: boolean,
) => {
	return getCols(stats.map(stat => addPrefixForStat(statType, stat))).map(
		(col, i) => {
			if (prefixOpp && stats[i].startsWith("opp")) {
				col.title = `opp${col.title}`;
				if (col.desc) {
					col.desc = `Opponent ${col.desc}`;
				}
			}

			return col;
		},
	);
};

const getStatFromTeam = (t: any, stat: string, statType: string) => {
	if (statType == "standings") {
		return t.seasonAttrs[stat] ?? 0;
	}
	return t.stats[stat];
};

const getFormattedStat = (value: number, stat: string, statType: string) => {
	return helpers.roundStat(value, stat, statType === "totals");
};

type ViewProps = View<"teamGraphs">;

const GraphCreation = <Team extends ViewProps["teamsX"][number]>({
	stat,
	statType,
	teams,
}: {
	teams: [Team[], Team[]];
	stat: [string, string];
	statType: [string, string];
	minGames: number;
}) => {
	const teamsYByTid = groupByUnique<any>(teams[1], "tid");

	const data: TooltipData[] = [];
	for (const t of teams[0]) {
		const t2 = teamsYByTid[t.tid];

		data.push({
			x: getStatFromTeam(t, stat[0], statType[0]),
			y: getStatFromTeam(t2, stat[1], statType[1]),
			row: t,
		});
	}

	const titleX = getStatsWithLabels([stat[0]], statType[0], true)[0];
	const titleY = getStatsWithLabels([stat[1]], statType[1], true)[0];
	const descShort: [string, string] = [titleX.title, titleY.title];

	return (
		<StatGraph<Team>
			data={data}
			descShort={descShort}
			descLong={[titleX.desc, titleY.desc]}
			getImageUrl={t => t.seasonAttrs.imgURLSmall ?? t.seasonAttrs.imgURL}
			getLink={t =>
				helpers.leagueUrl([
					"roster",
					`${t.abbrev}_${t.tid}`,
					t.seasonAttrs.season,
				])
			}
			getTooltipTitle={t => `${t.seasonAttrs.region} ${t.seasonAttrs.name}`}
			renderTooltip={(value, p, i) => {
				return (
					<div key={i}>
						{getFormattedStat(value, stat[i], statType[i])} {descShort[i]}
					</div>
				);
			}}
			stat={stat}
			statType={statType}
		/>
	);
};

type AxisState = {
	stat: string;
	statType: string;
	playoffs: string;
	season: number;
};

// For responsive ones, render the last one, which should be the longest
const OptionDropdown = ({ value }: { value: DropdownOption }) => {
	return (
		<option value={value.key}>
			{Array.isArray(value.value) ? value.value.at(-1)!.text : value.value}
		</option>
	);
};

type UpdateUrlParam = {
	seasonX?: number;
	seasonY?: number;
	statTypeX?: string;
	statTypeY?: string;
	playoffsX?: string;
	playoffsY?: string;
	statX?: string;
	statY?: string;
	minGames?: string;
};

const PickStat = ({
	className,
	label,
	state,
	updateUrl,
	stats,
}: {
	className?: string;
	label: "x" | "y";
	state: AxisState;
	updateUrl: (state: UpdateUrlParam) => void;
	stats: string[];
}) => {
	const statsXEnriched = getStatsWithLabels(
		stats,
		state.statType,
		false,
	) as (Col & {
		stat: string;
	})[];
	for (let i = 0; i < statsXEnriched.length; i++) {
		statsXEnriched[i].stat = stats[i];
	}

	const seasons = useDropdownOptions("seasons");
	const statTypes = [
		// Keep in sync with statTypes in TeamGraphs.ts
		...useDropdownOptions("teamOpponentAdvanced"),
		{ key: "standings", value: "Standings" },
		{ key: "powerRankings", value: "Power Rankings" },
		{ key: "finances", value: "Finances" },
	];
	const playoffs = useDropdownOptions("playoffs");

	const xyCapital = label === "x" ? "X" : "Y";

	return (
		<div
			className={classNames("input-group", className)}
			style={{
				maxWidth: 600,
			}}
		>
			<span className="input-group-text">
				{label}
				<span className="d-none d-sm-inline">-axis</span>
			</span>
			<select
				className="form-select"
				value={state.season}
				onChange={event =>
					updateUrl({
						[`season${xyCapital}`]:
							event.target.value === "career"
								? "career"
								: parseInt(event.target.value),
					})
				}
				style={{
					maxWidth: 70,
				}}
			>
				<option value="career">Career</option>
				{seasons.map(x => {
					return <OptionDropdown key={x.key} value={x} />;
				})}
			</select>
			<select
				className="form-select"
				value={state.statType}
				onChange={async event => {
					const newStatType = event.target.value;
					const { stat } = await toWorker("main", "getTeamGraphStat", {
						statType: newStatType,
						stat: state.stat,
					});
					await updateUrl({
						[`stat${xyCapital}`]: stat,
						[`statType${xyCapital}`]: newStatType,
					});
				}}
				style={{
					maxWidth: 130,
				}}
			>
				{statTypes.map(x => {
					return <OptionDropdown key={x.key} value={x} />;
				})}
			</select>
			<select
				className="form-select"
				value={state.stat}
				onChange={event =>
					updateUrl({
						[`stat${xyCapital}`]: event.target.value,
					})
				}
			>
				{statsXEnriched.map((x, i) => {
					return (
						<option key={i} value={x.stat} title={x.desc}>
							{x.title}
							{x.desc !== undefined ? ` (${x.desc})` : null}
						</option>
					);
				})}
			</select>
			<select
				className="form-select"
				value={state.playoffs}
				onChange={event =>
					updateUrl({ [`playoffs${xyCapital}`]: event.target.value })
				}
				style={{
					maxWidth: 130,
				}}
			>
				{playoffs.map(x => {
					return <OptionDropdown key={x.key} value={x} />;
				})}
			</select>
			<button
				className="btn btn-secondary"
				onClick={async () => {
					const { stat, statType } = await toWorker(
						"main",
						"getTeamGraphStat",
						{},
					);

					await updateUrl({
						[`stat${xyCapital}`]: stat,
						[`statType${xyCapital}`]: statType,
					});
				}}
			>
				<span className="d-none d-sm-inline">Random stat</span>
				<span className="d-sm-none">Rand</span>
			</button>
		</div>
	);
};

const TeamGraphs = ({
	playoffsX,
	playoffsY,
	seasonX,
	seasonY,
	statTypeX,
	statTypeY,
	statsX,
	statsY,
	statX,
	statY,
	teamsX,
	teamsY,
}: ViewProps) => {
	useTitleBar({
		title: "Team Graphs",
		dropdownView: "team_graphs",
	});

	const updateUrl = async (toUpdate: UpdateUrlParam) => {
		const url = helpers.leagueUrl([
			"team_graphs",
			toUpdate.seasonX ?? seasonX,
			toUpdate.statTypeX ?? statTypeX,
			toUpdate.playoffsX ?? playoffsX,
			toUpdate.statX ?? statX,
			toUpdate.seasonY ?? seasonY,
			toUpdate.statTypeY ?? statTypeY,
			toUpdate.playoffsY ?? playoffsY,
			toUpdate.statY ?? statY,
		]);

		await realtimeUpdate([], url, undefined, true);
	};

	if (location.pathname.endsWith("/team_graphs")) {
		// Set initial URL, for ctrl+r and reloading
		updateUrl({});
	}

	return (
		<>
			<div className="d-flex gap-3 align-items-start mb-3 flex-wrap">
				<div>
					<PickStat
						className="mb-3"
						label="x"
						stats={statsX}
						state={{
							season: seasonX,
							statType: statTypeX,
							playoffs: playoffsX,
							stat: statX,
						}}
						updateUrl={updateUrl}
					/>
					<PickStat
						label="y"
						stats={statsY}
						state={{
							season: seasonY,
							statType: statTypeY,
							playoffs: playoffsY,
							stat: statY,
						}}
						updateUrl={updateUrl}
					/>
				</div>
				<div className="d-flex d-lg-block">
					<button
						className="btn btn-secondary me-3 me-lg-0 mb-lg-3"
						onClick={() => {
							updateUrl({
								seasonX: seasonY,
								seasonY: seasonX,
								statTypeX: statTypeY,
								statTypeY: statTypeX,
								playoffsX: playoffsY,
								playoffsY: playoffsX,
								statX: statY,
								statY: statX,
							});
						}}
					>
						Swap x and y{<span className="d-none d-sm-inline"> axes</span>}
					</button>
				</div>
			</div>
			<div>
				<GraphCreation
					teams={[teamsX, teamsY]}
					stat={[statX, statY]}
					statType={[statTypeX, statTypeY]}
					minGames={0}
				/>
			</div>
		</>
	);
};

export default TeamGraphs;