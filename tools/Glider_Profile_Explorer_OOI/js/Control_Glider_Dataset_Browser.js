/*
OOI EPE - Glider Dataset Browser Control
for use with Glider Profile Explorer

Revised 12/17/2014
Written by Michael Mills, Rutgers University

*/

(function (eduVis) {

  "use strict";

  var parent_tool,
  control = {
    "name":"Glider_Dataset_Browser_Control",
    "version" : "0.1.6",
    "description" : "This controls allows the user to select Glider Datasets via Rutgers Marine Science ERDDAP server.",
    "authors" : [
    {
      "name" : "Michael Mills",
      "association" : "Rutgers University",
      "url" : "http://rucool.marine.rutgers.edu"
    }
    ],
    "config_controls" : {
      "slider" : {
        "date_start" : null,
        "date_end" : null,
        "date_range_start" : null,
        "date_range_end" : null
      }
    },
    "datasets":{}
  };

  control.config_dateRange_slider = function (date_start, date_end, range_start, range_end, time_start, time_end) {

    $("#ui-config-dateRange-slider").remove();

    var margin = {
      top: 0,
      right: 40,
      bottom: 20,
      left: 40
    },
    width = 500 - margin.left - margin.right,
    height = 50 - margin.top - margin.bottom;

    var date_format_ymd = d3.time.format("%Y-%m-%d"),
    date_range_format = d3.time.format("%Y-%m-%d-%H-%M-%S"),

    iso_format = d3.time.format.iso.parse,

    //start = date_format_ymd.parse(date_start),
    //end = date_format_ymd.parse(date_end);

    start = date_range_format.parse(date_start + "-00-01-01"),
    end = date_range_format.parse(date_end + "-23-59-59");

    var range_date_start = range_start || date_start,
    range_date_end = range_end || date_end;

    console.log("RANGEs!! ->", start, end, range_date_start, range_date_end);

    var x = d3.time.scale.utc()
    .range([0, width])
    .domain([start, end]);

    // set the extent to the selected range within the full range
    var brush = d3.svg.brush()
    .x(x)
    //.extent([date_format_ymd.parse(range_date_start), date_format_ymd.parse(range_date_end)])
    .extent([date_range_format.parse(range_date_start + "-00-01-01"), date_range_format.parse(range_date_end+"-23-59-59")])
    .on("brushstart", brushstart)
    .on("brush", brushmove)
    .on("brushend", brushend);

    var arc = d3.svg.arc()
    .outerRadius(height / 2)
    .startAngle(0)
    .endAngle(function (d, i) {
      return i ? -Math.PI : Math.PI;
    });

    var svg = d3.select("#ui-config-dateRange").append("svg")
    .attr("id","ui-config-dateRange-slider")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var tick_interpolate = d3.interpolate(start, end);
    var dd = [0, 0.25, 0.5, 0.75, 1].map(function (a) {
      return iso_format(tick_interpolate(a));
    });

    var brushg = svg.append("g")
    .attr("class", "brush")
    .call(brush);

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3.svg.axis().scale(x)
      .orient("bottom")
      .tickValues(dd)
      .tickFormat(date_format_ymd)
    );

    brushg.selectAll (".resize").append ("path")
    .attr ("transform", "translate(0," + height / 2 + ")")
    .attr ("d", arc);

    brushg.selectAll ("rect")
    .attr ("height", height);

    brushstart();
    brushmove();

    control.config_controls.brush = brush;

    function brushstart () {
      svg.classed("selecting", true);
    }

    function brushmove () {

      var s = brush.extent();

      $("#config-date_start-input").val (date_format_ymd (s[0]));
      $("#config-date_end-input").val (date_format_ymd (s[1]));

      // limit execution does not seem to have an effect
      L.Util.limitExecByInterval (control.poly_track_selected_update(s[0],s[1]), 1000, this);
    }

    function brushend () {
      svg.classed ("selecting", !d3.event.target.empty());
    }

  };

  /*

  */
  control.poly_track_selected_update = function (start,end) {

    // get full track from poly_track
    var track_geojson = control.config_controls.leaflet_map.track_full_geojson,
    iso_format = d3.time.format.iso.parse;

    var poly_coords = [],
    config = control.parent_tool.configuration,
    config_mapObj = control.config_controls.leaflet_map;

    var track_updated = L.geoJson(track_geojson,{

      onEachFeature: function (location, location_feature) {

        var date_compare = iso_format(location.properties.time);

        if ((date_compare >= start ) && (date_compare <= end)) {
          poly_coords.push(L.latLng(location.geometry.coordinates[1],location.geometry.coordinates[0]));
        }
      }
    });

    config_mapObj.poly_line_selected.setLatLngs(poly_coords);

  };

  control.init = function (_parent_tool) {

    control.parent_tool = _parent_tool;

    var parent_tool = control.parent_tool,
    config = parent_tool.configuration,
    settings = parent_tool.settings,
    iso_format = d3.time.format.iso.parse,
    date_format_ymd = d3.time.format("%Y-%m-%d"),
    slider = control.config_controls.slider;

    control.iso_format = iso_format;

    slider.date_start = config.date_start;
    slider.date_end = config.date_end;

    slider.date_range_start = config.date_start;
    slider.date_range_end = config.date_end;

    var erddap_ds = settings.erddap.data_source,//.parameter_metadata,

    dropdown_deployment = $("<div />")
    .append(
      $("<h2 />")
      .html("Glider Dataset Explorer")
    )
    .append(
      $("<div />")
      .html("Customize your glider profile explorer default view.")
      .append(
        $("<ol />")
        .append("<li>Choose a Deployment Dataset</li>")
        .append("<li>Refine the Date Range (optional)</li>")
        .append("<li>Apply the Configuration</li>")
      )
    )
    .append(
      $("<label />")
      .attr("for", "config-dataset_id-select")
      .html("Deployment Dataset")
    )
    .append(

      // CONTROL Dropdown for Dataset Selection

      control.config_controls["ui_control_dataset_id"] = $("<select />")
      .attr("id","config-dataset_id-select")
      .append("<option>...loading...</option>")
      .on("change", function (evt) {

        //console.log("this ui_control_dataset_id change event", this);

        var selected = $("option:selected", this),
        observatory = selected.parent().attr("label"),
        dataset_val = selected.val(),
        ds_obj,
        date_start_config = iso_format(config.date_start),
        date_end_config = iso_format(config.date_end),
        date_start_ds,
        date_end_ds,
        minLat,maxLat,minLon,maxLon,
        glider_datasets = control.config_controls.glider_datasets,
        c=0,
        is_dataset = false;

        config.observatory = observatory;
        config.glider_name = dataset_val.substring(dataset_val.indexOf("_")+1, dataset_val.lastIndexOf("-"));

        // find dataset array and set start date and end date
        do{
          if (glider_datasets[c].datasetID == dataset_val) {

            ds_obj = glider_datasets[c];

            date_start_ds = iso_format(ds_obj.minTime);
            date_end_ds = iso_format(ds_obj.maxTime);
            minLat = +ds_obj.minLatitude;
            maxLat = +ds_obj.maxLatitude;
            minLon = +ds_obj.minLongitude;
            maxLon = +ds_obj.maxLongitude;

            is_dataset = true;
          }
          c++;
        }
        while(!is_dataset);

        slider.date_start = date_format_ymd(date_start_ds);
        slider.date_end = date_format_ymd(date_end_ds);
        slider.date_range_start = date_format_ymd(date_start_ds);
        slider.date_range_end = date_format_ymd(date_end_ds);

        // now set the slider to the full range of the requested dataset
        // if its the config dataset load the specific start and end dates
        if (config.dataset_id === dataset_val) {

          slider.date_range_start = config.date_start;
          slider.date_range_end = config.date_end;

          control.config_dateRange_slider( slider.date_start, slider.date_end, slider.date_range_start, slider.date_range_end);
        }
        else{
          control.config_dateRange_slider( slider.date_start, slider.date_end, slider.date_range_start, slider.date_range_end );
        }

        // set the date picker start and end range restrictions
        $("#config-date_start-input").datepicker("option", {
          "minDate":date_format_ymd(date_start_ds),
          "maxDate":date_format_ymd(date_end_ds)
        });

        $("#config-date_end-input").datepicker("option", {
          "minDate":date_format_ymd(date_start_ds),
          "maxDate":date_format_ymd(date_end_ds)
        });

        // zoom to the track bounds, southwest, northeast obtained from datasets query
        control.config_controls.leaflet_map.map.fitBounds([
          [minLat,minLon],
          [maxLat,maxLon]
          ]);

          //http://erddap.marine.rutgers.edu/erddap/tabledap/OOI-GP05MOAS-GL001.geoJson?profile_id,time,latitude,longitude

          // query json object of dataset
          $.getJSON( "http://erddap.marine.rutgers.edu/erddap/tabledap/" + dataset_val + ".geoJson?profile_id,time,latitude,longitude",
          function (geodata) {

            console.log("track data returned...");

            var config_mapObj = control.config_controls.leaflet_map;

            // save the track geojson for later reference - primarily the config slider
            config_mapObj.track_full_geojson = geodata;

            // create arrays to hold the profile locations and selected profile locations
            var poly_coords = [],
            poly_coords_selected = [];

            // remove geoJson point layer if its already on the map
            if (typeof config_mapObj.track_full_L_geoJson !== "undefined") {
              config_mapObj.map.removeLayer(config_mapObj.track_full_L_geoJson);
            }

            /*
            Create Leaflet geoJson object for the points of the glider track
            -add click events for
            */

            config_mapObj.track_full_L_geoJson = L.geoJson(geodata,{

              onEachFeature: function (location, location_feature) {

                var featureMouseOut = function (feat) {

                  console.log(feat.options);
                  var f = feat.options;

                  feat.setStyle({
                    "fillOpacity":0,
                    "opacity":0,
                    "radius":0
                  });

                };

                var featureMouseOutTimer;

                location_feature.on({

                  // Track Mouse Hover Event
                  "mouseover": function (e) {

                    // todo- this can be another style setting in map settings to make it easy for future updates
                    var opts = this.options,
                    self = this;

                    // Save current style to be reapplied after mouse out
                    var currentStyle = {
                      "fillOpacity": opts.fillOpacity,
                      "opacity": opts.opacity,
                      "radius": opts.radius
                    };

                    // Set mouse out even after mouse over occurs to maintain styles
                    this.on({
                      "mouseout" : function () {

                        setTimeout(function () {self.setStyle(currentStyle) },1000);
                      }
                    });

                    // set the opacity, fill, and radius
                    this.setStyle({
                      "fillOpacity":1,
                      "opacity":1,
                      "radius":6
                    });
                  },
                  "click": function (e) {

                    // // Build Content for the Profile Marker click event
                    // var opts = this.options,
                    // self = this;
                    //
                    // // Save current style to be reapplied after mouse out
                    //
                    // var currentStyle = {
                    //   "fillOpacity": opts.fillOpacity,
                    //   "opacity": opts.opacity,
                    //   "radius": opts.radius
                    // };
                    //
                    // this.on({
                    //   "mouseout" : function () {
                    //
                    //     setTimeout(function () {self.setStyle(currentStyle) },1000);
                    //
                    //   }
                    // });

                    var start = iso_format($("#config-date_start-input").val()),
                    end = iso_format($("#config-date_end-input").val()),

                    props = e.target.feature.properties,

                    profile_date = props.time.substring(0,10),
                    profile_time = iso_format(props.time),

                    latlng = this.getLatLng(),

                    content = '<div style="margin:8px; min-width:240px">' +
                    '<div style="float:left;">' + props.time +"</div>" +
                    '<div style="text-align:right">Profile #: ' + props.profile_id +"</div>" +
                    "<div>Location: " + d3.round(latlng.lat,3) + " N " + d3.round(latlng.lng,3)+" W</div>"+
                    '</div><div style="padding:14px;">';

                    // build button based on current selection and glider track date range

                    // set as start date
                    if (profile_time <= start) {

                      content += '<a id="track_profile_set_start" data-attr-date="'+ profile_date +'" class="btn">Set as <b>Start Date</b></a>';
                    }
                    else if (profile_time <= end) {

                      content += '<a id="track_profile_set_start" data-attr-date="'+ profile_date +'" class="btn">Set as <b>Start Date</b></a>' + '<a id="track_profile_set_end" data-attr-date="'+ profile_date +'" class="btn">Set as <b>End Date</b>.</a>';
                    }
                    else{

                      content += '<a id="track_profile_set_end" data-attr-date="'+ profile_date +'" class="btn">Set as <b>End Date</b>.</a>';
                    }

                    content += "</div>";

                    // create pop up and add it to the map
                    var popup = L.popup()
                    .setLatLng(e.target._latlng)
                    .setContent(content)
                    .openOn(config_mapObj.map);

                    $("#track_profile_set_start").on("click",function (e) {

                      var date_start = $("#config-date_start-input"),
                      date_end = $("#config-date_end-input"),
                      slider = control.config_controls.slider;

                      // update the start date
                      date_start.val(
                        // coming as a formated date?
                        $(this).attr("data-attr-date")
                      );

                      control.config_dateRange_slider(slider.date_start, slider.date_end, date_start.val(), date_end.val());
                    });

                    $("#track_profile_set_end").on("click",function (e) {

                      var date_start = $("#config-date_start-input"),
                      date_end = $("#config-date_end-input");

                      date_end.val(
                        $(this).attr("data-attr-date")
                        //$(this).attr("data-attr-date")

                      );

                      control.config_dateRange_slider(slider.date_start, slider.date_end, date_start.val(), date_end.val());

                    });
                  }
                });

                //location_feature.bindPopup(control.track_profile_click(iso_format(location.properties.time)));

                poly_coords.push(L.latLng(location.geometry.coordinates[1],location.geometry.coordinates[0]));

              },
              pointToLayer: function (location, latlng) {
                return L.circleMarker(
                  latlng,
                  {
                    radius: 3,
                    //fillColor: "#ff0000",
                    fillColor: "#ff0000",
                    color: "#000",
                    weight: 1,
                    opacity: 0,
                    fillOpacity: 0
                  }
                );
              }
            });

            // set the selected L geoJson in the control map object for later reference
            // can be set to local value for memory savings if necessary
            config_mapObj.track_selected_L_geoJson = L.geoJson(geodata,{

              onEachFeature: function (location, location_feature) {

                var date_compare = iso_format(location.properties.time.substring(0,10));

                // if its the currently selected dataset in the configuration, use configuraiton dates, otherwise use full dataset dates
                if (config.dataset_id == dataset_val) {

                  if ((date_compare >= date_start_config ) && (date_compare <= date_end_config)) {
                    poly_coords_selected.push(L.latLng(location.geometry.coordinates[1],location.geometry.coordinates[0]));
                  }

                }
                else{
                  poly_coords_selected.push(L.latLng(location.geometry.coordinates[1],location.geometry.coordinates[0]));
                }

              }
            });

            // add points
            config_mapObj.map.addLayer(config_mapObj.track_full_L_geoJson);

            // update the poly line full track
            config_mapObj.poly_line_track.setLatLngs(poly_coords);

            // track mouse over and mouse out
            // config_mapObj.poly_line_track.on({
            //
            //   "mouseover" : function () {
            //
            //      config_mapObj.track_full_L_geoJson
            //     // set the opacity, fill, and radius
            //     .setStyle({
            //       "fillOpacity":1,
            //       "opacity":1,
            //       "radius":3
            //     });
            //   },
            //   "mouseout" : function () {
            //
            //      config_mapObj.track_full_L_geoJson
            //     // set the opacity, fill, and radius
            //     .setStyle({
            //       "fillOpacity":0,
            //       "opacity":0,
            //       "radius":6
            //     });
            //   }
            //
            // });

            // update the poly line selection track
            config_mapObj.poly_line_selected.setLatLngs(poly_coords_selected);

            // zoom the bounds of the track
            config_mapObj.map.fitBounds(config_mapObj.poly_line_track.getBounds());
          });

        })
      )
      .append(
        $("<div />")
        .attr("id","ui-config-map-container")
        .css({
          //"display":"none",
          //"width":"400px",
          "height":"350px",
          //"background-color":"red"
        })
        .append(

          // control.config_controls["ui_config_map"] =
          $("<div />")
          .attr("id","ui-config-map")
          .css({
            "width":"700px",
            "height":"350px"
          })
        )
      )
      .append(
        $("<div />")
        .attr("id","ui-config-dateRange")
        .append(
          $("<div />")
          .attr("id","ui-config-dateRange-start")
          .append(
            $("<label />")
            .attr("for","config-date_start-input")
            .html("Start Date")
          )
          .append(

            // Control: Date Start

            control.config_controls["ui_control_date_start"] = $("<input />")
            .attr("id","config-date_start-input")
            .addClass('datepicker')
            .datepicker({
              "dateFormat": "yy-mm-dd",
              "changeMonth": true,
              "changeYear": true,
              "onClose" : function (d,i) {
                var el_end_date = $("#config-date_end-input");
                el_end_date.datepicker("option","minDate", d);

                control.config_dateRange_slider(slider.date_start, slider.date_end, d, el_end_date.val());
              },
              "defaultDate": config.date_start
            })
            .val(config.date_start)
          )
        )
        .append(
          $("<div />")
          .css("margin-bottom","10px")
          .attr("id","ui-config-dateRange-end")
          .append(
            $("<label />")
            .attr("for","config-date_end-input")
            .html("End Date")
          )
          .append(

            // Control: Date End
            control.config_controls["ui_control_date_end"] = $("<input />")
            .attr("id","config-date_end-input")
            .addClass('datepicker')
            .datepicker({
              "dateFormat": "yy-mm-dd",
              "changeMonth": true,
              "changeYear": true,
              "onClose" : function (d,i) {
                var el_start_date = $("#config-date_start-input");
                el_start_date.datepicker("option", "maxDate", d);
                control.config_dateRange_slider(slider.date_start, slider.date_end, el_start_date.val(), d);
              },
              "defaultDate": config.date_start
            })
            .val(config.date_end)
          )
        )
      )
      .append(
        $("<div />")
        .attr("id","ui-config-apply")
        .append(
          $("<div />")
          .attr("id", "config-apply")
          .addClass("btn btn-medium")
          .html("Apply")
          .css({"margin-top":"20px"})
          .on("click",function () {
            // update the parameter configuration value

            parent_tool.configuration.date_start = $("#config-date_start-input").val();
            parent_tool.configuration.date_end = $("#config-date_end-input").val();
            parent_tool.configuration.dataset_id = $("#config-dataset_id-select").val();

            // call the apply callback
            parent_tool.config_callback();

          })
        )
      )
      .appendTo("#vistool-controls");

      // list of erddap variables that we are interested in
      var erddap_variables = [
      "datasetID",
      "institution",
      "minLongitude",
      "maxLongitude",
      "minLatitude",
      "maxLatitude",
      "minTime",
      "maxTime"
      ];

      // only request datasets with institution of OOI
      //http://erddap.marine.rutgers.edu/erddap/tabledap/allDatasets.json?
      //datasetID,institution,minLongitude,maxLongitude,minLatitude,maxLatitude,minTime,maxTime&institution=%22OOI%22

      // request erddap dataset listing
      $.getJSON('http://erddap.marine.rutgers.edu/erddap/tabledap/allDatasets.json?' + erddap_variables.join(',') +'&institution="OOI"',

      function (json) {

        var ds = json, datasets = [],
        ci = 0,
        clen = ds.table.columnNames.length;

        function getColumnKey(columnValue) {
          for (ci = 0; ci < clen; ci++) {
            if (ds.table.columnNames[ci] == columnValue) return ci;
          }
          return -1;
        }

        function getRowValue(row, columnValue) {
          var columnKey = getColumnKey(columnValue),
          rowValue = ds.table.rows[row][columnKey];
          return rowValue;
        }

        // build the datasets object
        $.each(ds.table.rows, function (i, row) {
          var dset = {};
          $.each(erddap_variables, function (x, v) {
            dset[v] = getRowValue(i, v);
          });
          datasets.push(dset);
        });

        // save dataset object for later reference
        control.config_controls.glider_datasets = datasets;

        // remove all drop down selection options
        $("#config-dataset_id-select").children().remove();

        // use lookup table to build structured dataset based on array / station source
        $.each(datasets, function (i,dset) {

          // grab dataset ID
          // first two chars or two chars after.. compare lowercase in all instances

          var d_id = dset.datasetID.substring(0,2).toLowerCase();

          erddap_ds[d_id].datasets.push(dset);

          // control.parenttool
          /*
          datasetID: "CE05MOAS-ce_311-20141007T0028"
          institution: "OOI"
          maxLatitude: 44.95396812372304
          maxLongitude: -124.12050911265995
          maxTime: "2014-11-21T10:32:44Z"
          minLatitude: 44.36658249006089
          minLongitude: -125.12023382659741
          minTime: "2014-10-07T00:43:48Z"
          */
        });

        //  create grouped select station with structured object
        $.each(erddap_ds, function (i, dataObj) {

          // create opt group
          var optGroup = $("<optgroup>")
          .attr("label", dataObj.title);

          // add datasets to opt group
          $.each(dataObj.datasets, function (i,dset) {

            var d = dset.datasetID,
            t0 = dset.minTime,
            t1 = dset.maxTime,
            //d_id = d.substring( (1+d.indexOf("_") ),d.indexOf("_")+4),
            d_id = d.substring(d.indexOf("_")+1, d.indexOf("-",d.indexOf("_"))),
            time_range = t0.substring(0,10) + " to " + t1.substring(0,10);

            optGroup.append(

              $("<option>")
              .attr("value",d)
              .html(d_id + "  " + time_range)
            );
          });

          // add opt group
          $("#config-dataset_id-select")
          .append(optGroup);
        });

        // set the default seleted option for the dataset dropdown
        control.config_controls.ui_control_dataset_id
        .val(config.dataset_id);

        // add the leaflet map config control
        control.config_controls.leaflet_map = {
          "map" : L.map('ui-config-map', {
            "center": [38.5,-78.2],
            "zoom": 3
            // ,noWrap : true
          })
        };

        // define the ocean basemap layer and add it ot the map tool control
        control.config_controls.leaflet_map.oceanBasemap_layer = new L.TileLayer("http://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}",{
          maxZoom: 19,
          attribution: 'Tile Layer: &copy; Esri'
        }).addTo(control.config_controls.leaflet_map.map);

        // define the full track polyline and add it ot the map
        control.config_controls.leaflet_map.poly_line_track = L.polyline(
          [],
          {color: 'white'} // /todo: add transparancy
        )
        .addTo(control.config_controls.leaflet_map.map);

        // define the selected portion polyline and add it to the map
        control.config_controls.leaflet_map.poly_line_selected = L.polyline(
          [],
          {color: 'blue'} // /todo: add transparancy
        )
        .addTo(control.config_controls.leaflet_map.map);

        // add event handlers to the map
        control.config_controls.leaflet_map.map.on({

          "zoomend" : function (e) {

            /*
            When zoom level changes set the style of the profile markers

            */

            if (this.getZoom() >= 10) {

              if (typeof control.config_controls.leaflet_map.track_full_L_geoJson !== "undefined") {

                // set the opacity, fill, and radius
                control.config_controls.leaflet_map.track_full_L_geoJson
                .setStyle({
                  "fillOpacity":1,
                  "opacity":1,
                  "radius":3
                });
              }
            }
            else{

              if (typeof control.config_controls.leaflet_map.track_full_L_geoJson !== "undefined") {

                control.config_controls.leaflet_map.track_full_L_geoJson
                .setStyle({
                  "fillOpacity":0,
                  "opacity":0,
                  "radius":3
                });
              }
            }
          }});

          control.config_controls.ui_control_dataset_id.trigger("change");

        })
        .done(function (resp) {
          console.log("done", resp);
        })
        .fail(function (resp) {
          console.log("request failed", resp);
        });

      };

      if ( 'object' !== typeof EduVis.controls ) {
        EduVis.controls = {};
      }

      EduVis.controls[control.name] = control;

    }(EduVis));
    
