// @flow

import type { WorkerOverridesConstants } from "../../common/types";

const overrides: {
    constants: WorkerOverridesConstants,
    components: {
        [key: string]: any,
    },
    util: { [key: string]: any },
    views: { [key: string]: any },
} = {
    constants: {
        COMPOSITE_WEIGHTS: {},
        PLAYER_STATS_TABLES: {},
        POSITION_COUNTS: {},
        POSITIONS: [],
        RATINGS: [],
        TEAM_STATS_TABLES: {},
        TIME_BETWEEN_GAMES: "",
    },
    components: {},
    util: {},
    views: {},
};

export default overrides;
