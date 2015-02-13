var ObservStruct = require('observ-struct')
var Observ = require('observ')
var ObservVarhash = require('observ-varhash')
var NodeArray = require('observ-node-array')
var SingleNode = require('observ-node-array/single')

var ArrayGrid = require('array-grid')

var computed = require('observ/computed')
var lookup = require('observ-node-array/lookup')
var merge = require('observ-node-array/merge')
var watch = require('observ/watch')
var nextTick = require('next-tick')
var deepEqual = require('deep-equal')
var ExternalRouter = require('./external-router')


module.exports = ScaleChunk

function ScaleChunk(parentContext){

  var context = Object.create(parentContext)

  var output = context.output = context.audio.createGain()
  context.output.connect(parentContext.output)

  var scaleSlots = NodeArray(context) 

  var obs = ObservStruct({
    id: Observ(),
    shape: Observ(),

    offset: Observ(0),
    templateSlot: SingleNode(context),
    scale: Observ(),

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

  context.slotLookup = merge([
    lookup(scaleSlots, 'id'),
    lookup(obs.slots, 'id'),
    singleLookup(obs.templateSlot, 'trigger')
  ])

  var computedSlots = computed([obs.offset, obs.templateSlot, obs.scale, obs.shape], function(offset, template, scale, shape){
    var length = shape&&(shape[0]*shape[1])||1
    var result = []
    for (var i=0;i<length;i++){
      var slot = obtainAndSubstitute(template, getNote(scale, i) + (offset || 0))
      if (slot){
        slot.id = String(i)
        result.push(slot)
      }
    }
    return result
  })

  computedSlots(scaleSlots.set)

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

  //obs.slots.onUpdate(obs.routes.reconnect)
  //scaleSlots.onUpdate(obs.routes.reconnect)

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

function obtainAndSubstitute(template, offset){
  return JSON.parse(JSON.stringify(template||{}, function(key, value){
    if (value && value.$offset){
      return value.value ? value.value + offset : offset
    } else if (key && (key === 'transpose' || key === 'note')){
      var val = getValue(value, 0) + offset
      return getNewValue(value, val)
    }

    return value
  }))
}

function getNewValue(object, value){
  if (object instanceof Object && !Array.isArray(object)){
    var v = obtain(object)
    v.value = getNewValue(v.value, value)
    return v
  } else {
    return value
  }
}

function getValue(object, defaultValue){
  if (object instanceof Object && !Array.isArray(object)){
    return getValue(object.value, defaultValue)
  } else {
    return object != null ? object : defaultValue
  }
}

function obtain(obj){
  return JSON.parse(JSON.stringify(obj))
}

function mod(n, m) {
  return ((n%m)+m)%m
}

function getNote(scale, offset){
  scale = Array.isArray(scale) ? scale : [0,1,2,3,4,5,6,7,8,9,10,11]
  var position = mod(offset, scale.length)
  var multiplier = Math.floor(offset/scale.length)
  return scale[position] + multiplier * 12
}

function singleLookup(item, key){
  var obs = Observ([])

  watch(item, function(data){
    var res = {}
    res[key] = data
    obs.set(res)
  })

  obs.get = function(k){
    if (k === key){
      return item
    }
  }

  obs.keys = function(){
    return [key]
  }

  return obs
}