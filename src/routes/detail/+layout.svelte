<script lang="ts">
	let { children } = $props();
</script>

<div class="detail-frame">
	{@render children()}
</div>

<style>
	.detail-frame {
		background: var(--ctp-crust);
		min-height: 100vh;
	}
</style>
