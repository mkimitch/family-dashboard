type JsonResponseOptions = {
	status?: number;
	headers?: Record<string, string>;
};

const JSON_HEADERS = {
	'cache-control': 'no-store',
	'content-type': 'application/json; charset=utf-8'
} as const;

export const jsonResponse = (body: unknown, options: JsonResponseOptions = {}): Response =>
	new Response(JSON.stringify(body), {
		status: options.status ?? 200,
		headers: {
			...JSON_HEADERS,
			...options.headers
		}
	});

export const errorResponse = (error: string, status: number): Response =>
	jsonResponse({ error }, { status });

export const readJsonBody = async (
	request: Request
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> => {
	try {
		return { ok: true, data: await request.json() };
	} catch {
		return { ok: false, response: errorResponse('Invalid JSON body', 400) };
	}
};
