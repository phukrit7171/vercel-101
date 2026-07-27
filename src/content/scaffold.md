---
title: 1. สร้างเว็บ docs
order: 1
description: SvelteKit + mdsvex ทำสารบัญอัตโนมัติจากไฟล์ markdown
---

# บทที่ 1 — สร้างเว็บ docs ด้วย SvelteKit + mdsvex

**เป้าหมาย:** `pnpm dev` แล้วเห็นเว็บ docs ที่มี sidebar และหน้าเนื้อหาจากไฟล์ markdown

## 1.1 scaffold โปรเจกต์

```bash
pnpm dlx sv create . --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright mdsvex sveltekit-adapter="adapter:vercel" --install pnpm
```

คำสั่งเดียวนี้แทนการกด prompt ทีละข้อ สิ่งที่มันติดตั้งให้:

| add-on                     | ได้อะไร                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `prettier`                 | จัดฟอร์แมตอัตโนมัติ + `prettier.config.js`                 |
| `eslint`                   | ตรวจ bug pattern + กฎเฉพาะของ Svelte                       |
| `vitest`                   | unit test (node) และ component test (รันในเบราว์เซอร์จริง) |
| `playwright`               | e2e test + `playwright.config.ts`                          |
| `mdsvex`                   | ให้ `.md` เป็น Svelte component ได้                        |
| `sveltekit-adapter=vercel` | `@sveltejs/adapter-vercel` แทน `adapter-auto`              |

> **ข้อสังเกตสำคัญ** SvelteKit รุ่นใหม่ไม่มี `svelte.config.js` แล้ว config ทั้งหมด
> รวมทั้ง adapter และ preprocessor ย้ายไปอยู่ใน `vite.config.ts` ถ้าคุณเคยเห็น
> ตัวอย่างเก่า ๆ ที่แก้ `svelte.config.js` — มันคือที่เดียวกัน แค่ย้ายบ้าน

เปิด `vite.config.ts` ดู จะเห็นบรรทัดสำคัญ:

```ts
sveltekit({
	adapter: adapter(), // ← deploy ไป Vercel
	preprocess: [mdsvex({ extensions: ['.svx', '.md'] })], // ← .md เป็น component
	extensions: ['.svelte', '.svx', '.md']
});
```

## 1.2 เลือก adapter ให้ถูก

`adapter-auto` เดาแพลตฟอร์มให้อัตโนมัติ ใช้ได้ แต่บทเรียนนี้ใช้ `adapter-vercel` ตรง ๆ เพราะ:

- อ่านโค้ดแล้วรู้ทันทีว่า deploy ไปไหน
- ตั้งออปชันเฉพาะ Vercel ได้ เช่น `runtime`, `regions`, `isr`, `images`
- `adapter-auto` ต้องไปโหลด adapter จริงตอน build ทำให้ build ในเครื่องกับบน CI ต่างกันได้

ถ้าจะติดตั้งเองทีหลัง:

```bash
pnpm add -D @sveltejs/adapter-vercel
```

## 1.3 วางเนื้อหา

หนึ่งไฟล์ = หนึ่งหน้า วางไว้ที่ `src/content/*.md` แต่ละไฟล์เริ่มด้วย frontmatter:

```markdown
---
title: 1. สร้างเว็บ docs
order: 1
description: SvelteKit + mdsvex ทำสารบัญอัตโนมัติจากไฟล์ markdown
---

# หัวข้อของหน้า
```

`title` ไปโผล่ที่ sidebar, `order` ใช้เรียงลำดับ, `description` ไปอยู่ใน `<meta>` และหน้าแรก

## 1.4 ทำสารบัญอัตโนมัติ

`src/lib/docs.ts` อ่านไฟล์ทั้งหมดตอน build ด้วย `import.meta.glob` ของ Vite:

```ts
const modules = import.meta.glob<DocModule>('/src/content/*.md', { eager: true });

export const docs: Doc[] = Object.entries(modules)
	.map(([path, module]) => {
		const slug = path.split('/').pop()!.replace(/\.md$/, '');
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
```

`eager: true` แปลว่า import จริงตอน build ไม่ใช่ lazy — เราจึงอ่าน `metadata`
(frontmatter ที่ mdsvex แปลงให้) มาเรียงเป็นสารบัญได้เลย ไม่ต้องมี config
รายชื่อหน้าให้ maintain

ผลคือ **เพิ่มไฟล์ .md แล้ว sidebar ขึ้นเอง** ไม่ต้องแตะ route

## 1.5 route ที่ render เนื้อหา

`src/routes/docs/[slug]/+page.ts`

```ts
export const load: PageLoad = ({ params }) => {
	const doc = getDoc(params.slug);
	if (!doc) error(404, `No doc page called "${params.slug}"`);
	return { slug: doc.slug, meta: doc.meta };
};

export const entries: EntryGenerator = () => docs.map((doc) => ({ slug: doc.slug }));
```

`src/routes/docs/[slug]/+page.svelte`

```svelte
<script lang="ts">
	import { getDoc } from '$lib/docs';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const Content = $derived(getDoc(data.slug)!.component);
</script>

<Content />
```

สองจุดที่คนพลาดบ่อย:

1. **อย่าส่ง component ผ่าน `load`** ข้อมูลที่ออกจาก `load` ต้อง serialize เป็น JSON ได้
   เพื่อส่งจาก server ไป client ตอน hydrate — ฟังก์ชัน component ทำไม่ได้
   ทางแก้คือส่งแค่ `slug` แล้วให้ `+page.svelte` ไปหยิบ component จาก `$lib/docs` เอง
2. **`entries` บอก prerender ว่ามีหน้าอะไรบ้าง** route ที่มี `[slug]` ตัว prerenderer
   เดาเองไม่ได้ ปกติมันจะไล่ตามลิงก์ที่เจอ แต่ประกาศ `entries` ตรง ๆ ชัวร์กว่า

## 1.6 prerender ทั้งเว็บ

`src/routes/+layout.ts`

```ts
export const prerender = true;
```

docs site ไม่มีเนื้อหาเฉพาะผู้ใช้ ทุกหน้าจึงกลายเป็น HTML นิ่ง ๆ ตอน build
ผลคือเร็ว ถูก และไม่มี serverless function ให้พังตอน runtime

**ผลข้างเคียงที่เป็นของดี:** ลิงก์เสียกลายเป็น build error เพราะ prerenderer
ไล่ตามลิงก์ทุกเส้นจริง ๆ — `pnpm build` เลยกลายเป็น test ตัวหนึ่งไปด้วย

## 1.7 ลิงก์ภายในต้องผ่าน `resolve()`

ESLint จะเตือนถ้าเขียน `href="/docs/foo"` ตรง ๆ ในไฟล์ `.svelte` ให้ใช้:

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<a href={resolve('/docs/[slug]', { slug: doc.slug })}>{doc.meta.title}</a>
```

เหตุผลคือ type safety — พิมพ์ path ผิดหรือลบ route ทิ้ง TypeScript ฟ้องตอน
`pnpm check` แทนที่จะไปเจอลิงก์เสียบน production

> ในไฟล์ `.md` เขียน `[ข้อความ](/docs/slug)` ตามปกติได้ กฎนี้บังคับเฉพาะ `.svelte`

## ✅ เช็คว่าผ่านบทนี้แล้ว

```bash
pnpm dev
```

- เปิด <http://localhost:5173> เห็นหน้าแรกที่ลิสต์หน้า docs ทั้งหมด
- คลิกเข้าไปหน้าใดหน้าหนึ่ง เห็นเนื้อหา markdown ถูก render
- ลองสร้าง `src/content/test.md` พร้อม frontmatter → sidebar ขึ้นให้เองโดยไม่ต้อง restart

## ต่อไป

[บทที่ 2 — ด่านคุณภาพในเครื่อง](/docs/local-quality)
