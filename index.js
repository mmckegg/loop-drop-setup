var ObservStruct = require('observ-struct')
var ObservNodeArray = require('./node-array.js')
var Event = require('geval')
var Observ = require('observ')
var watch = require('observ/watch')

module.exports = Setup

function Setup(context){
  var node = ObservStruct({
    controllers: ObservNodeArray(context),
    chunks: ObservNodeArray(context)
  })

  var removeListener = null
  var onLoad = null
  node.onLoad = Event(function(broadcast){
    onLoad = broadcast
  })

  node.file = null

  node.load = function(src){
    node.file = context.project.getFile(src, onLoad)
    node.path = node.file.path
    removeListener = watch(node.file, update)
  }

  node.destroy = function(){
    if (node.file){
      node.file.close()
      node.file = null
    }
    if (removeListener){
      removeListener()
    }
  }

  function update(data){
    var obj = {}
    
    try {
      obj = JSON.parse(data || '{}') || {}
    } catch (ex) {}

    obj._path = node.path
    node.set(obj || {})
  }

  return node
}