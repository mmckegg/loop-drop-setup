var ObservStruct = require('observ-struct')
var ObservNodeArray = require('./node-array.js')
var Event = require('geval')
var Observ = require('observ')
var watch = require('observ/watch')
var computed = require('observ/computed')
var getDirName = require('path').dirname
var getBaseName = require('path').basename
var join = require('path').join

module.exports = Setup

function Setup(context){
  var controllerContext = Object.create(context)

  var node = ObservStruct({
    controllers: ObservNodeArray(controllerContext),
    chunks: ObservNodeArray(context)
  })

  controllerContext.chunkLookup = node.chunks.controllerContextLookup

  var removeListener = null
  var removeCloseListener = null

  var onLoad = null
  var onClose = null
  node.onLoad = Event(function(broadcast){
    onLoad = broadcast
  })
  node.onClose = Event(function(broadcast){
    onClose = broadcast
  })

  node.file = null

  function release(){
    if (removeListener){
      removeListener()
      removeCloseListener()
      removeListener = null
      removeCloseListener = null
    }
  }

  node.load = function(src){
    release()
    if (src){
      node.file = context.project.getFile(src, onLoad)
      node.path = node.file.path
      removeListener = watch(node.file, update)
      removeCloseListener = node.file.onClose(onClose)
    }
  }

  node.rename = function(newFileName){
    if (node.file){
      var currentFileName = getBaseName(node.file.path)
      if (newFileName !== currentFileName){
        var directory = getDirName(node.file.path)
        var newPath = join(directory, newFileName)
        var src = context.project.relative(newPath)

        release()

        var file = context.project.getFile(src)
        file.set(node.file())
        node.file.delete()
        node.file = file
        node.path = node.file.path
        removeListener = watch(node.file, update)
        removeCloseListener = node.file.onClose(onClose)
      }
    }
  }

  node.destroy = function(){
    if (node.file){
      node.file.close()
      node.file = null
      node.set({})
    }
    release()
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