import {createHash} from 'node:crypto';
import type {RecordItem} from './types.js';

const METADATA_SOURCES=new Set(['pubmed','pubmed-guidelines','europepmc','crossref','clinicaltrials','openfda','dailymed','openalex','openalex-theses','datacite-datasets','datacite-theses']);
export function maySnapshot(source:string){return METADATA_SOURCES.has(source)}
export function metadataSnapshot(item:RecordItem){
 return {id:item.id,type:item.type,title:item.title,doi:item.doi||null,pmid:item.pmid||null,pmcid:item.pmcid||null,date:item.date||null,url:item.url,oa:item.oa,
 details:{
  registration:item.details?.registration||null,
  status:item.details?.status||null,
  studyType:item.details?.studyType||null,
  workType:item.details?.workType||null,
  retractionStatus:item.details?.retractionStatus||null,
  sourceUpdatedAt:item.details?.updatedAt||null
 }};
}
export function snapshotHash(item:RecordItem){return createHash('sha256').update(JSON.stringify(metadataSnapshot(item))).digest('hex')}
