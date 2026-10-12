import assert from 'node:assert/strict';
import {pool,logSearch,migrate} from '../dist/db.js';
assert.ok(pool,'DATABASE_URL must be configured');
await migrate();
const random=(globalThis.crypto?.randomUUID?.()||String(Date.now()));
const id='clinicaltrials:NCT'+random.replace(/-/g,'').slice(0,12);
const record={id,type:'trial',title:'MedAtlas Test Trial',url:'https://clinicaltrials.gov/',oa:'unknown',sourceIds:['clinicaltrials'],sourceLinks:[],retrievedAt:new Date().toISOString(),details:{registration:id,status:'RECRUITING'}};
const source=item=>({id:'clinicaltrials',name:'ClinicalTrials.gov',status:'complete',items:[item],total:1,loaded:1,next:null,retrievedAt:new Date().toISOString(),elapsedMs:5});
try{
 await logSearch('integration '+random,['clinicaltrials'],[source(record)]);
 await logSearch('integration '+random,['clinicaltrials'],[source({...record,retrievedAt:new Date().toISOString()})]);
 await logSearch('integration '+random,['clinicaltrials'],[source({...record,details:{...record.details,status:'COMPLETED'}})]);
 const stored=await pool.query('SELECT metadata,first_seen_at,last_seen_at FROM source_records WHERE source_id=$1 AND record_id=$2',['clinicaltrials',id]);
 assert.equal(stored.rows.length,1);assert.equal(stored.rows[0].metadata.details.status,'COMPLETED');
 const events=await pool.query('SELECT event_type FROM record_changes WHERE source_id=$1 AND record_id=$2 ORDER BY id',['clinicaltrials',id]);
 assert.deepEqual(events.rows.map(x=>x.event_type),['discovered','changed']);
 console.log('Database snapshot integration: discovered then changed, unchanged poll did not create a false event');
}finally{await pool.end()}
