// Isolated Electron settings verification; no live provider or paid API calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron}=require('playwright');
const repo=path.resolve(__dirname,'..'),run=fs.mkdtempSync(path.join(os.tmpdir(),'vrcal-custom-ai-'));
const root=path.join(run,'Materials'),profile=path.join(run,'Library');fs.mkdirSync(root);
let app;
async function launch(){
 app=await _electron.launch({executablePath:process.env.VRC_TEST_APP_EXECUTABLE||require('electron'),args:process.env.VRC_TEST_APP_EXECUTABLE?[]:[repo],env:{...process.env,VRC_LIBRARY_DATA_DIR:profile,VRC_LIBRARY_ROOT:root,VRC_LIBRARY_NO_NETWORK:'1',VRC_LIBRARY_NO_AUTOSCAN:'1',VRC_LIBRARY_NO_RELAUNCH:'1'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('.ai-nav').waitFor();
 await page.locator('.ai-nav').click();await page.locator('.ai-tools-intro').getByRole('button',{name:'AI 设置',exact:true}).click();return page;
}
(async()=>{
 let page=await launch(),panel=page.locator('.ai-settings');
 await panel.getByLabel('AI 服务商',{exact:true}).selectOption('custom');
 await panel.getByLabel('AI API Base URL',{exact:true}).fill('https://example.com/v1');
 await panel.getByLabel('AI 模型名称',{exact:true}).fill('vendor/model:latest');
 await panel.getByLabel('AI API 密钥',{exact:true}).fill('sk-SYNTHETIC-CUSTOM-NOT-REAL');
 await panel.getByLabel('自动解释 Unity 错误',{exact:true}).check();
 await panel.getByLabel('启用 AI 辅助',{exact:true}).check();await panel.getByLabel('同意 AI 数据说明',{exact:true}).check();
 await panel.getByRole('button',{name:'保存 AI 设置',exact:true}).click();await panel.getByRole('status').waitFor();
 let state=await page.evaluate(()=>window.library.aiState());assert.equal(state.provider,'custom');assert.equal(state.keyConfigured,true);assert.equal(state.customProtocol,'openai');
 assert(!fs.readFileSync(path.join(profile,'ai-credentials.json'),'utf8').includes('SYNTHETIC'));
 await panel.getByLabel('AI 接口协议',{exact:true}).selectOption('anthropic');assert.equal(await panel.getByLabel('同意 AI 数据说明',{exact:true}).isChecked(),false);
 await panel.getByLabel('AI API Base URL',{exact:true}).fill('https://api.anthropic.com');await panel.getByLabel('AI 模型名称',{exact:true}).fill('claude-opus-5-5');await panel.getByLabel('AI API 密钥',{exact:true}).fill('sk-SYNTHETIC-ANTHROPIC-NOT-REAL');
 await panel.getByLabel('同意 AI 数据说明',{exact:true}).check();await panel.getByRole('button',{name:'保存 AI 设置',exact:true}).click();
 await page.waitForFunction(async()=> (await window.library.aiState()).customProtocol==='anthropic');
 await page.screenshot({path:path.join(run,'custom-ai.png'),fullPage:true});
 await app.close();app=null;page=await launch();panel=page.locator('.ai-settings');state=await page.evaluate(()=>window.library.aiState());assert.equal(state.customProtocol,'anthropic');assert.equal(state.keyConfigured,true);assert.equal(await panel.getByLabel('AI API 密钥',{exact:true}).inputValue(),'');
 await panel.getByRole('button',{name:'移除密钥并关闭',exact:true}).click();await page.waitForFunction(async()=>!(await window.library.aiState()).keyConfigured);
 await app.close();app=null;console.log(JSON.stringify({ok:true,run,checks:['custom selection and OpenAI configuration','Windows encrypted key persistence','protocol change requires consent','Anthropic configuration','restart and write-only key','remove key and disable'],noPaidRequests:true}));
})().catch(async e=>{console.error(e);if(app)await app.close();process.exitCode=1});
