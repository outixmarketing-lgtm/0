const assert=require('node:assert/strict'),H=require('./server/http'),handler=require('./api/airix');
Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',AIRIX_OWNER_ID:'owner-id',APP_ORIGIN:'https://0-pink-beta.vercel.app'});
let calls=[];global.fetch=async(url,opt)=>{calls.push({url,opt});if(url.includes('/auth/v1/user'))return {ok:true,status:200,json:async()=>({id:'owner-id',email:'test@example.com'})};if(url.includes('airix_save'))return {ok:false,status:400,json:async()=>({message:'REVISION_CONFLICT'})};return {ok:true,status:200,json:async()=>[]};};
function response(){return {headers:{},code:200,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(data){this.data=data;return this}};}
(async()=>{let r=response();await handler({method:'GET',headers:{}},r);assert.equal(r.code,401);assert.equal(calls.length,0);
r=response();await handler({method:'POST',headers:{origin:'https://evil.example'},body:{action:'save'}},r);assert.equal(r.code,403);
r=response();await handler({method:'GET',headers:{cookie:'__Host-airix-access=token'}},r);assert.equal(r.code,200);assert.equal(r.data.workspace,null);assert.equal(r.headers['Cache-Control'],'no-store');
const old=global.fetch;global.fetch=async()=>({ok:true,status:200,json:async()=>({id:'other-user'})});r=response();await handler({method:'GET',headers:{cookie:'__Host-airix-access=token'}},r);assert.equal(r.code,403);global.fetch=old;
r=response();await handler({method:'POST',headers:{origin:process.env.APP_ORIGIN,cookie:'__Host-airix-access=token'},body:{action:'save',revision:0,data:{}}},r);assert.equal(r.code,400);
const valid={version:1,products:[],orders:[],bundles:[],movements:[],expenses:[],logo:''};r=response();await handler({method:'POST',headers:{origin:process.env.APP_ORIGIN,cookie:'__Host-airix-access=token'},body:{action:'save',revision:0,data:valid}},r);assert.equal(r.code,409);
r=response();H.setCookies(r,{access_token:'a',refresh_token:'r'});assert(r.headers['Set-Cookie'].every(c=>c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Strict')));
console.log('PASS API: unauthenticated, cross-origin, owner restriction, invalid data, revision conflicts, secure cookies, no-store.');})().catch(e=>{console.error(e);process.exit(1)});
