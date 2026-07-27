import type { Component } from 'svelte';

export type DocMeta = {
	title: string;
	order: number;
	description?: string;
};

export type Doc = {
	slug: string;
	meta: DocMeta;
	component: Component;
};

type DocModule = {
	default: Component;
	metadata: Partial<DocMeta>;
};

const modules = import.meta.glob<DocModule>('/src/content/*.md', { eager: true });

function slugOf(path: string): string {
	return path.split('/').pop()!.replace(/\.md$/, '');
}

/** Every doc page, sorted by frontmatter `order` then title. */
export const docs: Doc[] = Object.entries(modules)
	.map(([path, module]) => {
		const slug = slugOf(path);
		return {
			slug,
			component: module.default,
			meta: {
				title: module.metadata.title ?? slug,
				order: module.metadata.order ?? Number.MAX_SAFE_INTEGER,
				description: module.metadata.description
			}
		};
	})
	.sort((a, b) => a.meta.order - b.meta.order || a.meta.title.localeCompare(b.meta.title));

export function getDoc(slug: string): Doc | undefined {
	return docs.find((doc) => doc.slug === slug);
}
