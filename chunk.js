var ObservStruct = require('observ-struct')
var Observ = require('observ')
var ObservVarhash = require('observ-varhash')
var NodeArray = require('observ-node-array')
var ArrayGrid = require('array-grid')

var computed = require('observ/computed')
var lookup = require('observ-node-array/lookup')
var nextTick = require('next-tick')

module.exports = Chunk

function Chunk(parentContext){

  var context = Object.create(parentContext)

  context.output = context.audio.createGain()
  context.output.connect(parentContext.output)

  var obs = ObservStruct({
    id: Observ(),
    shape: Observ(),
    slots: NodeArray(context),
    inputs: Observ([]),
    outputs: Observ([]),
    routing: ObservVarhash({}),
    flags: ObservVarhash({}),
    volume: Observ(1),
    chokeAll: Observ(false),
    color: Observ([255,255,255])
  })

  obs.output = context.output

  context.slotLookup = lookup(obs.slots, 'id')

  var externalConnections = []

  obs.triggerOn = function(id, at){
    var slot = context.slotLookup.get(id)

    if (obs.chokeAll()){
      obs.slots.forEach(function(slot){
        slot.choke(at)
      })
    }

    if (slot){
      slot.triggerOn(at)
    }
  }

  obs.triggerOff = function(id, at){
    var slot = context.slotLookup.get(id)
    if (slot){
      slot.triggerOff(at)
    }
  }

  obs.getSlot = function(id){
    return context.slotLookup.get(id)
  }

  obs.triggers = computed([obs.id, obs.shape], function(id, shape){
    var length = Array.isArray(shape) && shape[0] * shape[1] || 0
    var result = []
    for (var i=0;i<length;i++){
      result.push(String(i))
    }
    return result
  })

  obs.grid = computed([obs.triggers, obs.shape], ArrayGrid)

  obs.resolvedGrid = computed([obs.triggers, obs.shape], function(triggers, shape){
    return ArrayGrid(triggers.map(getGlobalId), shape)
  })

  obs.routing(function(){
    nextTick(reconnect)
  })

  function reconnect(){

    // disconnect all current connections
    while (externalConnections.length){
      externalConnections.pop().disconnect()
    }

    var routing = obs.routing() || {}

    Object.keys(routing).forEach(function(from){

      var target = routing[from]
      var output = context.slotLookup.get(from)

      if (typeof target === 'string'){
        target = [target]
      }

      if (output && Array.isArray(target)){
        var routed = false

        target.forEach(function(to){

          if (to && typeof to === 'string'){
            if (to === '$default'){
              output.connect(context.output)
              routed = true
            } else {
              to = to.split('/')
              var destinationChunk = context.chunkLookup.get(to[0])
              var destinationSlot = destinationChunk && destinationChunk.getSlot(to[1])
              if (destinationSlot && destinationSlot.input){
                output.connect(destinationSlot.input)
                routed = true
              }
            }

          }
        })

        if (routed){
          externalConnections.push(output)
        }
      }
    })

  }

  obs.destroy = function(){
    while (externalConnections.length){
      externalConnections.pop().disconnect()
    }

    // destroy all the child nodes
  }

  return obs

  // scoped

  function getGlobalId(id){
    if (id){
      return obs.id() + '/' + id
    }
  }
}