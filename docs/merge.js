/* Exact identifier union across loaded pages. Never dedupe by title alone. */
window.MedAtlasMergeRecords=function(records){
 const groups=new Map(),index=new Map();let seq=0;
 const keys=r=>{if(r.type!=='article')return [r.type+':'+r.id];const out=[];if(r.doi)out.push('doi:'+String(r.doi).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,'').replace(/^doi:\s*/,''));if(r.pmid)out.push('pmid:'+String(r.pmid));if(r.pmcid)out.push('pmcid:'+String(r.pmcid).toUpperCase());return out.length?out:['article:'+r.id]};
 const join=(a,b)=>({...a,sourceIds:[...new Set([...(a.sourceIds||[]),...(b.sourceIds||[])])],sourceLinks:[...(a.sourceLinks||[]),...(b.sourceLinks||[]).filter(x=>!(a.sourceLinks||[]).some(y=>x.source===y.source&&x.url===y.url))],abstract:a.abstract||b.abstract,pmid:a.pmid||b.pmid,doi:a.doi||b.doi,pmcid:a.pmcid||b.pmcid,oa:a.oa==='yes'||b.oa==='yes'?'yes':a.oa==='no'&&b.oa==='no'?'no':'unknown'});
 for(const r of records){const existing=[...new Set(keys(r).map(k=>index.get(k)).filter(v=>v!==undefined))];const root=existing[0]??seq++;let value=groups.has(root)?join(groups.get(root),r):{...r};for(const other of existing.slice(1)){const old=groups.get(other);if(old){value=join(value,old);groups.delete(other);for(const [k,v]of index)if(v===other)index.set(k,root)}}groups.set(root,value);for(const key of keys(value))index.set(key,root)}
 return [...groups.values()];
};
