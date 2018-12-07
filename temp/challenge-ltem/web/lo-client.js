
function sendMqttCommand(deviceId, mqttReq, mqttArg) {
    return fetch(`https://liveobjects.orange-business.com/api/v1/deviceMgt/devices/${deviceId}/commands`, {
        method: 'POST',
        headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request: { connector: 'mqtt', value: { req: mqttReq, arg: mqttArg } } })
    })
};

function searchAllWithStatus(stationId) {
    return fetch(`https://liveobjects.orange-business.com/api/v0/data/search`, {
        method: 'POST',
        headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            size: 0,
            query: {
                bool: {
                    must: [
                        { match: { streamId: `seat:${stationId}` } },
                        { exists: { field: '@SEAT.value.status' } }
                    ],
                }
            },
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
    })
    .then((res) => res.json());
};


function searchAllWithReserv(stationId) {
    return fetch(`https://liveobjects.orange-business.com/api/v0/data/search`, {
        method: 'POST',
        headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            size: 0,
            query: {
                bool: {
                    must: [
                        { match: { streamId: `seat:${stationId}` } },
                        { exists: { field: '@SEAT.value.reserv' } }
                    ],
                }
            },
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
    })
    .then((res) => res.json());
};

function getAllStates(stationId) {
    var states = {};
    return searchAllWithStatus(stationId)
        .then(res => {
            res.aggregations.group_by_seat.buckets.forEach((bucket) => {
                const seatId = bucket.key;
                const doc = bucket.last_state.hits.hits[0]._source;
                states[seatId] = { id: seatId, busy: (doc.value.status === 1), reserv: false };
                console.log("doc status", doc.value);
            });

            return searchAllWithReserv(stationId)
                .then(res => {
                    res.aggregations.group_by_seat.buckets.forEach((bucket) => {
                        const seatId = bucket.key;
                        const doc = bucket.last_state.hits.hits[0]._source;
                        states[seatId] = states[seatId] || {};
                        states[seatId].reserv = (doc.value.reserv === 1);
                        console.log("doc reserv", doc.value);
                    });
                    console.log("RESULT", states);
                    return states;
                })

        });
}

const loClient = {
    sendMqttCommand: sendMqttCommand,
    getAllStates: getAllStates
};