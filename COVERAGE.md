# Source coverage and completeness contract

**Status 2026-10-11: pre-production.** Live GitHub Actions probes are not a production availability guarantee. As of the first 7-adapter probe, the six article/trial/openFDA searches returned results and the DailyMed drug-name endpoint returned zero for 'lung cancer'. A second probe uses 'aspirin' for drug labels.

| Source | Kind | Search integration | Semantics & limitations |
|---|---|---|---|
| PubMed | literature | E-utilities live and paged | PubMed query grammar; abstracts not included by ESummary; source coverage not identical to PMC |
| Europe PMC | literature | REST live and cursor-paged | Europe PMC query grammar, overlap with PubMed; OA flag is source evidence |
| Crossref | broad publication metadata | REST cursor-paged | Relevance-based bibliographic query, **not strict Boolean**, not medicine-only; DOI metadata not proof of free text |
| OpenAlex | broad scholarly works | REST cursor-paged | Relevance-based `search`, not medicine-only; anonymous API budget; some duplicate records |
| ClinicalTrials.gov | trials | v2 studies, token-paged | Registry records are not articles; US registry focus; `query.term` differs from PubMed |
| openFDA | FDA drug labels | API, offset-paged | Label search semantics, 1,000+ query limits and skip cap; not all drug information |
| DailyMed | drug labeling | SPL drug-name lookup, page-paged | **Drug-name lookup only**, not general medical-topic full text search |
| Google Scholar | scholarly discovery | Official shortcut only | No automated results or completeness claim |
| CNKI / Wanfang / SinoMed / Cochrane | licensed research | Official shortcut only | Institutional rights and automation license must be reviewed |
| WHO / NICE | guidelines | Official shortcut only | No structured guideline aggregation or update feed yet |
| ChiCTR | trial registry | Official shortcut only | Does not imply worldwide trial registry coverage |
| Theses / institutional repositories | dissertations | Not yet aggregated | Institution-specific API, rights and schemas required |

## Definition of completeness

A successful API response establishes only that a provider returned an *individual page*. The API must report `total`, `loaded`, `next` and `status` independently. Pages requested after a partial response should not restart completed sources. A 404/no records from a source must never be interpreted as zero records across other sources. Deduplicated loaded records must not be confused with the sum of different provider hit estimates.

Upstream systems use different query grammars. **The current search is a federated keyword search, not semantically identical Boolean searching across all sources.** Exact Boolean translation remains an unresolved blocker and must be implemented with per-adapter support checks and user-facing warnings before it can be advertised. An institution subscription does not authorize credential scraping. The project does not claim zero omissions or a synchronized full-text corpus.

## Freshness

Search requests directly query supported live APIs (apart from short-lived in-memory cache); saved watches periodically requery source totals. A watch is not a full incremental content or retraction tracking system. Change-data ingestion, provenance evidence and audit metadata require separate per-provider implementation.

## Verification

- [GitHub CI](https://github.com/lynox-pudding/MedAtlas/actions): TypeScript, offline mapping tests and JS checks.
- [Live upstream API smoke](https://github.com/lynox-pudding/MedAtlas/actions/workflows/live-api.yml): weekly and change-triggered real requests to seven providers; failures visible by source in job logs.
- [PostgreSQL integration](https://github.com/lynox-pudding/MedAtlas/actions/workflows/database.yml): migrates schema, starts Fastify, tests persistent watch endpoints.

**Deploy gate:** A passing live smoke test does not prove unlimited pagination, regional accessibility, query equivalence, licensed-source access, or full-text rights.


## China: implementation status and official evidence (2026-10-11)

**Automated but credential-gated:** Wanfang (万方数据) publishes an API for literature retrieval using `POST /openwanfang/getQuery`, `X-Ca-AppKey`, and `Authorization: APPCODE <code>`. MedAtlas now includes separate `OpenPeriodicalChi`, `OpenThesis`, and `OpenConference` source adapters. The adapters intentionally fail as **unavailable/authorization-required**, not zero hits, when credentials are absent. Field mapping uses a defensive schema because no licensed response has been tested. Do not mark these as verified until valid credentials, live response mappings, authoritative record URLs, and license scope have been tested.

- Official integration source: https://github.com/wanfangdata/wfdata-open-skills
- API reference: https://github.com/wanfangdata/wfdata-open-skills/blob/master/skills/wfdata-search/references/api-catalog.md
- Sample auth code: https://github.com/wanfangdata/wfdata-open-skills/blob/master/skills/wfdata-search/scripts/wf_data_query.py

**Documented REST integration, not yet implemented:** SinoMed documents REST API services for institutions and integrated search: https://www.sinomed.ac.cn/dataService/index.jsp?type=sjfw. Obtain exact technical contract and authorization before building the live adapter.

**Official entry, not aggregated:** CNKI (知网), VIP (维普), ChiCTR (中国临床试验注册中心), NMPA, NHC, Chinese Medical Association, NSTL, 中国科技论文在线. ChiCTR is a WHO-designated primary registry but an unrestricted real-time machine search API for MedAtlas has not been verified. Official WHO registry listing: https://www.who.int/tools/clinical-trials-registry-platform/network/primary-registries/chinese-clinical-trial-registry-%28chictr%29.

**No completeness claims:** China-accessible resources, mainland connectivity, licensing and APIs are different attributes. Static shortcuts cannot be counted as searched databases. For a Chinese-only query, English-dominant providers may have reduced recall without licensed Chinese metadata.
