const API_KEY = 'b6a3d30adb07411fb3d3bc0865b3257e';

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

let app;

try {
    const client = new Paho.MQTT.Client("liveobjects.orange-business.com", 443, "/mqtt", "web-ui-" + guid());
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    console.log("connecting to live objects...");
    client.connect({ userName: 'payload', password: API_KEY, onSuccess: onSuccess, useSSL: true });

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("MQTT > disconnected:" + responseObject.errorMessage);
        }
    }
    function onMessageArrived(message) {
        const msg = JSON.parse(message.payloadString);
        if (msg.model === 'SEAT') {
            app.handleSeatUpdate(msg);
        }
    }
    function onSuccess() {
        console.log("MQTT > connected!");
        client.subscribe('router/~event.v1.data.new.#');
    }
} catch (e) {
    console.log(e);
}

// Vue
const randomElementOf = (array) => {
    return array[Math.floor(Math.random() * array.length)];
}
const randomBool = () => (Math.random() > 0.5);
const STATIONS = [
    {
        id: 'partdieu', city: 'Lyon', station: 'gare de la Part-Dieu',
        deviceId: 'urn:lo:nsid:starterkit:352653090111519'
    },
    { id: 'lyon-prc', city: 'Lyon', station: 'gare de Perrache' },
    { id: 'paris-lyon', city: 'Paris', station: 'gare de Lyon' },
    { id: 'paris-nord', city: 'Paris', station: 'gare du Nord' },
    { id: 'paris-mtp', city: 'Paris', station: 'gare Montparnasse' }
];
const STATION_MAP = STATIONS.reduce((map, el) => { map[el.id] = el; return map }, {});

init = () => {

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
    const data = {
        seatStates: {},
        stations: STATION_MAP,
        seatsTotal: 0,
        seatsBusy: 0,
        seats: randomSeats(),
        now: moment()
    };
    app = new Vue({
        el: '#app',
        data: data,
        methods: {
            selectStation: function (station) {
                this.selectedStation = station;
                this.udpate();
            },
            udpate: function () {
                this.rawStatsData = [];
                loClient.getAllStates(this.selectedStation.id).then((res) => {
                    console.log("seatStates", res);
                    this.seatStates = res;
                    this.updateCounts();
                })
            },
            incr: function () {
                this.seatsBusy = this.seatsBusy + 1;
            },
            updateCounts: function () {
                this.seatsTotal = Object.values(this.seatStates).length;
                this.seatsBusy = Object.values(this.seatStates).filter((s) => s.busy).length;
                this.now = moment();
            },
            handleSeatUpdate: function (msg) {
                const expectedStreamId = 'seat:' + this.selectedStation.id;
                if (msg.streamId === expectedStreamId) {
                    console.log("received update for currently selected station => udpating", msg.value);
                    const seatId = msg.value.seat;
                    var state = this.seatStates[seatId] || {id: seatId};
                    if(typeof msg.value.status !== 'undefined') {
                        state.busy = (msg.value.status === 1);
                    }
                    if(typeof msg.value.reserv !== 'undefined') {
                        state.reserv = (msg.value.reserv === 1);
                    }
                    console.log(`seat ${seatId} has new state (busy=${state.busy} reserv=${state.reserv})`, state)
                    this.seatStates[seatId] = state;
                } else {
                    console.log("received update for another station => dropping", msg.value);
                }
                this.updateCounts();
            },
            bookSeat: function (seatId) {
                console.log(`booking seat ${seatId}`);
                loClient.sendMqttCommand(this.selectedStation.deviceId, 'res', { t: seatId, v: 1 });
            },
            unbookSeat: function (seatId) {
                console.log(`unbooking seat ${seatId}`);
                loClient.sendMqttCommand(this.selectedStation.deviceId, 'res', { t: seatId, v: 0 });
            }

        },
        created: function () {
            this.selectStation(STATION_MAP['partdieu']);
        }
    });
}

init();