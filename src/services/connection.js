import { sanitizePaint } from './paint.js'
import { computed, ref } from 'vue'
import { joinRoom, getRelaySockets } from 'trystero'

export function createConnection(transport = { joinRoom, getRelaySockets }) {
  const status = ref('disconnected'), peers = ref({}), error = ref('')
  let room, timer, send, lastPoint, started = 0
  const connected = computed(() => status.value === 'connected')
  function disconnect() {
    clearInterval(timer)
    room?.leave()
    room = null
    send = null
    lastPoint = null
    peers.value = {}
    status.value = 'disconnected'
  }
  function connect(roomId, player) {
    disconnect()
    lastPoint = player
    error.value = ''
    status.value = 'connecting'
    started = Date.now()
    try {
      room = transport.joinRoom({ appId: 'chameleon-image-explorer-v1' }, roomId, {
        onJoinError: () => { error.value = 'A peer could not connect. Try reconnecting if needed.' },
      })
      const action = room.makeAction('pointer')
      // Trystero 0.24 exposes tuple actions and callback registration methods.
      ;[send] = action
      action[1]((point, id) => {
        if (point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) {
          const previous = peers.value[id]
          const role = ['hunter', 'hider'].includes(point.role) ? point.role : previous?.role
          // A position-only update must not erase the player's existing paint.
          const paint = role === 'hider'
            ? (Array.isArray(point.paint) ? sanitizePaint(point.paint) : previous?.paint)
            : undefined
          peers.value = { ...peers.value, [id]: {
            x: point.x, y: point.y,
            ...(role ? { role } : {}),
            ...(paint !== undefined ? { paint } : {}),
            ...(typeof point.scene === 'string' ? { scene: point.scene } : previous?.scene ? { scene: previous.scene } : {}),
          } }
        }
      })
      const joined = id => { peers.value = { ...peers.value, [id]: null }; status.value = 'connected'; if (lastPoint) Promise.resolve(send(lastPoint, id)).catch(() => {}) }
      const left = id => { const next = { ...peers.value }; delete next[id]; peers.value = next }
      room.onPeerJoin(joined)
      room.onPeerLeave(left)
      timer = setInterval(() => {
        const online = Object.values(transport.getRelaySockets()).some(socket => socket.readyState === 1)
        if (online || Object.keys(room.getPeers()).length) {
          status.value = 'connected'
          error.value = ''
        } else if (Date.now() - started > 15000) {
          status.value = 'connecting'
          error.value = 'Waiting for the connection service. Check your internet or try reconnecting.'
        }
      }, 400)
    } catch (e) {
      disconnect()
      error.value = `Could not connect: ${e.message}`
    }
  }
  function pointer(point) { lastPoint = point; if (connected.value && send) Promise.resolve(send(point)).catch(() => {}) }
  return { status, peers, error, connected, connect, disconnect, pointer }
}
