/** Describe search grammar without claiming cross-provider Boolean equivalence. */
export type QueryCapability={mode:'native'|'relevance'|'specialized';note:string};
export const queryCapabilities:Record<string,QueryCapability>={
 pubmed:{mode:'native',note:'NCBI PubMed uses its own query parser and field tags; Boolean syntax can be expressed natively.'},
 europepmc:{mode:'native',note:'Europe PMC query syntax differs from PubMed; terms are not translated automatically.'},
 crossref:{mode:'relevance',note:'Crossref query.bibliographic is token-based relevance matching, not strict Boolean or full-text search.'},
 openalex:{mode:'relevance',note:'OpenAlex works search matches indexed metadata; Boolean expressions are not translated into equivalent filters.'},
 clinicaltrials:{mode:'specialized',note:'ClinicalTrials.gov query.term uses registry-specific search semantics.'},
 openfda:{mode:'specialized',note:'openFDA query syntax is based on drug-label fields and token indexing.'},
 'datacite-datasets':{mode:'native',note:'DataCite public DOI metadata search uses OpenSearch syntax, restricted to Dataset type; no full-text rights inferred.'},
 'datacite-theses':{mode:'native',note:'DataCite public DOI metadata filtered to Dissertation. Does not cover all Chinese theses.'},
 dailymed:{mode:'specialized',note:'DailyMed adapter only performs drug-name lookup, not subject-wide full-text searching.'},
 'wanfang-journal':{mode:'specialized',note:'Wanfang official PQ query and OpenPeriodicalChi collection; requires authenticated API access.'},
 'wanfang-thesis':{mode:'specialized',note:'Wanfang OpenThesis collection; metadata coverage and link templates require licensed live validation.'},
 'wanfang-conference':{mode:'specialized',note:'Wanfang OpenConference collection; PQ syntax differs from PubMed and Crossref.'}
};
export function queryCaveats(query:string,ids:string[]){const usesOperators=/\b(?:AND|OR|NOT)\b/i.test(query)||/[()]/.test(query);return ids.map(id=>({source:id,...queryCapabilities[id],warning:usesOperators&&queryCapabilities[id]?.mode!=='native'?'Boolean grouping or operators may not be preserved for this source.':undefined}));}
