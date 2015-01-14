var test = require('tape')

var Observ = require('observ')
var QueryParam = require('../query-param.js')

test('QueryParam', function(t){
  var obs = Observ({someValue: 'foo', deepValue: {key: 1}})

  var changes = []
  obs(function(change){
    changes.push(change)
  })

  var someValue = QueryParam(obs, 'someValue')
  t.equal(someValue.read(), 'foo')

  var deepValueKey = QueryParam(obs, 'deepValue.key')
  t.equal(deepValueKey.read(), 1)

  someValue.write('bar')
  deepValueKey.write(2)

  t.deepEqual(changes, [
    {someValue: 'bar', deepValue: {key: 1}},
    {someValue: 'bar', deepValue: {key: 2}}
  ])

  t.end()
})