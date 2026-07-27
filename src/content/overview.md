---
title: 0. ภาพรวมและของที่ต้องเตรียม
order: 0
description: เราจะสร้างอะไร ต้องเตรียมอะไร และคู่มือนี้ใช้ยังไง
---

# บทที่ 0 — ภาพรวมและของที่ต้องเตรียม

## เราจะสร้างอะไร

เว็บ documentation ด้วย SvelteKit + mdsvex หนึ่งตัว (คือเว็บที่คุณกำลังอ่านอยู่นี่แหละ)
แล้วห่อมันด้วย pipeline เต็มรูปแบบ:

```
  แก้โค้ดใน branch
        │
        ├─ pnpm changeset            บอกว่าเป็น patch / minor / major
        │
   เปิด Pull Request
        │
        ├─ ci.yml       lint → typecheck → unit test → build → e2e
        ├─ preview.yml  deploy preview URL ให้ reviewer กด
        │
   merge เข้า main  (branch protection บังคับว่า CI ต้องเขียวก่อน)
        │
        ├─ release.yml  รวม changeset → เปิด "Version Packages" PR
        │               merge PR นั้น → bump version + CHANGELOG + git tag
        │
        └─ deploy.yml   deploy production (หลัง CI เขียวเท่านั้น)
```

ตัวเว็บไม่ใช่พระเอก — pipeline ต่างหากที่เป็น ตัวเว็บมีไว้ให้มีของจริงให้ deploy

## ของที่ต้องมี

| อย่าง              | ตรวจยังไง                 | หมายเหตุ                             |
| ------------------ | ------------------------- | ------------------------------------ |
| Node 22 ขึ้นไป     | `node -v`                 | repo นี้ pin ไว้ที่ 24 ผ่าน `.nvmrc` |
| pnpm               | `pnpm -v`                 | ถ้ายังไม่มี: `corepack enable pnpm`  |
| git + บัญชี GitHub | `git --version`           | ต้อง push repo ของตัวเองได้          |
| บัญชี Vercel       | เข้า <https://vercel.com> | แผน Hobby ฟรีพอสำหรับบทเรียนนี้      |

ถ้ายังไม่มี pnpm:

```bash
corepack enable pnpm
```

## วิธีใช้คู่มือชุดนี้

มีสองแบบ เลือกได้:

**แบบ A — อ่านของที่ทำเสร็จแล้ว** clone repo นี้แล้วอ่านทีละบท เทียบกับไฟล์จริงที่มีอยู่
เหมาะกับคนที่อยากเข้าใจว่าแต่ละไฟล์มีไว้ทำไม

```bash
git clone https://github.com/phukrit7171/vercel-101.git
cd vercel-101
pnpm install
pnpm dev
```

**แบบ B — สร้างเองจากศูนย์** เปิดโฟลเดอร์ว่างใหม่แล้วทำตามทุกบทตั้งแต่บทที่ 1
เหมาะกับ workshop จริง ๆ ใช้เวลาราว 2–3 ชั่วโมง

ทุกบทจบด้วยหัวข้อ **✅ เช็คว่าผ่านบทนี้แล้ว** — ถ้าเช็คไม่ผ่าน อย่าเพิ่งไปบทถัดไป

## แผนที่ของ repo

```
.changeset/config.json              ตั้งค่า Changesets
.github/workflows/
  ci.yml                            PR + push main: lint, check, test, build, e2e
  release.yml                       push main: Release PR → git tag
  deploy.yml                        production deploy หลัง CI เขียว (opt-in)
  preview.yml                       preview deploy ต่อ PR + comment URL (opt-in)
src/content/*.md                    เนื้อหาที่คุณกำลังอ่าน หนึ่งไฟล์ = หนึ่งหน้า
src/lib/docs.ts                     ทำสารบัญจาก import.meta.glob
src/routes/docs/[slug]/             route ที่ render เนื้อหา
vite.config.ts                      adapter-vercel + mdsvex
vercel.json                         สวิตช์ปิด auto-deploy เมื่อย้ายไปใช้ทาง B
.nvmrc                              เวอร์ชัน Node ที่เดียว ใช้ทั้ง dev / CI / Vercel
```

## คำศัพท์ที่จะใช้ตลอด

| คำ                              | ความหมาย                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| **CI** (Continuous Integration) | ตรวจว่าโค้ดพังไหม รันทุก PR                                           |
| **CD** (Continuous Deployment)  | เอาโค้ดขึ้น production รันหลัง merge                                  |
| **Preview deployment**          | เว็บชั่วคราวของ branch นั้น ๆ ให้กดดูก่อน merge                       |
| **Gate**                        | ด่านที่ต้องผ่านก่อนไปต่อ เช่น "test ต้องเขียวก่อน merge"              |
| **Workflow**                    | ไฟล์ YAML ใน `.github/workflows/` ที่บอก GitHub ว่าให้ทำอะไรเมื่อไหร่ |
| **Job**                         | หน่วยงานย่อยใน workflow แต่ละ job ได้เครื่อง (runner) ของตัวเอง       |
| **Runner**                      | เครื่องเสมือนที่ GitHub เตรียมให้รัน job                              |
| **Secret**                      | ค่าลับที่เก็บใน GitHub เข้ารหัสไว้ workflow อ่านได้ คนอ่านไม่ได้      |

## ต่อไป

[บทที่ 1 — สร้างเว็บ docs ด้วย SvelteKit + mdsvex](/docs/scaffold)
