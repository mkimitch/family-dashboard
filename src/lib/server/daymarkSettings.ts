import { readFile } from 'node:fs/promises';
import { parseInstallationSettings, type InstallationSettings } from '../config/daymarkSettings';

export const readInstallationSettings = async (
	path = 'data/daymark-settings.json'
): Promise<InstallationSettings> => {
	try {
		return parseInstallationSettings(JSON.parse(await readFile(path, 'utf8')));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
			console.warn(
				'Could not load installation settings from',
				path,
				'-',
				(error as NodeJS.ErrnoException).code ?? (error as Error).name
			);
		return { version: 1 };
	}
};
