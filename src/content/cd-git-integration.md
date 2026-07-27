---
title: 5. CD ทาง A — Vercel Git Integration
order: 5
description: ต่อ GitHub เข้ากับ Vercel ทีละคลิก ได้ auto-deploy และ Preview URL ทุก PR
---

# บทที่ 5 — CD ทาง A: Vercel Git Integration

**เป้าหมาย:** push แล้วเว็บขึ้น production เอง และทุก PR มี Preview URL ให้กด

นี่คือทางที่ Vercel ออกแบบมาให้ ตั้งครั้งเดียวจบ ไม่ต้องเขียน workflow แม้แต่บรรทัดเดียว

## 5.1 สร้าง project ทีละคลิก

**1.** เข้า <https://vercel.com/new>

**2.** ถ้ายังไม่เคยต่อ GitHub จะมีปุ่ม **Continue with GitHub** / **Install** ให้กด
เลือกว่าจะให้ Vercel เข้าถึงทุก repo หรือเลือกเฉพาะบางอัน (เลือกเฉพาะอันที่ใช้ดีกว่า)

**3.** หา repo ของคุณในลิสต์ กด **Import**

**4.** หน้าตั้งค่าจะขึ้นมา ตรวจสามอย่างนี้:

| ช่อง                 | ค่าที่ควรเป็น                           |
| -------------------- | --------------------------------------- |
| **Framework Preset** | `SvelteKit` (Vercel ตรวจเจอเอง)         |
| **Build Command**    | ปล่อยว่าง = ใช้ `vite build` จาก preset |
| **Install Command**  | `pnpm install --frozen-lockfile`        |

**5.** กด **Deploy** แล้วรอ 1–2 นาที

**6.** เสร็จแล้วจะได้ URL แบบ `vercel-101-xxxx.vercel.app` กดเข้าไปดูได้เลย

**7.** ตั้ง Node version ให้ตรงกับ `.nvmrc`:
Project → **Settings** → **General** → เลื่อนหา **Node.js Version** → เลือก `24.x` → **Save**

> ถ้า Node version ไม่ตรง จะเจออาการ "build ผ่านในเครื่อง แต่แดงบน Vercel"
> ซึ่งเสียเวลาหาสาเหตุมาก

## 5.2 อะไรเกิดขึ้นหลังจากนี้

ตั้งแต่นี้ไป Vercel ผูกกับ repo แล้ว ไม่ต้องทำอะไรอีก:

| เหตุการณ์        | ผลลัพธ์                                                       |
| ---------------- | ------------------------------------------------------------- |
| push เข้า `main` | Production deployment ทับของเดิม                              |
| เปิด/อัปเดต PR   | Preview deployment พร้อม URL เฉพาะของ PR นั้น + comment ใน PR |
| push branch อื่น | Preview deployment เช่นกัน                                    |

Preview URL คือของดีที่สุดของทางนี้ — reviewer กดดูของจริงได้โดยไม่ต้อง clone

## 5.3 Environment variables

Vercel แบ่ง env เป็นสาม scope: **Production / Preview / Development**
ตั้งได้ที่ **Project → Settings → Environment Variables**

ใส่ทีละตัว: Key, Value แล้วติ๊กว่าจะให้ใช้ใน environment ไหนบ้าง

ดึงลงมาใช้ในเครื่อง:

```bash
pnpm add -g vercel     # ถ้ายังไม่มี CLI
vercel login
vercel link            # ผูกโฟลเดอร์นี้กับ project (สร้าง .vercel/)
vercel env pull .env.local
```

ฝั่ง SvelteKit เลือก import ให้ถูกตัว:

| import                 | ใช้เมื่อ                                                  |
| ---------------------- | --------------------------------------------------------- |
| `$env/static/private`  | secret ที่รู้ค่าตั้งแต่ตอน build — **แนะนำสำหรับ Vercel** |
| `$env/dynamic/private` | ค่าที่อาจเปลี่ยนตอน runtime                               |
| `$env/static/public`   | ค่าที่ client เห็นได้ ต้องขึ้นต้นด้วย `PUBLIC_`           |
| `$env/dynamic/public`  | เหมือนบน แต่อ่านตอน runtime                               |

บน Vercel ค่าพวกนี้เหมือนกันทั้งตอน build และ runtime ใช้ `static` ดีกว่า
เพราะมันแทนค่าตอน build ทำให้ตัด dead code ได้และเร็วกว่า

> ⚠️ อะไรที่ import จาก `$env/static/private` จะไม่มีทางหลุดไปฝั่ง client —
> SvelteKit จะ build fail ให้เลยถ้าเผลอ import ในโค้ดที่รันบน browser
> นี่คือฟีเจอร์ ไม่ใช่บั๊ก

Vercel ยังแจก env ของตัวเองมาให้ด้วย เช่น `VERCEL_COMMIT_REF` (ชื่อ branch ที่ deploy):

```ts
// src/routes/+layout.server.ts
import { VERCEL_COMMIT_REF } from '$env/static/private';

export function load() {
	return { deploymentGitBranch: VERCEL_COMMIT_REF };
}
```

## 5.4 ข้อเสียที่ต้องพูดให้ชัด

**Vercel ไม่รอ GitHub Actions**

push เข้า main แล้ว Vercel เริ่ม build ทันที พร้อม ๆ กับที่ CI เพิ่งเริ่มรัน
ถ้า e2e test ใช้เวลา 3 นาทีแล้วแดง — เว็บที่พังนั้นขึ้น production ไปตั้งแต่นาทีที่ 1 แล้ว

### แต่ปัญหานี้แก้ที่ต้นทางได้ ไม่ต้องเปลี่ยนวิธี deploy

ลองคิดย้อนกลับ: **โค้ดเสียเข้า main มาได้ยังไงตั้งแต่แรก?**

ถ้าตั้ง branch protection ([บทที่ 7](/docs/branch-protection)) ให้ CI เป็น required
status check → PR ที่เทสไม่ผ่าน merge ไม่ได้ → **main ไม่เคยมีโค้ดที่ยังไม่ผ่านเทส** →
Vercel ก็ไม่มีโค้ดเสียให้ build

```
โค้ดเสีย → PR → CI แดง → ❌ merge ไม่ได้ → main สะอาด → Vercel ปลอดภัย
                            ↑
                    นี่คือด่านตัวจริง ไม่ใช่ตรงจังหวะ deploy
```

**ด่านที่มีค่าคือด่านตอน merge ไม่ใช่ตอน deploy** — พอเข้าใจข้อนี้แล้ว ทาง A
กับทาง B ต่างกันน้อยกว่าที่คิดเยอะ

เหลือช่องว่างอยู่จริง ๆ แค่นี้:

| ช่องว่าง                                             | ปิดได้ยังไง                                          |
| ---------------------------------------------------- | ---------------------------------------------------- |
| PR เขียวเทียบ main เก่า พอ merge จริงชนกับของคนอื่น  | ติ๊ก **Require branches to be up to date** ในบทที่ 7 |
| Vercel build ใหม่เอง — ตัวที่ deploy ไม่ใช่ตัวที่เทส | ปิดไม่ได้ในทาง A (ต้องใช้ `--prebuilt` ของทาง B)     |
| ต้องมีคนกดอนุมัติ / ต้องรัน migration คั่น           | ปิดไม่ได้ในทาง A                                     |
| admin push ตรงเข้า main                              | จำกัด bypass list ให้แคบ                             |

**สำหรับ docs site แบบนี้: ทาง A + branch protection คือคำตอบ** ไม่มี migration
ไม่มี state ไม่ต้องอนุมัติ และพังแล้ว rollback ได้ในคลิกเดียว

บทที่ 6 มีไว้ให้รู้จัก **ว่าเมื่อไหร่ถึงจะต้องใช้** ไม่ใช่สิ่งที่ต้องเปิดในโปรเจกต์นี้ →
[ไปดูว่าเมื่อไหร่](/docs/cd-actions)

## 5.5 อีกอย่างที่ควรเปิด: Skew Protection

**Project → Settings → Advanced → Skew Protection**

เวลามี deploy ใหม่ ไฟล์ JS ของเวอร์ชันเก่าจะหายไป ผู้ใช้ที่เปิดเว็บค้างไว้แล้วกดลิงก์
อาจเจอ error — Skew Protection จะ route request ของเขาไปหา deployment เดิม
ต่อจนกว่าจะรีเฟรช

## ✅ เช็คว่าผ่านบทนี้แล้ว

- push commit เข้า main → production URL อัปเดตตาม
- เปิด PR → มี comment จาก Vercel พร้อม Preview URL ที่กดเข้าไปเห็นการเปลี่ยนแปลง
- `vercel env pull .env.local` ทำงานได้ (ต้อง `vercel login` และ `vercel link` ก่อน)

## ต่อไป

[บทที่ 6 — CD ทาง B: GitHub Actions + Vercel CLI](/docs/cd-actions)
