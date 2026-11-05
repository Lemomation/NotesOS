import { rm, mkdir, cp, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'edge-extension'),zip=path.join(root,'notes-os-edge-extension.zip');
execFileSync(process.execPath,[path.join(root,'verify.mjs')],{stdio:'inherit'});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const item of ['index.html','manifest.json','css','js','icons'])await cp(path.join(root,item),path.join(out,item),{recursive:true});
await cp(path.join(root,'EDGE-INSTALL.md'),path.join(out,'INSTALL.md'));
const allowed=new Set(['.html','.json','.css','.js','.png','.md']);
async function clean(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())await clean(full);else if(!allowed.has(path.extname(entry.name)))await rm(full);}}
await clean(out);
const manifest=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'));
if(manifest.manifest_version!==3||manifest.chrome_url_overrides?.newtab!=='index.html')throw new Error('Invalid extension manifest.');
await rm(zip,{force:true});
execFileSync('powershell.exe',['-NoProfile','-Command',`Compress-Archive -Path '${out.replaceAll("'","''")}\\*' -DestinationPath '${zip.replaceAll("'","''")}' -Force`],{stdio:'inherit'});
console.log(`Edge extension folder: ${out}`);console.log(`ZIP archive: ${zip}`);
