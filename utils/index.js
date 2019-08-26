
const jsonLogger = path => { return json => console.log(`${new Date().toISOString()} - ${path}: ${JSON.stringify(json, null, 2)}`)}
const textLogger = path => { return text => console.log(`${new Date().toISOString()} - ${path}: ${text}`)}

module.exports = {
  jsonLogger,
  textLogger
}