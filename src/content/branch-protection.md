---
title: 7. Branch protection และ rollback
order: 7
description: ตั้ง ruleset บน main ทีละคลิก เทียบ CD สองทาง และวิธีย้อนกลับเมื่อของพัง
---

# บทที่ 7 — เทียบสองทาง, branch protection และ rollback

## 7.1 ตารางเทียบ CD สองทาง

|                                | ทาง A: Git Integration           | ทาง B: Actions + CLI      |
| ------------------------------ | -------------------------------- | ------------------------- |
| เวลาตั้งค่า                    | ~5 นาที                          | ~30 นาที                  |
| เขียน workflow                 | ไม่ต้อง                          | ต้อง                      |
| ความลับที่ต้องดูแล             | ไม่มี                            | 3 ตัว + token หมดอายุ     |
| CI เป็นด่านจริงไหม             | ไม่ (ต้องพึ่ง branch protection) | ใช่                       |
| อนุมัติด้วยมือก่อน deploy      | ไม่ได้                           | ได้ (GitHub Environments) |
| Preview URL                    | ได้ฟรี อัตโนมัติ                 | ต้องเขียนเอง              |
| build ที่ไหน                   | Vercel                           | GitHub runner             |
| deploy สิ่งที่ test แล้วเป๊ะ ๆ | ไม่การันตี                       | ใช่ (`--prebuilt`)        |
| debug ตอนพัง                   | ดู log บน Vercel                 | ดู log บน GitHub          |

## 7.2 แล้วควรใช้อันไหน

**ใช้ทาง A ถ้า:** ทีมเล็ก, docs / marketing / blog, ความเสี่ยงตอนพังต่ำ,
อยากได้ preview โดยไม่ต้องดูแลอะไร — นี่คือคำตอบที่ถูกสำหรับคนส่วนใหญ่

**ใช้ทาง B ถ้า:** ต้องมี audit trail ว่าใครอนุมัติ deploy ไหน, ต้องรัน migration
หรือ smoke test ก่อน/หลัง deploy, เป็น monorepo ที่ต้องเลือก deploy เฉพาะบางส่วน,
หรือกฎขององค์กรบังคับว่า production ต้องผ่าน gate ที่ควบคุมได้

**ทางลูกผสมที่ใช้กันจริงบ่อยที่สุด:** ทาง A + branch protection ที่แข็งแรง
ได้ preview ฟรี และโค้ดที่ยังไม่ผ่าน CI ก็เข้า main ไม่ได้อยู่ดี

## 7.3 ตั้ง branch protection ทีละคลิก

GitHub มีสองระบบที่ทำงานคล้ายกัน: **Rulesets** (ใหม่ แนะนำ) กับ
**Branch protection rules** (เดิม) ที่นี่ใช้ Rulesets

**1.** repo → **Settings** → เมนูซ้าย **Rules** → **Rulesets**

**2.** **New ruleset** → **New branch ruleset**

**3. Ruleset Name** ใส่อะไรก็ได้ เช่น `protect main`

**4. Enforcement status** เลือก **Active**
(มี **Evaluate** ให้ลองแบบยังไม่บังคับจริง ใช้ตอนทดลองกับทีมใหญ่ได้)

**5. Target branches** → **Add target** → **Include default branch**
(หรือ **Add by pattern** แล้วใส่ `main`)

**6. Rules** ติ๊กตามนี้:

| กฎ                                           | ทำไม                                            |
| -------------------------------------------- | ----------------------------------------------- |
| ✅ **Restrict deletions**                    | กันลบ branch หลักทิ้ง                           |
| ✅ **Block force pushes**                    | กันประวัติหาย เขียนทับกันเงียบ ๆ                |
| ✅ **Require a pull request before merging** | ห้าม push ตรงเข้า main                          |
| ✅ **Require status checks to pass**         | หัวใจของบทนี้ ดูข้อ 7                           |
| ⬜ **Require linear history**                | ถ้าอยากบังคับ squash/rebase ไม่เอา merge commit |

ใต้ **Require a pull request** จะมีตัวเลือกย่อย:

- **Required approvals: 1** — ทีมจริงควรเปิด แต่ถ้าทำ workshop คนเดียวจะติดตัวเอง
  (คุณอนุมัติ PR ตัวเองไม่ได้) ตอนเรียนตั้ง 0 ไว้ก่อน
- **Dismiss stale pull request approvals when new commits are pushed** — ควรเปิด
  ไม่งั้น approve แล้ว push โค้ดใหม่ทีหลังได้ฟรี ๆ

**7.** ใต้ **Require status checks to pass** กด **Add checks** แล้วพิมพ์หาชื่อ job:

- `Lint, typecheck, unit tests, build`
- `End-to-end tests`

> ⚠️ **status check จะค้นเจอก็ต่อเมื่อเคยรันอย่างน้อยหนึ่งครั้งแล้ว**
> ถ้าหาไม่เจอ ให้เปิด PR ทดสอบสักใบให้ CI รันก่อน แล้วค่อยกลับมาตั้ง
>
> ชื่อที่ใช้คือค่า `name:` ของ **job** ไม่ใช่ชื่อ workflow ถ้า job ไม่ได้ตั้ง `name:`
> จะใช้ id ของ job แทน

ติ๊ก **Require branches to be up to date before merging** ด้วย — กันเคส
"PR เขียว, main เขียว แต่พอรวมกันแล้วพัง"

**8.** กด **Create** ล่างสุด

### ผลที่ได้

```bash
git switch main
echo "test" >> README.md
git commit -am "test: push ตรง"
git push
```

```
! [remote rejected] main -> main (protected branch hook declined)
```

ต่อไปนี้ต้องผ่าน PR อย่างเดียว

## 7.4 ข้อควรระวังกับ release.yml

ถ้าเปิด "Require a pull request" แล้ว **`release.yml` จะ push commit เข้า main ตรง ๆ ไม่ได้**

แต่ไม่มีปัญหา เพราะ Changesets ทำงานผ่าน PR อยู่แล้ว (มันเปิด "Version Packages" PR
ไม่ได้ push ตรง) ส่วนการสร้าง **tag** ยังทำได้ เพราะ branch ruleset คุมเฉพาะ branch
ไม่ได้คุม tag

ถ้าวันหนึ่งมี workflow ที่ต้อง push ตรงเข้า main จริง ๆ ให้เพิ่มมันใน
**Bypass list** ของ ruleset (เลือก **Repository admin** หรือระบุ GitHub App)
แต่คิดให้ดีก่อนเพิ่ม — ทุก bypass คือรูในกำแพง

## 7.5 Rollback

**ทาง A และ B เหมือนกัน — ใช้ Vercel dashboard:**

1. Project → **Deployments**
2. หา deployment ตัวที่ยังดีอยู่ (ดูจาก commit message / เวลา)
3. เมนู ⋯ ข้างขวา → **Promote to Production**
   (บางแผนจะเห็นเป็นปุ่ม **Instant Rollback**)

ใช้เวลาไม่กี่วินาที เพราะ build เดิมยังอยู่ ไม่ต้อง build ใหม่
**นี่คือทางที่ควรทำก่อนเสมอตอนของพัง** — หยุดเลือดก่อน แล้วค่อยไปหาสาเหตุ

**แล้วค่อยตามด้วยการแก้ที่ git:**

```bash
git revert <commit-ที่พัง>
git push
```

`revert` ดีกว่า `reset --hard` + force push เพราะประวัติยังอยู่ครบ
คนอื่นที่ pull ไปแล้วไม่พัง และเห็นชัดว่าเกิดอะไรขึ้น
(อีกอย่าง — คุณเพิ่งเปิด Block force pushes ไปเมื่อกี้)

**ถ้า tag ผิดไปแล้ว:**

```bash
git tag -d v0.2.0                  # ลบในเครื่อง
git push --delete origin v0.2.0    # ลบบน remote
```

ทำได้ แต่ควรเลี่ยง — ถ้ามีคนดึง tag นั้นไปแล้วจะสับสน ทางที่ปลอดภัยกว่าคือ
ปล่อย tag เสียไว้แล้วออก `v0.2.1` ที่แก้แล้วทับ

## 7.6 ของที่ควรทำต่อ ถ้าจะเอาไปใช้จริง

- **Dependabot / Renovate** อัปเดต dependency อัตโนมัติแล้วให้ CI ตรวจให้
- **`actions/dependency-review-action`** เตือนเมื่อ PR เพิ่ม dependency ที่มีช่องโหว่
- **Lighthouse CI** วัด performance ทุก PR
- **pin action ด้วย SHA** แทน `@v5` ถ้าอยู่ในองค์กรที่ซีเรียสเรื่อง supply chain
- **CODEOWNERS** บังคับให้เจ้าของโค้ดส่วนนั้นเป็นคน review
- **Vercel Analytics / Speed Insights** ดูของจริงหลัง deploy

## ✅ เช็คว่าผ่านบทนี้แล้ว

- ลอง `git push` ตรงเข้า main → ถูกปฏิเสธด้วย `protected branch hook declined`
- เปิด PR ที่ test แดง → ปุ่ม Merge ถูกล็อก มีข้อความ "Required statuses must pass"
- ลอง promote deployment เก่าจาก Vercel dashboard แล้วเปิดเว็บดูว่ากลับไปเวอร์ชันเดิมจริง

## ต่อไป

[บทที่ 8 — ปัญหาที่เจอบ่อยและวิธีแก้](/docs/troubleshooting)
