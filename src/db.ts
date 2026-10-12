import {Pool} from 'pg';import {randomUUID} from 'node:crypto';import {summarizeSources} from './results.js';import type {SourceResult} from './types.js';import {maySnapshot,metadataSnapshot,snapshotHash} from './metadata.js';
export const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,max:5,ssl:process.env.PG_SSL==='require'?{rejectUnauthorized:true}:undefined}):null;
export async function migrate(){if(!pool)return;await pool.query(`CREATE TABLE IF NOT EXISTS search_runs(id uuid PRIMARY KEY,query_text text NOT NULL,source_ids text[] NOT NULL,status text NOT NULL,loaded integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS source_observations(id bigserial PRIMARY KEY,run_id uuid REFERENCES search_runs(id),source_id text NOT NULL,status text NOT NULL,reported_total integer,loaded integer NOT NULL,retrieved_at timestamptz NOT NULL DEFAULT now(),error text);
CREATE TABLE IF NOT EXISTS watches(id uuid PRIMARY KEY,query_text text NOT NULL,source_ids text[] NOT NULL,interval_minutes integer NOT NULL DEFAULT 1440,enabled boolean NOT NULL DEFAULT true,next_run_at timestamptz NOT NULL DEFAULT now(),last_run_at timestamptz,last_status text,last_result jsonb);
CREATE INDEX IF NOT EXISTS watches_due_idx ON watches(next_run_at) WHERE enabled;
CREATE TABLE IF NOT EXISTS source_records(
 source_id text NOT NULL,
 record_id text NOT NULL,
 content_hash text NOT NULL,
 metadata jsonb NOT NULL,
 first_seen_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source_id,record_id)
);
CREATE TABLE IF NOT EXISTS record_changes(
 id bigserial PRIMARY KEY,
 source_id text NOT NULL,
 record_id text NOT NULL,
 event_type text NOT NULL,
 old_hash text,
 new_hash text NOT NULL,
 observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS record_changes_observed_idx ON record_changes(observed_at DESC);`)}
export async function logSearch(q:string,ids:string[],results:SourceResult[]){
 if(!pool)return;
 const runId=randomUUID(),summary=summarizeSources(results),client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('INSERT INTO search_runs(id,query_text,source_ids,status,loaded,details) VALUES($1,$2,$3,$4,$5,$6)',
   [runId,q,ids,summary.status,summary.loaded,JSON.stringify(summary)]);
  for(const result of results){
   await client.query('INSERT INTO source_observations(run_id,source_id,status,reported_total,loaded,error) VALUES($1,$2,$3,$4,$5,$6)',
    [runId,result.id,result.status,result.total,result.loaded,result.error||null]);
   if(!maySnapshot(result.id))continue;
   for(const item of result.items){
    const hash=snapshotHash(item),metadata=JSON.stringify(metadataSnapshot(item));
    const previous=await client.query('SELECT content_hash FROM source_records WHERE source_id=$1 AND record_id=$2 FOR UPDATE',[result.id,item.id]);
    if(previous.rowCount){
     const oldHash=previous.rows[0].content_hash as string;
     await client.query('UPDATE source_records SET last_seen_at=now(),content_hash=$3,metadata=$4::jsonb,changed_at=CASE WHEN content_hash<>$3 THEN now() ELSE changed_at END WHERE source_id=$1 AND record_id=$2',
      [result.id,item.id,hash,metadata]);
     if(oldHash!==hash)await client.query('INSERT INTO record_changes(source_id,record_id,event_type,old_hash,new_hash) VALUES($1,$2,$3,$4,$5)',[result.id,item.id,'changed',oldHash,hash]);
    }else{
     await client.query('INSERT INTO source_records(source_id,record_id,content_hash,metadata) VALUES($1,$2,$3,$4::jsonb)',[result.id,item.id,hash,metadata]);
     await client.query('INSERT INTO record_changes(source_id,record_id,event_type,old_hash,new_hash) VALUES($1,$2,$3,$4,$5)',[result.id,item.id,'discovered',null,hash]);
    }
   }
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
export async function addWatch(q:string,ids:string[],minutes:number){if(!pool)throw Error('DATABASE_URL missing');const id=randomUUID();await pool.query('INSERT INTO watches(id,query_text,source_ids,interval_minutes) VALUES($1,$2,$3,$4)',[id,q,ids,minutes]);return id}
export async function listWatches(){if(!pool)throw Error('DATABASE_URL missing');return (await pool.query('SELECT * FROM watches ORDER BY next_run_at LIMIT 200')).rows}
export async function removeWatch(id:string){if(!pool)throw Error('DATABASE_URL missing');return (await pool.query('DELETE FROM watches WHERE id=$1',[id])).rowCount}
export async function runDueWatches(search:(q:string,ids:string[])=>Promise<unknown>){if(!pool)return;const due=(await pool.query('SELECT * FROM watches WHERE enabled=true AND next_run_at<=now() ORDER BY next_run_at LIMIT 5')).rows;for(const row of due){const lock=await pool.query("UPDATE watches SET next_run_at=now()+(interval_minutes * interval '1 minute') WHERE id=$1 AND next_run_at<=now() RETURNING id",[row.id]);if(!lock.rowCount)continue;try{const result=await search(row.query_text,row.source_ids);const summary=(result as {summary?:{status?:string}})?.summary;const outcome=summary?.status==='complete'?'ok':(summary?.status||'unknown');await pool.query('UPDATE watches SET last_run_at=now(),last_status=$2,last_result=$3 WHERE id=$1',[row.id,outcome,JSON.stringify(result)])}catch(e){await pool.query('UPDATE watches SET last_run_at=now(),last_status=$2,last_result=$3 WHERE id=$1',[row.id,'error',JSON.stringify({error:String(e)})])}}}
