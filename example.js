var wrapSource = require('audio-slot/source')
var wrapProcessor = require('audio-slot/processor')

var Observ = require('observ')
var Setup = require('./')
var Bopper = require('bopper')

var audioContext = new AudioContext()
var scheduler = Bopper(audioContext)

var path = require('path')
var projectRoot = '/root'

scheduler.setTempo(110)
scheduler.start()

var context = window.context = {

  audio: audioContext,
  output: audioContext.createGain(),
  scheduler: scheduler,

  nodes: {
    'looper': require('loop-grid'),
    'qwerty': require('loop-qwerty'),

    'chunk': require('./chunk'),
    'external': require('./external'),
    'slot': require('audio-slot'),

    'oscillator': wrapSource(require('soundbank-oscillator')),
    'filter': wrapProcessor(audioContext.createBiquadFilter.bind(audioContext)),
    'overdrive': wrapProcessor(require('soundbank-overdrive')),
    'sample': wrapSource(require('soundbank-sample')),

    'AudioBuffer': require('loop-drop-project/audio-buffer'),

    'lfo': wrapSource(require('lfo')),
    'adsr': wrapSource(require('adsr'))
  },

  // stub project for sample loading via loop-drop-project/audio-buffer
  cwd: '/root/setup',
  project: { 
    getFile: function(src, type){

      var obs = Observ()

      if (src === 'setup/test.wav'){
        requestArrayBuffer('/sounds/test.wav', function(err, buffer){
          obs.set(buffer)
        })
      }

      obs.path = this.resolve(src)
      obs.src = src

      obs.onClose = function(listener){}
      obs.close = function(listener){ 
        obs.onClose()
        console.log('closed', obs.path)
      }

      return obs
    },

    checkExists: function(src, cb){
      process.nextTick(function(){
        if (src === 'setup/test.wav'){
          cb(null, true)
        } else {
          cb(null, false)
        }
      })
    },

    resolve: function(paths){
      return path.resolve.apply(path, [projectRoot].concat(paths))
    },

    relative: function(fullPath){
      return path.relative(projectRoot, fullPath)
    }
  }

}

context.output.connect(audioContext.destination)

var setup = window.setup = Setup(context)

setup.set({
  controllers: [
    //{ node: 'looper', 
    //  shape: [4,4],
    //  targets: ['synth/0', 'synth/1', 'synth/2', 'synth/3'],
    //  loops: [
    //    {length: 4, events: [[0, 0.5], [1,0.5]]},
    //    {length: 4, events: [[2, 0.5], [3,0.5]]},
    //    {length: 8, events: [[0, 2]]},
    //    {length: 12, events: [[0, 1]]}
//
    //  ]
    //},

    { node: 'qwerty', 
      chunkPositions: {synth: [1,2]}
    }

  ],

  chunks: [
    { id: 'synth',
      node: 'chunk',
      shape: [1, 5],

      slots: [
        { id: '0',
          node: 'slot',
          output: 'output',
          sources: [{ 
            node: 'oscillator', 
            shape: 'sawtooth',
            amp: {
              node: 'adsr',
              attack: 1,
              release: 2
            },
            detune: {
              node: 'lfo',
              amp: 50,
              rate: 10
            }
          }]
        },
        { id: '1',
          node: 'slot',
          output: 'output',
          sources: [{ 
            node: 'oscillator', note: 73,
            amp: {
              node: 'adsr',
              attack: 1,
              release: 2
            } 
          }]
        },
        { id: '2',
          node: 'slot',
          output: 'output',
          sources: [{ node: 'oscillator', note: 73-12+5 }],
          processors: [{
            node: 'filter',
            type: 'highpass',
            frequency: {
              node: 'adsr',
              attack: 10,
              value: 10000
            } 
          }]
        },
        { id: '3',
          node: 'slot',
          output: 'output',
          sources: [{ node: 'oscillator', note: 69-24 }]
        },

        { id: '4',
          node: 'slot',
          output: 'output',
          sources: [{ 
            node: 'sample', 
            mode: 'loop',
            buffer: { node: 'AudioBuffer', src: 'test.wav' },
            amp: {
              node: 'adsr',
              attack: 1,
              release: 2
            } 
          }]
        },

        { id: 'output',
          node: 'slot',
          processors: [{ node: 'overdrive', gain: 10 }]
        }
      ],

      flags: {'3': ['noRepeat']},
      routing: { output: '$default' },
      outputs: ['output']
    }
  ]

})

setup.controllers.get(0).recording(function(grid){
  console.log(grid.data)
})

function requestArrayBuffer(url, cb){
  var request = new window.XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    cb(null, request.response)
  }
  request.onerror = cb
  request.send();
}