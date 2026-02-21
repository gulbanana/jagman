<div class="sidebar">
	<div class="section">
		<div class="section-label">Agents</div>
		<div class="stat">
			<span class="value">16</span>
			<span class="desc">total</span>
		</div>
		<div class="stat">
			<span class="dot dot-running"></span>
			<span class="value">3</span>
			<span class="desc">running</span>
		</div>
		<div class="stat">
			<span class="dot dot-waiting"></span>
			<span class="value">2</span>
			<span class="desc">waiting</span>
		</div>
		<div class="stat">
			<span class="dot dot-done"></span>
			<span class="value">11</span>
			<span class="desc">done</span>
		</div>
	</div>

	<div class="section">
		<div class="section-label">Repos</div>
		<div class="stat">
			<span class="value">3</span>
			<span class="desc">tracked</span>
		</div>
		<div class="stat">
			<span class="value">2</span>
			<span class="desc">active</span>
		</div>
	</div>

	<div class="section">
		<div class="section-label">Queue</div>
		<div class="stat">
			<span class="value">2</span>
			<span class="desc">permissions</span>
		</div>
		<div class="stat">
			<span class="value">1</span>
			<span class="desc">review</span>
		</div>
		<div class="stat">
			<span class="value">1</span>
			<span class="desc">prompt</span>
		</div>
	</div>

	<div class="section">
		<div class="section-label">Session</div>
		<div class="stat">
			<span class="value">1h 12m</span>
		</div>
		<div class="stat">
			<span class="value">47</span>
			<span class="desc">tasks run</span>
		</div>
		<div class="stat">
			<span class="value">38</span>
			<span class="desc">approved</span>
		</div>
	</div>
</div>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 32px;
		padding: 16px 0;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.section-label {
		font-family: var(--stack-industrial);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ctp-overlay2);
		margin-bottom: 4px;
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.value {
		font-family: var(--stack-code);
		font-size: 13px;
		color: var(--ctp-text);
	}

	.desc {
		font-family: var(--stack-ui);
		font-size: 11px;
		color: var(--ctp-subtext0);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 8px;
		flex-shrink: 0;
		align-self: center;
	}

	.dot-running {
		background: var(--ctp-green);
	}

	.dot-waiting {
		background: var(--ctp-yellow);
	}

	.dot-done {
		background: var(--ctp-overlay1);
	}
</style>
