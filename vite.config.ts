import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({mode}) => {
 const target=loadEnv(mode,'.','').HR_API_PROXY_TARGET;
 return { base: './', plugins:[vue()], server:{host:'127.0.0.1',port:4318,strictPort:true,...(target?{proxy:{'/api':target}}:{})}, preview:{host:'127.0.0.1',port:4318,strictPort:true} };
});
