---
title: 2. ด่านคุณภาพในเครื่อง
order: 2
description: lint, typecheck, unit test, component test, e2e — ชุดคำสั่งที่ CI จะใช้ซ้ำ
---

# บทที่ 2 — ด่านคุณภาพในเครื่อง

**เป้าหมาย:** มีคำสั่งชุดเดียวที่ทั้งคุณและ CI ใช้ตรวจโค้ด

## 2.1 สคริปต์ที่ต้องมี

ดูใน `package.json`:

```json
{
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "vite preview",
		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"lint": "prettier --check . && eslint .",
		"format": "prettier --write .",
		"test:unit": "vitest",
		"test:e2e": "playwright test",
		"test": "pnpm test:unit --run && pnpm test:e2e"
	}
}
```

**กฎเหล็กข้อเดียวของบทนี้:** CI ต้องรัน **คำสั่งเดียวกัน** กับที่คุณรันในเครื่อง
ถ้า CI มีขั้นตอนลับที่คุณรันเองไม่ได้ เวลามันแดงคุณจะ debug ไม่ออก
และถ้าเครื่องคุณมีขั้นตอนที่ CI ไม่มี ก็จะเกิดอาการ "ที่เครื่องผมผ่านนะ"

## 2.2 แต่ละคำสั่งจับอะไร

| คำสั่ง           | จับอะไร                               | ตัวอย่างที่มันช่วยไว้                                      |
| ---------------- | ------------------------------------- | ---------------------------------------------------------- |
| `pnpm lint`      | ฟอร์แมตไม่ตรง + bug pattern           | ลืม `await`, ตัวแปรไม่ได้ใช้, `<a>` ที่ไม่ผ่าน `resolve()` |
| `pnpm check`     | type error ในไฟล์ `.svelte` และ `.ts` | ส่ง prop ผิดชนิด, ใช้ field ที่ไม่มีอยู่                   |
| `pnpm test:unit` | ตรรกะย่อย + component                 | สารบัญเรียงผิดลำดับ, frontmatter หาย, ปุ่มไม่ render       |
| `pnpm test:e2e`  | เว็บจริงในเบราว์เซอร์จริง             | ลิงก์เสีย, หน้า 404 ไม่ทำงาน, build พังแบบที่ type ไม่จับ  |
| `pnpm build`     | ตัว build เอง                         | prerender ล้มเพราะลิงก์ไปหน้าที่ไม่มี                      |

`pnpm build` เป็น test กลาย ๆ ที่คนมองข้าม — เพราะเราตั้ง `prerender = true`
ทุกหน้าจะถูกสร้างจริงตอน build ลิงก์เสียหนึ่งเส้น build แดงทันที

## 2.3 unit test ที่คุ้มค่า

`src/lib/docs.spec.ts` ไม่ได้ test ว่า markdown สวยไหม แต่ test **สัญญา** ของระบบสารบัญ:

```ts
it('sorts pages by frontmatter order', () => {
	const orders = docs.map((doc) => doc.meta.order);
	expect(orders).toEqual([...orders].sort((a, b) => a - b));
});
```

ถ้าใครแก้ `docs.ts` แล้วลืมเรียง test นี้จะแดง — นี่คือ test ที่ดี:
มันพังเมื่อพฤติกรรมเปลี่ยน ไม่ใช่เมื่อโค้ดเปลี่ยน

## 2.4 component test รันในเบราว์เซอร์จริง

`vite.config.ts` แบ่ง Vitest เป็นสอง project:

| project  | ไฟล์ที่จับ                | รันที่ไหน                |
| -------- | ------------------------- | ------------------------ |
| `server` | `src/**/*.spec.ts`        | Node                     |
| `client` | `src/**/*.svelte.spec.ts` | Chromium ผ่าน Playwright |

ตัวอย่างคือ `src/lib/DocList.svelte.spec.ts` ที่ render component จริงแล้วเช็ค DOM:

```ts
const screen = render(DocList, { docs });

await expect
	.element(screen.getByRole('link', { name: 'Alpha' }))
	.toHaveAttribute('href', '/docs/alpha');
```

ไม่ใช่ jsdom แต่เป็นเบราว์เซอร์จริง สิ่งที่ได้เพิ่มคือ CSS, layout และ API ของเบราว์เซอร์
ทำงานเหมือนของจริง — แลกกับความช้าและการต้องติดตั้ง Chromium บน CI

หมายเหตุการตั้งชื่อ: ต้องเป็น `.svelte.spec.ts` (มี `.svelte` คั่น) ถึงจะเข้า project `client`
ถ้าตั้งชื่อ `DocList.spec.ts` เฉย ๆ มันจะไปรันใน Node แล้ว render ไม่ได้

## 2.5 e2e test แค่พอ

`e2e/docs.e2e.ts` มีสามเคส: หน้าแรกขึ้น, หน้า docs render ได้, slug มั่ว ๆ ได้ 404
e2e ช้าและเปราะกว่า unit test เยอะ เอาไว้ยืนยัน "เส้นทางหลักไม่ตาย" พอ
รายละเอียดปลีกย่อยให้ไปอยู่ใน unit test

`playwright.config.ts`:

```ts
export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testMatch: '**/*.e2e.{ts,js}',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['html'], ['list']] : 'list'
});
```

| ออปชัน                | ทำไมต้องมี                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| `webServer`           | Playwright build + start เว็บให้เอง ไม่ต้องเปิดค้างไว้เอง                              |
| `reuseExistingServer` | ในเครื่อง ถ้ามี server รันอยู่แล้วก็ใช้ตัวนั้น (เร็วกว่า) แต่บน CI ต้อง build ใหม่เสมอ |
| `forbidOnly`          | กัน `.only` หลุดขึ้น main ซึ่งจะทำให้ CI เขียวทั้งที่รันเทสแค่ตัวเดียว                 |
| `retries: 1` บน CI    | ให้ flake มีโอกาสผ่าน แต่ report จะบอกว่ามัน retry — เห็นปัญหา ไม่ซุกปัญหา             |

ครั้งแรกต้องโหลดเบราว์เซอร์ก่อน:

```bash
pnpm exec playwright install chromium
```

## 2.6 pre-commit hook — ของแถม ไม่ใช่ของหลัก

อยากได้ก็ติดตั้งได้:

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

แต่ต้องเข้าใจว่า **hook ข้ามได้** ด้วย `git commit --no-verify` ส่วน CI ข้ามไม่ได้
hook มีไว้ให้ feedback เร็ว ไม่ใช่ด่านความปลอดภัย อย่าย้ายการตรวจสำคัญมาไว้ที่ hook แล้วตัดออกจาก CI

## ✅ เช็คว่าผ่านบทนี้แล้ว

```bash
pnpm lint && pnpm check && pnpm test:unit --run && pnpm build
```

ทุกคำสั่งต้องผ่าน ถ้า `pnpm lint` แดงเพราะฟอร์แมต ให้รัน `pnpm format` แล้วลองใหม่

## ต่อไป

[บทที่ 3 — CI บน GitHub Actions](/docs/ci)
