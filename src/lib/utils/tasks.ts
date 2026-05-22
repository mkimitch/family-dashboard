import type { DashboardTask, OmniCalTask } from '$lib/config/types';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DUE_ISO_PREFIX_RE = /^\d{4}-\d{2}-\d{2}T/;

type NormalizeTasksOptions = {
	todayKey: string;
	visibleDateKeys?: Iterable<string>;
};

type TaskCandidate = OmniCalTask & { __index: number };
type TaskCandidateWithDateKey = { task: TaskCandidate; dateKey: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isStringOrNull = (value: unknown): value is string | null =>
	typeof value === 'string' || value === null;

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

export const getTaskDateKey = (dueIso: string | null): string | null => {
	if (typeof dueIso !== 'string' || !DUE_ISO_PREFIX_RE.test(dueIso)) return null;
	const dateKey = dueIso.slice(0, 10);
	return DATE_KEY_RE.test(dateKey) ? dateKey : null;
};

export const isTaskCompleted = (task: Pick<OmniCalTask, 'status' | 'completedIso'>): boolean =>
	task.status === 'completed' || typeof task.completedIso === 'string';

const hasTaskDateKey = (value: {
	task: TaskCandidate;
	dateKey: string | null;
}): value is TaskCandidateWithDateKey => value.dateKey !== null;

const toTaskCandidate = (value: unknown, index: number): TaskCandidate | null => {
	if (!isRecord(value)) return null;
	if (typeof value.id !== 'string' || !value.id.trim()) return null;
	if (typeof value.taskListId !== 'string' || !value.taskListId.trim()) return null;
	if (typeof value.taskId !== 'string' || !value.taskId.trim()) return null;
	if (typeof value.title !== 'string' || !value.title.trim()) return null;
	if (!isStringOrNull(value.notes)) return null;
	if (typeof value.status !== 'string' || !value.status.trim()) return null;
	if (!isStringOrNull(value.dueIso)) return null;
	if (!isStringOrNull(value.completedIso)) return null;
	if (!isBoolean(value.deleted)) return null;
	if (!isBoolean(value.hidden)) return null;
	if (typeof value.position !== 'string') return null;
	if (!isStringOrNull(value.parent)) return null;
	if (!isNumber(value.updatedAt)) return null;

	return {
		id: value.id,
		taskListId: value.taskListId,
		taskId: value.taskId,
		title: value.title,
		notes: value.notes,
		status: value.status,
		dueIso: value.dueIso,
		completedIso: value.completedIso,
		deleted: value.deleted,
		hidden: value.hidden,
		position: value.position,
		parent: value.parent,
		updatedAt: value.updatedAt,
		__index: index
	};
};

const compareTaskPosition = (left: string, right: string): number => {
	if (left === right) return 0;
	if (!left) return 1;
	if (!right) return -1;
	return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
};

export const normalizeOmniCalTasks = (
	rawTasks: unknown,
	options: NormalizeTasksOptions
): DashboardTask[] => {
	if (!Array.isArray(rawTasks)) return [];

	const visibleDateKeys = new Set(options.visibleDateKeys ?? []);
	const restrictToVisibleWeek = visibleDateKeys.size > 0;

	return rawTasks
		.map((item, index) => toTaskCandidate(item, index))
		.filter((item): item is TaskCandidate => item !== null)
		.filter((task) => !task.deleted && !task.hidden)
		.filter((task) => !isTaskCompleted(task))
		.map((task) => ({ task, dateKey: getTaskDateKey(task.dueIso) }))
		.filter(hasTaskDateKey)
		.filter(({ dateKey }) => !restrictToVisibleWeek || visibleDateKeys.has(dateKey))
		.map(({ task, dateKey }) => ({
			id: task.id,
			taskListId: task.taskListId,
			taskId: task.taskId,
			title: task.title.trim(),
			notes: task.notes,
			status: task.status,
			dueIso: task.dueIso,
			dateKey,
			isAllDay: true,
			isCompleted: false,
			isDeleted: false,
			isHidden: false,
			isOverdue: dateKey < options.todayKey,
			position: task.position,
			parent: task.parent,
			updatedAt: task.updatedAt,
			__index: task.__index
		}))
		.sort((left, right) => {
			if (left.dateKey !== right.dateKey) return left.dateKey.localeCompare(right.dateKey);
			if (left.taskListId !== right.taskListId)
				return left.taskListId.localeCompare(right.taskListId, undefined, { sensitivity: 'base' });
			const positionCompare = compareTaskPosition(left.position, right.position);
			if (positionCompare !== 0) return positionCompare;
			const titleCompare = left.title.localeCompare(right.title, undefined, {
				sensitivity: 'base'
			});
			if (titleCompare !== 0) return titleCompare;
			return left.__index - right.__index;
		})
		.map(({ __index: _index, ...task }) => task);
};
