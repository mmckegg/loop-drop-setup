var jsonQuery = require('json-query')
var forceParent = require('json-query/force-parent')

module.exports = QueryParam

function QueryParam(target, query, forceParent){
  if (!(this instanceof QueryParam)) return new QueryParam(target, query, forceParent)
  this.target = target
  this.query = query
  this.forceParent = forceParent
}

QueryParam.prototype.type = 'QueryParam'

QueryParam.prototype.write = function(value){
  var newObject = obtain(this.target())
  var res = jsonQuery(this.query, {data: newObject})
  var obj = this.forceParent ? 
    forceParent(res, this.forceParent) : 
    jsonQuery.lastParent(res)

  if (obj){
    obj[res.key] = value
    this.target.set(newObject)
    return true
  } else {
    return false
  }
}

QueryParam.prototype.read = function(){
  var res = jsonQuery(this.query, {data: this.target()})
  return res.value
}

function obtain(obj){
  return JSON.parse(JSON.stringify(obj))
}