var test = require('tape')

var Setup = require('../')
var Observ = require('observ')

test('external', function(t){

  t.plan(4)

  var setupDescriptor = {
    chunks: [
      { node: 'external', src: 'chunk.json', anotherValue: 456 }
    ],
    controllers: []
  }

  var chunkDescriptor = {value: 123, node: 'test'}
  var chunkDescriptor2 = {value: 321, node: 'test2'}

  var context = {
    nodes: {
      test: function TestNode(){
        var node = Observ()
        node.destroy = function(){
          t.ok(true, 'destroyed on change')
        }
        node(function(descriptor){
          t.deepEqual(descriptor,  { value: 123, node: 'test', anotherValue: 456 })
        })
        return node
      },
      test2: function TestNode2(){
        var node = Observ()
        node(function(descriptor){
          t.deepEqual(descriptor,  { value: 321, node: 'test2', anotherValue: 456 })
        })
        return node
      },
      external: require('../external.js')
    },
    project: {
      getFile: function(src, cb){
        var obs = Observ()
        obs.path = src

        process.nextTick(function(){
          if (src == 'chunk.json'){
            obs.set(JSON.stringify(chunkDescriptor))

            // fake file change
            setTimeout(function(){
              obs.set(JSON.stringify(chunkDescriptor2))
            }, 100)

          } else if (src == 'setup.json'){
            obs.set(JSON.stringify(setupDescriptor))
          }
          cb&&cb(null, obs)
        })
        return obs
      }
    }
  }

  var setup = Setup(context)

  setup(function(data){
    t.deepEqual(data, { 
      _path: 'setup.json', 
      chunks: [ { anotherValue: 456, node: 'external', src: 'chunk.json' } ], 
      controllers: [] 
    }, 'initital setup')
  })

  setup.load('setup.json')

})