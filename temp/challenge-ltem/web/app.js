const API_KEY = 'b6a3d30adb07411fb3d3bc0865b3257e';

let app;

try {
    const client = new Paho.MQTT.Client("liveobjects.orange-business.com", 443, "mqtt");
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
        console.log(`MQTT > new message (${message.destinationName}`, message.payloadString);
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
        seats: [
            { id: 1, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 2, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 3, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 4, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 5, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 6, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 7, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
            { id: 8, deviceId: 'urn:lo:nsid:starterkit:352653090111519' },
        ]
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
        seatStatus: {},
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
                this.seats = randomSeats();
                loClient.getStationState(this.selectedStation.id).then((res) => {
                    console.log("seatStatus", res);
                    this.seatStatus = res;
                    this.updateCounts();
                })
            },
            updateCounts: function () {
                this.seatsTotal = Object.values(this.seatStatus).length;
                this.seatsBusy = Object.values(this.seatStatus).filter((s) => s.value.status !== 1).length;
                this.now = moment();
            },
            handleSeatUpdate: function (msg) {
                const expectedStreamId =  'seat:' + this.selectedStation.id;
                if (msg.streamId === expectedStreamId) {
                    console.log("received update for currently selected station => udpating", msg);
                    this.seatStatus[msg.value.seat] = msg;
                } else {
                    console.log("received update for another station => dropping", msg);
                }
                this.updateCounts();
            },
            bookSeat: function (seat) {
                console.log(`booking seat ${seat}`);
                loClient.sendMqttCommand(seat.deviceId, 'res', { t: seat.id, v: 1 });
            },
            unbookSeat: function (seat) {
                console.log(`unbooking seat ${seat}`);
                loClient.sendMqttCommand(seat.deviceId, 'res', { t: seat.id, v: 0 });
            }

        },
        created: function () {
            this.selectStation(STATION_MAP['partdieu']);
        }
    });
}

init();