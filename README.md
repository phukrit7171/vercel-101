# vercel-101

repo ตัวอย่างสำหรับ **สอน CI/CD ตั้งแต่ต้นจนจบ** โดยใช้เว็บ documentation
(SvelteKit + mdsvex) เป็นของที่เอาไป deploy จริงบน Vercel

ทุกอย่างในนี้รันได้จริง ไม่ใช่ pseudo-code — คู่มือแต่ละบทชี้ไปที่ไฟล์จริงใน repo

> **ใจความหลัก:** ด่านที่มีค่าคือด่านตอน **merge** ไม่ใช่ตอน deploy —
> branch protection สำคัญกว่าการเลือกวิธี deploy

## เนื้อหาที่ครอบคลุม

|                | เรื่อง                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **CI**         | lint (ESLint + Prettier), typecheck (`svelte-check`), unit test (Vitest), e2e (Playwright), build |
| **Versioning** | Changesets → Release PR → bump version + CHANGELOG + git tag                                      |
| **CD**         | สองทาง: Vercel Git Integration และ GitHub Actions + Vercel CLI พร้อมเทียบข้อดี/ข้อเสีย            |
| **ของประกอบ**  | branch protection, GitHub Environments + manual approval, preview deploy ต่อ PR, rollback         |

## เริ่มยังไง

```bash
pnpm install
pnpm dev
```

เปิด <http://localhost:5173>

รันชุดตรวจทั้งหมดแบบเดียวกับ CI:

```bash
pnpm lint && pnpm check && pnpm test:unit --run && pnpm build
```

e2e (ครั้งแรกต้องโหลดเบราว์เซอร์ก่อน):

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## คู่มือสอน

**คู่มือคือตัวเว็บเอง** — รัน `pnpm dev` แล้วอ่านที่ <http://localhost:5173>
หรืออ่านเป็นไฟล์ markdown ตรง ๆ ใน [`src/content/`](src/content/)

| บท  | เรื่อง                                 | ไฟล์                                                       |
| --- | -------------------------------------- | ---------------------------------------------------------- |
| 0   | ภาพรวมและของที่ต้องเตรียม              | [overview.md](src/content/overview.md)                     |
| 0.5 | ศัพท์และพื้นฐาน git/PR (ข้ามได้)       | [basics.md](src/content/basics.md)                         |
| 1   | สร้างเว็บ docs ด้วย SvelteKit + mdsvex | [scaffold.md](src/content/scaffold.md)                     |
| 2   | ด่านคุณภาพในเครื่อง                    | [local-quality.md](src/content/local-quality.md)           |
| 3   | ตั้ง CI บน GitHub Actions              | [ci.md](src/content/ci.md)                                 |
| 4   | เวอร์ชันและ tag ด้วย Changesets        | [versioning.md](src/content/versioning.md)                 |
| 5   | CD ทาง A — Vercel Git Integration      | [cd-git-integration.md](src/content/cd-git-integration.md) |
| 6   | CD ทาง B — GitHub Actions + Vercel CLI | [cd-actions.md](src/content/cd-actions.md)                 |
| 7   | Branch protection และ rollback         | [branch-protection.md](src/content/branch-protection.md)   |
| 8   | ปัญหาที่เจอบ่อย                        | [troubleshooting.md](src/content/troubleshooting.md)       |
| 9   | สรุป best practice + checklist         | [best-practices.md](src/content/best-practices.md)         |

แต่ละบทมีไฟล์ YAML เต็ม ๆ ให้ก๊อปไปใช้ และมีขั้นตอนกดในหน้า GitHub / Vercel
ทีละคลิก จบด้วยหัวข้อ "✅ เช็คว่าผ่านบทนี้แล้ว"

## แผนที่ของ repo

```
.changeset/config.json              ตั้งค่า Changesets (private package → version + tag)
.github/workflows/
  ci.yml                            PR + push main: lint, check, test, build, e2e
  release.yml                       push main: Release PR → git tag
  deploy.yml                        production deploy หลัง CI เขียว (opt-in)
  preview.yml                       preview deploy ต่อ PR + comment URL (opt-in)
src/content/*.md                    คู่มือสอนบทที่ 0–8 = เนื้อหาเว็บ หนึ่งไฟล์ = หนึ่งหน้า
src/lib/docs.ts                     ทำสารบัญจาก import.meta.glob
src/routes/docs/[slug]/             route ที่ render เนื้อหา
vite.config.ts                      adapter-vercel + mdsvex (SvelteKit ใหม่ไม่มี svelte.config.js)
vercel.json                         สวิตช์ปิด auto-deploy เมื่อย้ายไปใช้ทาง B
.nvmrc                              เวอร์ชัน Node ที่เดียว ใช้ทั้ง dev / CI / Vercel
```

## เอาไปใช้จริง

workflow `deploy.yml` และ `preview.yml` **ปิดอยู่โดยดีฟอลต์** จะทำงานก็ต่อเมื่อ
ตั้ง repository variable `DEPLOY_VIA_ACTIONS=true` — clone ไปแล้วใช้ได้เลยโดยไม่ต้องมี
บัญชี Vercel ดูวิธีเปิดในบทที่ 6

## เทคโนโลยี

SvelteKit · Svelte 5 · mdsvex · TypeScript · Vitest · Playwright · ESLint · Prettier ·
Changesets · GitHub Actions · Vercel

## License

[MIT](LICENSE)
