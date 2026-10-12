export type Kind='article'|'trial'|'drug'|'guideline'|'thesis'|'dataset';
export interface RecordItem {id:string;type:Kind;title:string;abstract?:string;authors?:string[];journal?:string;date?:string;doi?:string;pmid?:string;pmcid?:string;url:string;oa:'yes'|'no'|'unknown';accessEvidence?:string;sourceIds:string[];sourceLinks:{source:string;url:string}[];details?:Record<string,string>;retrievedAt:string;}
export interface Page {items:RecordItem[];total:number|null;next:string|null;note?:string;truncated?:boolean;}
export interface Adapter {id:string;name:string;kind:Kind;description:string;search:(q:string,limit:number,cursor:string|null)=>Promise<Page>}
export interface SourceResult {id:string;name:string;status:'complete'|'partial'|'limited'|'error'|'unavailable';items:RecordItem[];total:number|null;loaded:number;next:string|null;error?:string;retrievedAt:string;elapsedMs:number;note?:string;}
