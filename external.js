var Observ = require('observ')
var extend = require('xtend')
var computed = require('observ/computed')
var watch = require('observ/watch')

module.exports = External

function External(context){
  var node = Observ({})

  var additionalParams = getAdditional(node)
  var externalParams = null

  var release = null
  var releaseCC = null

  var lastDescriptor = null
  node.inner = null

  node.controllerContext = Observ()

  node.destroy = function(){
    if (node.inner && node.inner.destroy){
      node.inner.destroy()
      node.inner = null
    }

    if (release){
      release()
      release = null
      externalParams = null
    }

  }

  watch(node, function(descriptor){
    if (externalParams && externalParams.src != descriptor.src){
      release()
      release = null
      externalParams = null
    }

    if (!externalParams){
      if (descriptor.src){
        context.project.checkExists(descriptor.src, function(err, exists){
          if (exists){
            release&&release()
            externalParams = observJson(context.project.getFile(descriptor.src))
            externalParams.src = descriptor.src
            release = externalParams(update)
          }
        })
      }
    } else {
      update()
    }
  })

  function update(){
    var descriptor = extend(externalParams(), additionalParams())
    var ctor = descriptor && context.nodes[descriptor.node]

    if (descriptor && node && lastDescriptor && descriptor.node == lastDescriptor.node){
      node.inner.set(descriptor)
    } else {

      if (node.inner && node.inner.destroy){
        node.inner.destroy()

        if (releaseCC){
          releaseCC()
          releaseCC = null
          node.controllerContext.set(null)
        }
      }

      node.inner = null

      if (descriptor && ctor){
        node.inner = ctor(context)
        node.inner.set(descriptor)

        if (node.inner.controllerContext){
          releaseCC = watch(node.inner.controllerContext, node.controllerContext.set)
        }
      }
    }

    lastDescriptor = descriptor 
  }

  return node
}

function observJson(obs){
  return computed([obs], function(a){
    return JSON.parse(a)
  })
}

function getAdditional(obs){
  return computed([obs], function(a){
    return Object.keys(a).reduce(function(res, key){
      if (key !== 'node' && key !== 'src'){
        res[key] = a[key]
      }
      return res
    }, {})
  })
}