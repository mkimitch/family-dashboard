export async function POST({ request }) {
	const body = await request.json();
	console.error('[CLIENT ERROR]', body);
	return new Response('ok');
}
