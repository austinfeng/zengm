import { useEffect, useState } from "react";
import Select from "react-select";
import { SPORT_HAS_REAL_PLAYERS } from "../../common";
import { groupBy } from "../../common/groupBy";
import type { View } from "../../common/types";
import type { Settings } from "../../worker/views/settings";
import { MoreLinks } from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { localActions, logEvent, toWorker } from "../util";
import { settings } from "./Settings/settings";
import SettingsForm from "./Settings/SettingsForm";
import type { Key } from "./Settings/types";

const DefaultNewLeagueSettings = ({
	defaultSettings,
	overrides,
}: View<"defaultSettings">) => {
	useTitleBar({ title: "Default New League Settings" });

	useEffect(() => {
		localActions.update({
			dirtySettings: false,
		});
	}, []);

	const [settingsShown, setSettingsShown] = useState<Key[]>(
		overrides ? (Object.keys(overrides) as any) : [],
	);

	const settingsRemainingToSelect = settings.filter(
		setting => !setting.hidden && !settingsShown.includes(setting.key),
	);

	const options = Object.entries(
		groupBy(settingsRemainingToSelect, "category"),
	).map(([category, catSettings]) => ({
		label: category,
		options: catSettings.map(setting => ({
			label: setting.name,
			value: setting.key,
		})),
	}));

	return (
		<>
			<MoreLinks type="globalSettings" page="/settings/default" />

			<p>Here you can override the normal default settings for new leagues.</p>

			<p>
				If you set a setting here, it will only apply in a new league that does
				not have that setting specified. So if you are uploading an exported
				league containing league settings, it will not be changed by whatever
				you specify here.
				{SPORT_HAS_REAL_PLAYERS
					? " Also, real players leagues have some non-default settings already applied, and those will also not be altered by your specified defaults."
					: null}
			</p>

			<Select<{
				label: string;
				value: Key;
			}>
				classNamePrefix="dark-select"
				className="mb-3"
				onChange={newValue => {
					if (newValue) {
						setSettingsShown(shown => [...shown, newValue.value]);
					}
				}}
				options={options}
				placeholder="Select a setting to supply a new default value for..."
				value={null}
			/>

			<SettingsForm
				onSave={async settings => {
					console.log(settings);

					const newDefaultSettings: Partial<Settings> = {
						...settings,
					};

					// Enforce godModeInPast always is the same as godMode
					if (newDefaultSettings.godMode) {
						newDefaultSettings.godModeInPast = true;
					} else {
						// If godMode or godModeInPast is false, can delete, that is already the default. Those are always here because of SPECIAL_STATE_BOOLEANS
						delete newDefaultSettings.godMode;
						delete newDefaultSettings.godModeInPast;
					}

					await toWorker(
						"main",
						"updateDefaultSettingsOverrides",
						newDefaultSettings,
					);

					localActions.update({
						dirtySettings: false,
					});

					logEvent({
						type: "success",
						text: "New league default settings successfully updated.",
						saveToDb: false,
					});
				}}
				onCancelDefaultSetting={key => {
					setSettingsShown(shown => shown.filter(key2 => key2 !== key));
				}}
				onUpdateExtra={() => {
					localActions.update({
						dirtySettings: true,
					});
				}}
				saveText="Save Default Settings"
				initialSettings={{
					...defaultSettings,
					...overrides,
				}}
				settingsShown={settingsShown}
				hideShortcuts
				alwaysShowGodModeSettings
				// Enable everything so we get all options
				hasPlayers
				newLeague
				realPlayers
				defaultNewLeagueSettings
			/>
		</>
	);
};

export default DefaultNewLeagueSettings;
