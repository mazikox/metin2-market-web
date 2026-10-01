import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('public/privacy-preferences.js', 'utf8');
function browser({choice=null, enabled=true, hostname='metin2bazar.pl', broken=false}={}) {
  const records=new Map(choice ? [['metin2bazar.statistics.v1', JSON.stringify(choice)]] : []);
  const handlers={}, requests=[], timers=[];
  let reloads=0;
  const status={textContent:''};
  const document={
    currentScript:{dataset:{enabled:String(enabled),domain:'metin2bazar.pl',script:'/metrics/script.js',websiteId:'site-id',host:'/metrics'}},
    querySelectorAll: selector => selector.includes('status') ? [status] : [],
    createElement:()=>({dataset:{}}),
    head:{append:node=>requests.push(node)},
    addEventListener:(name,fn)=>handlers[name]=fn,
  };
  vm.runInNewContext(source,{
    document,window:{addEventListener:(name,fn)=>handlers[name]=fn},
    location:{hostname,reload:()=>reloads++},
    localStorage:{getItem:k=>records.get(k),removeItem:k=>records.delete(k),setItem:(k,v)=>{if(broken)throw Error('blocked');records.set(k,v);}},
    Date,setTimeout:(fn,delay)=>{assert.ok(delay<=2147483647);timers.push({fn,delay});return timers.length;},clearTimeout:()=>{},
  });
  return {requests, records, status, timers, reloads:()=>reloads,
    choose:value=>handlers.click({target:{closest:()=>({dataset:{statisticsChoice:value}})}}),
    storage:()=>handlers.storage({key:'metin2bazar.statistics.v1'})};
}
test('no analytics before affirmative consent; rejection does not load it',()=>{
 const b=browser();assert.equal(b.requests.length,0);b.choose('deny');assert.equal(b.requests.length,0);
});
test('acceptance loads once; withdrawal reloads into a page without tracking',()=>{
 const b=browser();b.choose('allow');b.choose('allow');assert.equal(b.requests.length,1);
 assert.equal(b.requests[0].src,'/metrics/script.js');
 b.choose('deny');assert.equal(b.reloads(),1);
 assert.equal(browser({choice:JSON.parse(b.records.values().next().value)}).requests.length,0);
});
test('saved consent works; expired, malformed and future values do not',()=>{
 assert.equal(browser({choice:{value:'allow',at:Date.now()}}).requests.length,1);
 for(const choice of [{value:'allow',at:0},{value:'allow',at:Date.now()+60000},{value:'unexpected',at:Date.now()}])
 assert.equal(browser({choice}).requests.length,0);
});
test('development and other domains never load analytics',()=>{
 for(const options of [{enabled:false},{hostname:'metin2market.mazikox.pl'}]){
 const b=browser(options);b.choose('allow');assert.equal(b.requests.length,0);
 }
});
test('blocked storage cannot imply consent',()=>{
 const b=browser({broken:true});b.choose('allow');assert.equal(b.requests.length,0);
 assert.match(b.status.textContent,/Nie można/);
});
test('revoking consent in another tab stops future analytics on this page',()=>{
 const b=browser({choice:{value:'allow',at:Date.now()}});b.records.clear();b.storage();assert.equal(b.reloads(),1);
});
