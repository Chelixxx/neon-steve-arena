'use strict';
const fs=require('fs');
const path=require('path');
const DATA=process.env.DATA_DIR||'/data';

// A complete pre-change snapshot was created before this update.
// Never duplicate the live VOLTRA data on every container restart.
const protectedBackup='.voltra-backup-before-history-2026-11-13T06-59-43-725Z';
if(fs.existsSync(DATA)&&fs.statSync(DATA).isDirectory()){
  for(const name of fs.readdirSync(DATA)){
    if(name.startsWith('.voltra-backup-before-history-') && name!==protectedBackup){
      const target=path.join(DATA,name);
      try{
        fs.rmSync(target,{recursive:true,force:true});
        console.log('[backup] Removed incomplete duplicate snapshot '+name);
      }catch(error){
        console.error('[backup] Could not remove incomplete snapshot '+name+':',error);
      }
    }
  }
}
require('./server.js');
