'use strict';

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const app = express();
const MAX_CODE = 50_000;
const MAX_INPUT = 64_000;
const MAX_OUTPUT = 64 * 1024;
const MAX_CASES = 10;
const EXECUTOR_TOKEN = (process.env.EXECUTOR_TOKEN || '').trim();

if (process.env.NODE_ENV === 'production' && EXECUTOR_TOKEN.length < 32) {
  throw new Error('EXECUTOR_TOKEN must contain at least 32 characters in production');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '128kb', strict: true }));
app.use((req,res,next)=>{res.set({
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
  'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
});next()});

const authorized = (req,res,next) => {
  if (EXECUTOR_TOKEN.length < 32) return res.status(503).json({ error:'Executor disabled' });
  const supplied = (req.get('authorization') || '').replace(/^Bearer\s+/i,'');
  const left = Buffer.from(supplied); const right = Buffer.from(EXECUTOR_TOKEN);
  if (left.length !== right.length || !crypto.timingSafeEqual(left,right)) return res.status(401).json({ error:'Unauthorized' });
  next();
};

function runCommand(executable,args,input,cwd,timeout=2000){
  return new Promise(resolve=>{
    const started=Date.now();let stdout='';let stderr='';let finished=false;let timer;
    const child=spawn(executable,args,{cwd,env:{PATH:process.env.PATH||'',LANG:'C.UTF-8'},detached:process.platform!=='win32',windowsHide:true,stdio:['pipe','pipe','pipe']});
    const finish=(result)=>{if(finished)return;finished=true;clearTimeout(timer);resolve({...result,timeMs:Date.now()-started})};
    const stop=()=>{try{if(process.platform==='win32')child.kill('SIGKILL');else process.kill(-child.pid,'SIGKILL')}catch{child.kill('SIGKILL')}};
    const capture=(target,chunk)=>{const value=chunk.toString('utf8');if(target==='out')stdout+=value;else stderr+=value;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>MAX_OUTPUT){stop();finish({success:false,outputLimit:true,stdout:stdout.slice(0,MAX_OUTPUT),stderr:'Output limit exceeded'})}};
    child.stdout.on('data',chunk=>capture('out',chunk));child.stderr.on('data',chunk=>capture('err',chunk));
    child.on('error',()=>finish({success:false,stdout:'',stderr:'Runtime unavailable'}));
    child.on('close',code=>finish({success:code===0,stdout,stderr:stderr.slice(0,4000),exitCode:code}));
    timer=setTimeout(()=>{stop();finish({success:false,timedOut:true,stdout:stdout.slice(0,MAX_OUTPUT),stderr:'Execution timed out'})},timeout);
    child.stdin.end(String(input||'').slice(0,MAX_INPUT));
  });
}

function validatePayload(body,withCases){
  if(!body||typeof body.code!=='string'||body.code.length<1||body.code.length>MAX_CODE)return 'Code must contain 1–50,000 characters';
  if(!['python','javascript','c','cpp','java'].includes(body.language))return 'Unsupported language';
  if(withCases&&(!Array.isArray(body.testCases)||body.testCases.length<1||body.testCases.length>MAX_CASES))return 'Provide 1–10 test cases';
  if(withCases&&body.testCases.some(tc=>Buffer.byteLength(typeof tc.input==='string'?tc.input:JSON.stringify(tc.input??''))>MAX_INPUT))return 'Test input is too large';
  return null;
}

async function prepare(language,code,runDir){
  if(language==='python'){const file=path.join(runDir,'solution.py');await fs.writeFile(file,code,{encoding:'utf8',mode:0o600});return {executable:'python3',args:['-I','-S','-B',file]}}
  if(language==='javascript'){const file=path.join(runDir,'solution.js');await fs.writeFile(file,code,{encoding:'utf8',mode:0o600});return {executable:'node',args:['--no-deprecation',file]}}
  if(language==='c'||language==='cpp'){
    const extension=language==='c'?'c':'cpp';const file=path.join(runDir,`solution.${extension}`);const binary=path.join(runDir,'solution.out');await fs.writeFile(file,code,{encoding:'utf8',mode:0o600});
    const compiler=language==='c'?'gcc':'g++';const args=language==='c'?[file,'-O2','-o',binary]:[file,'-O2','-std=c++20','-o',binary];const compiled=await runCommand(compiler,args,'',runDir,10000);if(!compiled.success)return {error:compiled.stderr||'Compilation failed'};return {executable:binary,args:[]};
  }
  const file=path.join(runDir,'Main.java');const javaCode=code.replace(/public\s+class\s+\w+/,'public class Main');await fs.writeFile(file,javaCode,{encoding:'utf8',mode:0o600});const compiled=await runCommand('javac',[file],'',runDir,10000);if(!compiled.success)return {error:compiled.stderr||'Compilation failed'};return {executable:'java',args:['-Xmx96m','-cp',runDir,'Main']};
}

app.post('/execute',authorized,async(req,res)=>{
  const error=validatePayload(req.body,false);if(error)return res.status(400).json({error});
  const runDir=path.join(__dirname,'temp',crypto.randomBytes(16).toString('hex'));await fs.mkdir(runDir,{recursive:true,mode:0o700});
  try{const prepared=await prepare(req.body.language,req.body.code,runDir);if(prepared.error)return res.json({status:'error',output:prepared.error});const result=await runCommand(prepared.executable,prepared.args,req.body.input||'',runDir);return res.json({status:result.success?'success':'error',output:result.success?result.stdout:(result.stderr||'Execution failed')})}catch{return res.status(500).json({error:'Executor failure'})}finally{await fs.rm(runDir,{recursive:true,force:true}).catch(()=>{})}
});

app.post('/validate',authorized,async(req,res)=>{
  const error=validatePayload(req.body,true);if(error)return res.status(400).json({allPassed:false,error});
  const {language,code,testCases}=req.body;const runDir=path.join(__dirname,'temp',crypto.randomBytes(16).toString('hex'));await fs.mkdir(runDir,{recursive:true,mode:0o700});
  try{
    const prepared=await prepare(language,code,runDir);if(prepared.error)return res.json({allPassed:false,stage:'compilation',error:prepared.error.slice(0,4000),passedCount:0,totalCount:testCases.length,results:[]});
    const results=[];let passedCount=0;
    for(let i=0;i<testCases.length;i++){const tc=testCases[i];const input=typeof tc.input==='string'?tc.input:JSON.stringify(tc.input??'');const raw=tc.expectedOutput??tc.output??'';const expected=(typeof raw==='string'?raw:JSON.stringify(raw)).trim();const result=await runCommand(prepared.executable,prepared.args,input,runDir);const actual=result.stdout.trim();const passed=result.success&&actual===expected;if(passed)passedCount++;results.push({testCase:i+1,passed,actualOutput:actual.slice(0,MAX_OUTPUT),expectedOutput:expected,timeMs:result.timeMs,...(!result.success?{error:result.timedOut?'Time limit exceeded':result.outputLimit?'Output limit exceeded':(result.stderr||'Runtime error').slice(0,4000)}:{})});if(result.timedOut||result.outputLimit)break}
    return res.json({allPassed:passedCount===testCases.length,passedCount,totalCount:testCases.length,stage:'execution',results});
  }catch{return res.status(500).json({allPassed:false,error:'Executor failure'})}finally{await fs.rm(runDir,{recursive:true,force:true}).catch(()=>{})}
});

app.get('/health',(req,res)=>res.json({status:'ok',service:'Job-Way-Execution-Sandbox'}));
app.use((error,req,res,next)=>{if(error?.type==='entity.too.large')return res.status(413).json({error:'Request body too large'});return res.status(400).json({error:'Invalid request'})});

const PORT=Number(process.env.PORT||8080);
app.listen(PORT,'0.0.0.0',()=>console.log(`Executor listening on ${PORT}`));
