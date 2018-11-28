const API_KEY = 'b6a3d30adb07411fb3d3bc0865b3257e';

// set callback handlers

/*try {
const client = new Paho.MQTT.Client("liveobjects.orange-business.com", 443, "web-ui");
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
    console.log("connecting to live objects...");
    client.connect({ userName: 'payload', password: API_KEY, onSuccess: onSuccess });

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("MQTT > disconnected:" + responseObject.errorMessage);
        }
    }
    function onMessageArrived(message) {
        console.log(`MQTT > new message (${message.destinationName}`, message.payloadString);
    }
    function onSuccess() {
        console.log("MQTT > connected!");
        client.subscribe('router/~event.v1.data.new.#');
    }
} catch (e) {
    console.log(e);
}*/

// Vue
const randomElementOf = (array) => {
    return array[Math.floor(Math.random() * array.length)];
}
const randomBool = () => (Math.random() > 0.5);

init = () => {
    const STATIONS = {
        'partdieu': {
            city: 'Lyon', station: 'gare de la Part-Dieu', seats: [
                { id: 1, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
                { id: 2, deviceId: 'urn:lo:nsid:starterkit:352653090111519' }
            ]
        },
        'lyon-prc': { city: 'Lyon', station: 'gare de Perrache' },
        'paris-lyon': { city: 'Paris', station: 'gare de Lyon' },
        'paris-nord': { city: 'Paris', station: 'gare du Nord' },
        'paris-mtp': { city: 'Paris', station: 'gare Montparnasse' }
    };
    const randomSeatsCategory = () => {
        const total = Math.floor(Math.random() * 20 + 1);
        return {
            total: total,
            taken: Math.floor(Math.random() * total)
        };
    };
    const randomSeats = () => ({
        standard: randomSeatsCategory(),
        outlet: randomSeatsCategory()
    });
    const randomServices = () => ({
        wifi: randomBool(),
        coffee: randomBool()
    });
    const data = {
        stations: STATIONS,
        selectedStation: randomElementOf(Object.values(STATIONS)),
        seats: randomSeats(),
        services: randomServices(),
        now: moment()
    };
    var app = new Vue({
        el: '#app',
        data: data,
        methods: {
            selectStation: function (station) {
                this.selectedStation = station;
                this.seats = randomSeats();
                this.services = randomServices();
            },
            bookSeat: function (seat) {
                console.log(`booking seat ${seat}`);
                loClient.sendMqttCommand(seat.deviceId, 'res', { t: seat.id, v: 1 });
            },
            unbookSeat: function (seat) {
                console.log(`unbooking seat ${seat}`);
                loClient.sendMqttCommand(seat.deviceId, 'res', { t: seat.id, v: 0 });
            }

        }
    });
}

const loClient = {
    sendMqttCommand: function (deviceId, mqttReq, mqttArg) {
        return fetch(`https://liveobjects.orange-business.com/api/v1/deviceMgt/devices/${deviceId}/commands`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ request: { connector: 'mqtt', value: { req: mqttReq, arg: mqttArg } } })
        })
    },
    getStationState: function (stationId) {
        return fetch(`https://liveobjects.orange-business.com/api/v0/data/search`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                size: 0,
                query: { match: { streamId: `seat:${stationId}` } },
                aggs: {
                    group_by_seat: {
                        terms: {
                            field: '@SEAT.value.seat'
                        },
                        aggs: {
                            last_state: {
                                top_hits: {
                                    sort: [{ timestamp: { order: 'desc' } }],
                                    size: 1
                                }
                            }
                        }
                    }
                }
            })
        });
    },
    listDevices: function (deviceId, mqttReq, mqttArg) {
        return fetch(`https://liveobjects.orange-business.com/api/v1/deviceMgt/devices`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });
    }
};

loClient.getStationState("partdieu").then(res => res.json().then(res => {
    const seatStates = {};
    res.aggregations.group_by_seat.buckets.forEach((el) => {
        const doc = el.last_state.hits.hits[0]._source;
        seatStates[el.key] = { timestamp: doc.timestamp, status: doc.value.status };
    });
    console.log(seatStates);
}));

init();