<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Doc } from './docs';

	let { docs }: { docs: Doc[] } = $props();
</script>

<ul>
	{#each docs as doc (doc.slug)}
		<li>
			<a href={resolve('/docs/[slug]', { slug: doc.slug })}>{doc.meta.title}</a>
			{#if doc.meta.description}
				— {doc.meta.description}
			{/if}
		</li>
	{/each}
</ul>
