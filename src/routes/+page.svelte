<script lang="ts">
	import DocList from '$lib/DocList.svelte';
	import { docs } from '$lib/docs';
</script>

<svelte:head>
	<title>vercel-101 — CI/CD กับ SvelteKit บน Vercel</title>
	<meta
		name="description"
		content="repo ตัวอย่างสำหรับสอน CI/CD และการ deploy SvelteKit บน Vercel"
	/>
</svelte:head>

<h1>vercel-101</h1>
<p>
	repo ตัวอย่างสำหรับสอนตั้งแต่ CI (lint / test / version tag) ไปจนถึง CD บน Vercel โดยใช้เว็บ docs
	ตัวนี้เองเป็นของที่ deploy
</p>

<DocList {docs} />
