import {writeFileSync} from 'node:fs';
import {adapters} from '../dist/adapters/index.js';
import {dataciteAdapters} from '../dist/datacite.js';
const sources=[...adapters,...dataciteAdapters],timeoutMs=18000,results=[];
async function deadline(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Upstream probe deadline exceeded')),timeoutMs)})])}finally{clearTimeout(timer)}}
for(const adapter of sources){
 const start=Date.now();
 const query=adapter.id==='openfda'||adapter.id==='dailymed'?'aspirin':'lung cancer';
 const entry={source:adapter.id,query,status:'pending',fetchedAt:new Date().toISOString(),durationMs:0,reportedTotal:null,firstPageLoaded:0,secondPageLoaded:null,pagingChecked:false,error:null};
 try{
  const page=await deadline(adapter.search(query,2,null));
  if(!Array.isArray(page.items)||typeof page.next!=='string'&&page.next!==null)throw Error('Unexpected pagination response');
  for(const row of page.items)if(!row.id||!row.title||!row.url||!row.sourceIds.includes(adapter.id))throw Error('Invalid source provenance');
  entry.reportedTotal=page.total;entry.firstPageLoaded=page.items.length;
  if(page.next){
   const next=await deadline(adapter.search(query,2,page.next));
   if(!Array.isArray(next.items))throw Error('Second page has invalid shape');
   const seen=new Set(page.items.map(r=>r.id));
   if(next.items.some(r=>seen.has(r.id)))throw Error('Second page repeats first-page records');
   entry.secondPageLoaded=next.items.length;
   entry.pagingChecked=true;
  }
  entry.status='ok';
 }catch(error){entry.status='error';entry.error=String(error)}
 entry.durationMs=Date.now()-start;
 results.push(entry);
 console.log(JSON.stringify(entry));
}
writeFileSync('live-status.json',JSON.stringify({generatedAt:new Date().toISOString(),disclaimer:'Page-level upstream probe only, not an exhaustive database coverage guarantee',results},null,2)+'\n');
if(results.some(x=>x.status==='error'))process.exitCode=1;
