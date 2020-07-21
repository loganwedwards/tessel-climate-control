var tessel = require('tessel')
var mqtt = require('mqtt')
var config = require('./env.json')
var relayLib = require('relay-mono')
var climateLib = require('climate-si7020')
var leds = tessel.led
var mqttLed = leds[2]
var relayLed = leds[3]
var states = {
  relay: false,
  climate: false,
}
var relay = relayLib.use(tessel.port['A'])
var climate = climateLib.use(tessel.port['B'])

console.log('Loading...')

var wifiOptions = {
  ssid: config.WIFI_SSID,
  password: config.WIFI_PASS,
  security: config.WIFI_SECURITY,
}
var mqttOptions = {
  username: config.MQTT_USER,
  password: config.MQTT_PASSWORD,
}
// To disable logging
// console.log = function () {}
var interval = config.UPDATE_INTERVAL || 5000
var mqttHost = 'mqtt://' + config.MQTT_HOST
var tempThreshold = config.TEMP_F_SETTING
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
  // var interfaces = require('os').networkInterfaces()
  // console.log(interfaces)
  // if (!Object.keys(interfaces).length) return false
  // var ip = interfaces.en1[0].address
  // console.log('wifi ip address ', ip)
  // return !!ip
  console.log('Checking wifi connectivity')
  console.log(tessel.network)
  return tessel.network.wifi.isConnected()
}

var relay1On = false // false === off

function bootstrap() {
  console.log('Starting up...')
  tessel.network.wifi.connect(wifiOptions, function (err, res) {
    if (err) {
      // Since we want to allow core functionality
      // without network connection, continue
      console.log('Error with wifi ', err)
    } else {
      console.log('Connected to Wifi ', res)
    }
    start()
  })
}

function start() {
  console.log('Starting up...')
  console.log('Hardware ready!')
  console.log('Attempting to connect to MQTT: ', config.MQTT_HOST)
  client = mqtt.connect(mqttHost, mqttOptions)

  function check(temp) {
    if (temp >= tempThreshold && !relay1On) {
      console.log('Enabling output')
      relay.turnOn(1, (err) => relayCallback(err, true))
      relay1On = true
      relayLed.on()
    }
    if (temp < tempThreshold) {
      console.log('Disabling output')
      if (relay1On) {
        relay.turnOff(1, (err) => relayCallback(err, false))
        relay1On = false
        relayLed.off()
      }
    }
  }

  function relayCallback(err) {
    if (err && client.connected) {
      publish(mqttChannels.error, err.message)
    } else {
      publish(mqttChannels.switch, relay1On ? 'true' : 'false')
    }
  }

  // Loop forever
  function loop() {
    if (
      !client ||
      (!client.connected && !client.reconnecting && wifiConnected())
    ) {
      console.log('Attempting mqtt reconnect')
      client = mqtt.connect(mqttHost, mqttOptions)
    }
    console.log('read temperature')
    climate.readTemperature('f', function (err, temp) {
      if (err) {
        return handleError(err)
      }
      check(temp)

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

  var loopInterval = setInterval(loop.bind(this), interval)

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
    mqttLed.on()
    client.publish(mqttChannels.pong, '1')
    client.subscribe(mqttChannels.ping, function (err) {
      if (!err) {
        client.publish(mqttChannels.pong, '1')
      } else {
        console.log('There was an error connecting to MQTT ', err)
        mqttLed.off()
      }
    })
  })

  client.on('close', function () {
    mqttLed.off()
  })

  client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString())
    client.end()
  })
}

function handleError(err) {
  console.log('Error ', err)
  // publish(mqttChannels.error, JSON.stringify(err))
}

climate.on('ready', function climateReady() {
  console.log('Climate ready!')
  states.climate = true
})
climate.on('error', function climateError(err) {
  console.log('error connecting module', err)
  handleError(err)
})

relay.on('ready', function relayReady() {
  console.log('Relay ready!')
  states.relay = true
})

tessel.network.wifi.on('disconnect', function (res) {
  console.log('Wifi disconnected. Attempting bootstrap', res)
  bootstrap()
})
var startup
function checkReady() {
  if (states.relay && states.climate) {
    console.log('All hardware ready. Bootstrapping...')
    clearInterval(startup)
    start()
  } else {
    console.log('States ', states)
  }
}

startup = setInterval(checkReady, 1000)
