import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizePaint, playerPaintView, MAX_STROKES } from './paint.js'

test('paint accepts brush strokes and rejects malformed remote content', () => {
 const stroke = {color:'#abcdef',width:2,points:[[2,12],[22,12]]}
 assert.deepEqual(sanitizePaint([stroke]), [stroke])
 assert.deepEqual(sanitizePaint([null,{...stroke,color:'url(evil)'},{...stroke,width:99},{...stroke,points:[[NaN,1]]},{...stroke,points:[[25,1]]}]), [])
 assert.equal(sanitizePaint(Array(200).fill(stroke)).length, MAX_STROKES)
 assert.deepEqual(sanitizePaint([]), [])
 const copy = sanitizePaint([stroke]); copy[0].points[0][0] = 9
 assert.equal(stroke.points[0][0],2)
})
test('painting keeps the player centered in the free area, even at image edges', () => {
 for (const [w,h] of [[1440,900],[390,844]]) {
  for (const [iw,ih] of [[12000,300],[400,2400]]) {
   for (const player of [{x:0,y:0},{x:.5,y:.5},{x:1,y:1}]) {
    const view = playerPaintView(w,h,iw,ih,player)
    const available = Math.max(100,w-(w<=700?220:340))
    assert.ok(Math.abs(view.x+player.x*iw*view.scale-available/2)<1e-8)
    assert.ok(Math.abs(view.y+player.y*ih*view.scale-h/2)<1e-8)
    assert.ok(view.scale*20<=240)
   }
  }
 }
})
