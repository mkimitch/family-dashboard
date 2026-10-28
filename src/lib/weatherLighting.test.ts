import { describe, expect, it } from 'vitest';
import { isWeatherNight } from './weatherLighting';

const weather = {
	timezone: 'America/Chicago',
	updatedAt: '2026-10-31T18:00:00Z',
	astronomy: { sunrise: '2026-10-31T07:00:00-05:00', sunset: '2026-10-31T18:00:00-05:00' },
	daily: [
		{
			date: '2026-10-31',
			sunrise: '2026-10-31T07:00:00-05:00',
			sunset: '2026-10-31T18:00:00-05:00'
		},
		// DST ends overnight. Use the next day's actual instants, not yesterday plus 24 hours.
		{
			date: '2026-11-01',
			sunrise: '2026-11-01T06:01:00-06:00',
			sunset: '2026-11-01T17:00:00-06:00'
		}
	]
};

describe('weather-driven decoration lighting', () => {
	it.each([
		['2026-10-31T06:59:59-05:00', true],
		['2026-10-31T07:00:00-05:00', false],
		['2026-10-31T17:59:59-05:00', false],
		['2026-10-31T18:00:00-05:00', true],
		['2026-10-31T23:59:59-05:00', true],
		['2026-11-01T00:00:00-05:00', true],
		['2026-11-01T01:30:00-05:00', true],
		['2026-11-01T01:30:00-06:00', true],
		['2026-11-01T06:00:59-06:00', true],
		['2026-11-01T06:01:00-06:00', false],
		['2026-11-01T17:00:00-06:00', true]
	])('uses current time %s, including midnight and DST', (time, expected) => {
		expect(isWeatherNight(weather, new Date(time))).toBe(expected);
	});

	it('uses astronomy timestamps without forecast data', () => {
		expect(isWeatherNight({ ...weather, daily: undefined }, new Date('2026-10-31T23:00:00Z'))).toBe(
			true
		);
	});

	it('handles local clock values in the weather timezone, not the host timezone', () => {
		const clockWeather = {
			timezone: 'America/Chicago',
			astronomy: { sunrise: '7:00 AM', sunset: '6:00 PM' }
		};
		expect(isWeatherNight(clockWeather, new Date('2026-10-31T23:00:00Z'))).toBe(true);
		expect(isWeatherNight(clockWeather, new Date('2026-10-31T12:00:00Z'))).toBe(false);
	});

	it('accepts epoch seconds/milliseconds and a data envelope', () => {
		const sunrise = Date.parse('2026-10-31T12:00:00Z');
		const sunset = Date.parse('2026-10-31T23:00:00Z');
		expect(
			isWeatherNight(
				{ data: { timezone: 'America/Chicago', sunrise: sunrise / 1000, sunset } },
				new Date(sunset)
			)
		).toBe(true);
	});

	it.each([
		null,
		{},
		{ ...weather, timezone: 'invalid' },
		{ astronomy: { sunrise: '25:00', sunset: '18:00' } },
		{ astronomy: { sunrise: '07:00', sunset: 'bad' } },
		{ astronomy: { sunrise: '18:00', sunset: '07:00' } },
		{ astronomy: { sunrise: '2026-10-31T07:00:00', sunset: '2026-10-31T18:00:00' } }
	])('falls back to day when solar data cannot be trusted %#', (value) => {
		expect(isWeatherNight(value, new Date('2026-10-31T23:00:00Z'))).toBe(false);
	});

	it('does not keep yesterday’s night state indefinitely during a weather outage', () => {
		expect(isWeatherNight(weather, new Date('2026-11-03T01:00:00Z'))).toBe(false);
	});

	it('handles spring DST using forecast instants', () => {
		const spring = {
			timezone: 'America/Chicago',
			daily: [
				{
					date: '2027-03-14',
					sunrise: '2027-03-14T07:12:00-05:00',
					sunset: '2027-03-14T19:03:00-05:00'
				}
			]
		};
		expect(isWeatherNight(spring, new Date('2027-03-14T07:11:59-05:00'))).toBe(true);
		expect(isWeatherNight(spring, new Date('2027-03-14T07:12:00-05:00'))).toBe(false);
	});
});
