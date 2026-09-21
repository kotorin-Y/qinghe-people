<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import type { Candidate } from '../types';
import { busy, mutate, notify } from '../store';
const props=defineProps<{candidate:Candidate;job:string}>();
const input=ref<HTMLInputElement>();
const url=ref(''),error=ref(''),uploading=ref(false);
const resume=computed(()=>props.candidate.resume);
const fileName=computed(()=>resume.value&&resume.value.kind!=='profile'?resume.value.name:'简历');
watch(resume,r=>{if(url.value)URL.revokeObjectURL(url.value);url.value='';error.value='';if(r&&r.kind!=='profile'){try{const [header,base64]=r.dataUrl.split(',');const mime=header?.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64$/)?.[1];if(!mime||!base64)throw new Error();const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));url.value=URL.createObjectURL(new Blob([bytes],{type:mime}));}catch{error.value='简历文件无法读取，请重新上传';}}},{immediate:true});
onUnmounted(()=>{if(url.value)URL.revokeObjectURL(url.value);});
async function upload(event:Event){
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
  error.value='';uploading.value=true;
  try{
    if(file.size>2*1024*1024)throw new Error('请上传不超过 2 MB 的简历');
    const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
    const pdf=String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
    const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
    const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!pdf&&!png&&!jpg&&!webp)throw new Error('仅支持有效的 PDF、PNG、JPG 或 WebP 文件');
    if(!pdf){try{const bitmap=await createImageBitmap(file);bitmap.close();}catch{throw new Error('图片内容已损坏，请重新选择有效简历图片');}}
    const mime=pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':'image/webp';
    const raw=new Uint8Array(await file.arrayBuffer());let binary='';for(const v of raw)binary+=String.fromCharCode(v);
    const dataUrl=`data:${mime};base64,${btoa(binary)}`;
    await mutate(`/candidates/${props.candidate.id}/resume`,{resume:{kind:pdf?'pdf':'image',name:file.name,dataUrl}},'PATCH','简历已保存');
  }catch(e){error.value=e instanceof Error?e.message:'上传失败';}finally{uploading.value=false;if(input.value)input.value.value='';}
}
function downloadProfile(){const r=resume.value;if(!r||r.kind!=='profile')return;const content=[props.candidate.name,props.job,r.demo?'虚构演示简历':'',r.summary,r.education,...r.experiences.map(e=>`${e.company} · ${e.period}\n${e.position}\n${e.description}`),'专业技能：'+r.skills.join('、')].join('\n\n');const u=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=props.candidate.name+'-简历.txt';a.click();URL.revokeObjectURL(u);notify('简历已导出');}
</script>
<template><section class="resume-section"><header class="resume-toolbar"><div><Icon name="file" :size="18"/><h3>简历预览</h3><span v-if="resume?.kind==='profile'&&resume.demo" class="badge badge-amber">虚构示例</span></div><div><button v-if="resume?.kind==='profile'" class="btn btn-small" @click="downloadProfile"><Icon name="download" :size="15"/>导出</button><a v-else-if="url" class="btn btn-small" :href="url" :download="fileName">下载原件</a><button class="btn btn-small" :disabled="busy||uploading" @click="input?.click()">{{ uploading?'正在读取…':resume?'替换简历':'上传简历' }}</button><input ref="input" class="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" aria-label="上传候选人简历" @change="upload"/></div></header><p v-if="error" class="form-error" role="alert">{{ error }}</p><article v-if="resume?.kind==='profile'" class="resume-paper"><div class="resume-name"><div><h2>{{ candidate.name }}</h2><p>{{ job }} · {{ candidate.experience }}经验</p></div><span>RESUME</span></div><section><h3>个人概述</h3><p>{{ resume.summary }}</p></section><section><h3>工作经历</h3><div v-for="(item,i) in resume.experiences" :key="i" class="resume-experience"><div><strong>{{ item.company }}</strong><span>{{ item.period }}</span></div><h4>{{ item.position }}</h4><p>{{ item.description }}</p></div></section><section><h3>教育背景</h3><p>{{ resume.education }}</p></section><section><h3>专业技能</h3><div class="resume-skills"><span v-for="skill in resume.skills" :key="skill">{{ skill }}</span></div></section><footer v-if="resume.demo">本简历为虚构演示资料，不代表真实候选人经历。</footer></article><div v-else-if="url" class="resume-file"><div class="resume-file-caption"><span>{{ fileName }}</span><a :href="url" target="_blank" rel="noopener">单独打开<Icon name="arrowUpRight" :size="14"/></a></div><iframe v-if="resume?.kind==='pdf'" :src="url" title="候选人 PDF 简历预览"></iframe><img v-else :src="url" alt="候选人上传的简历"/><p v-if="resume?.kind==='pdf'" class="data-note">若当前设备不支持内嵌 PDF，请点击“单独打开”或下载原件。</p></div><div v-else-if="!error" class="empty-state resume-empty"><Icon name="file" :size="35"/><h3>尚未添加简历</h3><p>上传候选人简历后，即可在这里预览。</p><span>支持 PDF、PNG、JPG、WebP，单个文件不超过 2 MB</span></div></section></template>
