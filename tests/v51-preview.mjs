import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(import.meta.url);const {chromium}=require('../.qa/node_modules/playwright');
const url='https://nhan634345678.github.io/video-review-demo/';
fs.mkdirSync('qa',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1040}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
const r=await page.goto(url,{waitUntil:'networkidle',timeout:60000});if(r.status()!==200)throw Error('Production page not200');
await page.locator('#versions button').first().waitFor();await page.getByLabel('Giữ vị trí khi đổi bản').uncheck();
const results=[];
for(const label of ['V3 A · Clean','V3 B · Premium','V3 C · Maximum','V4 · Premium','V4 · Maximum','V5 · Technical','V5 · Original skit','V5.1 · Creative Master']){
 await page.getByRole('button',{name:label,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
 const media=await page.locator('#main-video').evaluate(v=>({url:v.currentSrc,width:v.videoWidth,height:v.videoHeight,duration:v.duration}));
 const probe=await fetch(media.url,{headers:{Range:'bytes=0-1023'}});const data=await probe.arrayBuffer();
 if(probe.status!==206||data.byteLength!==1024)throw Error('Range unsupported '+label);
 await page.getByRole('button',{name:'▶ Phát / Tạm dừng',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#main-video').currentTime>1.5);
 const playing=await page.locator('#main-video').evaluate(v=>({time:v.currentTime,paused:v.paused,ready:v.readyState,audioDecodedBytes:v.webkitAudioDecodedByteCount,framesDecoded:v.webkitDecodedFrameCount,muted:v.muted,volume:v.volume,error:v.error?.message||null}));
 if(playing.paused||playing.error||playing.audioDecodedBytes<=0)throw Error('Playback/audio decoder failure');
 const seekTo=Math.min(30,media.duration*.7);await page.locator('#main-video').evaluate((v,t)=>v.currentTime=t,seekTo);
 await page.waitForFunction(()=>{const v=document.querySelector('#main-video');return !v.seeking&&v.currentTime>=Math.min(30,v.duration*.7)-.02&&v.readyState>=2;});
 const seek=await page.locator('#main-video').evaluate(v=>({time:v.currentTime,seeking:v.seeking}));
 await page.locator('#main-video').evaluate(v=>{v.pause();v.volume=.35;});
 const volume=await page.locator('#main-video').evaluate(v=>v.volume);if(Math.abs(volume-.35)>.01)throw Error('Volume failure');
 results.push({label,media,range:{status:probe.status,contentRange:probe.headers.get('content-range'),contentType:probe.headers.get('content-type'),bytes:data.byteLength},playing,seek,volume,status:'PASS'});
}
await page.getByRole('button',{name:'V5.1 · Creative Master',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
await page.getByRole('button',{name:'⇄ So sánh hai bản',exact:true}).click();
await page.locator('#compare-select').selectOption('v4-premium');await page.waitForFunction(()=>document.querySelector('#right-video').readyState>=2);
await page.locator('#main-video').evaluate(v=>v.currentTime=1.6);await page.waitForFunction(()=>!document.querySelector('#main-video').seeking);
await page.screenshot({path:'qa/review-page.png',fullPage:true});
const comparison=await page.locator('#right-video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,muted:v.muted,ready:v.readyState}));if(comparison.width!==1080||!comparison.muted)throw Error('Comparison failed');
await page.getByRole('button',{name:'▶ Phát / Tạm dừng',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('#main-video').currentTime>3);
const pairSync=await page.evaluate(()=>{const a=document.querySelector('#main-video'),b=document.querySelector('#right-video');return {delta:Math.abs(a.currentTime-b.currentTime),leftPaused:a.paused,rightPaused:b.paused,rightMuted:b.muted};});
if(pairSync.delta>.3||pairSync.leftPaused||pairSync.rightPaused||!pairSync.rightMuted)throw Error('A/B synchronization failed');
await page.getByRole('button',{name:'▶ Phát / Tạm dừng',exact:true}).click();

await page.getByRole('button',{name:'⇄ So sánh hai bản',exact:true}).click();
const fullStreams=[];
for(const label of ['V4 · Premium','V5 · Technical','V5.1 · Creative Master']){
 await page.getByRole('button',{name:label,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
 await page.locator('#main-video').evaluate(v=>{v.currentTime=0;v.volume=.65;});
 await page.getByRole('button',{name:'▶ Phát / Tạm dừng',exact:true}).click();
 const samples=[];for(let n=0;n<65;n++){await page.waitForTimeout(1000);const m=await page.locator('#main-video').evaluate(v=>({time:v.currentTime,ended:v.ended,paused:v.paused,ready:v.readyState,error:v.error?.message||null,audioBytes:v.webkitAudioDecodedByteCount,frames:v.webkitDecodedFrameCount,dropped:v.webkitDroppedFrameCount}));samples.push(m);if(m.error)throw Error('Full-play error');if(m.ended)break;}
 if(!samples.at(-1).ended)throw Error('Full stream did not reach end '+label);
 fullStreams.push({label,status:'PASS',samples});
}
await page.getByRole('button',{name:'V5.1 · Creative Master',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
await page.getByRole('button',{name:'⛶ Toàn màn hình',exact:true}).click();
await page.waitForFunction(()=>document.fullscreenElement?.id==='main-video');
const fullscreen=true;await page.evaluate(()=>document.exitFullscreen());
await page.getByRole('button',{name:'⇄ So sánh hai bản',exact:true}).click();
const distinct=await page.evaluate(()=>document.querySelector('#main-video').currentSrc!==document.querySelector('#right-video').currentSrc);if(!distinct)throw Error('Duplicate comparison');
await page.locator('#compare-select').selectOption('v5-technical');await page.waitForFunction(()=>document.querySelector('#right-video').readyState>=2);
await page.locator('#scene-marks button[data-time="15.55"]').click();await page.waitForFunction(()=>document.querySelector('#main-video').currentTime>=15.5);
await page.locator('#main-video').evaluate(v=>v.currentTime=17);await page.waitForFunction(()=>!document.querySelector('#main-video').seeking);
await page.screenshot({path:'qa/review-page.png',fullPage:true});
await page.getByRole('button',{name:'⇄ So sánh hai bản',exact:true}).click();
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'V5.1 · Creative Master',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
await page.locator('#main-video').evaluate(v=>v.currentTime=30.8);await page.waitForFunction(()=>!document.querySelector('#main-video').seeking);
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);if(overflow)throw Error('Mobile page overflows');
await page.screenshot({path:'qa/review-mobile.png',fullPage:true});
await page.getByText('▶ Video so sánh V4 / V5 / V5.1 (cùng nguồn)',{exact:true}).click();
await page.locator('#comparison-film-v51').evaluate(v=>v.play());
await page.waitForFunction(()=>document.querySelector('#comparison-film-v51').currentTime>1.5);
const comparisonFilm=await page.locator('#comparison-film-v51').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,time:v.currentTime,audioBytes:v.webkitAudioDecodedByteCount,error:v.error?.message||null}));
if(comparisonFilm.width!==1080||comparisonFilm.height!==640||comparisonFilm.audioBytes<=0||comparisonFilm.error)throw Error('Comparison movie failure');
await page.locator('#comparison-film-v51').evaluate(v=>v.pause());
const beforeAfter=[];
for(const alt of ['Cảnh toàn cầu ở giây 17: V4 V5 V5.1','Cảnh vĩ độ cao ở giây 30,8: V4 V5 V5.1']){
 const im=page.getByAltText(alt,{exact:true});await im.scrollIntoViewIfNeeded();
 await page.waitForFunction(alt=>{const im=[...document.images].find(i=>i.alt===alt);return im?.complete&&im.naturalWidth===1080;},alt);
 beforeAfter.push(await im.evaluate(i=>({alt:i.alt,url:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})));
}
if(errors.length)throw Error(errors.join('\n'));
const report={url,comparisonFilm,beforeAfter,browser:'Actual system Google Chrome on GitHub Actions',status:'PASS',variants:results,comparison,pairSync,fullStreams,fullscreen,distinctComparison:distinct,mobile:{width:390,height:844,overflow},errors,scope:'Real production URL playback, seek, switching, volume property, decoded AAC bytes, decoded video frames and full V4, V5 and V5.1 streams; inline comparison film. Audio decoder evidence is not human listening or proof of perceived music balance.'};
fs.writeFileSync('v51-playback-test.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
await browser.close();

