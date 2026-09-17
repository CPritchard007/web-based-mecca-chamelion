import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zoomAt, constrain } from './viewport.js'
test('zoom preserves the image point under the pointer', () => {
 const view={x:-200,y:-100,scale:2}, point={x:300,y:250}
 const next=zoomAt(view,1.5,point,1,8)
 assert.equal((point.x-view.x)/view.scale,(point.x-next.x)/next.scale)
 assert.equal((point.y-view.y)/view.scale,(point.y-next.y)/next.scale)
})
test('zoom respects both limits',()=>{assert.equal(zoomAt({x:0,y:0,scale:2},100,{x:0,y:0},1,8).scale,8);assert.equal(zoomAt({x:0,y:0,scale:2},.001,{x:0,y:0},1,8).scale,1)})
test('bounds center small images and prevent dragging large images off screen',()=>{assert.deepEqual(constrain({x:200,y:-900,scale:1},800,600,400,200),{x:200,y:200,scale:1});assert.deepEqual(constrain({x:200,y:-900,scale:2},800,600,800,600),{x:0,y:-600,scale:2})})

test('every image shape fits fully, preserves proportions, and can zoom to fill', async () => {
 const { imageScales } = await import('./viewport.js')
 for (const [iw, ih] of [[400,2400],[12000,300],[800,800],[1,1],[30000,20000]]) {
  for (const [w,h] of [[1440,900],[390,844]]) {
   const { min, max } = imageScales(w,h,iw,ih)
   const fitted = constrain({x:0,y:0,scale:min},w,h,iw,ih)
   assert.ok(iw*min <= w + 1e-8 && ih*min <= h + 1e-8)
   assert.ok(Math.abs(fitted.x - (w-iw*min)/2) < 1e-8)
   assert.ok(Math.abs(fitted.y - (h-ih*min)/2) < 1e-8)
   assert.ok(iw*max >= w && ih*max >= h)
   assert.ok(Number.isFinite(max) && max >= 1)
  }
 }
})
