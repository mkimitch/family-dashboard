export function GET() {
	return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
}
