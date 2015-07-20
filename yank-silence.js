module.exports = function(audioContext, input) {

  var output = audioContext.createGain()
  var analyser = audioContext.createAnalyser()
  analyser.fftSize = 32
  analyser.smoothingTimeConstant = 0.1
  output.connect(analyser)

  var yank = audioContext.createGain()
  input.connect(yank)

  var fft = new Uint8Array(analyser.frequencyBinCount)
  var waiting = false

  output.trigger = function() {
    if (!waiting) {
      yank.connect(output)
      console.log('connect')
      waiting = true
      setTimeout(function() {
        var stopWaiting = setInterval(function() {
          analyser.getByteFrequencyData(fft)
          var sum = 0
          for (var i=0;i<fft.length;i++) {
            sum += fft[i]
          }

          if (sum === 0) {
            clearTimeout(stopWaiting)
            yank.disconnect()
            waiting = false
            console.log('disconnect')
          }

        }, 1000)
      }, 5000)
    }
  }

  return output
}