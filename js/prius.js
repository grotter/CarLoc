var Prius = function () {
    var getQueryString = function (name) {
        function parseParams() {
            var params = {},
                e,
                a = /\+/g,
                r = /([^&=]+)=?([^&]*)/g,
                d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
                q = window.location.search.substring(1);

            while (e = r.exec(q))
                params[d(e[1])] = d(e[2]);

            return params;
        }

        if (!this.queryStringParams)
            this.queryStringParams = parseParams();

        return this.queryStringParams[name];
    }

    var getStreetSweeping = function (json) {
       $.getJSON('https://api.xtreet.com/roads2/getnearesttolatlng/?longitude=' + json.longitude + '&latitude=' + json.latitude, function (response) {
            console.log(response);

            if ($.isArray(response.rows)) {
                var row = response.rows[0];
                
                if (row.properties) {
                    if (row.properties.cleaning_info) {
                        $('#sign').append('<p class="cleaning_info">' + row.properties.cleaning_info + '</p>');
                    }

                    if (row.properties.cleaning_time_start) {
                        var date = moment.unix(row.properties.cleaning_time_start).utc();

                        if (date.isValid()) {
                            // replace with formatted
                            $('#sign .cleaning_info').remove();
                            $('#sign').append('<p class="cleaning_info">Next street sweeping: <strong>' + date.format('dddd, MMMM Do, h:mma') + '</strong></p>');
                        }
                    }

                    if (row.properties.sign_info) {
                        $('#sign').append('<p>' + row.properties.sign_info + '</p>');
                    }
                }
            }

            $('body').addClass('with-street-info');
       });
    }

    var getAddress = function (json) {
        $.getJSON('https://api.mapbox.com/geocoding/v5/mapbox.places/' + json.longitude + ',' + json.latitude + '.json?access_token=' + mapboxgl.accessToken, function (response) {
            console.log(response);
            
            if ($.isArray(response.features)) {
                $.each(response.features, function (i, obj) {
                    if (obj.place_type[0] == 'address') {
                        console.log(obj);

                        var str = [];

                        if (obj.address) str.push(obj.address);
                        if (obj.text) str.push(obj.text);
                        
                        if (str.length > 0) {
                            $('#addr').html(str.join(' '));    
                        } else {
                            $('#addr').remove();
                        }
                        
                        return false;
                    }
                });
            }

            $('body').addClass('with-geocoded');
        });
    }

    var setDate = function (timestamp) {
        var date = moment(timestamp);
        if (!date.isValid()) return; 

        var div = $('<div id="date" />');
        div.html('Parked at <strong>' + date.format('dddd, MMMM Do, h:mma') + '</strong>');

        $('body').append(div);
    }

    this.initialize = function () {
        mapboxgl.accessToken = getQueryString('mapbox_token');

        // init map
        $.getJSON('json/?vehicleId=' + getQueryString('vehicleId') + '&token=' + getQueryString('token'), function (json) {
            console.log(json);

            if (json.error) {
                alert('There was a problem reading the Pulse: ' + json.error);
                return;
            }

            if (json.timestamp) setDate(json.timestamp);

            var coords = [json.longitude, json.latitude];

            var map = new mapboxgl.Map({
                container: 'map',
                attributionControl: false,
                center: coords,
                zoom: 16.5,
                style: 'mapbox://styles/mapbox/light-v10?optimize=true'
            });

            map.once('load', function () {
                var el = document.createElement('div');
                el.innerHTML = '<div class="inner"></div>';
                el.className = 'marker';

                new mapboxgl.Marker(el).setLngLat(coords).addTo(map);

                getAddress(json);
                getStreetSweeping(json);
            });
        });
        
        // toggle legend
        var debounce = null;

        $('body').on('touchstart mousedown', function () {
            clearTimeout(debounce);
            $(this).addClass('interacting');
        });
        
        $('body').on('touchend mouseup', function () {
            clearTimeout(debounce);
            
            debounce = setTimeout(function () {
                $('body').removeClass('interacting');
            }, 500);
        });

        // stay fresh
        $(window).on('focus', function () {
            if ($('body').hasClass('hidden')) {
                window.location.reload();
            }
        });

        $(window).on('blur', function () {
            $('body').addClass('hidden');
        });
    }

    this.initialize();
}
