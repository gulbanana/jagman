sooner:
- reintroduce this: " - Cross-repo sorting (repoOrder) is dropped — repos render in DB order. This is acceptable; the active-first repo sorting can be re-added client-side later if needed."
- remove getAllRepos()
- rename getRepoPaths -> Stubs, getRepoData -> Summary, RepoColumnContent -> RepoColumn
later:
- more perf fixes (parallel agents)
- xplat process (this is also perf)
- switch to local gg to validate workspace apis
- wide + concertina cards
- card: prompt + config
- card: prompt + changelist
- Actually Launch Agent
- takeover mode