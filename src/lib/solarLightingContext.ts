import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const solarLightingKey = Symbol('solar-lighting');

// Created per page, never shared across SSR requests. WeatherCard owns updates.
export const provideSolarLighting = (): void => {
	setContext(solarLightingKey, writable(false));
};

export const useSolarLighting = (): Writable<boolean> =>
	getContext<Writable<boolean> | undefined>(solarLightingKey) ?? writable(false);
