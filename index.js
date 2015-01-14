var ObservStruct = require('observ-struct')
var NodeArray = require('observ-node-array')
var Event = require('geval')
var Observ = require('observ')
var watch = require('observ/watch')
var computed = require('observ/computed')
var getDirName = require('path').dirname
var getBaseName = require('path').basename
var join = require('path').join
var relative = require('path').relative

var map = require('observ-node-array/map')
var lookup = require('observ-node-array/lookup')

module.exports = Setup

function Setup(parentContext){

  var context = Object.create(parentContext)
  var audioContext = context.audio

  var node = ObservStruct({
    controllers: NodeArray(context),
    chunks: NodeArray(context),
    selectedChunkId: Observ()
  })

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

  // maps and lookup
  node.controllers.resolved = map(node.controllers, 'resolved')
  node.chunks.resolved = map(node.chunks, 'resolved')

  context.chunkLookup = lookup(node.chunks, 'id')

  node.context = context

  node.resolved = ObservStruct({
    controllers: node.controllers.resolved,
    chunks: node.chunks.resolved
  })

  node.getNewChunkId = function(src){
    var lookup = node.chunks.controllerContextLookup()
    var base = getBaseName(src, '.json')
    var incr = 0
    var id = base

    while (lookup[id]){
      incr += 1
      id = base + ' ' + (incr + 1)
    }

    return id
  }

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