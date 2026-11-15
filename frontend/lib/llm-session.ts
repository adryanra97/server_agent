/** Temporary per-tab LLM credentials. No persistent cookies or database storage. */
export type LLMProvider = 'openai'|'openrouter'|'groq'|'deepseek'|'together'|'xai';
export type LLMSession = {provider:LLMProvider;endpoint:string;model:string;apiKey:string};
export const LLM_SESSION_KEY='twinpeak-llm-session-v1';
export const LLM_SESSION_CHANGED='twinpeak-llm-session-updated';
export const llmProviders:{id:LLMProvider;name:string;endpoint:string;model:string}[]=[
  {id:'openai',name:'OpenAI',endpoint:'https://api.openai.com/v1/chat/completions',model:'gpt-4.1-mini'},
  {id:'openrouter',name:'OpenRouter',endpoint:'https://openrouter.ai/api/v1/chat/completions',model:'openai/gpt-4.1-mini'},
  {id:'groq',name:'Groq',endpoint:'https://api.groq.com/openai/v1/chat/completions',model:'llama-3.3-70b-versatile'},
  {id:'deepseek',name:'DeepSeek',endpoint:'https://api.deepseek.com/chat/completions',model:'deepseek-chat'},
  {id:'together',name:'Together AI',endpoint:'https://api.together.xyz/v1/chat/completions',model:'meta-llama/Llama-3.3-70B-Instruct-Turbo'},
  {id:'xai',name:'xAI',endpoint:'https://api.x.ai/v1/chat/completions',model:'grok-4'},
];
export function validLLMConfig(value:LLMSession){
  return llmProviders.some(item=>item.id===value.provider&&item.endpoint===value.endpoint)&&
    value.model.trim().length>0&&value.model.length<=160&&
    value.apiKey.trim().length>0&&value.apiKey.length<=500;
}
export function readLLMSession():LLMSession|null{
  if(typeof window==='undefined')return null;
  try{
    const raw=window.sessionStorage.getItem(LLM_SESSION_KEY);
    if(!raw)return null;
    const candidate=JSON.parse(raw) as LLMSession;
    return validLLMConfig(candidate)?candidate:null;
  }catch{return null;}
}
export function saveLLMSession(value:LLMSession){
  if(typeof window==='undefined'||!validLLMConfig(value))throw Error('Complete a supported provider, endpoint, model, and API key.');
  window.sessionStorage.setItem(LLM_SESSION_KEY,JSON.stringify(value));
  window.dispatchEvent(new Event(LLM_SESSION_CHANGED));
}
export function clearLLMSession(){
  if(typeof window==='undefined')return;
  window.sessionStorage.removeItem(LLM_SESSION_KEY);
  window.dispatchEvent(new Event(LLM_SESSION_CHANGED));
}
export async function requestReasoning(input:{
  kind:'indeterminate'|'report';service:string;rps:number;summary:string;
  verdict?:string;notes?:string;
}):Promise<{text:string;generated:boolean;source:'llm'|'model'}>{
  const session=readLLMSession();
  const response=await fetch('/api/reasoning',{
    method:'POST',headers:{'Content-Type':'application/json'},
    cache:'no-store',
    body:JSON.stringify({...input,...(session?{session}:{})}),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||typeof result?.text!=='string')
    throw Error('Explanation service is temporarily unavailable.');
  return result;
}
