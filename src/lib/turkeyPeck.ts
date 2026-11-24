import type { PeckVariant } from './config/daymarkSettings';

// Both ends of the copper silhouette meet the breast at the original 93,54 → 110,76 seam.
// The two neck curves can bend while the brow, beak, eye and jaw travel together.
const pose = (
	x: number,
	y: number,
	pitch: number,
	nape: string,
	browControl: string,
	throat: string
) => {
	const radians = (pitch * Math.PI) / 180;
	const point = (px: number, py: number) => {
		const dx = px - 102;
		const dy = py - 24;
		return [
			x + dx * Math.cos(radians) - dy * Math.sin(radians),
			y + dx * Math.sin(radians) + dy * Math.cos(radians)
		]
			.map((value) => Number(value.toFixed(3)))
			.join(' ');
	};
	return {
		path: `M93 54 ${nape} Q${browControl} ${point(103, 16)} Q${point(111, 17)} ${point(111, 24)} Q${point(111, 29)} ${point(106, 32)} ${throat} 110 76Z`,
		face: `translate(${x - 102}px, ${y - 24}px) rotate(${pitch}deg)`
	};
};

const rest = pose(
	102,
	24,
	0,
	'Q95 46 91 36 Q87 25 92 20',
	'96 14',
	'Q102 36 106 45 L111 59 Q114 68'
);
const lift = pose(
	101,
	22.5,
	-5,
	'Q94 44 90 35 Q86 24 90.7 19.4',
	'94.2 13.1',
	'Q101 34 105 44 L111 59 Q114 68'
);
const reach = pose(
	112,
	35,
	16,
	'Q94 45 98 38 Q98 30 104 28',
	'111 23.5',
	'Q109 46 108 50 L111 60 Q114 68'
);
const bend = pose(
	120,
	57,
	40,
	'Q98 46 106 46 Q114 45 119 47',
	'123.5 48',
	'Q114 66 112 64 L111 66 Q113 71'
);
const low = pose(
	119.5,
	87,
	64,
	'Q100 49 107 53 Q116 58 120 68',
	'126 78',
	'Q111 93 111.6 87 L112 81 Q112 78'
);
export const restingNeckPath = rest.path;

// Ease into and out of the stroke, passing through the intermediate poses at speed.
const stroke = [
	{ offset: 0, pose: rest, easing: 'ease-in-out' },
	{ offset: 0.14, pose: lift, easing: 'ease-in' },
	{ offset: 0.27, pose: reach, easing: 'linear' },
	{ offset: 0.38, pose: bend, easing: 'cubic-bezier(.29,.38,.72,1)' },
	{ offset: 0.52, pose: low, easing: 'cubic-bezier(.32,0,.72,.56)' },
	{ offset: 0.72, pose: bend, easing: 'linear' },
	{ offset: 0.86, pose: reach, easing: 'ease-out' },
	{ offset: 1, pose: rest, easing: 'linear' }
];
// Both variants share the same first-stroke speed.
const doublePeckReferenceMs = 1250;
const doublePeckFirstStrokeShare = 1050 / doublePeckReferenceMs;
const secondLow = pose(
	119.5,
	85.5,
	61,
	'Q100 49 107 53 Q116 57 120 67',
	'126 76.5',
	'Q111 91.5 111.6 86 L112 80.5 Q112 78'
);
const doubleStroke = [
	...stroke
		.slice(0, 4)
		.map((frame) => ({ ...frame, offset: frame.offset * doublePeckFirstStrokeShare })),
	{ offset: 546 / doublePeckReferenceMs, pose: low, easing: 'ease-in-out' },
	{ offset: 646 / doublePeckReferenceMs, pose: bend, easing: 'ease-in-out' },
	{ offset: 796 / doublePeckReferenceMs, pose: secondLow, easing: 'linear' },
	{ offset: 826 / doublePeckReferenceMs, pose: secondLow, easing: 'cubic-bezier(.32,0,.72,.56)' },
	{ offset: 1010 / doublePeckReferenceMs, pose: bend, easing: 'linear' },
	{ offset: 1130 / doublePeckReferenceMs, pose: reach, easing: 'ease-out' },
	{ offset: 1, pose: rest, easing: 'linear' }
];

const framesFor = (sequence: typeof stroke) => ({
	neck: sequence.map(({ offset, pose, easing }) => ({ offset, easing, d: `path("${pose.path}")` })),
	face: sequence.map(({ offset, pose, easing }) => ({ offset, easing, transform: pose.face }))
});
const singleFrames = framesFor(stroke);
const doubleFrames = framesFor(doubleStroke);

export const peckDuration = (baseDuration: number, variant: PeckVariant) =>
	variant === 'double' ? baseDuration / doublePeckFirstStrokeShare : baseDuration;

export const animatePeck = (
	neck: SVGPathElement,
	face: SVGGElement,
	baseDuration: number,
	variant: PeckVariant
) => {
	const frames = variant === 'double' ? doubleFrames : singleFrames;
	const duration = peckDuration(baseDuration, variant);
	return [
		neck.animate(frames.neck, { id: 'turkey-peck-neck', duration }),
		face.animate(frames.face, { id: 'turkey-peck', duration })
	];
};
