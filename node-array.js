var Observ = require('observ')
var watch = require('observ/watch')

module.exports = ObservNodeArray

function ObservNodeArray(context){
  var obs = Observ([])
  obs._list = []

  var instanceDescriptors = []

  obs.controllerContextLookup = Observ({})
  obs.map = obs._list.map.bind(obs._list)

  obs.getLength = function(){
    return obs._list.length
  }

  obs.get = function(i){
    return obs._list[i]
  }

  obs.resolved = Observ([])

  obs.push = function(descriptor){
    var ctor = descriptor && context.nodes[descriptor.node]
    if (ctor){
      instance = ctor(context)
      obs._list.push(instance) 
      instance.set(descriptor)
      instanceDescriptors.push(descriptor)
      if (instance.controllerContext){
        removeListeners.push(watch(instance.controllerContext, updateCC))
      }
      if (instance.resolved){
        instance.resolved(updateResolved)
      }
    }
  }

  var removeListeners = []

  obs(function(descriptors){
    if (!Array.isArray(descriptors)){
      descriptors = []
    }

    var length = Math.max(descriptors.length,instanceDescriptors.length) 
    for (var i=0;i<length;i++){

      var instance = obs._list[i]
      var descriptor = descriptors[i]
      var lastDescriptor = instanceDescriptors[i]

      var ctor = descriptor && context.nodes[descriptor.node]

      if (instance && descriptor && lastDescriptor && descriptor.node == lastDescriptor.node){
        instance.set(descriptor)
      } else {
        if (instance && instance.destroy){
          instance.destroy()

          if (removeListeners[i]){
            removeListeners[i]()
            removeListeners[i] = null
          }
        }

        obs._list[i] = null

        if (descriptor){
          // create
          if (ctor){
            instance = ctor(context)
            obs._list[i] = instance
            
            if (instance.resolved){
              instance.resolved(updateResolved)
            }

            instance.set(descriptor)
            
            if (instance.controllerContext){
              removeListeners[i] = watch(instance.controllerContext, updateCC)
            }
          }
        }
      }
    }

    obs._list.length = descriptors.length
    removeListeners.length = descriptors.length
    instanceDescriptors = descriptors
  })

  function updateCC(){
    obs.controllerContextLookup.set(obs._list.reduce(chunkLookup, {}))
  }

  function updateResolved(){
    obs.resolved.set(obs._list.map(resolve))
  }

  updateResolved()
  return obs
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
  var data = item.controllerContext()
  if (data && data.id){
    result[data.id] = data
  }
  return result
}