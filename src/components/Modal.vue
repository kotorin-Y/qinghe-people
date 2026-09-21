<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Icon from './Icon.vue';
defineProps<{ title: string; subtitle?: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const el = ref<HTMLDialogElement>();
const before = document.activeElement as HTMLElement | null;
const priorOverflow = document.body.style.overflow;
onMounted(() => { el.value?.showModal(); document.body.style.overflow = 'hidden'; });
onUnmounted(() => { document.body.style.overflow = priorOverflow; before?.focus(); });
function backdrop(e: MouseEvent) { if (e.target === el.value) { const box = el.value.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) emit('close'); } }
</script>
<template><Teleport to="body"><dialog ref="el" class="modal" :class="{ 'modal-wide': wide }" aria-labelledby="modal-title" @cancel.prevent="emit('close')" @click="backdrop"><header class="modal-header"><div><h2 id="modal-title">{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div><button class="icon-btn" aria-label="关闭窗口" @click="emit('close')"><Icon name="x" /></button></header><div class="modal-body"><slot /></div><footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer></dialog></Teleport></template>
