import type { PageServerLoad } from './$types';
import { stopAllGgWeb } from '$lib/server/gg';

export const load: PageServerLoad = async () => {
	stopAllGgWeb(null);
	return {};
};
