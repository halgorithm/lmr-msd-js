import fs from 'fs/promises'
import { BitStream } from 'bit-buffer'
import { timesMap, iterMap } from '../util/index.js'

// look into filer for fs in browser

function parseStage(stream) {
  const animatedTiles = iterMap(() => parseAnimatedTile(stream))
  const graphicsFileId = stream.readInt8()
  const unknown = stream.readInt8() // might affect tile animations?
  const roomsCount = stream.readInt8()
  const rooms = timesMap(roomsCount, () => parseRoom(stream))

  return { animatedTiles, unknown, graphicsFileId, rooms }
}

function parseAnimatedTile(stream) {
  const animateInBoss = stream.readBits(1) === 1
  const framesCount = stream.readBits(15)
  if (!animateInBoss && framesCount === 0) return

  const frames = timesMap(framesCount, () =>
    parseAnimatedTileFrame(stream)
  )
  
  return { animateInBoss, frames }
}

function parseAnimatedTileFrame(stream) {
  const wait = stream.readBits(5)
  const gfxIdx = parseTileIdx(stream)

  return { wait, gfxIdx }
}

function parseTileIdx(stream) {
  return stream.readBits(11)
}

function parseRoom(stream) {
  const useBossGfx = stream.readInt8() === 1
  const layerGroupsCount = stream.readInt8()
  const primeLayerGroupIdx = stream.readInt8()
  const collisionWidth = stream.readInt16()
  const collisionHeight = stream.readInt16()
  const collision = parseCollision(
    stream, collisionWidth, collisionHeight
  )
  const layerGroups = timesMap(layerGroupsCount, () =>
    parseLayerGroup(stream)
  )

  return { useBossGfx, primeLayerGroupIdx, collision, layerGroups }
}

function parseCollision(stream, width, height) {
  return rectMap(width, height, () => stream.readUint8())
}

function parseLayerGroup(stream) {
  const width = stream.readInt16()
  const height = stream.readInt16()
  const layersCount = stream.readInt8()
  const layers = timesMap(layersCount, () =>
    parseLayer(stream, width, height)
  )

  return { layers, width, height }
}

function parseLayer(stream, width, height) {
  return rectMap(width, height, () => parseGfxTile(stream))
}

function parseGfxTile(stream) {
  const rotate180 = stream.readBits(1) === 1
  const rotate90 = stream.readBits(1) === 1
  const flipHorizontal = stream.readBits(1) === 1
  const blendMode = stream.readBits(2)
  const gfxIdx = parseTileIdx(stream)

  return { gfxIdx, blendMode, flipHorizontal, rotate90, rotate180 }
}



function rectMap(width, height, callback) {
  return timesMap(height, () =>
    timesMap(width, callback)
  )
}



// file can be a String, File or Blob
async function parseMSD(file) {
  return fs.readFile(file)
    .then(data => {
      const stream = new BitStream(data)
      stream.bigEndian = true

      return parseStage(stream)
    })
}

export default parseMSD
