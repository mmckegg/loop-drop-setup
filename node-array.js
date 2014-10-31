var Observ = require('observ')
var watch = require('observ/watch')
var resolveNode = require('./resolve-node.js')

var NO_TRANSACTION = {}

module.exports = ObservNodeArray

function ObservNodeArray(context){
  var obs = Observ([])
  obs._list = []

  var instanceDescriptors = []
  var currentTransaction = NO_TRANSACTION

  obs.controllerContextLookup = Observ({})
  obs.map = obs._list.map.bind(obs._list)

  obs.getLength = function(){
    return obs._list.length
  }

  obs.get = function(i){
    return obs._list[i]
  }

  obs.indexOf = function(item){
    return obs._list.indexOf(item)
  }

  obs.move = function(item, targetIndex){
    var currentIndex = obs._list.indexOf(item)
    if (~currentIndex){
      var descriptor = instanceDescriptors[currentIndex]
      var listener = removeListeners[currentIndex]
      var ccListener = removeCCListeners[currentIndex]

      if (currentIndex < targetIndex){
        insert(targetIndex+1, item, descriptor, listener, ccListener)
        remove(currentIndex)
        update()
      } else {
        remove(currentIndex)
        insert(targetIndex, item, descriptor, listener, ccListener)
        update()
      }
    }
  }

  obs.remove = function(item){
    var currentIndex = obs._list.indexOf(item)
    if (~currentIndex){
      remove(currentIndex)
      update()
    }
  }

  function remove(index){
    instanceDescriptors.splice(index, 1)
    removeListeners.splice(index, 1)
    removeCCListeners.splice(index, 1)
    obs._list.splice(index, 1)
  }

  function insert(index, obj, descriptor, listener, ccListener){
    instanceDescriptors.splice(index, 0, descriptor)
    removeListeners.splice(index, 0, listener)
    removeCCListeners.splice(index, 0, ccListener)
    obs._list.splice(index, 0, obj)
  }

  obs.resolved = Observ([])

  obs.push = function(descriptor){
    var ctor = descriptor && resolveNode(context.nodes, descriptor.node)
    if (ctor){
      var instance = createInstanceAt(ctor, descriptor, obs._list.length)
      update()
    }
  }

  var removeNodeListeners = []
  var removeCCListeners = []
  var removeListeners = []

  function removeListenerFor(i){
    if (removeCCListeners[i]){
      removeCCListeners[i]()
      removeCCListeners[i] = null
    }

    if (removeListeners[i]){
      removeListeners[i]()
      removeListeners[i] = null
    }

    if (removeNodeListeners[i]){
      removeNodeListeners[i]()
      removeNodeListeners[i] = null
    }
  }

  obs(function(descriptors){

    if (currentTransaction === descriptors){
      return false
    }

    if (!Array.isArray(descriptors)){
      descriptors = []
    }

    var length = Math.max(descriptors.length,instanceDescriptors.length) 
    for (var i=0;i<length;i++){

      var instance = obs._list[i]
      var descriptor = descriptors[i]
      var lastDescriptor = instanceDescriptors[i]

      var ctor = descriptor && resolveNode(context.nodes, descriptor.node)

      if (instance && descriptor && lastDescriptor && descriptor.node == lastDescriptor.node){
        instance.set(descriptor)
      } else {
        if (instance && instance.destroy){
          instance.destroy()
          removeListenerFor(i)
        }

        obs._list[i] = null

        if (descriptor){
          // create
          if (ctor){
            instance = createInstanceAt(ctor, descriptor, i)
          }
        }
      }
    }

    obs._list.length = descriptors.length
    removeListeners.length = descriptors.length
    removeCCListeners.length = descriptors.length
    instanceDescriptors = descriptors
  })

  function createInstanceAt(ctor, descriptor, index){
    var instance = ctor(context)
    obs._list[index] = instance
    
    if (instance.resolved){
      instance.resolved(updateResolved)
    }

    instance.set(descriptor)
    removeListeners[index] = instance(update)

    if (instance.node){
      removeNodeListeners[index] = instance.node(updateNode.bind(instance))
    }

    if (instance.controllerContext){
      removeCCListeners[index] = watch(instance.controllerContext, updateCC)
    }
    return instance
  }

  function update(){
    currentTransaction = obs._list.map(getValue)
    obs.set(currentTransaction)
    updateCC()
    updateResolved()
    currentTransaction = NO_TRANSACTION
  }

  function updateCC(){
    obs.controllerContextLookup.set(obs._list.reduce(chunkLookup, {}))
  }

  function updateResolved(){
    obs.resolved.set(obs._list.map(resolve))
  }

  function updateNode(newNode){
    var instance = this
    var index = obs._list.indexOf(instance)
    if (~index){
      var ctor = resolveNode(context.nodes, newNode)
      removeListenerFor(index)
      createInstanceAt(ctor, instance(), index)
    }
  }

  updateResolved()
  return obs
}

function getValue(obj){
  return typeof obj === 'function' ? obj() : obj
}

function resolve(node){
  if (node){
    if (node.resolved){
      return node.resolved()
    } else {
      return node()
    }
  }
}

function chunkLookup(result, item){
  if (item && item.controllerContext){
    var data = item.controllerContext()
    if (data && data.id){
      result[data.id] = data
    }
  }
  return result
}