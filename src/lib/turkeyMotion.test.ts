import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	motions,
	resolveSettings,
	type GroundPeckStyle,
	type Motion,
	type PeckVariant
} from './config/daymarkSettings';
import { peckDuration } from './turkeyPeck';
import { createTurkeyController, scheduleTurkey } from './turkeyMotion';

const setup = (getStyle: () => GroundPeckStyle = () => 'single', random = Math.random) => {
	const settings = resolveSettings(undefined, 'thanksgiving', new URLSearchParams()).turkey;
	const render = vi.fn((id: Motion, variant?: PeckVariant) => {
		let cancel!: () => void;
		const finished = new Promise<Animation>((resolve, reject) => {
			const timer = setTimeout(
				resolve,
				variant ? peckDuration(settings[id].durationMs, variant) : settings[id].durationMs
			);
			cancel = () => {
				clearTimeout(timer);
				reject(new DOMException('Cancelled', 'AbortError'));
			};
		});
		return [{ finished, cancel }];
	});
	const controller = createTurkeyController((id) => settings[id].enabled, render, getStyle, random);
	const start = () =>
		scheduleTurkey(controller, settings, {
			now: Date.now,
			random: () => 0,
			after: (ms, callback) => {
				const timer = setTimeout(callback, ms);
				return () => clearTimeout(timer);
			}
		});
	return { controller, settings, render, start };
};

describe('turkey playback and scheduling', () => {
	afterEach(() => vi.useRealTimers());
	it.each(motions)('honors the individual %s toggle and configured duration', async (motion) => {
		vi.useFakeTimers();
		const { settings, controller, render } = setup();
		settings[motion].enabled = false;
		expect(await controller.play(motion)).toBe('skipped');
		expect(render).not.toHaveBeenCalled();
		settings[motion] = { ...settings[motion], enabled: true, durationMs: 1234 };
		const result = controller.play(motion);
		await vi.advanceTimersByTimeAsync(1233);
		expect(get(controller.current)).toBe(motion);
		expect(await controller.playAll()).toBe('skipped');
		await vi.advanceTimersByTimeAsync(1);
		expect(await result).toBe('completed');
		expect(get(controller.current)).toBe(null);
	});
	it('cancels the sequence and permits immediate replay without stale completions', async () => {
		vi.useFakeTimers();
		const { settings, controller, render } = setup();
		settings.head.enabled = false;
		const sequence = controller.playAll();
		await vi.advanceTimersByTimeAsync(settings.wattle.durationMs);
		expect(get(controller.current)).toBe('wing');
		controller.cancel();
		const next = controller.play('tail');
		expect(await sequence).toBe('cancelled');
		expect(get(controller.current)).toBe('tail');
		await vi.runAllTimersAsync();
		expect(await next).toBe('completed');
		expect(render.mock.calls.flat()).toEqual(['wattle', 'wing', 'tail']);
	});
	it('breaks ties in order, drops missed deadlines and leaves four seconds of rest', async () => {
		vi.useFakeTimers();
		const { settings, controller, render, start } = setup();
		for (const id of motions) settings[id].intervalMs = [1000, 1000];
		settings.tail.intervalMs = [7000, 7000];
		const stop = start();
		await vi.advanceTimersByTimeAsync(1000);
		expect(get(controller.current)).toBe('head');
		await vi.advanceTimersByTimeAsync(850 + 4000);
		expect(render).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(999);
		expect(render).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(get(controller.current)).toBe('head');
		stop();
		expect(get(controller.current)).toBe(null);
		await vi.runAllTimersAsync();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('drops late opportunities and waits a fresh interval after suspension', async () => {
		vi.useFakeTimers();
		const { settings, controller, render, start } = setup();
		const stop = start();
		vi.setSystemTime(Date.now() + 300000);
		await vi.advanceTimersByTimeAsync(settings.head.intervalMs[0]);
		expect(render).toHaveBeenCalledTimes(1);
		stop();
		await vi.advanceTimersByTimeAsync(300000);
		const stopAgain = start();
		await vi.advanceTimersByTimeAsync(settings.head.intervalMs[0] - 1);
		expect(get(controller.current)).toBe(null);
		stopAgain();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('samples only accepted random pecks and honors one-play overrides', async () => {
		vi.useFakeTimers();
		const random = vi.fn().mockReturnValueOnce(0.6999).mockReturnValueOnce(0.7);
		const { settings, controller, render } = setup(() => 'random', random);
		for (const expected of ['single', 'double']) {
			const playing = controller.play('peck');
			expect(render).toHaveBeenLastCalledWith('peck', expected);
			expect(get(controller.lastPeck)).toBe(expected);
			expect(await controller.playPeck('random')).toBe('skipped');
			controller.cancel();
			expect(await playing).toBe('cancelled');
		}
		for (const style of ['single', 'double'] as const) {
			const playing = controller.playPeck(style);
			expect(render).toHaveBeenLastCalledWith('peck', style);
			controller.cancel();
			await playing;
		}
		settings.peck.enabled = false;
		for (const style of ['single', 'double', 'random'] as const)
			expect(await controller.playPeck(style)).toBe('skipped');
		expect(random).toHaveBeenCalledTimes(2);
		expect(render).toHaveBeenCalledTimes(4);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('selects at the scheduled opportunity and rests from the actual variant completion', async () => {
		vi.useFakeTimers();
		let style: GroundPeckStyle = 'single';
		const random = vi.fn(() => 0.9);
		const { settings, controller, start, render } = setup(() => style, random);
		for (const motion of motions) settings[motion].enabled = motion === 'peck';
		settings.peck.intervalMs = [1000, 1000];
		settings.peck.durationMs = 2100;
		const stop = start();
		style = 'random';
		await vi.advanceTimersByTimeAsync(999);
		expect(random).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(render).toHaveBeenLastCalledWith('peck', 'double');
		await vi.advanceTimersByTimeAsync(2499);
		expect(get(controller.current)).toBe('peck');
		await vi.advanceTimersByTimeAsync(1);
		expect(get(controller.current)).toBeNull();
		style = 'single';
		await vi.advanceTimersByTimeAsync(4000 + 999);
		expect(render).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(render).toHaveBeenLastCalledWith('peck', 'single');
		expect(random).toHaveBeenCalledTimes(1);
		stop();
		await vi.runAllTimersAsync();
		expect(get(controller.current)).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('allocates no timers when all behaviors are disabled', () => {
		vi.useFakeTimers();
		const { settings, start } = setup();
		for (const id of motions) settings[id].enabled = false;
		start()();
		expect(vi.getTimerCount()).toBe(0);
	});
});
