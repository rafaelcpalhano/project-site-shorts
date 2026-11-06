import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import cp from 'node:child_process'
import http from 'node:http'
import {gzipSync} from 'node:zlib'
import {PassThrough} from 'node:stream'
const require=createRequire(import.meta.url),firebase=createRequire(require.resolve('firebase-tools/package.json'))

test('Firebase CLI loads and prints its version without using the owner credential/config directory',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clipzone-cli-smoke-'))
 try{
  const env={HOME:temp,USERPROFILE:temp,APPDATA:temp,LOCALAPPDATA:temp,XDG_CONFIG_HOME:temp,FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',NO_UPDATE_NOTIFIER:'1',CI:'true'}
  for(const name of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','ComSpec'])if(process.env[name])env[name]=process.env[name]
  const cli=path.join(path.dirname(require.resolve('firebase-tools/package.json')),'lib/bin/firebase.js')
  const version=cp.execFileSync(process.execPath,[cli,'--version'],{env,encoding:'utf8',windowsHide:true,timeout:15000}).trim()
  assert.equal(version,require('firebase-tools/package.json').version)
 }finally{const target=path.resolve(temp);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(target).startsWith('clipzone-cli-smoke-'));fs.rmSync(target,{recursive:true,force:true})}
})

test('gaxios still creates and streams multipart bodies with its scoped UUID override, without HTTP',async()=>{
 const {Gaxios}=firebase('gaxios');let called=false
 const response=await new Gaxios().request({url:'https://fixture.invalid/no-network',method:'POST',multipart:[{headers:{'Content-Type':'text/plain'},content:'fixture-payload'}],adapter:async options=>{
  called=true;const chunks=[];for await(const chunk of options.body)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks).toString()
  const contentType=options.headers['Content-Type'];assert.match(contentType,/boundary=[a-f0-9-]{36}/);assert.ok(body.includes('fixture-payload'))
  return {config:options,data:{ok:true},status:200,statusText:'OK',headers:{}}
 }})
 assert.equal(called,true);assert.equal(response.data.ok,true)
})

test('PubSub trace propagation round-trips using the patched scoped OpenTelemetry core without a client or credentials',()=>{
 const pubsub=createRequire(firebase.resolve('@google-cloud/pubsub/package.json')),api=pubsub('@opentelemetry/api'),core=pubsub('@opentelemetry/core')
 const tracing=pubsub('./build/src/telemetry-tracing.js'),traceId='a'.repeat(32),spanId='b'.repeat(16),message={}
 tracing.setGloballyEnabled(true)
 try{
  tracing.injectSpan(api.trace.wrapSpanContext({traceId,spanId,traceFlags:1}),message)
  assert.equal(message.attributes.googclient_traceparent,'00-'+traceId+'-'+spanId+'-01')
  delete message.parentSpan
  const extracted=new core.W3CTraceContextPropagator().extract(api.ROOT_CONTEXT,message,tracing.pubsubGetter)
  assert.equal(api.trace.getSpanContext(extracted).traceId,traceId);assert.equal(tracing.containsSpanContext(message),true)
 }finally{tracing.setGloballyEnabled(false)}
})

for(const variant of ['firebase','mcp'])test('body-parser '+variant+' handles valid gzip and trailing garbage on loopback without crashing',{timeout:10000},async()=>{
 const owner=variant==='firebase'?firebase:createRequire(firebase.resolve('@modelcontextprotocol/sdk/package.json'))
 const parser=owner('body-parser').json(),server=http.createServer((req,res)=>parser(req,res,error=>{res.statusCode=error?400:200;res.end(error?'invalid':JSON.stringify(req.body))}))
 const send=body=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/',method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':'gzip','Content-Length':body.length}},res=>{let text='';res.on('data',c=>{text+=c});res.on('end',()=>resolve({status:res.statusCode,text}))});req.on('error',reject);req.end(body)})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const good=await send(gzipSync('{"ok":true}'));assert.equal(good.status,200);assert.equal(JSON.parse(good.text).ok,true)
  const bad=await send(Buffer.concat([gzipSync('{"ok":true}'),Buffer.from('trailing-invalid-bytes')]))
  assert.equal(bad.status,400)
 }finally{await new Promise(resolve=>server.close(resolve))}
})

const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'clipzone-glob-compat-'))
for(const dir of ['src','src/nested','.firebase','controllers'])fs.mkdirSync(path.join(fixture,dir),{recursive:true})
for(const [file,text] of Object.entries({'package.json':'{"type":"commonjs"}','src/a.js':'module.exports=1','src/a.test.js':'module.exports=2','src/nested/b.js':'module.exports=3','.hidden.txt':'hidden','.firebase/private.txt':'fixture','firebase-debug.log':'fixture','controllers/index.js':'module.exports={index:true}','controllers/item.js':'module.exports={item:true}'}))fs.writeFileSync(path.join(fixture,file),text)
const normalize=items=>items.map(p=>p.replaceAll('\\','/')).sort()

test('glob corrigido mantém APIs síncrona e assíncrona, exclusões e arquivos ocultos',async()=>{
 const glob=require('glob'),options={cwd:fixture,nodir:true,ignore:['**/*.test.js'],posix:true}
 assert.deepEqual(normalize(glob.sync('src/**/*.js',options)),['src/a.js','src/nested/b.js'])
 assert.deepEqual(normalize(await glob.glob('src/**/*.js',options)),['src/a.js','src/nested/b.js'])
 assert.ok(glob.sync('**/*',{cwd:fixture,nodir:true,dot:true}).includes('.hidden.txt'))
 const controller=new AbortController();controller.abort();await assert.rejects(glob.glob('**/*',{cwd:fixture,signal:controller.signal}))
})

test('minimatch corrigido mantém correspondência, classes, globstar e extglob usados pelas ferramentas',()=>{
 const mm=require('minimatch')
 for(const name of ['src/a.js','src/nested/b.js'])assert.ok(mm.minimatch(name,'src/**/*.js'))
 assert.ok(!mm.minimatch('src/a.txt','src/**/*.js'));assert.ok(mm.minimatch('src/a.js','src/[ab].js'))
 const pattern=new mm.Minimatch('src/**/!(*.test).js');assert.ok(pattern.match('src/a.js'));assert.ok(!pattern.match('src/a.test.js'))
 assert.deepEqual(mm.braceExpand('file{1,2}.txt'),['file1.txt','file2.txt'])
 assert.ok(mm.minimatch('.hidden.txt','*',{dot:true}))
})

test('Firebase CLI e archiver-utils preservam seleção real de arquivos',()=>{
 const {listFiles}=require('firebase-tools/lib/listFiles.js')
 const files=normalize(listFiles(fixture,['**/*.test.js']))
 assert.ok(files.includes('src/a.js'));assert.ok(files.includes('.hidden.txt'))
 assert.ok(!files.includes('src/a.test.js'));assert.ok(!files.includes('firebase-debug.log'));assert.ok(!files.includes('.firebase/private.txt'))
 const archiveFiles=require('archiver-utils/file.js').expand({cwd:fixture},['src/**/*.js','!**/*.test.js'])
 assert.deepEqual(normalize(archiveFiles),['src/a.js','src/nested/b.js'])
})

test('exegesis mantém carregamento síncrono dos controladores',()=>{
 const {loadControllersSync}=require('exegesis/lib/controllers/loadControllers.js')
 const controllers=loadControllersSync(path.join(fixture,'controllers'))
 assert.equal(controllers.item.item,true);assert.equal(controllers.index.index,true)
})

test('archiver mantém geração ZIP de fixtures sem dados do projeto',async()=>{
 const archive=require('archiver')('zip'),stream=new PassThrough(),chunks=[]
 const ended=new Promise((resolve,reject)=>{stream.on('data',b=>chunks.push(b));stream.on('end',resolve);stream.on('error',reject);archive.on('error',reject)})
 archive.pipe(stream);archive.glob('src/**/*.js',{cwd:fixture,ignore:['**/*.test.js']});await archive.finalize();await ended
 const zip=Buffer.concat(chunks);assert.ok(zip.length>0);assert.equal(zip.readUInt32LE(0),0x04034b50)
})

test('rimraf com glob atua somente sobre arquivo de fixture explicitamente delimitado',async()=>{
 const target=path.resolve(fixture,'remove.tmp');assert.ok(target.startsWith(path.resolve(fixture)+path.sep));fs.writeFileSync(target,'fixture-only')
 await require('rimraf').rimraf(target.replaceAll('\\','/'),{glob:true});assert.ok(!fs.existsSync(target));assert.ok(fs.existsSync(path.join(fixture,'src/a.js')))
})


test.after(()=>{const target=path.resolve(fixture);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('clipzone-glob-compat-'));fs.rmSync(target,{recursive:true,force:true})})
