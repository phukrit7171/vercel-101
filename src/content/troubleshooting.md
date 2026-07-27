---
title: 8. ปัญหาที่เจอบ่อย
order: 8
description: error ที่ผู้เรียนเจอจริงในแต่ละบท พร้อมวิธีแก้
---

# บทที่ 8 — ปัญหาที่เจอบ่อยและวิธีแก้

## CI

### `ERR_PNPM_OUTDATED_LOCKFILE`

```
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

มีคนแก้ `package.json` แล้วไม่ได้ commit lockfile ที่อัปเดต

```bash
pnpm install
git add pnpm-lock.yaml && git commit -m "chore: update lockfile"
```

**อย่า**แก้ด้วยการเอา `--frozen-lockfile` ออกจาก CI — นั่นคือการปิดเซ็นเซอร์ควันไฟ

### `Unable to locate executable file: pnpm`

`actions/setup-node` ที่ตั้ง `cache: pnpm` ต้องหา pnpm เจอก่อน
สลับลำดับให้ `pnpm/action-setup@v4` มาก่อน `actions/setup-node@v5` เสมอ

### `Multiple versions of pnpm specified`

มีทั้งฟิลด์ `packageManager` ใน `package.json` และ `version:` ใน `pnpm/action-setup`
เลือกอย่างเดียว — แนะนำให้เหลือแค่ `packageManager` แล้วลบ `version:` ออกจาก workflow

### Playwright ล้มบน CI แต่ผ่านในเครื่อง

- ลืม `pnpm exec playwright install --with-deps chromium` — `--with-deps` ลง
  system library ที่ ubuntu runner ไม่มีมาให้
- เครื่องคุณเร็วกว่า runner ทำให้ timing test เปราะ ใช้ `expect(...).toBeVisible()`
  ซึ่งรอให้เอง แทน `waitForTimeout`
- โหลด artifact `playwright-report` มาเปิดดู trace จะเห็นว่าตอนนั้นหน้าจอเป็นยังไงจริง ๆ

### CI เขียวแต่รันเทสไปแค่ตัวเดียว

มี `.only` หลุดเข้ามา — `forbidOnly: !!process.env.CI` ใน `playwright.config.ts`
มีไว้กันเรื่องนี้ ตรวจว่ายังอยู่

## Changesets

### merge แล้วไม่มี "Version Packages" PR โผล่มา

ไล่เช็คตามลำดับ:

1. **Settings → Actions → General → Workflow permissions** →
   **Allow GitHub Actions to create and approve pull requests** เปิดอยู่ไหม
   (สาเหตุอันดับหนึ่ง — workflow จะเขียวแต่ไม่มีอะไรเกิดขึ้น)
2. `permissions:` ใน `release.yml` มี `contents: write` และ `pull-requests: write` ไหม
3. มีไฟล์ใน `.changeset/` จริงไหม (นอกจาก `README.md` กับ `config.json`)
4. `fetch-depth: 0` อยู่ใน step checkout ไหม

### version ไม่ bump ทั้งที่มี changeset

`package.json` เป็น `"private": true` แต่ `.changeset/config.json` ไม่ได้ตั้ง:

```json
"privatePackages": { "version": true, "tag": true }
```

### tag ไม่ถูกสร้าง

ดูว่า `publish:` ใน `release.yml` เป็น `pnpm changeset tag` ไม่ใช่ `changeset publish`
และ workflow ต้องมี `contents: write`

## Vercel

### build ผ่านในเครื่อง แต่แดงบน Vercel

- **Node version ไม่ตรง** Project → Settings → General → Node.js Version
  ให้ตรงกับ `.nvmrc`
- **devDependencies ไม่ถูกติดตั้ง** ปกติ Vercel ติดตั้งให้ ถ้าตั้ง `NODE_ENV=production`
  เอาไว้เองมันจะข้าม — เอาออก
- **ตัวพิมพ์ใหญ่เล็กในชื่อไฟล์** macOS ไม่สนใจ แต่ Linux สนใจ
  `import DocList from './doclist.svelte'` พังบน Vercel ถ้าไฟล์จริงชื่อ `DocList.svelte`

### `adapter-auto` บ่นว่าไม่รู้จักแพลตฟอร์ม

ติดตั้ง adapter ตรง ๆ:

```bash
pnpm add -D @sveltejs/adapter-vercel
```

แล้วเปลี่ยน import ใน `vite.config.ts`

### prerender ล้ม: `404 ... linked from ...`

มีลิงก์ชี้ไปหน้าที่ไม่มีอยู่ ข้อความ error บอกทั้งหน้าปลายทางและหน้าที่ลิงก์ออกมา
แก้ลิงก์ หรือถ้าเป็นลิงก์ที่ตั้งใจให้ไปที่อื่นจริง ๆ ก็ยกเว้นได้ใน
`kit.prerender.handleHttpError`

**เจอบ่อยเวลาเขียนเนื้อหา docs** — พิมพ์ `/docs/ci-cd` แต่ไฟล์จริงชื่อ `ci.md`
นี่คือฟีเจอร์ ไม่ใช่บั๊ก: มันจับลิงก์เสียให้ตั้งแต่ตอน build

### `Error: No existing credentials found` ตอน `vercel pull`

`VERCEL_TOKEN` ไม่ถึงคำสั่ง เช็คว่า:

- ชื่อ secret สะกดตรงกับที่อ้างใน workflow
- workflow ที่ทริกจาก **fork** จะไม่ได้รับ secrets เลย (โดยตั้งใจ)
- token ยังไม่หมดอายุ

### `Project not found` ตอน `vercel build`

`VERCEL_ORG_ID` หรือ `VERCEL_PROJECT_ID` ผิด หรือ token ไม่ได้อยู่ scope เดียวกับ project
รัน `vercel link` ใหม่แล้วดู `.vercel/project.json` อีกรอบ

### deploy ขึ้นสองรอบทุกครั้ง

เปิดทั้งสองทางพร้อมกัน — ปิด Git Integration ด้วย `vercel.json`
([บทที่ 6](/docs/cd-actions)) หรือปิด `DEPLOY_VIA_ACTIONS` เลือกอย่างใดอย่างหนึ่ง

### `deploy.yml` ไม่ทำงานเลย ทั้งที่ CI เขียว

1. ตั้ง repository variable `DEPLOY_VIA_ACTIONS=true` แล้วหรือยัง
2. ชื่อใน `workflows: [CI]` ตรงกับ `name:` ใน `ci.yml` ไหม (ไม่ใช่ชื่อไฟล์)
3. `workflow_run` จะทำงานก็ต่อเมื่อไฟล์ workflow นั้น **อยู่บน default branch แล้ว** —
   ทดสอบจาก branch อื่นไม่ได้ ต้อง merge เข้า main ก่อน

## Branch protection

### หา status check ไม่เจอตอนตั้ง ruleset

check จะขึ้นในลิสต์ก็ต่อเมื่อเคยรันแล้วอย่างน้อยหนึ่งครั้ง เปิด PR ทดสอบสักใบ
ให้ CI รันก่อน แล้วค่อยกลับมาตั้ง

### merge ไม่ได้เพราะ approve ตัวเองไม่ได้

ตอนทำ workshop คนเดียว ให้ตั้ง **Required approvals** เป็น `0`
หรือใส่ตัวเองใน **Bypass list** ของ ruleset

## เตือนที่ไม่ต้องแก้

```
[vite-plugin-svelte] src/content/xxx.md:1:8 `context="module"` is deprecated
```

มาจากโค้ดที่ mdsvex สร้างเอง ไม่ใช่โค้ดของเรา และไม่กระทบการทำงาน
รอ mdsvex อัปเดตให้ใช้ `module` attribute แบบใหม่ ระหว่างนี้ปล่อยผ่านได้

## เทคนิค debug ทั่วไป

**อ่าน log จากบนลงล่าง หา error แรก** error หลังจากนั้นมักเป็นผลพวง

**รัน CI ในเครื่อง** ก่อนโทษ GitHub ลองรันคำสั่งเดียวกันเป๊ะ ๆ:

```bash
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm lint && pnpm check && pnpm test:unit --run && pnpm build
```

**เทียบ commit ที่เคยเขียว** `git log --oneline` หา commit ล่าสุดที่ CI ผ่าน
แล้ว `git diff` กับตัวนั้น

**ใช้ `workflow_dispatch`** `deploy.yml` เปิดให้กด run เองได้จากแท็บ Actions
ใช้ทดสอบ deploy โดยไม่ต้อง push commit ขยะ

**เปิด debug log ของ Actions** ตั้ง repository secret `ACTIONS_STEP_DEBUG=true`
แล้วรันใหม่ จะได้ log ละเอียดกว่าเดิมมาก

## จบแล้ว

กลับไป [บทที่ 0](/docs/overview) เพื่อดูภาพรวมอีกครั้ง
หรือดูโค้ดจริงทั้งหมดได้ที่ <https://github.com/phukrit7171/vercel-101>
