var ObservStruct = require('observ-struct')
var NodeArray = require('observ-node-array')
var Observ = require('observ')
var watch = require('observ/watch')
var computed = require('observ/computed')
var getDirName = require('path').dirname
var getBaseName = require('path').basename
var join = require('path').join
var relative = require('path').relative

var map = require('observ-node-array/map')
var lookup = require('observ-node-array/lookup')

var ObservDefault = require('./observ-default.js')

module.exports = Setup

function Setup(parentContext){

  var context = Object.create(parentContext)
  var audioContext = context.audio


  var node = ObservStruct({
    controllers: NodeArray(context),
    chunks: NodeArray(context),
    selectedChunkId: Observ(),
    globalScale: ObservDefault({
      offset: 0, 
      notes: [0,2,4,5,7,9,11]
    })
  })

  context.setup = node
  context.globalScale = node.globalScale

  // main output
  node.output = audioContext.createGain()
  context.output = node.output
  node.output.connect(parentContext.output)

  context.triggerEvent = function(event){
    var split = event.id.split('/')
    var chunk = context.chunkLookup.get(split[0])
    var slotId = split[1]
    if (chunk){
      if (event.event === 'start'){
        chunk.triggerOn(slotId, event.time)
      } else if (event.event === 'stop'){
        chunk.triggerOff(slotId, event.time)
      }
    }
  }

  node.resolveAvailableChunk = function(id){
    var base = id
    var lookup = context.chunkLookup()
    var incr = 0

    while (lookup[id]){
      incr += 1
      id = base + ' ' + (incr + 1)
    }

    return id
  }

  node.destroy = function(){
    node.chunks.destroy()
    node.controllers.destroy()
  }

  // maps and lookup
  node.controllers.resolved = map(node.controllers, resolve)
  node.chunks.resolved = map(node.chunks, resolve)
  node.chunks.lookup = lookup(node.chunks, function(x){
    var descriptor = get(x)
    return descriptor && descriptor.id || undefined
  })

  context.chunkLookup = lookup(node.chunks, function(x){ 
    var data = x.resolved ? x.resolved() : x()
    return data && data.id || undefined
  }, resolve, resolveInner)


  node.context = context

  node.resolved = ObservStruct({
    selectedChunkId: node.selectedChunkId,
    controllers: node.controllers.resolved,
    chunks: node.chunks.resolved
  })

  node.grabInput = function(){
    var length = node.controllers.getLength()
    for (var i=0;i<length;i++){
      var controller = node.controllers.get(i)
      if (controller.grabInput){
        controller.grabInput()
      }
    }

    // now focus the selected chunk
    if (node.selectedChunkId){
      var chunkId = node.selectedChunkId()
      for (var i=0;i<length;i++){
        var controller = node.controllers.get(i)
        var chunkPositions = controller().chunkPositions || {}
        if (controller.grabInput && chunkPositions[chunkId]){
          controller.grabInput()
        }
      }
    }
  }

  return node
}

function get(obs){
  return typeof obs == 'function' ? obs() : obs
}

function resolve(node){
  return node && node.resolved || node
}

function resolveInner(node){
  return node && node.node || node
}