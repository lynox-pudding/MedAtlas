# Source coverage and completeness contract

**Status 2026-10-11: pre-production.** Live GitHub Actions probes are not a production availability guarantee. Initial live probes established actual first-page responses, and follow-up probes tested cursor pagination. DailyMed is tested using the drug name 'aspirin'. Intermittent HTTP 429/503 errors are recorded, not converted into zero results.

| Source | Kind | Search integration | Semantics & limitations |
|---|---|---|---|
| PubMed | literature | E-utilities live and paged | PubMed query grammar; abstracts not included by ESummary; source coverage not identical to PMC |
| Europe PMC | literature | REST live and cursor-paged | Europe PMC query grammar, overlap with PubMed; OA flag is source evidence |
| Crossref | broad publication metadata | REST cursor-paged | Relevance-based bibliographic query, **not strict Boolean**, not medicine-only; DOI metadata not proof of free text |
| OpenAlex | broad scholarly works | REST cursor-paged | Relevance-based `search`, not medicine-only; anonymous API budget; some duplicate records |
| ClinicalTrials.gov | trials | v2 studies, token-paged | Registry records are not articles; US registry focus; `query.term` differs from PubMed |
| openFDA | FDA drug labels | API, offset-paged | Label search semantics, 1,000+ query limits and skip cap; not all drug information |
| DailyMed | drug labeling | SPL drug-name lookup, page-paged | **Drug-name lookup only**, not general medical-topic full text search |
| OpenAlex dissertations | dissertations | Public metadata type filter and cursor | OpenAlex type:dissertation, not complete Chinese thesis coverage |
| PubMed practice guidelines | guidelines | PubMed publication-type subset | Not a NICE/WHO guideline repository; literature indexing only |
| DataCite datasets | research data | Public DOI metadata and cursor | Dataset metadata, not necessarily downloadable full data |
| DataCite dissertations | dissertations | Public DOI metadata and cursor | DataCite Findable DOI subset; not all theses |
| Wanfang Chinese journals / theses / proceedings | licensed research | Authorized API adapter, requires AppKey/AppCode | Without credentials returns unavailable; schema based on official documentation, not live authenticated verification |
| Google Scholar | scholarly discovery | Official shortcut only | No automated results or completeness claim |
| CNKI / SinoMed / Cochrane / VIP | licensed research | Official shortcut only | Institutional rights and automation license must be reviewed |
| WHO / NICE | guidelines | Official shortcut only | No structured guideline aggregation or update feed yet |
| ChiCTR | trial registry | Official shortcut only | Does not imply worldwide trial registry coverage |
| Other theses / institutional repositories | dissertations | Official entry only | Beyond OpenAlex/DataCite coverage, institution APIs and licenses must be checked |

## Definition of completeness

A successful API response establishes only that a provider returned an *individual page*. The API must report `total`, `loaded`, `next` and `status` independently. Pages requested after a partial response should not restart completed sources. A 404/no records from a source must never be interpreted as zero records across other sources. Deduplicated loaded records must not be confused with the sum of different provider hit estimates.

Upstream systems use different query grammars. **The current search is a federated keyword search, not semantically identical Boolean searching across all sources.** Opt-in `strict=true` rejects adapters that cannot preserve meaningful Boolean operations, rather than silently returning non-equivalent results. General search still uses source-native relevance logic. Full cross-provider semantic equivalence remains unavailable. An institution subscription does not authorize credential scraping. The project does not claim zero omissions or a synchronized full-text corpus.

## Freshness

Search requests directly query supported live APIs (apart from short-lived in-memory cache). Saved watches poll source totals and metadata snapshots for records actually retrieved. PostgreSQL records first-seen, last-seen, change events and selected retraction flags. This is **not** a complete incremental mirror, historical retraction feed or guaranteed daily coverage of the upstream corpus.

## Verification

- [GitHub CI](https://github.com/lynox-pudding/MedAtlas/actions): TypeScript, offline mapping tests and JS checks.
- [Live upstream API smoke](https://github.com/lynox-pudding/MedAtlas/actions/workflows/live-api.yml): weekly and adapter-change-triggered real requests to eleven public adapters; failures visible by source in job logs.
- [PostgreSQL integration](https://github.com/lynox-pudding/MedAtlas/actions/workflows/database.yml): migrates schema, starts Fastify, tests persistent watches, record snapshots/change history and streaming source events.

**Deploy gate:** A passing live smoke test does not prove unlimited pagination, regional accessibility, query equivalence, licensed-source access, or full-text rights.


## China: implementation status and official evidence (2026-10-11)

**Automated but credential-gated:** Wanfang (万方数据) publishes an API for literature retrieval using `POST /openwanfang/getQuery`, `X-Ca-AppKey`, and `Authorization: APPCODE <code>`. MedAtlas now includes separate `OpenPeriodicalChi`, `OpenThesis`, and `OpenConference` source adapters. The adapters intentionally fail as **unavailable/authorization-required**, not zero hits, when credentials are absent. Field mapping uses a defensive schema because no licensed response has been tested. Do not mark these as verified until valid credentials, live response mappings, authoritative record URLs, and license scope have been tested.

- Official integration source: https://github.com/wanfangdata/wfdata-open-skills
- API reference: https://github.com/wanfangdata/wfdata-open-skills/blob/master/skills/wfdata-search/references/api-catalog.md
- Sample auth code: https://github.com/wanfangdata/wfdata-open-skills/blob/master/skills/wfdata-search/scripts/wf_data_query.py

**Documented REST integration, not yet implemented:** SinoMed documents REST API services for institutions and integrated search: https://www.sinomed.ac.cn/dataService/index.jsp?type=sjfw. Obtain exact technical contract and authorization before building the live adapter.

**Official entry, not aggregated:** CNKI (知网), VIP (维普), ChiCTR (中国临床试验注册中心), NMPA, NHC, Chinese Medical Association, NSTL, 中国科技论文在线. ChiCTR is a WHO-designated primary registry but an unrestricted real-time machine search API for MedAtlas has not been verified. Official WHO registry listing: https://www.who.int/tools/clinical-trials-registry-platform/network/primary-registries/chinese-clinical-trial-registry-%28chictr%29.

**No completeness claims:** China-accessible resources, mainland connectivity, licensing and APIs are different attributes. Static shortcuts cannot be counted as searched databases. For a Chinese-only query, English-dominant providers may have reduced recall without licensed Chinese metadata.

## Licensed guidelines, trial registry reuse and deployment limitations

- NICE syndication offers a current guidance API, **subject to license and API-key approval**; international reuse may carry substantial fees. Official: https://www.nice.org.uk/reusing-our-content/nice-syndication-api
- WHO ICTRP downloadable registry data are updated weekly, but the terms explicitly prohibit using downloaded ICTRP data for marketing, promotional or commercial purposes. **Do not use its feed in a commercial MedAtlas deployment without appropriate WHO permission.** Official terms: https://www.who.int/tools/clinical-trials-registry-platform/network/who-data-set/downloading-records-from-the-ictrp-database
- NCBI PMC OAI-PMH is suitable for licensed metadata harvesting, not indiscriminate full-text redistribution; upstream rate and license restrictions apply. Official: https://pmc.ncbi.nlm.nih.gov/tools/oai/
- DataCite public API supports metadata search without authentication and deep cursor paging. Official: https://support.datacite.org/docs/rest-api and https://support.datacite.org/docs/pagination
- **GitHub Pages does not host the Fastify API, PostgreSQL or a continuous worker.** The site can publish a static navigation UI from `/docs`, but live unified aggregation requires a separate backend runtime and permissions for some providers.
