<script setup>
import { computed, ref, onUnmounted, watch } from 'vue'
import { ArrowRight, Radio, Users, Link, Check, LogOut, LoaderCircle, Eye, Paintbrush } from 'lucide-vue-next'
import { scenes } from './services/scenes'
import ImageExplorer from './components/ImageExplorer.vue'
import { createConnection } from './services/connection'
const connection = createConnection()
const { status, peers, error, connected } = connection
const role = ref('')
const painting = ref(false), paint = ref([])
function playerState(point = hiderPosition.value) { return { ...point, role: role.value, scene: selectedScene.value, ...(role.value === 'hider' ? { paint: paint.value } : {}) } }
function updatePaint(strokes) { paint.value = strokes; if (connected.value) connection.pointer(playerState()) }
const hiderPosition = ref({ x: .5, y: .5 })
const room = ref(new URLSearchParams(location.search).get('room') || 'sports-day')
const selectedScene = ref(scenes.find(scene => scene.id === new URLSearchParams(location.search).get('scene'))?.id || scenes[0]?.id)
const scene = computed(() => scenes.find(item => item.id === selectedScene.value))
const scenePeers = computed(() => Object.fromEntries(Object.entries(peers.value).filter(([, point]) => point?.scene === selectedScene.value)))
function changeScene() { painting.value = false; hiderPosition.value = { x: .5, y: .5 }; if (connected.value) connection.pointer(playerState()); const url = new URL(location.href); url.searchParams.set('scene', selectedScene.value); history.replaceState({}, '', url) }
function sendPointer(point) { if (role.value === 'hunter') connection.pointer(playerState(point)) }
function placeHider(point) { if (!connected.value || role.value !== 'hider') return; hiderPosition.value = point; connection.pointer(playerState(point)) }
watch(connected, online => { if (online) connection.pointer(playerState()); else painting.value = false })

const copied = ref(false), copyError = ref('')
const count = computed(() => Object.keys(peers.value).length)
function join() { if (!role.value) return; const id=room.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,48); room.value=id || 'sports-day'; connection.connect(room.value, playerState()); const url=new URL(location.href); url.searchParams.set('room',room.value); history.replaceState({},'',url) }
async function share() { try { const url = new URL(location.href); url.searchParams.set('scene', selectedScene.value); await navigator.clipboard.writeText(url.href); copied.value=true; setTimeout(()=>copied.value=false,2000) } catch { copyError.value='Copy the page URL from your address bar to invite a friend.' } }
onUnmounted(connection.disconnect)
</script>

<template>
  <main class="app-shell" :class="{ painting }">
    <ImageExplorer v-if="scene" :key="scene.id" :src="scene.src" :title="scene.title" :peers="scenePeers" :sharing="connected" :role="role" :local-hider="connected && role === 'hider' ? hiderPosition : null" :painting="painting" :paint="paint" @paint="updatePaint" @pointer="sendPointer" @place="placeHider"/>
    <p v-else class="image-message">Add an image to src/assets/images to start exploring.</p>
    <header class="corner-panel identity-panel">
      <a class="brand" href="./" aria-label="Chameleon home"><span class="brand-mark">c</span>chameleon<span class="brand-dot">.</span></a>
      <label for="scene">CHOOSE A SCENE</label>
      <select id="scene" v-model="selectedScene" @change="changeScene"><option v-for="item in scenes" :key="item.id" :value="item.id">{{ item.title }}</option></select>
      <p>Countless little stories. Take a closer look.</p>
    </header>
    <button v-if="connected && role === 'hider'" class="paint-toggle corner-panel" :class="{ active: painting }" :aria-pressed="painting" title="Paint your player" @click="painting = !painting"><Paintbrush :size="19"/><span>{{ painting ? 'Done' : 'Paint' }}</span></button>
    <aside class="corner-panel room-panel" aria-label="Exploring room">
      <div class="session-heading"><span class="eyebrow">YOUR EXPLORING ROOM</span><Radio :size="16"/></div>
      <div class="status" aria-live="polite"><span :class="status"></span>{{ connected ? `Playing as a ${role}` : status === 'connecting' ? 'Connecting · Spectating' : 'Spectating · Explore freely' }}</div>
      <form v-show="!painting" @submit.prevent="join">
        <label for="room">ROOM NAME</label>
        <div class="room-input"><span>#</span><input id="room" v-model="room" maxlength="48" :disabled="status !== 'disconnected'" required autocomplete="off" spellcheck="false"></div>
        <fieldset class="role-choice" :disabled="status !== 'disconnected'">
          <legend>CHOOSE YOUR SIDE</legend>
          <label><input v-model="role" type="radio" value="hunter" name="role" required><span>Hunter</span></label>
          <label><input v-model="role" type="radio" value="hider" name="role" required><span>Hider</span></label>
        </fieldset>
        <p class="role-description">{{ role === 'hider' ? 'Drag your circle to move. Drag the background to explore.' : role === 'hunter' ? 'Explore the scene and look for the white circles.' : 'Pick a side to join, or keep spectating.' }}</p>
        <button v-if="status==='disconnected'" class="connect-button" type="submit">Join as {{ role || 'a player' }} <ArrowRight :size="17"/></button>
        <button v-else-if="status==='connecting'" class="connect-button" type="button" @click="connection.disconnect"><LoaderCircle class="spin" :size="17"/> Connecting · Cancel</button>
        <button v-else class="connect-button" type="button" @click="share"><Check v-if="copied" :size="17"/><Link v-else :size="17"/>{{ copied?'Link copied':'Invite a friend' }}</button>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="copyError" class="error">{{ copyError }}</p>
      <div v-show="!painting" class="room-footer"><Users v-if="connected" :size="14"/><Eye v-else :size="14"/><span>{{ connected ? `${count+1} ${count===0?'explorer':'explorers'} in this room` : 'Not ready? Stay and look around.' }}</span></div>
      <button v-if="connected" class="leave-button" @click="connection.disconnect"><LogOut :size="13"/> Leave room · Keep spectating</button>
    </aside>
  </main>
</template>
