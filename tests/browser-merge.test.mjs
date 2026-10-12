import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const window={};runInNewContext(readFileSync(new URL('../public/merge.js',import.meta.url),'utf8'),{window});
const rec=(id,extras={})=>({id,title:id,type:'article',url:'https://example.org',sourceIds:[id],sourceLinks:[{source:id,url:'https://example.org/'+id}],oa:'unknown',...extras});
test('cross-page transitive DOI PMID unification',()=>{const arr=[rec('a',{doi:'10.1/A'}),rec('b',{pmid:'123'}),rec('c',{doi:'https://doi.org/10.1/a',pmid:'123'})];const x=window.MedAtlasMergeRecords(arr);assert.equal(x.length,1);assert.equal(x[0].sourceIds.length,3)});
test('same title without identifiers is not merged',()=>{assert.equal(window.MedAtlasMergeRecords([rec('a'),rec('b')]).length,2)});
