import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createConnection } from './connection.js'
function setup() {
 const callbacks={}, sockets={relay:{readyState:0}}, calls=[]
 const room={leave:()=>calls.push('leave'),getPeers:()=>({}),makeAction:()=>[point=>calls.push(point),fn=>callbacks.pointer=fn],onPeerJoin:fn=>callbacks.join=fn,onPeerLeave:fn=>callbacks.leave=fn}
 return {callbacks,sockets,calls,connection:createConnection({joinRoom:()=>room,getRelaySockets:()=>sockets})}
}
test('sharing waits for a relay and pauses after relay loss',t=>{
 t.mock.timers.enable({apis:['setInterval','Date']})
 const {connection,sockets}=setup()
 connection.connect('test')
 assert.equal(connection.connected.value,false)
 sockets.relay.readyState=1
 t.mock.timers.tick(400)
 assert.equal(connection.connected.value,true)
 sockets.relay.readyState=3
 t.mock.timers.tick(16000)
 assert.equal(connection.connected.value,false)
 assert.match(connection.error.value,/Waiting/)
 connection.disconnect()
 assert.equal(connection.status.value,'disconnected')
})
test('peer presence and valid cursors update; disconnect clears the room',()=>{
 const {connection,callbacks,calls}=setup()
 connection.connect('test')
 callbacks.join('peer1')
 assert.equal(connection.connected.value,true)
 callbacks.pointer({x:.2,y:.8},'peer1')
 assert.deepEqual(connection.peers.value.peer1,{x:.2,y:.8})
 callbacks.pointer({x:'bad',y:1},'peer1')
 assert.equal(connection.peers.value.peer1.x,.2)
 connection.pointer({x:.5,y:.5})
 assert.deepEqual(calls[0],{x:.5,y:.5})
 callbacks.leave('peer1')
 assert.deepEqual(connection.peers.value,{})
 connection.disconnect()
 assert.ok(calls.includes('leave'))
})
test('join failure leaves sharing disconnected and reports the error',()=>{
 const connection=createConnection({joinRoom:()=>{throw new Error('Unavailable')}})
 connection.connect('test')
 assert.equal(connection.connected.value,false)
 assert.match(connection.error.value,/Unavailable/)
})

test('roles and hiding spots sync to new peers and survive pointer updates', () => {
 const {connection, callbacks, calls} = setup()
 const initial = {x:.5,y:.5,role:'hider',scene:'sports-day.jpg'}
 connection.connect('game', initial)
 callbacks.join('hunter1')
 assert.deepEqual(calls[0], initial)
 const placed = {...initial,x:.2,y:.8}
 connection.pointer(placed)
 callbacks.join('hunter2')
 assert.deepEqual(calls.at(-1), placed)
 callbacks.pointer(placed, 'other-hider')
 assert.deepEqual(connection.peers.value['other-hider'], placed)
 callbacks.pointer({...placed,x:2}, 'other-hider')
 assert.deepEqual(connection.peers.value['other-hider'], placed)
 connection.disconnect()
 connection.connect('new-game')
 const before = calls.length
 callbacks.join('new-peer')
 assert.equal(calls.length, before)
 connection.disconnect()
})

test('paint syncs with player state and can be cleared', () => {
 const {connection,callbacks,calls} = setup()
 const player = {x:.5,y:.5,role:'hider',scene:'sports-day.jpg',paint:[{color:'#336699',width:3,points:[[10,10],[14,14]]}]}
 connection.connect('paint-room', player)
 callbacks.join('peer')
 assert.deepEqual(calls[0],player)
 callbacks.pointer(player,'peer')
 assert.deepEqual(connection.peers.value.peer.paint,player.paint)
 callbacks.pointer({...player,paint:[]},'peer')
 assert.deepEqual(connection.peers.value.peer.paint,[])
 connection.disconnect()
})

test('hunter retains hider paint across position-only updates', () => {
 const {connection,callbacks} = setup()
 connection.connect('paint-room')
 callbacks.join('hider')
 const paint = [{color:'#336699',width:3,points:[[10,10],[14,14]]}]
 callbacks.pointer({x:.5,y:.5,role:'hider',scene:'scene.jpg',paint},'hider')
 callbacks.pointer({x:.6,y:.7},'hider')
 assert.deepEqual(connection.peers.value.hider,{x:.6,y:.7,role:'hider',scene:'scene.jpg',paint})
 callbacks.pointer({x:.6,y:.7,role:'hider',paint:[]},'hider')
 assert.deepEqual(connection.peers.value.hider.paint,[])
 connection.disconnect()
})
