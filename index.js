const mqtt = require('mqtt')
const mqttOptions = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
}
const interval = process.env.UPDATE_INTERVAL || 5000
const client = mqtt.connect(process.env.MQTT_HOST, mqttOptions)
const channel = process.env.MQTT_PREFIX
const mqttChannels = {
  temperature: `${channel}/temperature`,
  humidity: `${channel}/humidity`,
  switch: `${channel}/switch`,
  pong: `${channel}/pong`,
  ping: `${channel}/ping`,
  error: `${channel}/error`,
}

var relay1On = false // false === off
const tempThreshold = process.env.TEMP_F_SETTING

require('tesselate')(
  {
    modules: {
      A: ['relay-mono', 'relay'],
      B: ['climate-si7020', 'climate'],
    },
  },
  function (tessel, modules) {
    const relay = modules.relay
    const climate = modules.climate

    console.log('Connected to si7005')
    const relayStatusLed = tessel.led[1]

    function check(temp) {
      if (temp >= tempThreshold && !relay1On) {
        console.log('Enabling output')
        relay.turnOn(1, handleError)
        relayStatusLed.write(true)
      }
      if (temp < tempThreshold) {
        console.log('Disabling output')
        relay.turnOff(1, handleError)
        relayStatusLed.write(false)
      }
    }

    // Loop forever
    setImmediate(function loop() {
      climate.readTemperature('f', function (err, temp) {
        if (err) {
          return handleError(err)
        }
        check(temp)
        client.publish(mqttChannels.temperature, temp.toFixed(2))
        climate.readHumidity(function (err, humid) {
          if (err) {
            return handleError(err)
          }
          client.publish(mqttChannels.humidity, humid.toFixed(2))
          console.log(
            'Temperature: ',
            temp.toFixed(2) + ' F',
            'Humidity: ',
            humid.toFixed(2) + ' %RH'
          )
          setTimeout(loop, interval)
        })
      })
    })

    climate.on('error', function (err) {
      console.log('error connecting module', err)
      handleError(err)
    })
  }
)

function handleError(err) {
  client.publish(mqttChannels.error, JSON.stringify(err.message))
}

client.on('connect', function () {
  client.subscribe(mqttChannels.ping, function (err) {
    if (!err) {
      client.publish(mqttChannels.pong, 1)
    }
  })
})

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
  client.end()
})
