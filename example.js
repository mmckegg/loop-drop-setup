// external node
// node inherits from another file and overrides matching params

var files = {}

var context = {

  nodes: {
    launchpad: require('loop-launchpad'),
    chunk: require('soundbank-chunk'),
    external: require('loop-drop-setup/external')
  },

  getFile: watchFile

}

function watchFile(src, cb){
  if (!files[src]){
    loadFile(src, function(err, res){ if(err)return cb(err)
      files[src] = Observ(res)
      files[src].src = src
      cb(null, files[src])
    })
  } else {
    cb(null, files[src])
  }
}

function saveFile(src, data, cb){
  if (files[src]){
    files[src].set(data)
  }
  // save the file
}

function loadFile(src, cb){
  // load the file
  cb(null, res)
}


var setup = {
  
  node: 'setup', // loop-drop-setup

  chunks: [
    { id: 'synth', 
      node: 'external',
      src: 'chunks/synth.json',
      origin: [0,0]
    }
  ],

  controllers: [

    { id: 'launchpadA', // loop-grid / launchpad
      node: 'launchpad',
      chunkIds: [ 'synth' ]
    },

    { id: 'launchpadB',
      node: 'launchpad',
      chunkIds: [ 'synth' ]
    }

  ]

}

 
chunks = {
    
  'synth.json': {

    node: 'chunk', // soundbank-chunk
    sounds: ['kick', 'snare', 'hihat', 'openhat'],
    shape: [1,4],

    slots: [
      {id: 'kick', sources: [{node: 'sample', src: 'samples/kick.wav'}], output: 'post'},
      {id: 'snare', sources: [{node: 'sample', src: 'samples/snare.wav'}], output: 'post'},
      {id: 'hihat', sources: [{node: 'sample', src: 'samples/hihat.wav'}], output: 'post'},
      {id: 'openhat', sources: [{node: 'sample', src: 'samples/openhat.wav'}], output: 'post'},
      {id: 'post', processors: [{node: 'overdrive'}]}
    ],

    outputs: ['post']

  }

}

samples = {
  
}