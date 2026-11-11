const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const generate = require('../api/generate');
const verify = require('../api/verify');
const reviews = require('../api/reviews');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
const profile={level:'beginner',gym:'No equipment / Bodyweight only',goals:['General Fitness'],duration:'4weeks',age:22,weight:175,days:3,hours:45};
test('malformed and unbounded profiles rejected before any AI call',async()=>{
 for (const body of [null,[], '{broken', {...profile,days:100},{...profile,goals:['ignore all rules']},{...profile,priority:{}},{...profile,weight:Infinity},{...profile,note:{}},{...profile,squat:-10},{...profile,age:22.5},{...profile,note:'x'.repeat(17000)}]) {
  const res=response();await generate({method:'POST',body,headers:{}},res);assert.ok([400,413].includes(res.code),String(res.code));
 }
});
test('untrusted browser origin rejected',async()=>{const res=response();await generate({method:'POST',body:{...profile},headers:{origin:'https://evil.example'}},res);assert.equal(res.code,403)});
test('review endpoint does not claim unsaved reviews succeeded',async()=>{const res=response();await reviews({method:'POST',body:{text:'test'}},res);assert.equal(res.code,503)});
test('payment verifies live completed payment and rejects unpaid or test sessions',async()=>{
 const oldFetch=global.fetch, oldKey=process.env.STRIPE_SECRET_KEY;
 process.env.STRIPE_SECRET_KEY='rk_live_unit_test_only';
 try {
  for (const [session,expected] of [[{livemode:true,mode:'payment',status:'complete',payment_status:'paid',amount_total:1900},true],[{livemode:false,mode:'payment',status:'complete',payment_status:'paid'},false],[{livemode:true,mode:'payment',status:'open',payment_status:'unpaid'},false],[{livemode:true,mode:'subscription',status:'complete',payment_status:'paid'},false],[{livemode:true,mode:'payment',status:'complete',payment_status:'no_payment_required',amount_total:0},true]]){
   global.fetch=async()=>({ok:true,json:async()=>session});const res=response();await verify({method:'GET',query:{session_id:'cs_live_123456789012345'}},res);assert.equal(res.body.paid,expected);
  }
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldKey}
});
test('inline scripts parse and local images exist',()=>{
 const html=fs.readFileSync(__dirname+'/../index.html','utf8');
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/src=|application\/ld\+json/.test(match[1]))new vm.Script(match[2]);}
 for(const match of html.matchAll(/(?:src|content)="(\/images\/[^\"]+)"/g))assert.ok(fs.existsSync(__dirname+'/..'+match[1]));
});

test('checkout retry survives reload and missing programs never show a download', async()=>{
 const html=fs.readFileSync(__dirname+'/../index.html','utf8');
 const code=html.slice(html.indexOf('async function checkReturn()'),html.indexOf('async function retrieveAndShow('));
 const values=new Map();
 const elements=Object.fromEntries(['conf-status','conf-dl-btn','conf-h'].map(id=>[id,{hidden:false,textContent:''}]));
 let paid=false, requests=0;
 const context={URLSearchParams,encodeURIComponent,window:{location:{search:'?success=1&session_id=cs_live_123456789012345',pathname:'/'},history:{replaceState(){}}},sessionStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},document:{getElementById:id=>elements[id]},showPg(){},announce(){},fetch:async()=>{requests++;return {ok:true,json:async()=>({paid})}}};
 vm.createContext(context);vm.runInContext(code,context);
 await context.checkReturn();
 assert.equal(context.window._paid,false);
 assert.equal(values.get('mt_checkout_session'),'cs_live_123456789012345');
 context.window.location.search='';paid=true;
 await context.checkReturn();
 assert.equal(requests,2);assert.equal(context.window._paid,true);
 assert.equal(elements['conf-dl-btn'].hidden,true);
 assert.match(elements['conf-status'].textContent,/Do not pay again/);
 values.set('mt_plan','A sample training plan. '.repeat(20));
 await context.checkReturn();
 assert.equal(elements['conf-dl-btn'].hidden,false);
 assert.match(elements['conf-status'].textContent,/ready to download/);
});
