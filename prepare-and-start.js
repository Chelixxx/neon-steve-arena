'use strict';
const fs=require('fs');
const path=require('path');
const DATA=process.env.DATA_DIR||'/data';
try{
 if(fs.existsSync(DATA)&&fs.statSync(DATA).isDirectory()){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backup=path.join(DATA,'.voltra-backup-before-history-'+stamp);
  fs.mkdirSync(backup,{recursive:false});
  fs.cpSync(DATA,backup,{recursive:true,preserveTimestamps:true,filter:(source)=>{
   if(source===backup||source.startsWith(backup+path.sep))return false;
   return true;
  }});
  const files=fs.readdirSync(backup);
  console.log('[backup] VOLTRA data snapshot created at '+backup+' ('+files.length+' top-level entries)');
 }else{
  console.warn('[backup] DATA directory not found; continuing without snapshot');
 }
}catch(error){
 console.error('[backup] Snapshot failed; refusing to start to protect VOLTRA data:',error);
 process.exit(1);
}
require('./server.js');
