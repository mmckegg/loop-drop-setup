var ObservStruct = require('observ-struct')
var ObservNodeArray = require('./node-array.js')
var Event = require('geval')
var Observ = require('observ')
var watch = require('observ/watch')
var computed = require('observ/computed')
var getDirName = require('path').dirname
var getBaseName = require('path').basename
var join = require('path').join

var NO_TRANSACTION = {}

module.exports = Setup

function Setup(context){
  var controllerContext = Object.create(context)

  var node = ObservStruct({
    controllers: ObservNodeArray(controllerContext),
    chunks: ObservNodeArray(context),
    selectedChunkId: Observ()
  })

  node.resolved = ObservStruct({
    controllers: node.controllers.resolved,
    chunks: node.chunks.resolved
  })

  controllerContext.chunkLookup = node.chunks.controllerContextLookup

  var removeListener = null
  var removeCloseListener = null
  var currentTransaction = NO_TRANSACTION
  var lastSavedValue = NO_TRANSACTION

  var onLoad = null
  var onClose = null
  node.onLoad = Event(function(broadcast){
    onLoad = broadcast
  })
  node.onClose = Event(function(broadcast){
    onClose = broadcast
  })

  node.file = null

  node(function(newValue){
    if (newValue && newValue !== currentTransaction && node.file){
      lastSavedValue = JSON.stringify(newValue)
      node.file.set(lastSavedValue)
    }
  })

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
    if (data && data !== lastSavedValue){
      try {
        var obj = JSON.parse(data || '{}') || {}
        currentTransaction = obj || {}
        node.set(currentTransaction)
        currentTransaction = NO_TRANSACTION
      } catch (ex) {}
    }
  }

  return node
}