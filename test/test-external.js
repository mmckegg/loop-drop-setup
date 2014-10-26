var test = require('tape')

var Setup = require('../')
var Observ = require('observ')

test('external', function(t){

  t.plan(5)

  var setupDescriptor = {
    chunks: [
      { node: 'external', src: 'chunk.json', anotherValue: 456 }
    ],
    controllers: [
      { node: 'controller/sub', value: 525 }
    ]
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
      controller: {
        sub: function SubControllerNode(){
          var node = Observ()
          node(function(descriptor){
            t.deepEqual(descriptor,  { value: 525, node: 'controller/sub' })
          })
          return node
        }
      },
      external: require('../external.js')
    },
    project: {
      getFile: function(src, cb){
        var obs = Observ()
        obs.path = src

        obs.onClose = function noop(){}

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
      },
      checkExists: function(src, cb){
        cb(null, true)
      }
    }
  }

  var setup = Setup(context)

  setup(function(data){
    t.deepEqual(data, { 
      chunks: [ { anotherValue: 456, node: 'external', src: 'chunk.json' } ], 
      controllers: [ { node: 'controller/sub', value: 525 } ] 
    }, 'initital setup')
  })

  setup.load('setup.json')

})