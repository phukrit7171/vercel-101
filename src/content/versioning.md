---
title: 4. เวอร์ชันและ tag ด้วย Changesets
order: 4
description: ตั้ง release.yml ให้ bot เปิด Release PR แล้วสร้าง git tag ให้อัตโนมัติ
---

# บทที่ 4 — เวอร์ชันและ tag ด้วย Changesets

**เป้าหมาย:** ทุก release มีเลขเวอร์ชัน มี git tag และมี CHANGELOG ที่มนุษย์อ่านรู้เรื่อง โดยไม่ต้องมีใครมานั่งจำ

## 4.1 ปัญหาที่กำลังแก้

ทำเองแบบ `npm version patch && git push --tags` ใช้ได้ตอนทำคนเดียว พอเป็นทีม:

- สอง PR bump version พร้อมกัน → conflict ใน `package.json` ทุกครั้ง
- ไม่มีใครรู้ว่า `v1.4.2` ต่างจาก `v1.4.1` ตรงไหน ต้องไล่อ่าน commit เอา
- คนตัดสินใจว่า patch หรือ minor คือคนกด release ไม่ใช่คนเขียนโค้ด ซึ่งเป็นคนที่รู้จริง

Changesets แก้ด้วยการย้ายการตัดสินใจไปไว้ที่ **ตอนเขียนโค้ด** และเลื่อนการ bump ไปไว้ **ตอน release**

## 4.2 ติดตั้ง

```bash
pnpm add -D @changesets/cli
pnpm exec changeset init
```

จะได้โฟลเดอร์ `.changeset/` มาพร้อม `config.json` และ `README.md`

แก้ `.changeset/config.json` เพิ่มส่วน `privatePackages`:

```json
{
	"$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
	"changelog": "@changesets/cli/changelog",
	"commit": false,
	"fixed": [],
	"linked": [],
	"access": "restricted",
	"baseBranch": "main",
	"updateInternalDependencies": "patch",
	"ignore": [],
	"privatePackages": {
		"version": true,
		"tag": true
	}
}
```

`package.json` ของเราตั้ง `"private": true` เพราะเป็นเว็บ ไม่ใช่ library ที่จะขึ้น npm
โดยดีฟอลต์ Changesets จะข้าม package ที่ private ไปเลย บล็อกข้างบนบอกว่า
**"อย่าข้าม — ยัง bump version และสร้าง tag ให้ด้วย แค่ไม่ต้อง publish"**

เพิ่ม script ไว้เรียกง่าย ๆ:

```json
"scripts": {
	"changeset": "changeset"
}
```

## 4.3 ชีวิตประจำวันของนักพัฒนา

```bash
pnpm changeset
```

มันจะถามสองข้อ:

1. **patch / minor / major?** — ใช้กติกา semver: แก้บั๊ก = patch, เพิ่มของใหม่ = minor,
   ของเก่าพัง = major
2. **สรุปว่าเปลี่ยนอะไร** — ประโยคนี้จะไปโผล่ใน CHANGELOG ตรง ๆ เขียนให้คนอ่าน ไม่ใช่เขียนให้ตัวเอง

ได้ไฟล์ `.changeset/สุ่มชื่อมา.md` ออกมา หน้าตาแบบนี้:

```markdown
---
'vercel-101': minor
---

เพิ่มปุ่มค้นหาใน sidebar
```

commit ไฟล์นี้ไปกับ PR ตามปกติ **หนึ่ง PR อาจมีหลาย changeset ก็ได้** ถ้ามันทำหลายเรื่อง

> PR ที่ไม่ได้เปลี่ยนพฤติกรรมของเว็บ (แก้ typo ใน comment, ปรับ CI) ไม่ต้องมี changeset

## 4.4 ไฟล์ release.yml เต็ม ๆ

สร้าง `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write # สร้าง commit และ tag
  pull-requests: write # เปิด/อัปเดต Version Packages PR

jobs:
  release:
    name: Version and tag
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0 # changesets ต้องการ history เต็มเพื่อ diff กับ main

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Changesets
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset tag
          commit: 'chore(release): version packages'
          title: 'chore(release): version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`changesets/action` ฉลาดพอที่จะดูเองว่าอยู่ในสถานการณ์ไหน:

| สถานการณ์                                  | มันทำอะไร                                        |
| ------------------------------------------ | ------------------------------------------------ |
| มี changeset ค้างใน `.changeset/`          | เปิด (หรืออัปเดต) PR ชื่อ **"Version Packages"** |
| PR นั้นเพิ่งถูก merge (ไม่เหลือ changeset) | รันคำสั่งใน `publish:` → ที่นี่คือสร้าง git tag  |

**`publish: pnpm changeset tag` ไม่ใช่ `changeset publish`** — `publish` จะยิงขึ้น npm
ส่วน `tag` แค่สร้าง git tag แล้ว push ซึ่งคือสิ่งที่เราต้องการสำหรับเว็บ

`fetch-depth: 0` ก็ห้ามลืม — `actions/checkout` ดีฟอลต์ดึงมาแค่ commit เดียว
Changesets จะเทียบกับ `main` ไม่ได้ถ้าไม่มี history

## 4.5 ตั้งค่า repo ให้ bot ทำงานได้ ⚠️

**นี่คือขั้นตอนที่คนพลาดมากที่สุดในบทนี้** ไปที่:

**Settings → Actions → General → Workflow permissions**

แล้วติ๊กทั้งสองข้อ:

- ✅ **Read and write permissions**
- ✅ **Allow GitHub Actions to create and approve pull requests**

กด **Save**

ถ้าไม่เปิดข้อสอง workflow จะรันผ่าน (เขียว!) แต่ไม่มี PR โผล่มา และใน log
จะมีบรรทัด `GitHub Actions is not permitted to create or approve pull requests`
ซ่อนอยู่

## 4.6 ลำดับเหตุการณ์เต็ม ๆ

```
1. PR #12 "เพิ่มปุ่มค้นหา"  +  .changeset/wild-cats-sing.md (minor)
   └─ merge เข้า main
        └─ release.yml → เปิด PR #13 "chore(release): version packages"
              ├─ package.json     0.1.0 → 0.2.0
              ├─ CHANGELOG.md     เพิ่มหัวข้อ ## 0.2.0
              └─ ลบ .changeset/wild-cats-sing.md ทิ้ง

2. merge PR #13
   └─ release.yml → ไม่มี changeset เหลือแล้ว → รัน changeset tag
        └─ git tag v0.2.0 ถูกสร้างและ push
```

จุดที่ควรชี้ให้ผู้เรียนเห็น: **PR #13 คือจุดที่มนุษย์ยังได้ review** ก่อนของจะออก
ถ้าเลข version หรือ CHANGELOG ผิด แก้ใน PR นั้นได้เลย

## 4.7 ทำไมไม่ใช้ semantic-release

semantic-release อ่าน Conventional Commits (`feat:`, `fix:`) แล้ว release ทันทีที่ merge main
ไม่มี PR ให้ review

|                            | Changesets               | semantic-release       |
| -------------------------- | ------------------------ | ---------------------- |
| ตัดสินระดับ version        | คนเขียน ตอนเปิด PR       | อ่านจาก commit message |
| มีด่านให้ review           | มี (Version Packages PR) | ไม่มี                  |
| commit message             | เขียนยังไงก็ได้          | ต้องคุมรูปแบบเคร่งครัด |
| หลาย package ใน repo เดียว | รองรับดีมาก              | ต้องต่อ plugin เพิ่ม   |

สำหรับการสอน Changesets ชนะเพราะ **ทุกขั้นตอนมองเห็นได้** ผู้เรียนเห็น PR เห็น diff
เห็น tag เกิดขึ้นทีละอย่าง ส่วน semantic-release เหมาะกับทีมที่ระเบียบ commit ดีอยู่แล้ว
และอยากให้อัตโนมัติเต็มที่

## ✅ เช็คว่าผ่านบทนี้แล้ว

```bash
git switch -c test-changeset
pnpm changeset          # เลือก patch แล้วพิมพ์อะไรก็ได้
git add .changeset && git commit -m "docs: test changeset"
git push -u origin test-changeset
```

- merge PR → มี PR ใหม่ชื่อ "chore(release): version packages" โผล่มาเอง
- เปิดดู diff เห็น `package.json` bump และ `CHANGELOG.md` ที่มีข้อความคุณ
- merge PR นั้น → รอ workflow จบ แล้ว:

```bash
git fetch --tags
git tag
```

ต้องเห็น tag ใหม่โผล่มา

## ต่อไป

[บทที่ 5 — CD ทาง A: Vercel Git Integration](/docs/cd-git-integration)
