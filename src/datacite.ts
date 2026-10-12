import type {Adapter,Kind,Page,RecordItem} from './types.js';
const pick=(value:unknown):string=>typeof value==='string'?value.trim():'';
function cursorFrom(url:unknown):string|null{
 if(typeof url!=='string'||!url)return null;
 const parsed=new URL(url);
 if(parsed.host!=='api.datacite.org'||parsed.protocol!=='https:')throw Error('DataCite next-page link unexpected host');
 const token=parsed.searchParams.get('page[cursor]');
 if(!token||token.length>2048)throw Error('DataCite next-page cursor missing or oversized');
 return token;
}
export function mapDataCite(d:any,source:string,kind:Kind):Page{
 if(!d||!Array.isArray(d.data)||typeof d.meta?.total!=='number')throw Error('DataCite response schema changed; not treating as zero results');
 const items:RecordItem[]=d.data.map((record:any)=>{
 const a=record.attributes||{},doi=pick(record.id||a.doi);
 if(!doi)throw Error('DataCite DOI record without identifier');
 const link='https://doi.org/'+encodeURIComponent(doi).replace(/%2F/gi,'/');
 const title=pick(a.titles?.[0]?.title)||'Untitled DataCite record';
 const authors=Array.isArray(a.creators)?a.creators.map((x:any)=>pick(x.name)).filter(Boolean):[];
 return {id:source+':'+doi,type:kind,title,url:link,doi,authors,date:String(a.publicationYear||''),
 oa:'unknown',sourceIds:[source],sourceLinks:[{source,url:link}],retrievedAt:new Date().toISOString(),
 details:{resourceType:pick(a.types?.resourceTypeGeneral),publisher:pick(a.publisher),updatedAt:pick(a.updated)}} as RecordItem;
 });
 return {items,total:d.meta.total,next:cursorFrom(d.links?.next),note:'DataCite public Findable DOI metadata, not guaranteed free full text. Cursor pagination follows original API tokens.'};
}
export function dataciteAdapter(id:string,name:string,kind:Kind,resourceType:string):Adapter{
 return {id,name,kind,description:'DataCite public DOI metadata for '+resourceType+'; OpenSearch query + cursor pagination',async search(q,n,c){
  const u=new URL('https://api.datacite.org/dois');
  u.searchParams.set('query','('+q+') AND types.resourceTypeGeneral:'+resourceType);
  u.searchParams.set('page[cursor]',c||'1');
  u.searchParams.set('page[size]',String(Math.min(n,50)));
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
  try{
   const res=await fetch(u,{signal:ctl.signal,headers:{'Accept':'application/vnd.api+json','User-Agent':'MedAtlas/0.5 (https://github.com/lynox-pudding/MedAtlas)'}});
   if(!res.ok)throw Error('DataCite upstream HTTP '+res.status);
   return mapDataCite(await res.json(),id,kind);
  }finally{clearTimeout(timer)}
 }};
}
export const dataciteAdapters:Adapter[]=[
 dataciteAdapter('datacite-datasets','DataCite Research Datasets / 研究数据集','dataset','Dataset'),
 dataciteAdapter('datacite-theses','DataCite Dissertations / 学位论文','thesis','Dissertation')
];
