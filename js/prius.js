var Prius = function () {
    var _vehicleId = 0;
    var _locUrl = false;
    var _overrideData = false;
    var _selectedVal = 0;
    var _dayOfWeek = false;
    var _streets = [];
    var _streetSweeping = [];

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

    var _updateSignInfo = function (row) {
        // populate info panel
        if (row && row.properties) {
            $('#sign').empty();

            if (row.properties.cleaning_info) {
                $('#sign').append('<p class="cleaning_info">' + row.properties.cleaning_info + '</p>');
            }

            if (row.properties.cleaning_time_start) {
                var date = moment.unix(row.properties.cleaning_time_start).utc();

                if (date.isValid()) {
                    // replace with formatted
                    $('#sign .cleaning_info').remove();
                    $('#sign').append('<p class="cleaning_info">Next street sweeping: <span class="dropdown_container"></span></p>');
                }
            }

            if (row.properties.sign_info) {
                $('#sign').append('<p>' + row.properties.sign_info + '</p>');
            }
        } else {
            $('#sign').append('<p>Street sweeping data unavailable</p>');
        }
    }

    var _onDropdown = function () {
        $(window).off('blur');

        var that = $(this);
        var selected = that.find(':selected');
        var str = 'Switch street sweeping to ';
        str += $.trim(selected.text());
        str += '?';

        var onFail = function () {
            that.val(_selectedVal);
        }

        if (confirm(str)) {
            // write override json
            var data = selected.data('streetSweepingData');

            $.getJSON(_locUrl, {
                override: JSON.stringify(data)
            }, function (response) {
                if (response.success) {
                    console.log('successful override!');
                    console.log(response);
                    
                    _selectedVal = that.val();      
                } else {
                    onFail();
                }
            }).fail(onFail);
        } else {
            onFail();
        }

        setTimeout(_setRefreshListener, 100);
    }

    var _insertUpdateDropdown = function () {
        var select = $('<select />');
        var times = [];

        $.each(_streetSweeping, function (i, obj) {
            if (obj.properties && obj.properties.cleaning_time_start) {
                var t = obj.properties.cleaning_time_start;
                if ($.inArray(t, times) >= 0) return true;

                times.push(t);

                var date = moment.unix(t).utc();

                if (date.isValid()) {
                    var option = $('<option>' + date.format('dddd, MMMM Do, h:mma') + '</option>');
                    option.data('streetSweepingData', obj.properties);
                    option.val(i);
                    select.append(option);
                }
            }
        });

        select.val(_selectedVal);
        select.on('change', _onDropdown);
        $('.dropdown_container').append(select);
    }

    var _onStreetSweeping = function (response) {
        console.log(response);

        if ($.isArray(response.rows)) {
            _streetSweeping = response.rows;
            var row = _streetSweeping[_selectedVal];
            
            // make sure we have accurate data for exceptions
            if (typeof(_dayOfWeek) == 'number') {
                $.each(_streetSweeping, function (i, obj) {
                    if (obj.properties && obj.properties.cleaning_time_start) {
                        var date = moment.unix(obj.properties.cleaning_time_start).utc();

                        if (date.isValid()) {
                            if (date.day() == _dayOfWeek) {
                                _selectedVal = i;
                                row = obj;
                                return false;
                            }
                        }
                    }
                });
            }

            // override
            if (typeof(_overrideData) == 'object') {
                $.each(_streetSweeping, function (i, obj) {
                    if (obj.properties && obj.properties.cleaning_time_start) {
                        if (obj.properties.cleaning_time_start == _overrideData.cleaning_time_start) {
                            console.log('setting override');
                            _selectedVal = i;
                            row = obj;
                            return false;
                        }
                    }
                });
            }

            _updateSignInfo(row);
            _insertUpdateDropdown();
        }

        $('body').addClass('with-street-info');
    }

    var getStreetSweeping = function (json) {
        var onError = function () {
            $('#sign .cleaning_info').remove();
            $('#sign').append('<p class="cleaning_info">Street sweeping data unavailable</p>');
            $('body').addClass('with-street-info'); 
        };

        var getFresh = function () {
            $.getJSON('https://api.xtreet.com/roads2/getnearesttolatlng/', json, _onStreetSweeping).fail(onError);
        };

        _overrideData = false;

        // first check if we have an override
        $.getJSON('../json/override-' + _vehicleId + '.json?nocache=' + Math.random(), function (r) {
            console.log(r);

            if (r.latitude == json.latitude && r.longitude == json.longitude) {
                // location match
                if (r.override.cleaning_time_start > moment().unix()) {
                    // not expired, override
                    _overrideData = r.override;  
                }
            }

            getFresh();
        }).fail(getFresh);
    }

    var getFeature = function (type, features) {
        var feature = false;

        $.each(features, function (i, obj) {
            if (obj.place_type[0] == type) {
                feature = obj;
                return false;
            }
        });

        return feature;
    }

    var getAddress = function (json) {
        var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/';
        url += json.longitude + ',' + json.latitude;
        url += '.json?access_token=' + mapboxgl.accessToken;
        url += '&nocache=' + Math.random();

        $.getJSON(url, function (response) {
            console.log(response);
            
            _dayOfWeek = false;

            if ($.isArray(response.features)) {
                // address
                var obj = getFeature('address', response.features);

                if (obj) {
                    console.log(obj);
                    var str = [];

                    if (obj.address) str.push(obj.address);
                    
                    if (obj.text) {
                        // override with customization
                        $.each(_streets, function (i, street) {
                            if (obj.text.indexOf(street.needle) == 0) {
                                _dayOfWeek = street.sweepDay;
                            }    
                        });

                        str.push(obj.text);
                    }
                    
                    if (str.length > 0) {
                        $('#addr').html(str.join(' '));    
                    }
                } else {
                    // neighborhood
                    obj = getFeature('neighborhood', response.features);
                    
                    if (obj && obj.text) {
                        $('#addr').html(obj.text);
                    }
                }
            }

            if ($.trim($('#addr').text()) == '') {
                $('#addr').remove();
            }

            $('body').addClass('with-geocoded');

            getStreetSweeping(json);
        });
    }

    var setDate = function (timestamp) {
        var date = moment(timestamp);
        if (!date.isValid()) return; 

        var div = $('<div id="date" />');
        div.html('Updated <strong>' + date.format('dddd, MMMM Do, h:mma') + '</strong>');

        $('body').append(div);
    }

    var _error = function (title, msg) {
        $('#info h1').html(title);
        $('#info').append('<ul><li>' + msg + '</li></ul>');
        
        $('body').off();
        $('body').removeClass('interacting');
        $('body').addClass('error');   
    }

    var _setRefreshListener = function () {
        $(window).off('blur');

        $(window).on('blur', function () {
            $('body').addClass('hidden');
        });
    }

    var _start = function () {
        _locUrl = '../json/?vehicleId=' + _vehicleId + '&token=' + getQueryString('token');
        mapboxgl.accessToken = getQueryString('mapbox_token');

        // init map
        $.getJSON(_locUrl, function (json) {
            console.log(json);

            if (!json.latitude || !json.longitude) {
                var errorDetails = json.error ? json.error : 'Unknown server error';
                _error('There was a problem reading the car&rsquo;s location!', errorDetails);
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
                el.innerHTML = '<div class="inner"></div><p>' + $('title').html() + '</p>';
                el.className = 'marker';

                new mapboxgl.Marker(el).setLngLat(coords).addTo(map);

                getAddress(json);
            });
        });
        
        // toggle legend
        var debounce = null;

        $('#map').on('touchstart mousedown', function () {
            clearTimeout(debounce);
            $('body').addClass('interacting');
        });
        
        $('#map').on('touchend mouseup', function () {
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

        _setRefreshListener();
    }

    this.initialize = function () {
        _vehicleId = getQueryString('vehicleId');

        // load street customizations
        $.getJSON('../json/streets.json', function (response) {
            if ($.isArray(response)) {
                console.log(response);
                _streets = response;
            }

            _start();
        }).fail(_start);
    }

    this.initialize();
}
