// @flow

import { helpers as commonHelpers } from "../../common";
import local from "./local";

const leagueUrl = (components: (number | string)[]): string => {
    const lid = local.state.lid;
    if (typeof lid !== "number") {
        return "/";
    }

    return commonHelpers.leagueUrlFactory(lid, components);
};

/**
 * Format a number as an integer with commas in the thousands places.
 */
const numberWithCommas = (x: number | string): string => {
    return parseFloat(x)
        .toFixed()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const plusMinus = (arg: number, d: number): string => {
    if (Number.isNaN(arg)) {
        return "";
    }
    return (arg > 0 ? "+" : "") + arg.toFixed(d);
};

const roundsWonText = (
    playoffRoundsWon: number,
    numPlayoffRounds: number,
    numConfs: number,
): string => {
    const playoffsByConference = numConfs === 2;

    if (playoffRoundsWon === numPlayoffRounds) {
        return "League champs";
    }
    if (playoffRoundsWon === numPlayoffRounds - 1) {
        return playoffsByConference ? "Conference champs" : "Made finals";
    }
    if (playoffRoundsWon === numPlayoffRounds - 2) {
        return playoffsByConference
            ? "Made conference finals"
            : "Made semifinals";
    }
    if (playoffRoundsWon >= 1) {
        return `Made ${commonHelpers.ordinal(playoffRoundsWon + 1)} round`;
    }
    if (playoffRoundsWon === 0) {
        return "Made playoffs";
    }
    return "";
};

const roundOverrides =
    process.env.SPORT === "basketball"
        ? {
              gp: "none",
              gs: "none",
              gmsc: "oneDecimalPlace",
              fgp: "oneDecimalPlace",
              tpp: "oneDecimalPlace",
              ftp: "oneDecimalPlace",
              ws48: "roundWinp",
              pm: "plusMinus",
              ftpfga: "roundWinp",
          }
        : {
              cmpPct: "oneDecimalPlace",
              qbRat: "oneDecimalPlace",
              rusYdsPerAtt: "oneDecimalPlace",
              recYdsPerAtt: "oneDecimalPlace",
              fgPct: "oneDecimalPlace",
              xpPct: "oneDecimalPlace",
              pntYdsPerAtt: "oneDecimalPlace",
              krYdsPerAtt: "oneDecimalPlace",
              prYdsPerAtt: "oneDecimalPlace",
          };

const roundStat = (
    value: number,
    stat: string,
    totals: boolean = false,
): string => {
    try {
        // Number of decimals for many stats
        const d = totals ? 0 : 1;

        if (Number.isNaN(value)) {
            value = 0;
        }

        if (roundOverrides[stat] === "none") {
            return String(value);
        }
        if (roundOverrides[stat] === "oneDecimalPlace") {
            return value.toFixed(1);
        }
        if (roundOverrides[stat] === "roundWinp") {
            return commonHelpers.roundWinp(value);
        }
        if (roundOverrides[stat] === "plusMinus") {
            return plusMinus(value, d);
        }
        return value.toFixed(d);
    } catch (err) {
        return "";
    }
};

const helpers = Object.assign({}, commonHelpers, {
    leagueUrl,
    numberWithCommas,
    plusMinus,
    roundStat,
    roundsWonText,
});

export default helpers;
