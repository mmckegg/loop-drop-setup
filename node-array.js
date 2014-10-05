var Observ = require('observ')

module.exports = ObservNodeArray

function ObservNodeArray(context){
  var obs = Observ([])
  obs._list = []

  var instanceDescriptors = []

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
        }

        obs._list[i] = null

        if (descriptor){
          // create
          if (ctor){
            instance = ctor(context)
            obs._list[i] = instance
            instance.set(descriptor)
          }
        }
      }
    }

    obs._list.length = descriptors.length
    instanceDescriptors = descriptors
  })

  return obs
}
