import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(import.meta.url);const {chromium}=require('../.qa/node_modules/playwright');
const url='https://nhan634345678.github.io/video-review-demo/';fs.mkdirSync('qa',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const response=await page.goto(url,{waitUntil:'networkidle'});if(response.status()!==200)throw Error('Page inaccessible');
await page.getByRole('button',{name:'V5.3 · Selective Creative',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
await page.locator('#main-video').evaluate(v=>{v.pause();v.currentTime=30.8;});await page.waitForFunction(()=>{const v=document.querySelector('#main-video');return !v.seeking&&v.readyState===4});
await page.locator('#viewers').scrollIntoViewIfNeeded();await page.waitForTimeout(600);
const frame=await page.locator('#main-video').evaluate(v=>{const b=v.getBoundingClientRect();return {time:v.currentTime,url:v.currentSrc,width:v.videoWidth,height:v.videoHeight,box:{x:b.x,y:b.y,width:b.width,height:b.height},viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth};});
if(frame.box.y<0||frame.box.y+frame.box.height>844||frame.overflow||frame.width!==1080)throw Error('Full mobile player is outside viewport');
await page.screenshot({path:'qa/v53-mobile-player.png'});
const creativeFrames=[];
for(const [section,t] of [['callout',4.2],['handoff',27.6],['focus',30.8],['correction',44.55],['ending',51.95]]){
 await page.locator('#main-video').evaluate((v,t)=>{v.pause();v.currentTime=t;},t);
 await page.waitForFunction(()=>{const v=document.querySelector('#main-video');return !v.seeking&&v.readyState===4});
 await page.locator('#viewers').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
 const actual=await page.locator('#main-video').evaluate(v=>({time:v.currentTime,width:v.videoWidth,height:v.videoHeight,error:v.error?.message||null}));
 if(actual.error||Math.abs(actual.time-t)>.05)throw Error('Creative seek failure');
 await page.screenshot({path:'qa/v53-mobile-'+section+'.png'});creativeFrames.push({section,target:t,...actual});
}
await page.locator('#main-video').evaluate(v=>v.currentTime=30.8);await page.waitForFunction(()=>!document.querySelector('#main-video').seeking);
await page.locator('#main-video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#main-video').currentTime>=32.95);await page.locator('#main-video').evaluate(v=>v.pause());
const playing=await page.locator('#main-video').evaluate(v=>({time:v.currentTime,rate:v.playbackRate,audioBytes:v.webkitAudioDecodedByteCount,frames:v.webkitDecodedFrameCount,error:v.error?.message||null}));
if(playing.rate!==1||playing.audioBytes<=0||playing.error||playing.time>=33.5)throw Error('Mobile playback/payoff capture failed');
await page.screenshot({path:'qa/v53-mobile-payoff.png'});
if(errors.length)throw Error(errors.join('\n'));const report={status:'PASS',url,browser:'Actual system Google Chrome',viewport:{width:390,height:844},frame,playing,creativeFrames,errors,scope:'Entire 9:16 player inside mobile viewport, actual 1x playback and decoded AAC, geographic/payoff frames visible; no horizontal overflow. Supplements existing full ten-variant QA.'};
fs.writeFileSync('v53-mobile-proof.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();

