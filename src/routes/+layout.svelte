<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { docs } from '$lib/docs';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<aside>
		<a class="brand" href={resolve('/')}>vercel-101</a>
		<nav>
			<ul>
				{#each docs as doc (doc.slug)}
					{@const href = resolve('/docs/[slug]', { slug: doc.slug })}
					<li>
						<a {href} aria-current={page.url.pathname === href ? 'page' : undefined}>
							{doc.meta.title}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(html) {
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		color-scheme: light dark;
	}

	:global(body) {
		margin: 0;
	}

	.shell {
		display: grid;
		grid-template-columns: 16rem minmax(0, 1fr);
		gap: 2rem;
		max-width: 68rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	@media (max-width: 48rem) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	aside {
		position: sticky;
		top: 2rem;
		align-self: start;
	}

	.brand {
		display: block;
		font-weight: 700;
		font-size: 1.125rem;
		margin-bottom: 1rem;
		text-decoration: none;
	}

	nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
	}

	nav a {
		display: block;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		text-decoration: none;
		color: inherit;
		opacity: 0.75;
	}

	nav a:hover,
	nav a[aria-current='page'] {
		background: color-mix(in srgb, currentColor 10%, transparent);
		opacity: 1;
	}

	main {
		min-width: 0;
		line-height: 1.7;
	}

	main :global(pre) {
		overflow-x: auto;
		padding: 1rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	main :global(table) {
		border-collapse: collapse;
	}

	main :global(th),
	main :global(td) {
		border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
		padding: 0.375rem 0.75rem;
		text-align: left;
	}
</style>
