<script lang="ts">
	import { getDoc } from '$lib/docs';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const Content = $derived(getDoc(data.slug)!.component);
</script>

<svelte:head>
	<title>{data.meta.title} — vercel-101</title>
	{#if data.meta.description}
		<meta name="description" content={data.meta.description} />
	{/if}
</svelte:head>

<Content />
