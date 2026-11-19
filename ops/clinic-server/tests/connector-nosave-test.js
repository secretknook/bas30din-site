process.chdir('/home/claude/clinic-server');
const { run, mem } = require('/home/claude/clinic-server/mockserver.js');
mem.sess={SO:{phone:'917903568856',role:'owner',name:'Alok',exp:'2099-01-01'}};
const K=run('desk',{sid:'SO',action:'v8_apikey'}).desk.apiKey;
const snap=()=>JSON.stringify(mem);
for (const x of [{action:'ext_ping'},{action:'ext_status'},{action:'ext_cancel',ref:'nope'},{action:'ext_call',ref:'nope'},{action:'ext_done',ref:'nope'},{action:'ext_token',phone:'12'},{action:'ext_bill',phone:'9876500000',amount:0}]) {
  const a=snap(); const r=run('desk',Object.assign({key:K},x)).desk; console.log((snap()===a?'ok   no save':'FAIL saved   ')+' '+x.action+' '+(r.code||'ok'));
}
const a=snap(); run('desk',{action:'ext_ping',key:'bad'}); console.log((snap()===a?'ok   no save':'FAIL saved')+' bad key');
