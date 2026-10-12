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
 if(!res.ok)throw Error('Wanfang HTTP '+res.status);
 return await res.json() as any;
 }finally{clearTimeout(timer)}
}
export function mapWanfang(d:any,source:string,kind:Kind,offset:number,n:number):Page{
 const rows=Array.isArray(d?.docs)?d.docs:Array.isArray(d?.data?.docs)?d.data.docs:Array.isArray(d?.data)?d.data:Array.isArray(d?.result?.docs)?d.result.docs:[];
 const total=Number.isFinite(Number(d?.numFound??d?.data?.numFound??d?.total))?Number(d?.numFound??d?.data?.numFound??d?.total):null;
 const items:RecordItem[]=rows.map((r:any)=>{
 const id=safe(r.Id??r.id??r.ID??r.DocId??r.docId),title=safe(r.Title??r.title??r['标题']);
 if(!id)return null;
 const doi=safe(r.DOI??r.doi)||undefined;
 return {id:source+':'+id,type:kind,title:title||'未提供题名',abstract:safe(r.Abstract??r.abstract??r['摘要'])||undefined,date:safe(r.PublishYear??r.publishYear??r.Year),doi,oa:'unknown' as const,url:'https://www.wanfangdata.com.cn/',sourceIds:[source],sourceLinks:[{source,url:'https://www.wanfangdata.com.cn/'}],retrievedAt:new Date().toISOString(),details:{upstreamId:id,collection:source,originalRecordLink:'Not verified; use official search'}} as RecordItem;
 }).filter(Boolean);
 return {items,total,next:total!==null&&offset+rows.length<total&&rows.length>0?String(offset+rows.length):null,note:'Wanfang licensed metadata. Provider response mapping requires live authorized verification; original record URLs are not synthesized.'};
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
{id:'sinomed',name:'SinoMed 中国生物医学文献',category:'Chinese literature',mode:'authorized_api',url:'https://www.sinomed.ac.cn/',searchUrl:null,notes:'官方确认有 REST API，需取得接入授权与接口说明'},
{id:'wanfang',name:'万方数据',category:'Chinese literature / theses',mode:'authorized_api',url:'https://www.wanfangdata.com.cn/',searchUrl:null,notes:'官方开放接口文档已确认，服务端 AppKey + AppCode'},
{id:'cnki',name:'中国知网 CNKI',category:'Chinese literature / theses',mode:'official_entry',url:'https://www.cnki.net/',searchUrl:null,notes:'未核实可公开使用的统一检索 API，不能标记为已聚合'},
{id:'cqvip',name:'维普 VIP',category:'Chinese journals',mode:'official_entry',url:'https://www.cqvip.com/',searchUrl:null,notes:'授权检索能力待核实'},
{id:'chictr',name:'中国临床试验注册中心 ChiCTR',category:'Clinical trials',mode:'official_entry',url:'https://www.chictr.org.cn/',searchUrl:null,notes:'WHO primary registry，未核实用于聚合的公开实时 API'},
{id:'nmpa',name:'国家药品监督管理局 NMPA',category:'Drugs / regulations',mode:'official_entry',url:'https://www.nmpa.gov.cn/',searchUrl:null,notes:'官方药品及监管公告入口，结构化检索需另行评估'},
{id:'nhc',name:'国家卫生健康委员会',category:'Guidelines / public health',mode:'official_entry',url:'https://www.nhc.gov.cn/',searchUrl:null,notes:'卫生政策、医疗卫生和公共卫生信息'},
{id:'cma',name:'中华医学会',category:'Medical society / guidelines',mode:'official_entry',url:'https://www.cma.org.cn/',searchUrl:null,notes:'学会发布信息与指南入口'},
{id:'cstj',name:'中国科技论文在线',category:'Academic papers',mode:'official_entry',url:'https://www.paper.edu.cn/',searchUrl:null,notes:'公开科研资源，自动 API 待核实'},
{id:'nstl',name:'国家科技图书文献中心 NSTL',category:'Scientific literature',mode:'official_entry',url:'https://www.nstl.gov.cn/',searchUrl:null,notes:'科技文献发现和服务入口'}
] as const;
