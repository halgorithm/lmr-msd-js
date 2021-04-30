// import { Writable } from 'stream'
import fs from 'fs'
import { BitStream } from 'bit-buffer'
import { timesMap, iterMap } from '../util/index.js'

const BUFFER_SIZE = 8388608 // 8 MB

function serializeStage(stream, msd) {
  msd.animatedTiles.forEach(animatedTile =>
    serializeAnimatedTile(stream, animatedTile)
  )
  stream.writeInt16(0) // end of animatedTileSection

  stream.writeInt8(msd.graphicsFileId)
  stream.writeInt8(msd.unknown)
  stream.writeInt8(msd.rooms.length)
  msd.rooms.forEach(room => serializeRoom(stream, room))
}

function serializeAnimatedTile(stream, animatedTile) {
  stream.writeBoolean(animatedTile.animateInBoss)
  stream.writeBits(animatedTile.frames.length, 15)

  animatedTile.frames.forEach(frame =>
    serializeAnimatedTileFrame(stream, frame)
  )
}

function serializeAnimatedTileFrame(stream, frame) {
  stream.writeBits(frame.wait, 5)
  serializeTileIdx(stream, frame.gfxIdx)
}

function serializeTileIdx(stream, idx) {
  stream.writeBits(idx, 11)
}

function serializeRoom(stream, room) {
  stream.writeInt8(room.useBossGfx ? 1 : 0)
  stream.writeInt8(room.layerGroups.length)
  stream.writeInt8(room.primeLayerGroupIdx)

  stream.writeInt16(room.collision[0].length)
  stream.writeInt16(room.collision.length)
  eachRect(room.collision, val => stream.writeUint8(val))
  room.layerGroups.forEach(layerGroup =>
    serializeLayerGroup(stream, layerGroup)
  )
}

function serializeLayerGroup(stream, layerGroup) {
  stream.writeInt16(layerGroup.width)
  stream.writeInt16(layerGroup.height)
  stream.writeInt8(layerGroup.layers.length)
  layerGroup.layers.forEach(layer => serializeLayer(stream, layer))
}

function serializeLayer(stream, layer) {
  eachRect(layer, tile => serializeGfxTile(stream, tile))
}

function serializeGfxTile(stream, tile) {
  stream.writeBoolean(tile.rotate180)
  stream.writeBoolean(tile.rotate90)
  stream.writeBoolean(tile.flipHorizontal)
  stream.writeBits(tile.blendMode, 2)
  serializeTileIdx(stream, tile.gfxIdx)
}



function eachRect(data, callback) {
  data.forEach(row => row.forEach(callback))
}



async function serializeMSD(path, msd) {
  // TODO use a smart-buffer or something that can resize instead of
  // allocating so much space and hoping it doesn't run out.
  // May require patching bit-buffer to relax its type-checking
  // on the provided buffer.
  const data = Buffer.allocUnsafe(BUFFER_SIZE)
  const stream = new BitStream(data)
  stream.bigEndian = true
  
  return new Promise(resolve => {
    resolve(serializeStage(stream, msd))
  }).then(() => {
    const finalData = stream.buffer.slice(0, stream.byteIndex)
    fs.writeFileSync(path, finalData)
  })
}

export default serializeMSD
