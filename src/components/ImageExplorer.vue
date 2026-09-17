<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { Plus, Minus, MousePointer2, Scan, Move } from 'lucide-vue-next'
import HiderAvatar from './HiderAvatar.vue'
import { MAX_STROKES, MAX_POINTS, playerPaintView } from '../services/paint'
import { zoomAt, constrain, imageScales } from '../services/viewport'
const props = defineProps({ src: { type: String, required: true }, title: String, sharing: Boolean, peers: Object, role: String, localHider: Object, painting: Boolean, paint: { type: Array, default: () => [] } })
const emit = defineEmits(['pointer', 'place', 'paint'])
const root = ref(), picture = ref(), loaded = ref(false), failed = ref(false)
const size = reactive({ w: 1, h: 1, iw: 1, ih: 1 })
const view = reactive({ x: 0, y: 0, scale: 1 })
let target = { ...view }, frame, observer, last = 0, velocity = { x: 0, y: 0 }, lastMove = 0, broadcast = 0
const playerDrag = ref(null)
const brushColor = ref('#547d43'), brushSize = ref(2), activeStroke = ref(null)
const brushPreview = ref(null)
const brushPreviewStyle = computed(() => {
  if (!brushPreview.value || !props.localHider) return {}
  const width = (activeStroke.value?.width ?? Number(brushSize.value)) * view.scale
  return {
    left: `${view.x + (props.localHider.x * size.iw + brushPreview.value[0] - 12) * view.scale}px`,
    top: `${view.y + (props.localHider.y * size.ih + brushPreview.value[1] - 12) * view.scale}px`,
    width: `${width}px`, height: `${width}px`,
    backgroundColor: `${activeStroke.value?.color ?? brushColor.value}33`,
  }
})
function updateBrushPreview(e) {
  if (!props.painting || !props.localHider) { brushPreview.value = null; return }
  const p = local(e)
  const x = (p.x-view.x)/view.scale - props.localHider.x*size.iw
  const y = (p.y-view.y)/view.scale - props.localHider.y*size.ih
  brushPreview.value = paintPointer !== null || Math.hypot(x,y) <= 10 ? paintPoint(e) : null
}
let paintPointer = null, savedView = null
const visiblePaint = computed(() => activeStroke.value ? [...props.paint, activeStroke.value] : props.paint)
function paintPoint(e) {
  const p = local(e)
  return [Math.max(0, Math.min(24, (p.x-view.x)/view.scale - props.localHider.x*size.iw + 12)), Math.max(0, Math.min(24, (p.y-view.y)/view.scale - props.localHider.y*size.ih + 12))]
}
function startPaint(e) {
  if (paintPointer !== null || !props.localHider || props.paint.length >= MAX_STROKES || e.button > 0) return
  e.preventDefault()
  updateBrushPreview(e)
  paintPointer = e.pointerId
  activeStroke.value = { color: brushColor.value, width: Number(brushSize.value), points: [paintPoint(e)] }
  root.value.setPointerCapture(e.pointerId)
}
function movePaint(e) {
  if (paintPointer !== e.pointerId || !activeStroke.value || activeStroke.value.points.length >= MAX_POINTS) return
  const point = paintPoint(e), previous = activeStroke.value.points.at(-1)
  if (Math.hypot(point[0]-previous[0], point[1]-previous[1]) > .08) activeStroke.value.points.push(point)
}
function finishPaint() {
  const id = paintPointer, stroke = activeStroke.value
  paintPointer = null
  activeStroke.value = null
  if (stroke) emit('paint', [...props.paint, stroke])
  if (id !== null && root.value?.hasPointerCapture(id)) root.value.releasePointerCapture(id)
}
watch(() => props.painting, enabled => {
  brushPreview.value = null
  finishPaint()
  stopPlayerDrag()
  pointers.clear(); dragging.value = false; velocity = { x: 0, y: 0 }
  if (enabled) savedView = { ...view }
  else if (savedView) { target = clamp(savedView); savedView = null }
})
const pointers = new Map(), dragging = ref(false)
const scales = computed(() => imageScales(size.w, size.h, size.iw, size.ih))
const minimum = computed(() => scales.value.min)
const mapSize = computed(() => { const scale = Math.min(94 / size.iw, 59 / size.ih); return { width: `${size.iw * scale}px`, height: `${size.ih * scale}px` } })
const percent = computed(() => Math.round(view.scale / minimum.value * 100))
const minimap = computed(() => ({ left: `${Math.max(0,-view.x/view.scale/size.iw)*100}%`, top: `${Math.max(0,-view.y/view.scale/size.ih)*100}%`, width: `${Math.min(1,size.w/view.scale/size.iw)*100}%`, height: `${Math.min(1,size.h/view.scale/size.ih)*100}%` }))
function clamp(v) { return constrain(v, size.w, size.h, size.iw, size.ih) }
function fit() { if (playerDrag.value || props.painting) return; velocity = { x: 0, y: 0 }; target = clamp({ scale: minimum.value, x: 0, y: 0 }) }
function load() { if (!picture.value.naturalWidth || !picture.value.naturalHeight) { failed.value = true; return }; failed.value = false; size.iw = picture.value.naturalWidth; size.ih = picture.value.naturalHeight; loaded.value = true; fit(); Object.assign(view,target) }
function zoom(factor, point = { x: size.w / 2, y: size.h / 2 }) { if (!loaded.value || playerDrag.value || props.painting) return; velocity = { x: 0, y: 0 }; target = clamp(zoomAt(target, factor, point, minimum.value, scales.value.max)) }
function local(event) { const r = root.value.getBoundingClientRect(); return { x: event.clientX-r.left, y: event.clientY-r.top } }
function startPlayerDrag(e) {
  if (props.painting) { startPaint(e); return }
  if (e.button > 0 || !props.sharing || !props.localHider || pointers.size || playerDrag.value) return
  e.preventDefault()
  const p = local(e)
  playerDrag.value = {
    id: e.pointerId,
    offsetX: (p.x - view.x) / view.scale - props.localHider.x * size.iw,
    offsetY: (p.y - view.y) / view.scale - props.localHider.y * size.ih,
  }
  velocity = { x: 0, y: 0 }
  target = { ...view }
  root.value.focus({ preventScroll: true })
  root.value.setPointerCapture(e.pointerId)
}
function movePlayer(e) {
  const drag = playerDrag.value
  if (!drag || drag.id !== e.pointerId) return
  const p = local(e)
  emit('place', {
    x: Math.max(0, Math.min(1, ((p.x - view.x) / view.scale - drag.offsetX) / size.iw)),
    y: Math.max(0, Math.min(1, ((p.y - view.y) / view.scale - drag.offsetY) / size.ih)),
  })
}
function stopPlayerDrag() {
  const id = playerDrag.value?.id
  playerDrag.value = null
  if (id !== undefined && root.value?.hasPointerCapture(id)) root.value.releasePointerCapture(id)
}
watch(() => props.sharing, sharing => { if (!sharing) stopPlayerDrag() })
function down(e) { if (!loaded.value || props.painting || playerDrag.value || e.button > 0) return; root.value.focus(); root.value.setPointerCapture(e.pointerId); pointers.set(e.pointerId,local(e)); dragging.value = true; velocity = { x: 0,y: 0 }; target = { ...view }; lastMove = performance.now() }
function move(e) {
  if (props.painting) { updateBrushPreview(e); movePaint(e); return }
  if (playerDrag.value) { movePlayer(e); return }
  const p = local(e), now = performance.now()
  if (loaded.value && props.sharing && p.x >= view.x && p.x <= view.x + size.iw * view.scale && p.y >= view.y && p.y <= view.y + size.ih * view.scale && now-broadcast > 65) { emit('pointer',{ x: (p.x-view.x)/view.scale/size.iw,y: (p.y-view.y)/view.scale/size.ih }); broadcast=now }
  if (!pointers.has(e.pointerId)) return
  const old = pointers.get(e.pointerId)
  if (pointers.size === 2) {
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)[1]
    const before = Math.hypot(old.x-other.x,old.y-other.y), after = Math.hypot(p.x-other.x,p.y-other.y)
    const center = { x: (old.x+other.x)/2,y: (old.y+other.y)/2 }
    target = zoomAt(target,after/Math.max(1,before),center,minimum.value,scales.value.max)
    target.x += (p.x-old.x)/2; target.y += (p.y-old.y)/2; target=clamp(target)
    velocity = { x: 0,y: 0 }
  } else {
    const dt=Math.max(8,now-lastMove)
    target=clamp({ ...target,x:target.x+p.x-old.x,y:target.y+p.y-old.y })
    velocity={ x:(p.x-old.x)/dt,y:(p.y-old.y)/dt }
  }
  pointers.set(e.pointerId,p); lastMove=now
}
function up(e) {
  if (paintPointer === e.pointerId) { if (e.type === 'pointerup') movePaint(e); finishPaint(); if (e.pointerType !== 'mouse' || e.type !== 'pointerup') brushPreview.value = null; return }
  if (playerDrag.value?.id === e.pointerId) {
    if (e.type === 'pointerup') movePlayer(e)
    stopPlayerDrag()
    return
  }
  pointers.delete(e.pointerId); dragging.value=pointers.size>0; if (performance.now()-lastMove>90 || e.type==='pointercancel') velocity={ x:0,y:0 } }
function wheel(e) { zoom(Math.exp(-e.deltaY*(e.deltaMode===1 ? .04 : .002)),local(e)) }
function key(e) { if (playerDrag.value || props.painting) return; const moves={ ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80] }; if(moves[e.key]) { e.preventDefault(); const [x,y]=moves[e.key]; target=clamp({...target,x:target.x+x,y:target.y+y}) } else if (['+','=','-','0'].includes(e.key)) { e.preventDefault(); e.key==='0'?fit():zoom(e.key==='-'?1/1.3:1.3) } }
function tick(now) { const dt=Math.min(32,now-last||16); last=now; if(props.painting && props.localHider) { target=playerPaintView(size.w,size.h,size.iw,size.ih,props.localHider); Object.assign(view,target) } else if(!dragging.value) { target=clamp({...target,x:target.x+velocity.x*dt,y:target.y+velocity.y*dt}); const decay=Math.exp(-dt/150); velocity.x*=decay; velocity.y*=decay } const mix=1-Math.exp(-dt/(dragging.value?22:65)); for(const k of ['x','y','scale']) view[k]+=(target[k]-view[k])*mix; frame=requestAnimationFrame(tick) }
onMounted(() => { observer=new ResizeObserver(([entry])=>{ size.w=entry.contentRect.width; size.h=entry.contentRect.height; fit() }); observer.observe(root.value); frame=requestAnimationFrame(tick) })
onUnmounted(()=>{ observer?.disconnect(); cancelAnimationFrame(frame) })
</script>

<template>
  <div class="viewer" ref="root" tabindex="0" :aria-label="`${title}. Drag to pan, scroll to zoom. Arrow keys pan; plus and minus zoom; zero resets.`" :class="{ dragging: dragging || playerDrag }" @dragstart.prevent @pointerdown="down" @pointermove="move" @pointerleave="brushPreview = null" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @wheel.prevent="wheel" @dblclick="zoom(1.6, local($event))" @keydown="key">
    <div class="image-layer" v-show="loaded && !failed" :style="{ width: size.iw+'px',height:size.ih+'px', transform:`translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})` }">
      <img ref="picture" :src="src" :alt="title" draggable="false" @load="load" @error="failed=true">
      <template v-for="(point,id) in peers" :key="id">
        <HiderAvatar :show-base="Array.isArray(point.paint)" :strokes="point.paint" v-if="point?.role === 'hider'" class="hider-marker" :style="{left:point.x*100+'%',top:point.y*100+'%'}" width="24" height="24" viewBox="0 0 24 24" aria-label="Hider"/>
        <div v-else-if="point" class="peer-pointer" :style="{left:point.x*100+'%',top:point.y*100+'%',transform:`scale(${1/view.scale})`}"><MousePointer2 :size="19" fill="currentColor"/><span>Hunter {{ id.slice(0,4) }}</span></div>
      </template>
      <HiderAvatar :strokes="visiblePaint" v-if="localHider" class="hider-marker local-hider" :class="{ moving: playerDrag, paintable: painting }" @pointerdown.stop="startPlayerDrag" @dblclick.stop :style="{left:localHider.x*100+'%',top:localHider.y*100+'%'}" width="24" height="24" viewBox="0 0 24 24" :aria-label="painting ? 'Your player. Drag to paint.' : 'Your hiding spot. Drag to move.'"/>
    </div>
    <div v-if="painting && brushPreview" class="brush-preview" :style="brushPreviewStyle" aria-hidden="true"></div>
    <div v-if="failed" class="image-message">The image couldn’t load. Choose another scene or check the image file.</div>
    <div v-else-if="!loaded" class="image-message">Unfolding the scene…</div>
    <div class="corner-panel help-panel"><strong><Move :size="15"/> Follow your curiosity</strong><p>{{ painting ? 'Paint your circle · Done to explore again' : sharing && role === 'hider' ? 'Drag your circle to move · Drag the scene to explore' : 'Drag to explore · Scroll or pinch to zoom' }}</p><small v-if="!painting">Arrow keys to pan · + / − to zoom · 0 to reset</small></div>
    <section v-if="painting" class="corner-panel paint-tools" aria-label="Painting tools" @pointerenter="brushPreview = null" @pointerdown.stop @pointermove.stop @pointerup.stop @dblclick.stop @wheel.stop @keydown.stop>
      <div class="eyebrow">PAINT YOUR PLAYER</div>
      <p>View locked to your circle.</p>
      <label for="brush-color">BRUSH COLOR</label>
      <div class="color-control"><input id="brush-color" v-model="brushColor" type="color"><span>{{ brushColor }}</span></div>
      <label for="brush-size">BRUSH SIZE <output>{{ brushSize }}</output></label>
      <input id="brush-size" v-model.number="brushSize" type="range" min="0.5" max="8" step="0.5">
      <div class="paint-actions"><button :disabled="!paint.length" @click="emit('paint', paint.slice(0,-1))">Undo</button><button :disabled="!paint.length" @click="emit('paint', [])">Clear</button></div>
      <p v-if="paint.length >= MAX_STROKES" role="status">Paint is full. Undo or clear to keep painting.</p>
    </section>
    <div class="corner-panel navigation-panel" @pointerenter="brushPreview = null" @pointerdown.stop @dblclick.stop @wheel.stop>
    <div class="map" v-if="loaded && !failed" :style="mapSize" aria-hidden="true"><img :src="src" alt="" draggable="false"><div :style="minimap"></div></div>
    <div class="viewer-controls" @pointerdown.stop @dblclick.stop>
      <button :disabled="!loaded || failed || painting" aria-label="Zoom out" @click="zoom(1/1.35)"><Minus :size="18"/></button><span>{{ percent }}%</span><button :disabled="!loaded || failed || painting" aria-label="Zoom in" @click="zoom(1.35)"><Plus :size="18"/></button><div class="control-divider"></div><button :disabled="!loaded || failed || painting" aria-label="Fit image" title="Fit image (0)" @click="fit"><Scan :size="19"/></button>
    </div>
    </div>
  </div>
</template>
