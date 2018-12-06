
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
        })
            .then((res) => res.json())
            .then(res => {
                const seatStates = {};
                res.aggregations.group_by_seat.buckets.forEach((bucket) => {
                    const seatId = bucket.key;
                    const doc = bucket.last_state.hits.hits[0]._source;
                    seatStates[seatId] = { timestamp: doc.timestamp, value: doc.value };
                });
                return seatStates;
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