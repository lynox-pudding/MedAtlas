(()=>{
'use strict';
const $=id=>document.getElementById(id);
const api=(window.MEDATLAS_API_BASE||'').replace(/\/$/,'');
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(v){try{const u=new URL(String(v));return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}
const fallback=[
 ['PubMed','https://pubmed.ncbi.nlm.nih.gov/?term={query}'],
 ['Europe PMC','https://europepmc.org/search?query={query}'],
 ['ClinicalTrials.gov','https://clinicaltrials.gov/search?term={query}'],
 ['Crossref','https://search.crossref.org/?q={query}'],
 ['Google Scholar','https://scholar.google.com/scholar?q={query}'],
 ['万方数据','https://www.wanfangdata.com.cn/'],
 ['中国知网 CNKI','https://www.cnki.net/'],
 ['SinoMed','https://www.sinomed.ac.cn/'],
 ['维普 VIP','https://www.cqvip.com/'],
 ['ChiCTR','https://www.chictr.org.cn/'],
 ['NMPA','https://www.nmpa.gov.cn/'],
 ['国家卫健委','https://www.nhc.gov.cn/'],
 ['NICE','https://www.nice.org.uk/guidance'],
 ['WHO','https://www.who.int/publications/guidelines']
];
let sourceInfo=[],sourceStates=new Map(),selected=[],query='',records=[],cursors={},busy=false,pending=new Set(),capabilities=[];
function renderLinks(entries){
 $('links').innerHTML=entries.map(([name,template])=>'<a target="_blank" rel="noopener noreferrer" data-url="'+safe(template)+'" href="'+safeUrl(template.replace('{query}',encodeURIComponent($('query').value.trim())))+'">'+safe(name)+' ↗</a>').join('');
}
function refreshLinks(){for(const a of $('links').querySelectorAll('a[data-url]'))a.href=safeUrl(a.dataset.url.replace('{query}',encodeURIComponent($('query').value.trim())))}
async function bootstrap(){
 renderLinks(fallback);
 try{
  const res=await fetch(api+'/api/sources');
  if(!res.ok)throw Error('API HTTP '+res.status);
  const data=await res.json();
  sourceInfo=data.automated||[];
  selected=sourceInfo.filter(s=>s.configured).map(s=>s.id);
  $('sources').innerHTML=sourceInfo.map(s=>'<label title="'+safe(s.description)+'"><input type="checkbox" data-source="'+safe(s.id)+'" '+(s.configured?'checked':'')+'> '+safe(s.name)+(s.requiresAuthorization&&!s.configured?' · 🔒 需 API 授权':'')+'</label>').join('');
  const merged=[...fallback,...(data.chineseDirectory||[]).map(s=>[s.name+' · '+(s.mode==='authorized_api'?'需授权':'官方入口'),s.searchUrl||s.url])];
  renderLinks([...new Map(merged.map(entry=>[entry[0],entry])).values()]);
  $('sources').addEventListener('change',()=>{selected=[...$('sources').querySelectorAll('input:checked')].map(x=>x.dataset.source)});
 }catch(e){
  $('sources').textContent='后端 API 尚未部署；你仍可以使用下面的官方数据库入口。静态网页本身不能查询所有数据库。';
 }
}
function renderStatuses(){
 const ids=[...new Set([...selected,...sourceStates.keys()])];
 const caveats=capabilities.filter(c=>c.warning).map(c=>'<div class="statusline"><span>'+safe(c.source)+': '+safe(c.warning)+'</span></div>').join('');
 $('statuses').innerHTML=caveats+ids.map(id=>{
  const r=sourceStates.get(id);
  const label=r?.name||sourceInfo.find(x=>x.id===id)?.name||id;
  const status=pending.has(id)?'searching':(r?.status||'not_requested');
  const bad=['error','unavailable','limited'].includes(status);
  return '<div class="statusline"><strong>'+safe(label)+'</strong><span class="'+(bad?'bad':'ok')+'">'+safe(status)+(r?' · '+r.loaded+' loaded / '+(r.total??'unknown')+' reported':'')+(r?.error?' · '+safe(r.error):'')+(r?.note?' · '+safe(r.note):'')+'</span></div>';
 }).join('');
}
function renderResults(){
 const kind=$('kind').value,onlyOA=$('oa').checked;
 const visible=records.filter(r=>(!kind||r.type===kind)&&(!onlyOA||r.oa==='yes'));
 $('count').textContent=visible.length+' displayed · '+records.length+' unique loaded';
 $('results').innerHTML=visible.length?visible.map(r=>'<article class="result"><h3><a target="_blank" rel="noopener noreferrer" href="'+safeUrl(r.url)+'">'+safe(r.title)+'</a></h3><div class="meta">'+safe(r.type)+' · '+safe(r.date||'Date unknown')+' · '+safe((r.sourceIds||[]).join(', '))+(r.doi?' · DOI '+safe(r.doi):'')+'</div>'+(r.abstract?'<p class="description">'+safe(r.abstract.slice(0,650))+'</p>':'')+(r.oa==='yes'?'<span class="tag">Open access evidence</span>':'')+'</article>').join(''):'<p class="muted">No matches in loaded pages for these filters. Inspect each source status before assuming zero hits.</p>';
}
function encodeCursors(value){const binary=unescape(encodeURIComponent(JSON.stringify(value)));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function fetchFallback(params){
 const res=await fetch(api+'/api/search?'+params.toString());const data=await res.json();
 if(!res.ok)throw Error(data.error||('API HTTP '+res.status));
 capabilities=data.queryCapabilities||[];
 for(const item of data.results){updateSource(item)}
 return data;
}
function updateSource(result){
 pending.delete(result.id);sourceStates.set(result.id,result);
 if(result.next)cursors[result.id]=result.next;
 else if(result.status!=='error'&&result.status!=='unavailable')delete cursors[result.id];
 records=window.MedAtlasMergeRecords([...records,...(result.items||[])]);
 $('more').hidden=!Object.keys(cursors).length;
 renderStatuses();renderResults();
}
async function fetchStream(params){
 if(typeof EventSource==='undefined')return fetchFallback(params);
 return new Promise((resolve,reject)=>{
  const stream=new EventSource(api+'/api/search/stream?'+params.toString());
  let finished=false;
  stream.onmessage=e=>{
   try{
    const message=JSON.parse(e.data);
    if(message.type==='source')updateSource(message.source);
    if(message.type==='complete'){finished=true;stream.close();resolve(message)}
   }catch(err){finished=true;stream.close();reject(err)}
  };
  stream.onerror=()=>{if(finished)return;stream.close();reject(Error('Streaming connection failed. Previously received results are kept.'))};
 });
}
async function search(next=false){
 if(busy)return;
 if(!selected.length){alert('Select at least one source');return}
 const current=$('query').value.trim();if(current.length<2)return;
 if(!next){query=current;records=[];cursors={};sourceStates=new Map();capabilities=[]}
 else if(query!==current){return search(false)}
 const ids=next?Object.keys(cursors):[...selected];if(!ids.length)return;
 busy=true;pending=new Set(ids);$('status').hidden=false;
 $('more').hidden=true;renderStatuses();renderResults();
 const button=$('searchForm').querySelector('button');button.disabled=true;button.textContent='Searching…';
 const params=new URLSearchParams({q:query,sources:ids.join(','),limit:'15'});if($('strict').checked)params.set('strict','true');
 if(next)params.set('cursors',encodeCursors(cursors));
 try{await fetchStream(params)}
 catch(err){$('statuses').insertAdjacentHTML('afterbegin','<div class="statusline bad">'+safe(err.message)+'</div>')}
 finally{busy=false;pending.clear();renderStatuses();button.disabled=false;button.textContent='Search research →';$('more').hidden=!Object.keys(cursors).length}
}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();void search(false)});
$('more').addEventListener('click',()=>void search(true));
$('kind').addEventListener('change',renderResults);
$('oa').addEventListener('change',renderResults);
$('query').addEventListener('input',refreshLinks);
void bootstrap();
})();