---
title: 3. ตั้ง CI บน GitHub Actions
order: 3
description: สร้าง .github/workflows/ci.yml ทีละบรรทัด พร้อมไฟล์เต็มที่ก๊อปไปใช้ได้เลย
---

# บทที่ 3 — ตั้ง CI บน GitHub Actions

**เป้าหมาย:** ทุก PR ถูกตรวจอัตโนมัติ และผลลัพธ์อ่านง่ายพอที่จะแก้ได้

## 3.0 GitHub Actions ทำงานยังไง (30 วินาที)

1. คุณสร้างไฟล์ YAML ไว้ใน `.github/workflows/` แล้ว push ขึ้น GitHub
2. GitHub อ่านไฟล์นั้น เห็นว่า "ให้ทำงานเมื่อมีเหตุการณ์ X"
3. พอเกิดเหตุการณ์นั้น GitHub เตรียมเครื่องเสมือน (runner) ให้แล้วรันคำสั่งตามที่เขียนไว้

ไม่ต้องไปกดเปิดอะไรใน dashboard — **แค่มีไฟล์อยู่ใน repo ก็ทำงานแล้ว**

โครงสร้างไฟล์ workflow:

```yaml
name: ชื่อที่จะโชว์ในแท็บ Actions
on: # เหตุการณ์ที่ทริก
jobs: # งานที่จะทำ
  ชื่อ-job:
    runs-on: ubuntu-latest # เครื่องแบบไหน
    steps: # ทำอะไรบ้าง เรียงจากบนลงล่าง
      - uses: ... # เรียกใช้ action ที่คนอื่นเขียนไว้
      - run: ... # รันคำสั่ง shell
```

## 3.1 สร้างไฟล์

```bash
mkdir -p .github/workflows
```

แล้วสร้าง `.github/workflows/ci.yml` ตามนี้ (ไฟล์เต็ม ก๊อปไปใช้ได้เลย):

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  quality:
    name: Lint, typecheck, unit tests, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Lint (prettier + eslint)
        run: pnpm lint

      - name: Typecheck (svelte-check)
        run: pnpm check

      - name: Install Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Unit tests
        run: pnpm test:unit --run

      - name: Build
        run: pnpm build

  e2e:
    name: End-to-end tests
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Install Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Playwright
        run: pnpm test:e2e

      - name: Upload Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

ที่เหลือของบทนี้คืออธิบายว่าแต่ละส่วนมีไว้ทำไม

## 3.2 workflow ทำงานเมื่อไหร่

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

- `pull_request` — ด่านหลัก ตรวจก่อน merge
- `push: main` — ตรวจซ้ำหลัง merge เพราะผลของการ merge อาจต่างจากตอนทดสอบใน PR
  (branch คุณเขียว แต่ระหว่างนั้นมีคน merge อย่างอื่นเข้า main จนชนกัน)

## 3.3 concurrency — อย่าเผา runner ฟรี ๆ

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

push สามครั้งรัว ๆ ปกติจะได้ CI สามรอบ ทั้งที่สนใจแค่รอบสุดท้าย
บรรทัดนี้ยกเลิกรอบเก่าให้อัตโนมัติ — ประหยัดเวลาและโควตา

`group` คือกุญแจ: run ที่มี `group` เดียวกันจะเบียดกัน ที่นี่ใช้ `github.ref`
(ชื่อ branch) เป็นส่วนหนึ่งของกุญแจ แปลว่า **คนละ branch ไม่เบียดกัน**

> เดี๋ยวจะเห็นว่า `release.yml` และ `deploy.yml` ตั้ง `cancel-in-progress: false` —
> งานที่สร้าง tag หรือ deploy **ห้ามถูกยกเลิกกลางคัน** เพราะจะเหลือสถานะครึ่ง ๆ กลาง ๆ

## 3.4 permissions — ให้สิทธิ์เท่าที่ต้องใช้

```yaml
permissions:
  contents: read
```

`GITHUB_TOKEN` เป็น token ที่ GitHub แจกให้ทุก workflow อัตโนมัติ ในบาง repo
มันมีสิทธิ์เขียนมาตั้งแต่ต้น CI ที่แค่รันเทสไม่ต้องเขียนอะไรทั้งนั้น
ประกาศไว้ชัด ๆ ว่าอ่านอย่างเดียว ถ้ามี action อันไหนโดน compromise มันก็ทำอะไรไม่ได้

## 3.5 setup ที่ทำให้ install เร็วและนิ่ง

```yaml
- uses: pnpm/action-setup@v4

- uses: actions/setup-node@v5
  with:
    node-version-file: .nvmrc
    cache: pnpm

- run: pnpm install --frozen-lockfile
```

สามจุดที่ต้องเข้าใจ:

**1. `pnpm/action-setup` ต้องมาก่อน `setup-node`**
เพราะ `cache: pnpm` ต้องเจอ pnpm ก่อนถึงจะรู้ที่ตั้ง store
ถ้าสลับลำดับจะได้ error `Unable to locate executable file: pnpm`
เวอร์ชัน pnpm มาจากฟิลด์ `packageManager` ใน `package.json`:

```json
"packageManager": "pnpm@11.13.0"
```

**2. `node-version-file: .nvmrc`**
เขียนเวอร์ชัน Node ไว้ที่เดียว ใช้ทั้งเครื่อง dev, CI และ Vercel ไม่ต้องไล่แก้สามที่

**3. `--frozen-lockfile`**
ถ้า `pnpm-lock.yaml` ไม่ตรงกับ `package.json` ให้ล้มเลย อย่าไปแก้ให้
ผลคือสิ่งที่ CI ติดตั้งเป็นชุดเดียวกับที่คุณติดตั้งในเครื่องเป๊ะ ๆ

## 3.6 แบ่งเป็นสอง job

```yaml
jobs:
  quality: # lint → check → unit test → build
  e2e: # needs: quality
```

`needs: quality` แปลว่า job `e2e` จะไม่เริ่มจนกว่า `quality` จะสำเร็จ

ทำไมไม่รวมเป็น job เดียว:

- **อ่านผลง่ายกว่า** เห็นทันทีว่าแดงเพราะ lint หรือเพราะ e2e
- **ไม่จ่ายค่า e2e ฟรี ๆ** e2e ต้องโหลด Chromium ~100MB ถ้า lint แดงตั้งแต่แรกก็ไม่ต้องเสียเวลาตรงนั้น
- **ตั้ง status check แยกกันได้** ในบทที่ 7 เราจะบังคับให้ทั้งสอง job เขียวก่อน merge

ข้อแลกเปลี่ยน: job ใหม่ = runner ใหม่ = ต้อง checkout และ install ใหม่
สำหรับโปรเจกต์เล็กมันคุ้มกับความชัดเจน โปรเจกต์ใหญ่ค่อยพิจารณา build cache ข้าม job

## 3.7 artifact ตอนพัง

```yaml
- name: Upload Playwright report
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

`if: ${{ !cancelled() }}` สำคัญมาก — ถ้าไม่ใส่ step นี้จะถูกข้ามเมื่อ step ก่อนหน้าล้ม
ซึ่งคือตอนที่คุณ **ต้องการ report มากที่สุด**

(ใช้ `!cancelled()` แทน `always()` เพื่อไม่ให้มันยังทำงานตอนที่คุณกดยกเลิก run เอง)

วิธีดู: เข้าแท็บ **Actions** → คลิก run ที่แดง → เลื่อนลงล่างสุดหา **Artifacts** →
โหลด `playwright-report` → แตกไฟล์แล้วเปิด `index.html` จะเห็น trace, screenshot
และ video ของเทสที่ล้ม

## 3.8 push แล้วดูผล

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, test and build workflow"
git push
```

เข้า repo บน GitHub → แท็บ **Actions** → จะเห็น run ชื่อ **CI** กำลังทำงาน

คลิกเข้าไปจะเห็น job สองอันเรียงกัน คลิกที่ job แล้วกางแต่ละ step ดู log ได้

## ✅ เช็คว่าผ่านบทนี้แล้ว

```bash
git switch -c test-ci
git commit --allow-empty -m "test: trigger ci"
git push -u origin test-ci
```

เปิด PR แล้วดูแท็บ Checks:

- เห็นสอง job: `Lint, typecheck, unit tests, build` และ `End-to-end tests`
- job ที่สองเริ่มหลังจากอันแรกเสร็จ ไม่ใช่พร้อมกัน
- ลอง push ซ้ำอีกครั้งระหว่าง CI กำลังรัน → run เก่าขึ้นสถานะ cancelled

ลองทำให้มันแดงดูสักครั้งด้วย เช่นแก้ `src/lib/docs.ts` ให้ไม่เรียงลำดับ
แล้ว push — จะเห็นว่า unit test แดง และ job `e2e` ไม่ได้รันเลย

## ต่อไป

[บทที่ 4 — เวอร์ชันและ tag ด้วย Changesets](/docs/versioning)
