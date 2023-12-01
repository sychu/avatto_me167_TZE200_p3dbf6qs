# AVATTO_me167_TZE200_p3dbf6qs
This is investigation result for issue: https://github.com/Koenkk/zigbee2mqtt/issues/19787

**THIS FIX IS EXPERIMENTAL, NOT FULLY TESTED AND SHOULD BE USED ON YOR OWN RESPONSIBILITY!**

By default device `_TZE200_p3dbf6qs` is recognized by `zigbee-herdsman-converters` as [ME168](https://www.zigbee2mqtt.io/devices/ME168.html) but in fact it is [ME167](https://www.zigbee2mqtt.io/devices/ME167.html)

# Bug Decription
Issue with default converter is related with schedule definition. After setting custom configuration. Automatic schedule set target temperature to some crazy values like 153 degrees.

# Fix
It look like that this device supports 6 values for schedule definition (not 4) and there are also different mappings for days in `tuyaDatapoints`.
In this fix I copied device definition and schedule related converters from https://github.com/Koenkk/zigbee-herdsman-converters.
Fix allows to populate and send 6 elements for schedule to device.



## Installation (Zigbee2mqtt Home Asisstant add-on)

1. In your `config/zigbee2mqtt` folder, add `avatto_me167.js`.
2. Open your zigbee2mqtt addon Web UI, navigate to settings, then external converters
3. Click the '+' button, and type `avatto_me167` into the text box which appears.
4. Click submit and restart Zigbee2mqtt
5. Go to device and reconfigure 🔄️ 
