import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { startGgWeb, stopAllGgWeb } from '$lib/server/gg';

export const load: PageServerLoad = async ({ params }) => {
	const displayPath = params.path;
	stopAllGgWeb(displayPath);
	const url = await startGgWeb(displayPath);
	redirect(302, url);
};
