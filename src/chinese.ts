import type {Adapter,Page,RecordItem,Kind} from './types.js';
export class AccessRequired extends Error{constructor(public source:string,public instruction:string){super(source+' requires authorized API credentials: '+instruction)}}
const safe=(v:unknown)=>typeof v==='string'?v.trim():'';
export function wanfangPayload(q:string,n:number,c:string|null,collection:string){
 const start=c===null?0:Number(c);
 if(!Number.isSafeInteger(start)||start<0||start>1000000)throw Error('Invalid Wanfang pagination offset');
 return {collections:[collection],query:q,sort:{sort_name:'OfflineScore'},rows:n,start};
}
async function queryWanFang(payload:ReturnType<typeof wanfangPayload>){
 const key=process.env.WFDATA_APP_KEY,code=process.env.WFDATA_APP_CODE;
 if(!key||!code)throw new AccessRequired('Wanfang','set WFDATA_APP_KEY and WFDATA_APP_CODE server-side');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
 try{
 const res=await fetch('https://api.wanfangdata.com.cn/openwanfang/getQuery',{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','X-Ca-AppKey':key,Authorization:'APPCODE '+code},body:JSON.stringify(payload)});
 if(res.status===401||res.status===403)throw new AccessRequired('Wanfang','HTTP '+res.status+'; verify API entitlement and app credentials');
 if(!res.ok)throw Error('Wanfang HTTP '+res.status);
 return await res.json() as any;
 }finally{clearTimeout(timer)}
}
function fieldText(value:unknown):string{
 if(value===null||value===undefined)return '';
 if(typeof value==='string'||typeof value==='number')return String(value).trim();
 if(Array.isArray(value))return value.map(fieldText).filter(Boolean).join('; ');
 if(typeof value==='object'){
 const o=value as Record<string,unknown>;
 for(const key of ['value','values','string_value','stringValue','str','text','value_string','raw','v'])if(key in o){const result=fieldText(o[key]);if(result)return result;}
 }
 return '';
}
function fieldsMap(document:any):Record<string,unknown>{
 const raw=document?.fields;
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
 if(Array.isArray(raw)){const mapped:Record<string,unknown>={};for(const part of raw){const key=part?.key??part?.name??part?.field??part?.field_name;if(typeof key==='string')mapped[key]=part.value??part.values??part;}return mapped;}
 return document??{};
}
export function mapWanfang(d:any,source:string,kind:Kind,offset:number,n:number):Page{
 const response=d?.data?.documents?d.data:d;
 if(!response||!Array.isArray(response.documents)||!Number.isFinite(Number(response.num_found)))throw Error('Wanfang response schema unknown: documents/num_found missing; not a zero-result response');
 const rows=response.documents as any[],total=Number(response.num_found);
 if(rows.length===0&&offset<total)throw Error('Wanfang returned no documents despite remaining reported matches');
 const items:RecordItem[]=rows.map((r:any)=>{
 const fields=fieldsMap(r),get=(...keys:string[])=>keys.map(k=>fieldText(fields[k]??r?.[k])).find(Boolean)||'';
 const id=get('Id','id','ID','DocId','docId'),title=get('Title','SingleTitle','title');
 if(!id)throw Error('Wanfang record lacks authoritative identifier; refusing silent omission');
 const doi=get('DOI','doi')||undefined;
 const candidate=get('ThirdPartyUrl','thirdPartyUrl');const direct=candidate.startsWith('https://')?candidate:(doi&&/^10\.\d{4,9}\//.test(doi)?'https://doi.org/'+doi:'https://www.wanfangdata.com.cn/');
 return {id:source+':'+id,type:kind,title:title||'未提供题名',abstract:get('Abstract','abstract')||undefined,
 authors:get('Creator','FirstCreator').split(';').map(x=>x.trim()).filter(Boolean),
 date:get('PublishDate','PublishYear','Year')||undefined,doi,oa:'unknown',
 url:direct,sourceIds:[source],sourceLinks:[{source,url:direct}],
 retrievedAt:new Date().toISOString(),details:{upstreamId:id,collection:source,recordLinkEvidence:direct.includes('doi.org')?'DOI':'Original URL not confirmed'}} as RecordItem;
 });
 const next=offset+rows.length<total&&rows.length>0?String(offset+rows.length):null;
 return {items,total,next,note:'Authorized Wanfang API: num_found is reported hits, not fully fetched records. Source record URL may not be exposed by this endpoint.'};
}
export function wanfangAdapter(id:string,name:string,kind:Kind,collection:string):Adapter{
 return {id,name,kind,description:'Wanfang official authorized Open API ('+collection+'); requires WFDATA_APP_KEY and WFDATA_APP_CODE',async search(q,n,c){const payload=wanfangPayload(q,n,c,collection);return mapWanfang(await queryWanFang(payload),id,kind,payload.start,n)}};
}
export const chineseAdapters:Adapter[]=[
 wanfangAdapter('wanfang-journal','万方中文期刊','article','OpenPeriodicalChi'),
 wanfangAdapter('wanfang-thesis','万方学位论文','thesis','OpenThesis'),
 wanfangAdapter('wanfang-conference','万方会议论文','article','OpenConference')
];
export const chineseDirectory=[
{id:'sinomed',name:'SinoMed 中国生物医学文献',category:'Chinese literature',mode:'authorized_api',url:'https://www.sinomed.ac.cn/',searchUrl:'https://www.sinomed.ac.cn/zh/subjectSearch.jsp',notes:'官方确认有 REST API，需取得接入授权与接口说明'},
{id:'wanfang',name:'万方数据',category:'Chinese literature / theses',mode:'authorized_api',url:'https://www.wanfangdata.com.cn/',searchUrl:null,notes:'官方开放接口文档已确认，服务端 AppKey + AppCode'},
{id:'cnki',name:'中国知网 CNKI',category:'Chinese literature / theses',mode:'official_entry',url:'https://www.cnki.net/',searchUrl:null,notes:'未核实可公开使用的统一检索 API，不能标记为已聚合'},
{id:'cqvip',name:'维普 VIP',category:'Chinese journals',mode:'official_entry',url:'https://www.cqvip.com/',searchUrl:null,notes:'授权检索能力待核实'},
{id:'chictr',name:'中国临床试验注册中心 ChiCTR',category:'Clinical trials',mode:'official_entry',url:'https://www.chictr.org.cn/',searchUrl:'https://www.chictr.org.cn/searchproj.html',notes:'WHO primary registry，未核实用于聚合的公开实时 API'},
{id:'nmpa',name:'国家药品监督管理局 NMPA',category:'Drugs / regulations',mode:'official_entry',url:'https://www.nmpa.gov.cn/',searchUrl:null,notes:'官方药品及监管公告入口，结构化检索需另行评估'},
{id:'nhc',name:'国家卫生健康委员会',category:'Guidelines / public health',mode:'official_entry',url:'https://www.nhc.gov.cn/',searchUrl:null,notes:'卫生政策、医疗卫生和公共卫生信息'},
{id:'cma',name:'中华医学会',category:'Medical society / guidelines',mode:'official_entry',url:'https://www.cma.org.cn/',searchUrl:null,notes:'学会发布信息与指南入口'},
{id:'cstj',name:'中国科技论文在线',category:'Academic papers',mode:'official_entry',url:'https://www.paper.edu.cn/',searchUrl:null,notes:'公开科研资源，自动 API 待核实'},
{id:'nstl',name:'国家科技图书文献中心 NSTL',category:'Scientific literature',mode:'official_entry',url:'https://www.nstl.gov.cn/',searchUrl:null,notes:'科技文献发现和服务入口'}
] as const;
