import test from 'node:test';import assert from 'node:assert/strict';import {metadataSnapshot,snapshotHash,maySnapshot} from '../dist/metadata.js';
const item={id:'clinicaltrials:NCT123',type:'trial',title:'Study',url:'https://clinicaltrials.gov/study/NCT123',oa:'unknown',sourceIds:['clinicaltrials'],sourceLinks:[],retrievedAt:'2026-01-01',details:{registration:'NCT123',status:'RECRUITING'}};
test('same content has stable hash across retrieval times',()=>assert.equal(snapshotHash(item),snapshotHash({...item,retrievedAt:'2026-10-11'})));
test('status change modifies hash',()=>assert.notEqual(snapshotHash(item),snapshotHash({...item,details:{...item.details,status:'COMPLETED'}})));
test('licensed Wanfang data is excluded from generic snapshots',()=>assert.equal(maySnapshot('wanfang-thesis'),false));
test('snapshot never silently caches abstracts or full text',()=>{assert.equal('abstract' in metadataSnapshot({...item,abstract:'restricted text'}),false)});
