var ObservStruct = require('observ-struct')
var Observ = require('observ')
var ObservVarhash = require('observ-varhash')
var NodeArray = require('observ-node-array')
var ArrayGrid = require('array-grid')

var computed = require('observ/computed')
var lookup = require('observ-node-array/lookup')
var nextTick = require('next-tick')
var deepEqual = require('deep-equal')
var ExternalRouter = require('./external-router')

module.exports = Chunk

function Chunk(parentContext){

  var context = Object.create(parentContext)

  var output = context.output = context.audio.createGain()
  context.output.connect(parentContext.output)

  var obs = ObservStruct({
    id: Observ(),
    shape: Observ(),
    slots: NodeArray(context),
    inputs: Observ([]),
    outputs: Observ([]),
    volume: Observ(1),
    routes: ExternalRouter(context),
    flags: ObservVarhash({}),
    volume: Observ(1),
    chokeAll: Observ(false),
    color: Observ([255,255,255]),
    selectedSlotId: Observ()
  })

  obs.output = context.output
  obs.context = context

  obs.volume(function(value){
    output.gain.value = value
  })

  context.slotLookup = lookup(obs.slots, 'id')

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


  obs.slots.onUpdate(obs.routes.reconnect)

  obs.destroy = function(){
    obs.routes.destroy()
  }

  return obs

  // scoped

  function getGlobalId(id){
    if (id){
      return obs.id() + '/' + id
    }
  }
}