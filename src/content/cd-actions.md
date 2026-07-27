---
title: 6. CD ทาง B — Actions + Vercel CLI
order: 6
description: ตั้ง secrets, เขียน deploy.yml ให้รอ CI เขียว และใส่ด่านอนุมัติด้วยมือ
---

# บทที่ 6 — CD ทาง B: GitHub Actions + Vercel CLI

**เป้าหมาย:** production deploy เกิดขึ้น **หลัง** CI เขียวเท่านั้น และใส่ด่านอนุมัติได้

## 6.0 อ่านก่อน: คุณอาจไม่จำเป็นต้องใช้บทนี้ ⚠️

ถ้ามาจาก[บทที่ 5](/docs/cd-git-integration) แล้ว คุณรู้แล้วว่า branch protection
ปิดช่องว่างใหญ่ที่สุดของทาง A ไปได้ — โค้ดที่เทสไม่ผ่านเข้า main ไม่ได้ตั้งแต่แรก

**สำหรับ docs site / blog / เว็บ marketing: ทาง A + branch protection พอแล้วจริง ๆ**
อย่าทำบทนี้เพียงเพราะรู้สึกว่ามัน "ถูกต้องกว่า" — มันแลกด้วย secret สามตัวที่ต้องดูแล
token ที่หมดอายุ และ workflow ที่ต้อง maintain

ทาง B คุ้มเมื่อคุณต้องการอย่างน้อยหนึ่งข้อนี้:

| ต้องการ                                                | ทำไมทาง A ให้ไม่ได้                     |
| ------------------------------------------------------ | --------------------------------------- |
| **deploy artifact ตัวเดียวกับที่เทส**                  | Vercel build ใหม่เองในสภาพแวดล้อมของมัน |
| **คนกดอนุมัติก่อนขึ้น production**                     | Vercel ไม่มีด่านนี้                     |
| **รัน migration / smoke test คั่นก่อนหรือหลัง deploy** | ไม่มีที่ให้แทรก step                    |
| **audit trail ว่าใครสั่ง deploy อันไหน**               | log อยู่คนละที่กับ CI                   |
| **monorepo ที่ deploy เฉพาะบางส่วน**                   | ต้องเขียน logic เอง                     |

ถ้าไม่เข้าข้อไหนเลย → ข้ามไป[บทที่ 7](/docs/branch-protection) ได้เลย
กลับมาอ่านตอนโปรเจกต์โตขึ้นก็ได้

ที่เหลือของบทนี้คือวิธีทำจริงเมื่อถึงเวลานั้น

## 6.1 ปิด auto-deploy ของ Vercel ก่อน

### ทำไมเปิดคู่กันไม่ได้

คำถามที่ถูกถามบ่อย: "เปิดทั้งสองทางเลยได้ไหม" — ได้ แต่ไม่ควร เพราะจะกลายเป็นแบบนี้:

```
push main
  ├─ Vercel Git Integration → build → production   (เริ่มทันที เสร็จก่อน)
  └─ CI เขียว → deploy.yml   → build → production   (เสร็จทีหลัง ทับของแรก)
```

- จ่ายค่า build สองรอบสำหรับ commit เดียว
- production alias ถูกเขียนทับสองครั้ง ใครเสร็จทีหลังชนะ
- ถ้า CI แดง ตัวแรกก็ขึ้น production ไปแล้วอยู่ดี — เสียประโยชน์ของทาง B ไปทั้งหมด

สรุปคือได้ข้อเสียของทั้งสองทางมารวมกัน โดยไม่ได้ข้อดีของทาง B เลย
**ใช้ project เดียว แล้วเลือกทางเดียว** พลิกไปมาได้ด้วยสวิตช์สองตัว:

| ต้องการ | `vercel.json`   | repo variable             |
| ------- | --------------- | ------------------------- |
| ทาง A   | `"main": true`  | ไม่ตั้ง (หรือ `false`)    |
| ทาง B   | `"main": false` | `DEPLOY_VIA_ACTIONS=true` |

> ถ้าอยากให้ผู้เรียนเห็นสองแบบทำงานพร้อมกันจริง ๆ ต้องสร้าง **สอง Vercel project**
> จาก repo เดียวกัน แล้วปิด Git Integration ของ project ที่สองผ่าน dashboard
> (`vercel.json` ปิดแยกราย project ไม่ได้ เพราะเป็นไฟล์ใน repo ที่ทั้งคู่อ่านร่วมกัน)
> — ทำได้ แต่สำหรับการสอนมักจะสับสนมากกว่าได้ประโยชน์

### วิธีปิด

เลือกวิธีใดวิธีหนึ่ง:

**วิธีที่ 1 — ผ่านไฟล์ (แนะนำ เพราะอยู่ใน git ให้คนอื่นเห็น)**

สร้าง/แก้ `vercel.json` ที่ราก repo:

```json
{
	"$schema": "https://openapi.vercel.sh/vercel.json",
	"git": {
		"deploymentEnabled": {
			"main": false
		}
	}
}
```

repo นี้ตั้งไว้เป็น `true` อยู่ (= ทาง A ทำงาน) เปลี่ยนเป็น `false` เมื่อจะย้ายมาทาง B

**วิธีที่ 2 — ผ่าน dashboard** Project → Settings → Git → **Disconnect**
วิธีนี้ตัดขาดสนิทกว่า แต่คนอ่านโค้ดจะไม่รู้ว่าถูกปิดไว้

## 6.2 หา ID สามตัว

```bash
pnpm add -g vercel
vercel login
vercel link          # เลือก scope และ project ที่สร้างไว้ในบทที่ 5
cat .vercel/project.json
```

จะได้ประมาณนี้:

```json
{ "projectId": "prj_xxxxxxxx", "orgId": "team_xxxxxxxx" }
```

ส่วน **token** สร้างที่ <https://vercel.com/account/settings/tokens>:

1. กด **Create Token**
2. ตั้งชื่อให้รู้เรื่อง เช่น `github-actions-vercel-101`
3. **Scope** เลือกเฉพาะ team/account ที่ใช้ ไม่ต้องให้กว้างกว่านั้น
4. **Expiration** ตั้งสั้นที่สุดเท่าที่ยอมรับได้
5. ก๊อปค่าเก็บไว้ — **มันโชว์ครั้งเดียว**

> `.vercel/` อยู่ใน `.gitignore` อยู่แล้ว — **ห้าม commit** เด็ดขาด

## 6.3 ใส่ค่าลง GitHub ทีละคลิก

ไปที่ repo บน GitHub → **Settings** → เมนูซ้าย **Secrets and variables** → **Actions**

### แท็บ Secrets

กด **New repository secret** สามครั้ง ใส่:

| Name                | Secret                                 |
| ------------------- | -------------------------------------- |
| `VERCEL_TOKEN`      | token ที่เพิ่งสร้าง                    |
| `VERCEL_ORG_ID`     | `orgId` จาก `.vercel/project.json`     |
| `VERCEL_PROJECT_ID` | `projectId` จาก `.vercel/project.json` |

ใส่แล้วดูค่าไม่ได้อีก แก้ได้อย่างเดียว — นั่นคือจุดประสงค์ของมัน

### แท็บ Variables

กด **New repository variable**:

| Name                 | Value  |
| -------------------- | ------ |
| `DEPLOY_VIA_ACTIONS` | `true` |

ตัวนี้ไม่ใช่ความลับ เลยใส่เป็น variable ไม่ใช่ secret — มันคือสวิตช์เปิด/ปิดของบทนี้
ถ้ายังไม่ได้ตั้ง workflow deploy จะข้ามทั้งงาน ไม่แดง ไม่รบกวนใคร
ทำให้ repo ตัวอย่างนี้ clone ไปใช้ได้เลยโดยไม่ต้องมี Vercel

## 6.4 ไฟล์ deploy.yml เต็ม ๆ

สร้าง `.github/workflows/deploy.yml`:

```yaml
name: Deploy (production)

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  deploy:
    name: Build and deploy with Vercel CLI
    runs-on: ubuntu-latest
    if: >-
      vars.DEPLOY_VIA_ACTIONS == 'true' &&
      (github.event_name == 'workflow_dispatch' ||
       github.event.workflow_run.conclusion == 'success')
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Install Vercel CLI
        run: pnpm add -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy prebuilt output
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"
          echo "🚀 Deployed to $url" >> "$GITHUB_STEP_SUMMARY"
```

## 6.5 รอ CI ด้วย `workflow_run`

```yaml
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
  workflow_dispatch:
```

`workflow_run` ยิงเมื่อ workflow ชื่อ `CI` **จบ** บน main — จบแบบไหนก็ยิง รวมทั้งตอนแดง
เลยต้องกรองเองอีกชั้นใน `if:`:

```yaml
if: >-
  vars.DEPLOY_VIA_ACTIONS == 'true' &&
  (github.event_name == 'workflow_dispatch' ||
   github.event.workflow_run.conclusion == 'success')
```

> ชื่อใน `workflows: [CI]` ต้องตรงกับค่า `name:` ใน `ci.yml` เป๊ะ ๆ ไม่ใช่ชื่อไฟล์

`workflow_dispatch` แถมมาให้กด deploy เองจากหน้าเว็บได้ (Actions → เลือก workflow →
ปุ่ม **Run workflow**) ใช้เวลาต้อง re-deploy โดยไม่มี commit ใหม่

## 6.6 กับดักใหญ่: checkout ผิด commit

```yaml
- uses: actions/checkout@v5
  with:
    ref: ${{ github.event.workflow_run.head_sha || github.sha }}
```

workflow ที่ทริกด้วย `workflow_run` จะ checkout **ปลาย branch ล่าสุด** ให้โดยดีฟอลต์
ไม่ใช่ commit ที่ CI เพิ่งตรวจ ถ้ามีคน push แทรกระหว่างนั้น คุณจะ deploy โค้ดที่ยังไม่ผ่าน CI
— ซึ่งทำลายเหตุผลทั้งหมดของการมาทางนี้ บรรทัด `ref:` แก้เรื่องนี้

## 6.7 สามคำสั่งของ Vercel CLI

```bash
vercel pull --yes --environment=production --token=$VERCEL_TOKEN
vercel build --prod --token=$VERCEL_TOKEN
vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

| คำสั่ง              | ทำอะไร                                                         |
| ------------------- | -------------------------------------------------------------- |
| `pull`              | ดึง project settings + env production ลงมาไว้ใน `.vercel/`     |
| `build`             | build ในเครื่อง runner ได้ผลลัพธ์เป็น `.vercel/output`         |
| `deploy --prebuilt` | อัปโหลดผลลัพธ์ที่ build แล้วขึ้นไปตรง ๆ ไม่ build ซ้ำบน Vercel |

`--prebuilt` คือหัวใจ: **สิ่งที่ deploy คือสิ่งที่ runner นี้ build จาก commit ที่ CI ตรวจแล้ว**
ไม่ใช่ของที่ Vercel ไป build ใหม่ในสภาพแวดล้อมอื่น

`VERCEL_ORG_ID` และ `VERCEL_PROJECT_ID` ตั้งเป็น `env:` ระดับ job เพราะ CLI
อ่านจาก environment variable เองโดยไม่ต้องส่งเป็น flag

`vercel deploy` พิมพ์ URL ออก stdout เราจึงเก็บไปโชว์ได้:

```bash
url=$(vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN)
echo "url=$url" >> "$GITHUB_OUTPUT"
echo "🚀 Deployed to $url" >> "$GITHUB_STEP_SUMMARY"
```

- `$GITHUB_OUTPUT` = ส่งค่าไปให้ step อื่นใช้ต่อ (`steps.deploy.outputs.url`)
- `$GITHUB_STEP_SUMMARY` = เขียน markdown ขึ้นหน้าสรุปของ run

## 6.8 ด่านอนุมัติด้วยมือ (GitHub Environments)

```yaml
environment:
  name: production
  url: ${{ steps.deploy.outputs.url }}
```

ตั้งค่าฝั่ง GitHub:

1. **Settings** → **Environments** → **New environment**
2. ตั้งชื่อ `production` (ต้องตรงกับใน YAML) → **Configure environment**
3. ติ๊ก **Required reviewers** แล้วใส่ชื่อคนที่มีสิทธิ์อนุมัติ (สูงสุด 6 คน)
4. เลื่อนลงไปที่ **Deployment branches and tags** → เลือก **Selected branches**
   → เพิ่ม `main` เพื่อกันไม่ให้ branch อื่นใช้ environment นี้ (และเข้าถึง secret ของมัน)
5. **Save protection rules**

หลังจากนั้น job จะหยุดรอ มีปุ่ม **Review deployments** ให้กด และ GitHub จะส่ง
notification ให้ reviewer ส่วนช่อง `url` ทำให้หน้า repo แสดงลิงก์ deployment ล่าสุดให้

> Required reviewers ใช้ได้ฟรีบน public repo ส่วน private repo ต้องเป็นแผน Pro/Enterprise

## 6.9 Preview deploy ของ PR

สร้าง `.github/workflows/preview.yml` — ใช้คำสั่งชุดเดียวกันแต่ **ไม่มี `--prod`**:

```yaml
name: Deploy (preview)

on:
  pull_request:

concurrency:
  group: preview-${{ github.head_ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  preview:
    runs-on: ubuntu-latest
    if: vars.DEPLOY_VIA_ACTIONS == 'true' && github.event.pull_request.head.repo.fork == false
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm add -g vercel@latest
      - run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"
```

แล้วเอา URL ไป comment ใน PR ด้วย `actions/github-script` โดยหา comment เดิม
จาก marker ก่อน ถ้าเจอก็แก้ของเดิม ไม่งั้น PR ที่ push บ่อย ๆ จะมี comment รกเป็นสิบอัน
(ดูโค้ดเต็มใน `.github/workflows/preview.yml` ของ repo นี้)

สองข้อสังเกต:

- **preview ไม่ต้องรอ CI** เพราะมันไม่ใช่ production reviewer ควรได้ URL เร็วที่สุด
- **PR จาก fork จะถูกข้าม** (`github.event.pull_request.head.repo.fork == false`)
  เพราะ GitHub ไม่ส่ง secrets ให้ workflow ที่ทริกจาก fork — เป็นเรื่องดี ไม่งั้นใครก็ขโมย
  token คุณได้ด้วยการเปิด PR

## ✅ เช็คว่าผ่านบทนี้แล้ว

- ตั้ง secrets ครบสามตัว + variable `DEPLOY_VIA_ACTIONS=true`
- push เข้า main → CI รันจบก่อน แล้ว `Deploy (production)` ถึงเริ่ม
- ถ้าตั้ง required reviewer ไว้ → job ค้างรออนุมัติ กดแล้วถึงไปต่อ
- หน้า summary ของ run มีบรรทัด `🚀 Deployed to https://...`
- **ข้อสอบจริงของบทนี้:** ทำให้ test แดงแล้ว push → CI แดง และ deploy **ไม่ทำงาน**

## ต่อไป

[บทที่ 7 — เทียบสองทาง + branch protection](/docs/branch-protection)
