import assert from 'node:assert/strict';
const endpoint='http://127.0.0.1:3000/api/search/stream?q=cancer&sources=wanfang-journal&limit=2';
const response=await fetch(endpoint,{headers:{Accept:'text/event-stream'}});
assert.equal(response.status,200);
assert.match(response.headers.get('content-type')||'',/text\/event-stream/);
const body=await response.text();
const events=body.split('\n\n').filter(Boolean).map(line=>{
 assert.ok(line.startsWith('data: '),'Invalid SSE event frame');
 return JSON.parse(line.slice(6));
});
assert.equal(events[0].type,'start');
const update=events.find(e=>e.type==='source');
assert.ok(update,'Missing source event');
assert.equal(update.source.id,'wanfang-journal');
assert.equal(update.source.status,'unavailable');
assert.equal(update.source.total,null);
const complete=events.find(e=>e.type==='complete');
assert.ok(complete,'Missing final completeness summary');
assert.equal(complete.summary.status,'sources_unavailable');
console.log('Streaming API returns an explicit authorization-unavailable status rather than zero matches');

const strictResponse=await fetch('http://127.0.0.1:3000/api/search/stream?q=cancer%20AND%20diabetes&sources=crossref&strict=true');
assert.equal(strictResponse.status,200);
const strictEvents=(await strictResponse.text()).split('\n\n').filter(Boolean).map(line=>JSON.parse(line.slice(6)));
const unsupported=strictEvents.find(e=>e.type==='source');
assert.equal(unsupported.source.status,'unavailable');
assert.equal(unsupported.source.total,null);
assert.match(unsupported.source.error,/Strict Boolean/);
