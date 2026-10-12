import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
for(const file of ['index.html','app.js','config.js','merge.js','styles.css']){
 const master=readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
 const published=readFileSync(new URL('../docs/'+file,import.meta.url),'utf8');
 assert.equal(published,master,'docs/'+file+' differs from public/'+file+'; sync before release');
}
console.log('GitHub Pages /docs matches all canonical /public frontend assets.');
