import { readonly, writable } from 'svelte/store';
import {
	motions,
	settingsDefinitions,
	type GroundPeckStyle,
	type PeckVariant,
	type Motion,
	type TurkeySettings
} from './config/daymarkSettings';

type Result = 'completed' | 'cancelled' | 'skipped';
type Playback = Pick<Animation, 'finished' | 'cancel'>;
type Renderer = (...selection: [Exclude<Motion, 'peck'>] | ['peck', PeckVariant]) => Playback[];

const singlePeckProbability = 0.7;
const choosePeck = (style: GroundPeckStyle, random: () => number): PeckVariant => {
	if (style !== 'random') return style;
	return random() < singlePeckProbability ? 'single' : 'double';
};

export const createTurkeyController = (
	enabled: (motion: Motion) => boolean,
	render: Renderer,
	getPeckStyle: () => GroundPeckStyle = () => settingsDefinitions.groundPeckStyle.default,
	random: () => number = Math.random
) => {
	const lastPeck = writable<PeckVariant | null>(null);
	const current = writable<Motion | null>(null);
	let active: { animations: Playback[] } | null = null;
	const cancel = () => {
		if (!active) return;
		for (const animation of active.animations) animation.cancel();
		active = null;
		current.set(null);
	};
	const run = async (
		requested: readonly Motion[],
		peckOverride?: GroundPeckStyle
	): Promise<Result> => {
		if (active || !requested.some(enabled)) return 'skipped';
		const playback = { animations: [] as Playback[] };
		active = playback;
		try {
			for (const motion of requested) {
				if (!enabled(motion)) continue;
				const selection: Parameters<Renderer> =
					motion === 'peck'
						? [motion, choosePeck(peckOverride ?? getPeckStyle(), random)]
						: [motion];
				playback.animations = render(...selection);
				const finished = Promise.all(playback.animations.map((animation) => animation.finished));
				current.set(motion);
				if (selection[0] === 'peck' && active === playback) lastPeck.set(selection[1]);
				await finished;
				if (active !== playback) return 'cancelled';
				for (const animation of playback.animations) animation.cancel();
				playback.animations = [];
			}
			return 'completed';
		} catch (error) {
			if (active !== playback || (error instanceof Error && error.name === 'AbortError'))
				return 'cancelled';
			throw error;
		} finally {
			if (active === playback) cancel();
		}
	};
	return {
		current: readonly(current),
		lastPeck: readonly(lastPeck),
		playPeck: (style: GroundPeckStyle) => run(['peck'], style),
		play: (motion: Motion) => run([motion]),
		playAll: () => run(motions),
		cancel
	};
};
export type TurkeyController = ReturnType<typeof createTurkeyController>;

const browserClock = {
	now: () => performance.now(),
	random: Math.random,
	after: (ms: number, callback: () => void) => {
		const timer = setTimeout(callback, ms);
		return () => clearTimeout(timer);
	}
};

export const scheduleTurkey = (
	controller: TurkeyController,
	settings: TurkeySettings,
	clock = browserClock
) => {
	const enabled = motions.filter((motion) => settings[motion].enabled);
	const due = new Map<Motion, number>();
	const renew = (motion: Motion, now: number) => {
		const [min, max] = settings[motion].intervalMs;
		due.set(motion, now + min + clock.random() * (max - min));
	};
	let stopped = false;
	let clearTimer: (() => void) | undefined;
	const scheduleNext = () => {
		if (stopped || !enabled.length) return;
		// Strict comparison preserves registry order for ties.
		const next = enabled.reduce((a, b) => (due.get(b)! < due.get(a)! ? b : a));
		clearTimer = clock.after(Math.max(0, due.get(next)! - clock.now()), async () => {
			await controller.play(next);
			if (stopped) return;
			clearTimer = clock.after(4000, () => {
				const now = clock.now();
				for (const motion of enabled) if (due.get(motion)! <= now) renew(motion, now);
				scheduleNext();
			});
		});
	};
	const now = clock.now();
	for (const motion of enabled) renew(motion, now);
	scheduleNext();
	return () => {
		stopped = true;
		clearTimer?.();
		controller.cancel();
	};
};
