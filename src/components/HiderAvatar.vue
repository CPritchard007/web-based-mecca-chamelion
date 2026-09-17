<script setup>
import { useId } from 'vue'
defineProps({ strokes: { type: Array, default: () => [] }, showBase: { type: Boolean, default: true } })
const clipId = useId()
function path(points) { return points.map((p,i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + (points.length === 1 ? ` l0.001 0` : '') }
</script>
<template>
  <svg style="filter:none;box-shadow:none;border:0;outline:0" width="24" height="24" viewBox="0 0 24 24">
    <defs><clipPath :id="clipId"><circle cx="12" cy="12" r="10"/></clipPath></defs>
    <!-- Clip the white base and paint together to avoid a separate white edge. -->
    <circle cx="12" cy="12" r="10" fill="transparent" pointer-events="all"/>
    <g :clip-path="`url(#${clipId})`"><rect v-if="showBase" width="24" height="24" fill="white"/><path v-for="(stroke,index) in strokes" :key="index" :d="path(stroke.points)" :stroke="stroke.color" :stroke-width="stroke.width" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>
</template>
