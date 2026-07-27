import { describe, expect, it } from 'vitest';
import { docs, getDoc } from './docs';

describe('docs index', () => {
	it('picks up every markdown file in src/content', () => {
		expect(docs.length).toBeGreaterThan(0);
	});

	it('reads the title from frontmatter', () => {
		const doc = getDoc('overview');
		expect(doc?.meta.title).toBe('0. ภาพรวมและของที่ต้องเตรียม');
	});

	it('sorts pages by frontmatter order', () => {
		const orders = docs.map((doc) => doc.meta.order);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it('returns undefined for an unknown slug', () => {
		expect(getDoc('does-not-exist')).toBeUndefined();
	});
});
