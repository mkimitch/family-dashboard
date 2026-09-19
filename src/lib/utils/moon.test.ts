import { getMoonIconPath } from './moon';
import { describe, expect, it } from 'vitest';

describe('moon phase icon paths', () => {
	it.each([
		[0, '/assets/moon/moon-100/moon-0000.png'],
		[0.25, '/assets/moon/moon-100/moon-0058.png'],
		[0.5, '/assets/moon/moon-100/moon-0116.png'],
		[0.75, '/assets/moon/moon-100/moon-0174.png'],
		[1, '/assets/moon/moon-100/moon-0000.png']
	])('maps phase %s to its original PNG frame', (moonPhase, expected) => {
		expect(getMoonIconPath({ moonPhase })).toBe(expected);
	});
});
