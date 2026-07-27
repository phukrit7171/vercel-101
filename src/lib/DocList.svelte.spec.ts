import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DocList from './DocList.svelte';
import type { Doc } from './docs';

const fakeComponent = (() => null) as unknown as Doc['component'];

const docs: Doc[] = [
	{ slug: 'alpha', component: fakeComponent, meta: { title: 'Alpha', order: 1 } },
	{
		slug: 'beta',
		component: fakeComponent,
		meta: { title: 'Beta', order: 2, description: 'the second one' }
	}
];

describe('DocList', () => {
	it('links to every doc page', async () => {
		const screen = render(DocList, { docs });

		await expect
			.element(screen.getByRole('link', { name: 'Alpha' }))
			.toHaveAttribute('href', '/docs/alpha');
		await expect.element(screen.getByRole('link', { name: 'Beta' })).toBeVisible();
	});

	it('shows the description when there is one', async () => {
		const screen = render(DocList, { docs });

		await expect.element(screen.getByText('— the second one')).toBeVisible();
	});
});
