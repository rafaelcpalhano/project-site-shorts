import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createDescriptionTranslator,TRANSLATION_MODEL} from '../server/games/translate-description.ts'
import {createGameTranslation} from '../server/games/translation-store.ts'
import {mapGameDetails} from '../src/features/games/services/game-details.ts'
const oldModel='@cf/qwen/qwen3-30b-a3b-fp8'
const game={source:'IGDB',status:'active',description:'Portal is a puzzle game.',officialName:'Portal',aliases:[]}
const config={accountId:'a'.repeat(32),token:'synthetic-not-a-secret'}
function memory(record=game){const rows=new Map([['games/igdb-1',structuredClone(record)]]);return {rows,store:{transact:async work=>work({get:async p=>structuredClone(rows.get(p)??null),set:(p,v)=>rows.set(p,v)})},now:()=>new Date('2026-11-06T12:00:00Z')}}
function completion(init){return {success:true,result:{object:'chat.completion',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.parse(JSON.parse(init.body).messages[1].content).description.replace('is a puzzle game.','é um jogo de quebra-cabeça.'),reasoning_content:'must-not-persist'}}]}}}

test('Gemma usa modelo fixo, saída limitada e raciocínio desativado',async()=>{
 let calls=0
 const translate=createDescriptionTranslator(config,async(url,init)=>{
  calls++;assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/'+config.accountId+'/ai/run/@cf/google/gemma-4-26b-a4b-it')
  const request=JSON.parse(init.body)
  assert.equal(request.max_completion_tokens,3072);assert.equal(request.max_tokens,undefined)
  assert.deepEqual(request.chat_template_kwargs,{enable_thinking:false});assert.equal(request.stream,false);assert.equal(request.temperature,0)
  assert.equal(init.redirect,'error');assert.ok(init.signal instanceof AbortSignal);assert.equal(request.messages.length,2)
  assert.ok(!init.body.includes(config.token));assert.ok(!init.body.includes('/no_think'))
  return Response.json(completion(init))
 })
 assert.equal(await translate(game),'Portal é um jogo de quebra-cabeça.');assert.equal(calls,1)
})

test('erro 410 preserva tradução existente, diagnóstico privado e espera sem repetir chamada',async()=>{
 const original={...game,translation:{locale:'pt-BR',text:'Portal é um jogo de quebra-cabeça.',model:oldModel,sourceDescription:game.description,sourceName:game.officialName,sourceHash:'previous-model-hash'}}
 const d=memory(original);let calls=0
 const run=createGameTranslation({...d,maximumPerDay:20,translate:createDescriptionTranslator(config,async()=>{calls++;return new Response('provider-private-payload',{status:410})})})
 await run('igdb-1');await run('igdb-1')
 assert.equal(calls,1);assert.deepEqual(d.rows.get('games/igdb-1'),original)
 assert.equal(mapGameDetails('igdb-1',d.rows.get('games/igdb-1')).descriptionPtBr,original.translation.text)
 assert.deepEqual(d.rows.get('gameTranslations/igdb-1').failure,{code:'translation-unavailable',providerStatus:410})
 assert.equal(d.rows.get('translationUsage/2026-11-06').count,1)
 assert.ok(!JSON.stringify([...d.rows]).includes('provider-private-payload'))
})

test('cache do modelo anterior continua visível e reconfirmação atualiza uma única vez',async()=>{
 const oldHash=createHash('sha256').update(JSON.stringify([game.description,game.officialName,game.aliases,oldModel,'pt-BR',2])).digest('hex')
 const d=memory({...game,translation:{locale:'pt-BR',text:'Tradução anterior preservada.',model:oldModel,sourceDescription:game.description,sourceName:game.officialName,sourceHash:oldHash}})
 assert.equal(mapGameDetails('igdb-1',d.rows.get('games/igdb-1')).descriptionPtBr,'Tradução anterior preservada.')
 let calls=0
 const run=createGameTranslation({...d,maximumPerDay:20,translate:createDescriptionTranslator(config,async(_url,init)=>{calls++;return Response.json(completion(init))})})
 assert.equal(calls,0);await run('igdb-1');await run('igdb-1')
 assert.equal(calls,1);assert.equal(d.rows.get('games/igdb-1').translation.model,TRANSLATION_MODEL)
 assert.equal(d.rows.get('games/igdb-1').description,game.description)
 assert.equal(d.rows.get('translationUsage/2026-11-06').count,1)
 assert.ok(!JSON.stringify([...d.rows]).includes('must-not-persist'))
})

