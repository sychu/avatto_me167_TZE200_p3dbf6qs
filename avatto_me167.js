const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const fixedValueConverter = {
    thermostatScheduleDayMultiDP: {
        from: (v) => {
            const schedule = [];
            for (let index = 1; index < 24; index = index + 4) {
                schedule.push(
                    String(parseInt(v[index+0])).padStart(2, '0') + ':' +
                    String(parseInt(v[index+1])).padStart(2, '0') + '/' +
                    // @ts-ignore
                    (parseFloat((v[index+2] << 8) + v[index+3]) / 10.0).toFixed(1),
                );
            }
            return schedule.join(' ');
        },
        to: (v) => {
            const payload = [0];
            const transitions = v.split(' ');
            if (transitions.length != 6) {
                throw new Error('Invalid schedule: there should be 6 transitions');
            }
            for (const transition of transitions) {
                const timeTemp = transition.split('/');
                if (timeTemp.length != 2) {
                    throw new Error('Invalid schedule: wrong transition format: ' + transition);
                }
                const hourMin = timeTemp[0].split(':');
                const hour = parseInt(hourMin[0]);
                const min = parseInt(hourMin[1]);
                const temperature = Math.floor(parseFloat(timeTemp[1]) * 10);
                if (hour < 0 || hour > 24 || min < 0 || min > 60 || temperature < 50 || temperature > 300) {
                    throw new Error('Invalid hour, minute or temperature of: ' + transition);
                }
                payload.push(
                    hour,
                    min,
                    (temperature & 0xff00) >> 8,
                    temperature & 0xff,
                );
            }
            return payload;
        },
    },
    thermostatScheduleDayMultiDPWithDayNumber: (dayNum) => {
        return {
            from: (v) => fixedValueConverter.thermostatScheduleDayMultiDP.from(v),
            to: (v) => {
                const data = fixedValueConverter.thermostatScheduleDayMultiDP.to(v);
                data[0] = dayNum;
                return data;
            },
        };
    }
};

const definition = {
    fingerprint: tuya.fingerprint('TS0601', [
        //'_TZE200_bvu2wnxz', /* model: 'ME167', vendor: 'AVATTO' */
        //'_TZE200_6rdj8dzm', /* model: 'ME167', vendor: 'AVATTO' */
        '_TZE200_p3dbf6qs', /* model: 'ME167', vendor: 'AVATTO' */
        //'_TZE200_rxntag7i', /* model: 'ME168', vendor: 'AVATTO' */
    ]),
    model: 'TS0601_thermostat_3',
    vendor: 'TuYa',
    description: 'Thermostatic radiator valve',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    whiteLabel: [
        tuya.whitelabel('AVATTO', 'ME167', 'Thermostatic radiator valve', ['_TZE200_p3dbf6qs']),
        //tuya.whitelabel('AVATTO', 'ME167', 'Thermostatic radiator valve', ['_TZE200_bvu2wnxz', '_TZE200_6rdj8dzm', '_TZE200_p3dbf6qs']),
        //tuya.whitelabel('AVATTO', 'ME168', 'Thermostatic radiator valve', ['_TZE200_rxntag7i']),
    ],
    onEvent: tuya.onEventSetTime,
    configure: tuya.configureMagicPacket,
    exposes: [
        e.child_lock(), e.battery_low(),
        e.climate()
            .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['auto', 'heat', 'off'], ea.STATE_SET)
            .withRunningState(['idle', 'heat'], ea.STATE)
            .withLocalTemperatureCalibration(-3, 3, 1, ea.STATE_SET),
        ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
        e.binary('scale_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('If the heat sink is not fully opened within ' +
            'two weeks or is not used for a long time, the valve will be blocked due to silting up and the heat sink will not be ' +
            'able to be used. To ensure normal use of the heat sink, the controller will automatically open the valve fully every ' +
            'two weeks. It will run for 30 seconds per time with the screen displaying "Ad", then return to its normal working state ' +
            'again.'),
        e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('When the room temperature is lower than ' +
            '5 °C, the valve opens; when the temperature rises to 8 °C, the valve closes.'),
        e.numeric('error', ea.STATE).withDescription('If NTC is damaged, "Er" will be on the TRV display.'),
    ],
    meta: {
        tuyaDatapoints: [
            [2, 'system_mode', tuya.valueConverterBasic.lookup({'auto': tuya.enum(0), 'heat': tuya.enum(1), 'off': tuya.enum(2)})],
            [3, 'running_state', tuya.valueConverterBasic.lookup({'heat': tuya.enum(0), 'idle': tuya.enum(1)})],
            [4, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
            [5, 'local_temperature', tuya.valueConverter.divideBy10],
            [7, 'child_lock', tuya.valueConverter.lockUnlock],           
            [28, 'schedule_wednesday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
            [29, 'schedule_thursday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
            [30, 'schedule_friday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
            [31, 'schedule_saturday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
            [32, 'schedule_sunday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
            [33, 'schedule_monday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
            [34, 'schedule_tuesday', fixedValueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],  
            [35, null, tuya.valueConverter.errorOrBatteryLow],
            [36, 'frost_protection', tuya.valueConverter.onOff],
            [39, 'scale_protection', tuya.valueConverter.onOff],
            [47, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration2],
        ],
    },
};


module.exports = definition;
