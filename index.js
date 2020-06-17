var mqtt = require('mqtt')
var config = require('./env.json')
var mqttOptions = {
  username: config.MQTT_USER,
  password: config.MQTT_PASSWORD,
  // host: config.MQTT_HOST,
  // port: 1883,
}
// var client = undefined
// console.log = function () {}
var interval = config.UPDATE_INTERVAL || 5000
var mqttHost = 'mqtt://' + config.MQTT_HOST
console.log('Attempting to connect to ', config.MQTT_HOST)
var client
var channel = config.MQTT_PREFIX
var mqttChannels = {
  temperature: channel + '/temperature',
  humidity: channel + '/humidity',
  switch: channel + '/switch',
  pong: channel + '/pong',
  ping: channel + '/ping',
  error: channel + '/error',
}

function wifiConnected() {
  var interfaces = require('os').networkInterfaces()
  console.log(interfaces)
  if (!Object.keys(interfaces).length) return false
  var ip = interfaces.en1[0].address
  console.log('wifi ip address ', ip)
  return !!ip
}

var relay1On = false // false === off
var tempThreshold = config.TEMP_F_SETTING

require('tesselate')(
  {
    modules: {
      A: ['relay-mono', 'relay'],
      B: ['climate-si7005', 'climate'],
    },
  },
  function (tessel, modules) {
    var relay = modules.relay
    var climate = modules.climate
    var relayStatusLed = tessel.led[1]
    console.log('Hardware ready!')

    client = mqtt.connect(mqttHost, mqttOptions)

    function check(temp) {
      if (temp >= tempThreshold && !relay1On) {
        console.log('Enabling output')
        relay.turnOn(1)
        relay1On = true
        relayStatusLed.write(true)
      }
      if (temp < tempThreshold) {
        console.log('Disabling output')
        if (relay1On) {
          relay.turnOff(1)
          relay1On = false
          relayStatusLed.write(false)
        }
      }
    }

    // Loop forever
    function loop() {
      if (
        !client ||
        (!client.connected && !client.reconnecting && wifiConnected())
      ) {
        client = mqtt.connect(mqttHost, mqttOptions)
      }

      climate.readTemperature('f', function (err, temp) {
        if (err) {
          return handleError(err)
        }
        check(temp)
        publish(mqttChannels.switch, relay1On ? 'true' : 'false')
        publish(mqttChannels.temperature, temp.toFixed(2))
        climate.readHumidity(function (err, humid) {
          if (err) {
            return handleError(err)
          }
          publish(mqttChannels.humidity, humid.toFixed(2))
          console.log(
            'Temperature:',
            temp.toFixed(2) + ' F',
            'Humidity:',
            humid.toFixed(2) + ' %RH'
          )
        })
      })
    }

    var loop = setInterval(loop.bind(this), interval)

    climate.on('error', function (err) {
      console.log('error connecting module', err)
      handleError(err)
    })

    function publish(channel, value) {
      if (client && client.connected) {
        console.log('Publishing ', channel, value)
        client.publish(channel, value)
      } else {
        // console.log('MQTT not defined or not connected ', client)
        console.log('! MQTT not ready !')
      }
    }

    client.on('connect', function () {
      console.log('MQTT connected!')
      tessel.led[0].write(true)
      client.publish(mqttChannels.pong, '1')
      client.subscribe(mqttChannels.ping, function (err) {
        if (!err) {
          client.publish(mqttChannels.pong, '1')
        } else {
          console.log('There was an error connecting to MQTT ', err)
        }
      })
    })

    client.on('close', function () {
      tessel.led[0].write(false)
    })

    client.on('message', function (topic, message) {
      // message is Buffer
      console.log(message.toString())
      client.end()
    })
  }
)

function handleError(err) {
  console.log('Error ', err)
  // publish(mqttChannels.error, JSON.stringify(err))
}
