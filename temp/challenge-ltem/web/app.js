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
    const client = new Paho.MQTT.Client("liveobjects.orange-business.com", 443, "/mqtt", "web-ui-" + guid()  );
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
                this.rawStatsData = [];
                this.seats = randomSeats();
                loClient.getStationState(this.selectedStation.id).then((res) => {
                    console.log("seatStatus", res);
                    this.seatStatus = res;
                    this.updateCounts();
                })
            },
            incr: function() {
                this.seatsBusy = this.seatsBusy + 1;
            },
            updateCounts: function () {
                this.seatsTotal = Object.values(this.seatStatus).length;
                this.seatsBusy = Object.values(this.seatStatus).filter((s) => s.value.status !== 1).length;
                this.now = moment();
            },
            handleSeatUpdate: function (msg) {
                const expectedStreamId =  'seat:' + this.selectedStation.id;
                if (msg.streamId === expectedStreamId) {
                    console.log("received update for currently selected station => udpating", msg.value);
                    this.seatStatus[msg.value.seat] = msg;
                } else {
                    console.log("received update for another station => dropping", msg.value);
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

    const calendarFormat =  {sameDay: '[aujourd\'hui]', lastDay: '[hier]', lastWeek: 'dddd'};

    // d3js chart
    var chart = (() => {
        // building list à past 7 days
        const DATA = new Array(7).fill(0)
            .map((d,i) => moment().startOf('day').subtract(i, 'day'))
            .reverse()
            .map((d) => ({ date: d.valueOf(), dateStr: d.calendar(null, calendarFormat), val: Math.floor(Math.random() * 100)}))
        console.log("D", DATA);

        const WIDTH = 1100;
        const HEIGHT = 400;
        const TEXT_HEIGHT = 20;
        const LEFT_PADDING = 80;
        var svg = d3.select("#chart_days").append("svg:svg").attr("width", WIDTH).attr("height", HEIGHT);
        const xscale = d3.scaleLinear().domain([0, DATA.length]).range([LEFT_PADDING, WIDTH]);
        const heightScale = d3.scaleLinear().domain([0, 100]).range([0, HEIGHT - TEXT_HEIGHT]);
        const yScale = d3.scaleLinear().domain([0, 100]).range([HEIGHT - TEXT_HEIGHT, 0]);
        
        const gXLabels = svg.append("g");
        const gYLabels = svg.append("g");
        const gRects = svg.append("g");
        
        return {
            update: function() {
                // rects
                var d = gRects.selectAll("rect").data(DATA);
                d.enter().append("rect")
                    .attr("fill", "#6e267b")
                        .attr("width", xscale(0.5) - xscale(0))
                        .attr("y", (d) => yScale(d.val))
                        .attr("x", (d,i) => xscale(i))
                        .attr("height", (d) => heightScale(d.val));
                d.exit().remove();

                // texts
                d = gXLabels.selectAll("text").data(DATA);
                d.enter().append("text")
                    .text((d) => d.dateStr)
                        .attr("x", (d,i) => xscale(i))
                        .attr("y", HEIGHT);
                d.exit().remove();

                // Y axis
                d = gYLabels.selectAll("text").data(yScale.ticks(5));
                d.enter().append("text")
                    .text((d) => '' + d)
                        .attr("y", yScale);
                d.exit().remove();
                // Y axis
                d = gYLabels.selectAll("line").data(yScale.ticks(5));
                d.enter()
                    .append("line")
                    .attr("x1", LEFT_PADDING)
                    .attr("x2", WIDTH)
                    .attr("y1", yScale)
                    .attr("y2", yScale)
                    .attr("stroke", "#CCC");
                d.exit().remove();
            }
        }
    })();
    chart.update();
}

init();