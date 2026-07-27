import { error } from '@sveltejs/kit';
import { docs, getDoc } from '$lib/docs';
import type { EntryGenerator, PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const doc = getDoc(params.slug);
	if (!doc) error(404, `No doc page called "${params.slug}"`);

	// Only serialisable data may cross the SSR boundary, so the page component
	// looks the markdown component up from `$lib/docs` by slug instead.
	return { slug: doc.slug, meta: doc.meta };
};

// Tells the prerenderer which dynamic routes exist, so it does not have to rely
// on finding a link to every page.
export const entries: EntryGenerator = () => docs.map((doc) => ({ slug: doc.slug }));
