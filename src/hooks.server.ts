export async function handle({ event, resolve }) {
	console.log(`[REQ] ${event.request.method} ${event.url.pathname}`);
	const response = await resolve(event);
	return response;
}
