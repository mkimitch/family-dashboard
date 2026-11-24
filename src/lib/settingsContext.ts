import { getContext, setContext } from 'svelte';
import type { CalendarDecoration } from './calendarDecorations';
import { resolveSettings } from './config/daymarkSettings';

const key = Symbol('daymark-settings');
type SettingsGetter = (decoration: CalendarDecoration | null) => ReturnType<typeof resolveSettings>;
export const provideSettings = (get: SettingsGetter) => setContext(key, get);
export const useSettings = () => getContext<SettingsGetter>(key);
