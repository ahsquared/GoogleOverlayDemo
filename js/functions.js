$(document).ready(function () {

  // get the whole thing going
  vaxiMap.init('xml/world_map.xml', false);

});

var vaxiMap = {
  // general info
  live: true,
  dataPath: "xml/world_map.xml",
  warningsPath: "xml/warnings.travel.xml",
  fluWarningsPath: "xml/warnings.flu.txt",
  travelNewsPath: "xml/news.travel.xml",
  fluNewsPath: "xml/news.flu.xml",
  pertussisNewsPath: "xml/news.pertussis.xml",
  dataXml: 0,
  warningsXml: 0,
  fluWarnings: [],
  travelNewsXml: 0,
  fluNewsXml: 0,
  petussisNewsXml: 0,
  regionFillOpacity: 0.5,
  hoverFillOpacity: 0.8,

  // function that starts the whole app running
  init: function (xmlPath, liveBool) {
    vaxiMap.dataPath = xmlPath;
    vaxiMap.live = liveBool;
    $.ajaxSetup({
      error: function (obj, status, error) {
        $('.result').html(status + ', ' + error);
        console.log('error loading file' + obj);
      }
    });

    vaxiMap.getRegionData();

  },

  // ajax call to get the data xml and pass it to the function that parses the data
  getRegionData: function () {
    $.ajax({
      url: vaxiMap.dataPath,
      success: function (xml) {
        vaxiMap.dataXml = xml;
        if (vaxiMap.live) {
          vaxiMap.getDataFeedPaths();
        }
        vaxiMap.getTravelWarnings();
      }
    });
  },

  getDataFeedPaths: function () {
    var sections = vaxiMap.dataXml.getElementsByTagName('section');
    vaxiMap.travelNewsPath = sections[1].getElementsByTagName('feed-url')[0].getAttribute('url');
    vaxiMap.warningsPath = sections[1].getElementsByTagName('smart-traveller-region-score-provider')[0].getAttribute('url');

    vaxiMap.fluNewsPath = sections[2].getElementsByTagName('feed-url')[0].getAttribute('url');
    vaxiMap.fluWarningsPath = sections[2].getElementsByTagName('google-flu-trends-score-provider')[0].getAttribute('data-url');

    vaxiMap.pertussisNewsPath = sections[3].getElementsByTagName('feed-url')[0].getAttribute('url');
  },

  // ajax call to get the travel warnings xml and pass it to the function that parses the data
  getTravelWarnings: function () {
    $.ajax({
      url: vaxiMap.warningsPath,
      success: function (xml) {
        vaxiMap.warningsXml = xml;
        vaxiMap.getFluWarnings();
      }
    });
  },

  // ajax call to get the flu warnings txt file and pass it to the function that parses the data
  getFluWarnings: function () {
    $.ajax({
      url: vaxiMap.fluWarningsPath,
      success: function (txt) {
        vaxiMap.fluWarnings = CSVToArray(txt);
        vaxiMap.fluWarnings.remove(0, 10);
        vaxiMap.getTravelNews();
      }
    });
  },
  // ajax call to get the flu warnings txt file and pass it to the function that parses the data
  getTravelNews: function () {
    $.ajax({
      url: vaxiMap.travelNewsPath,
      success: function (xml) {
        vaxiMap.travelNewsXml = xml;
        vaxiMap.getFluNews();
      }
    });
  },
  // ajax call to get the flu warnings txt file and pass it to the function that parses the data
  getFluNews: function () {
    $.ajax({
      url: vaxiMap.fluNewsPath,
      success: function (xml) {
        vaxiMap.fluNewsXml = xml;
        vaxiMap.getPertussisNews();
      }
    });
  },

  // ajax call to get the flu warnings txt file and pass it to the function that parses the data
  getPertussisNews: function () {
    $.ajax({
      url: vaxiMap.pertussisNewsPath,
      success: function (xml) {
        vaxiMap.pertussisNewsXml = xml;
        vaxiMap.initializeMap();
      }
    });
  },

  initializeMap: function () {

    // for detecting mobile tablets - to convert mouseover to click
    vaxiMap.detectDevice();
    vaxiMap.setOrientation();
    vaxiMap.parseVaxiData();
    vaxiMap.parse
    vaxiMap.parseTravelWarnings();
    vaxiMap.parseFluWarnings();
    vaxiMap.parsePertussisWarnings();
    if (vaxiMap.mobileDevice != '') {
      window.addEventListener('orientationchange', vaxiMap.setOrientation, false);
    }
    vaxiMap.setupInfoContainers();
    vaxiMap.parseNews();
    vaxiMap.setupNewsContainer();
    vaxiMap.setupGMap();
  },

  detectDevice: function () {

    // For use within normal web clients 
    var isiPad = navigator.userAgent.match(/iPad/i) != null;
    var isiPhone = navigator.userAgent.match(/iPhone/i) != null;
    var isAndroid = navigator.userAgent.match(/android/i) != null;
    if (isiPad) {
      vaxiMap.mobileDevice = 'iPad';
    }
    if (isiPhone) {
      vaxiMap.mobileDevice = 'iPhone';
    }
    if (isAndroid) {
      vaxiMap.mobileDevice = 'android';
    }
  },

  mobileDevice: '',
  orientation: '',
  setOrientation: function () {
    if (vaxiMap.mobileDevice != '') {
      var orient = Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait';
      vaxiMap.orientation = orient;
      if (orient == 'landscape') {
        $('.map_container, #map_canvas').css({
          height: '715px',
          width: '1024px'
        });
        $('.news_items').height('727px');
        $('.loading').css({
          left: '462px',
          top: '300px'
        });
        if (vaxiMap.map != 0) {
          google.maps.event.trigger(vaxiMap.map, 'resize');
          //vaxiMap.map.setZoom(vaxiMap[vaxiMap.selectedMap].mapSettings.zoom - 1);
        }
      } else {
        $('.map_container, #map_canvas').css({
          height: '970px',
          width: '768px'
        });
        $('.news_items').height('931px');
        $('.loading').css({
          left: '334px',
          top: '405px'
        });
        if (vaxiMap.map != 0) {
          google.maps.event.trigger(vaxiMap.map, 'resize');
          //vaxiMap.map.setZoom(vaxiMap[vaxiMap.selectedMap].mapSettings.zoom);
        }
      }
    }
  },

  // string name of the map to show
  selectedMap: "travel",

  // number of polygons (aka landMasses)
  numPolys: 0,

  map: 0,

  // setup the map, create the polygon overlays
  setupGMap: function () {
    var latlng = new google.maps.LatLng(vaxiMap.travel.mapSettings.lat, vaxiMap.travel.mapSettings.lng);
    var myOptions = {
      zoom: vaxiMap.travel.mapSettings.zoom,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      scrollwheel: false,
      panControl: true,
      panControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    if (vaxiMap.mobileDevice != '') {
      myOptions.panControl = false;
      var orient = Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait';
      if (orient == 'landscape') {
        myOptions.zoom = myOptions.zoom - 1;
      }
    }
    vaxiMap.map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);

    if (vaxiMap.mobileDevice != '') {
      google.maps.event.addListener(vaxiMap.map, 'dragstart', function () {
        vaxiMap.warnCont.hide();
        vaxiMap.currentPolygon.setOptions({
          fillOpacity: vaxiMap.regionFillOpacity
        });
      });
      google.maps.event.addListener(vaxiMap.map, 'click', function () {
        vaxiMap.warnCont.hide();
        vaxiMap.currentPolygon.setOptions({
          fillOpacity: vaxiMap.regionFillOpacity
        });
      });
    }

    $('.loading').show();
    vaxiMap.loadRegions(vaxiMap.travel, function () {
      $('.loading').hide();
    });

  },

  // function that clears the map of region overlays
  removeRegionPolygons: function () {
    for (var i = 0; i < vaxiMap.regionPolygons.length; i++) {
      vaxiMap.regionPolygons[i].setMap(null);
    }
    vaxiMap.numPolys = 0;
    vaxiMap.regionPolygons.length = 0;
  },

  // array that holds the current regionPolygons
  regionPolygons: [],


  // function that loads the regions for the travel map
  loadRegions: function (section, callbackFn) {
    section = (section || vaxiMap.travel);
    sectionRegion = section.regions;
    sectionWarnings = section.warningLevels;
    vaxiMap.map.setZoom(section.mapSettings.zoom);
    var latlng = new google.maps.LatLng(section.mapSettings.lat, section.mapSettings.lng);
    vaxiMap.map.setCenter(latlng);
    vaxiMap.regionPolygons.length = 0;
    for (var key in sectionRegion) {
      if (sectionRegion.hasOwnProperty(key)) {

        var color = "#fe0000";
        if (sectionRegion[key].level != null) {
          color = sectionWarnings[sectionRegion[key].level][1];
        } else {
          console.log(color, sectionRegion[key]);
        }
        if (vaxiMap.regionGeometry[key]) { // need to fix Australia landmasses
          var landMasses = vaxiMap.regionGeometry[key].landMasses.points;
          for (var i = 0; i < landMasses.length; i++) {
            var points = landMasses[i];
            var polyPoints = [];
            for (var j = 0; j < points.length; j++) {
              polyPoints.push(new google.maps.LatLng(points[j][1], points[j][0]));
            }
            vaxiMap.regionPolygons.push(
              new google.maps.Polygon({
                paths: polyPoints,
                strokeColor: color,
                strokeOpacity: 0.6,
                strokeWeight: 1,
                fillColor: color,
                fillOpacity: vaxiMap.regionFillOpacity
              })
            );
            vaxiMap.regionPolygons[vaxiMap.numPolys].setMap(vaxiMap.map);
            if (vaxiMap.mobileDevice == 'iPad') {
              vaxiMap.attachTravelRegionEventHandlersIPad(section, sectionRegion[key], vaxiMap.regionPolygons[vaxiMap.numPolys]);
            } else {
              vaxiMap.attachTravelRegionEventHandlers(section, sectionRegion[key], vaxiMap.regionPolygons[vaxiMap.numPolys]);
            }
            vaxiMap.numPolys++;
          }
        }
      }
    }
    // call the callback function
    if (typeof callbackFn == 'function') {
      if (vaxiMap.mobileDevice == 'iPad') {
        setTimeout(callbackFn, 4000);
      } else {
        callbackFn();
      }
    }
  },

  // html container for the warning level (tooltip)
  warnCont: $('.warning_container'),

  // html container for the links (smart traveller, traveller info, vaccination
  linkCont: $('.link_container'),

  // vaccination popup container
  vaccinationPopupCont: $('#vaccination_popup'),

  // setup the html containers
  setupInfoContainers: function () {
    vaxiMap.warnCont.hide();
    vaxiMap.linkCont.hide();
    var mapOffset = $('.map_container').offset();
    vaxiMap.offsetX = mapOffset.left;
    vaxiMap.offsetY = mapOffset.top;
    // this function fixes the position of the tooltip if it gets overrun by the mouse (which causes a mouseout event on the map polygon)
    if (vaxiMap.mobileDevice == '') {
      vaxiMap.warnCont.mouseover(function (evt) {
        vaxiMap.mouseY = evt.pageY - vaxiMap.offsetY - vaxiMap.warnCont.outerHeight() - 31;
        $(this).css({
          top: vaxiMap.mouseY
        });
      });
    }

    // toggle hover state on the links
    vaxiMap.linkCont.find('h3')
      .hover(
        function () {
          $(this).addClass('active');
        }, function () {
          $(this).removeClass('active');
        });
    vaxiMap.linkCont
      .mouseleave(function () {
        vaxiMap.linkCont.hide();
      });

    // setup close handler for the vaccination popup
    $('#vaccination_popup .close').click(function () {
      vaxiMap.vaccinationPopupCont.hide();

    });

    // attach close event handler for the warning container
    if (vaxiMap.mobileDevice != '') {
      vaxiMap.warnCont.append(vaxiMap.linkCont);
      var close = '<div class="close">X</div>';
      vaxiMap.warnCont.append(close);
      vaxiMap.warnCont.children('.close').click(function () {
        vaxiMap.warnCont.hide();
        vaxiMap.currentPolygon.setOptions({
          fillOpacity: vaxiMap.regionFillOpacity
        });

      });


      $('#map_canvas').bind('click.regionClick', function (evt) {
        vaxiMap.mouseY = evt.pageY - vaxiMap.offsetY - vaxiMap.warnCont.outerHeight();
        vaxiMap.mouseX = evt.pageX - vaxiMap.offsetX - 100;
        vaxiMap.warnCont.css({
          top: vaxiMap.mouseY,
          left: vaxiMap.mouseX
        });

        //console.log(region[0] + ', lng/x: ' + e.latLng.lng() + '/' + evt.pageX + 'lat/y: ' + e.latLng.lng() + '/' + evt.pageY);
      });

    }

  },

  // parse the news from the news xml
  parseNews: function (section) {
    var travelNews = vaxiMap.travelNewsXml.getElementsByTagName('item');
    for (var i = 0; i < travelNews.length; i++) {
      var title = travelNews[i].getElementsByTagName('title')[0].childNodes[0].nodeValue;
      var desc = travelNews[i].getElementsByTagName('description')[0].childNodes[0].nodeValue;
      var link = travelNews[i].getElementsByTagName('link')[0].childNodes[0].nodeValue;
      vaxiMap.travel.news.push([title, desc, link]);
    }
    var fluNews = vaxiMap.fluNewsXml.getElementsByTagName('item');
    for (var i = 0; i < fluNews.length; i++) {
      var title = fluNews[i].getElementsByTagName('title')[0].childNodes[0].nodeValue;
      var desc = fluNews[i].getElementsByTagName('description')[0].childNodes[0].nodeValue;
      var link = fluNews[i].getElementsByTagName('link')[0].childNodes[0].nodeValue;
      vaxiMap.flu.news.push([title, desc, link]);
    }
    var pertussisNews = vaxiMap.pertussisNewsXml.getElementsByTagName('item');
    for (var i = 0; i < pertussisNews.length; i++) {
      var title = pertussisNews[i].getElementsByTagName('title')[0].childNodes[0].nodeValue;
      var desc = pertussisNews[i].getElementsByTagName('description')[0].childNodes[0].nodeValue;
      var link = pertussisNews[i].getElementsByTagName('link')[0].childNodes[0].nodeValue;
      vaxiMap.pertussis.news.push([title, desc, link]);
    }
  },


  // setup the news listing on the map
  setupNewsContainer: function () {

    // load the travel news
    var travelItems = '';
    $('.map_container').append('<div id="news_container" class="news_container"></div>');
    for (var i = 0; i < vaxiMap.travel.news.length; i++) {
      travelItems += '<div class="news_item"><h2>' + vaxiMap.travel.news[i][0] + '</h2>' +
        '<p>' + vaxiMap.travel.news[i][1] + '</p><a href="' + vaxiMap.travel.news[i][2] + '">...more</a></div>';
    }
    var travelNews = '<div id="travel" class="news"><h1>Travel News</h1><div class="news_items">' + travelItems + '</div></div>';
    $('.news_container').append(travelNews);

    // load the flu news
    var fluItems = '';
    for (var i = 0; i < vaxiMap.flu.news.length; i++) {
      fluItems += '<div class="news_item"><h2>' + vaxiMap.flu.news[i][0] + '</h2>' +
        '<p>' + vaxiMap.flu.news[i][1] + '</p><a href="' + vaxiMap.flu.news[i][2] + '">...more</a></div>';
    }
    var fluNews = '<div id="flu" class="news"><h1>Flu News</h1><div class="news_items">' + fluItems + '</div></div>';
    $('.news_container').append(fluNews);

    // load the pertussis news
    var pertussisItems = '';
    for (var i = 0; i < vaxiMap.pertussis.news.length; i++) {
      pertussisItems += '<div class="news_item"><h2>' + vaxiMap.pertussis.news[i][0] + '</h2>' +
        '<p>' + vaxiMap.pertussis.news[i][1] + '</p><a href="' + vaxiMap.pertussis.news[i][2] + '">...more</a></div>';
    }
    var pertussisNews = '<div id="pertussis" class="news"><h1>Pertussis News</h1><div class="news_items">' + pertussisItems + '</div></div>';
    $('.news_container').append(pertussisNews);


    // show the first news by default
    $('.news_container .news').eq(0).fadeIn(600);

    // add show/ hide to the news header
    $('.news h1').click(function () {
      if ($('.news_items:visible').length > 0) {
        $(this).removeClass('active');
        $('.news_items').slideUp(400);
      } else {
        $(this).addClass('active');
        $('.news_items').slideDown(400);
      }
    });
    $('.news h1').dblclick(function () {
      alert('you have double clicked!!');
    });

    // add linking functionality to the news items
    $('.news .news_item').click(function () {
      var lnk = $(this).children('a').attr('href');
      var conf = confirm("Are you sure you want to go to: " + lnk);
      if (conf) {
        window.location.href = lnk;
      } else {
        // nothing
      }
    });
    if (vaxiMap.orientation == 'landscape') {
      $('.news_items').height('727px');
    }

  },

  // function that swaps the news being shown
  showNews: function (id) {
    id = id.toLowerCase();
    var newsItemsShowing = false;
    if ($('.news_container .news:visible .news_items:visible').length > 0) {
      newsItemsShowing = true;
    }
    $('.news_container .news:visible').fadeOut(400, function () {
      if (newsItemsShowing) {
        $('#' + id + ' .news_items').show();
      } else {
        $('#' + id + ' .news_items').hide();
      }
      $('#' + id).fadeIn(400);
    });
  },

  // store the mouse position for use when user clicks the map - so we can pass it to jQuery and show the links container in the right place
  mouseX: 0,
  mouseY: 0,

  // store the offset position of the map container (to keep the bubble in the right place
  offsetX: 0,
  offsetY: 0,

  // current polygon being viewed
  currentPolygon: 0,

  // attach the polygon event handlers
  // - mouseover of the polygon to show tooltip
  attachTravelRegionEventHandlers: function (section, region, polygon, map) {
    google.maps.event.addListener(polygon, 'mouseover', function (e) {
      //console.log('mouseover');
      $('#map_canvas').bind('mousemove.regionMove', function (evt) {
        vaxiMap.mouseY = evt.pageY - vaxiMap.offsetY - vaxiMap.warnCont.outerHeight() - 35;
        vaxiMap.mouseX = evt.pageX - vaxiMap.offsetX - 100;
        vaxiMap.warnCont.css({
          top: vaxiMap.mouseY,
          left: vaxiMap.mouseX
        });
        //console.log(region[0] + ', lng/x: ' + e.latLng.lng() + '/' + evt.pageX + 'lat/y: ' + e.latLng.lng() + '/' + evt.pageY);
      });
      vaxiMap.warnCont.children('h2').text(region.name).end().children('h3').text(section.warningLevels[region.level][0]).end().show();
      if (section.name == "flu") {
        vaxiMap.warnCont.children('h4').text('Calculated by cases of the flu for the last 2 months compared to the 2 year average');
      }
      if (section.name == "pertussis") {
        vaxiMap.warnCont.children('h3').append(' - ' + region.score);
        vaxiMap.warnCont.children('h4').text('Number of notifications of diseases received from State and Territory health authorities in the month 1 December to 31 December 2010');
      }
      polygon.setOptions({
        fillOpacity: vaxiMap.hoverFillOpacity
      });

    });
    // - mouseout of the polygon to hide tooltip
    google.maps.event.addListener(polygon, 'mouseout', function (e) {
      $('#map_canvas').unbind('mousemove.regionMove');
      vaxiMap.warnCont.hide();

      polygon.setOptions({
        fillOpacity: vaxiMap.regionFillOpacity
      });
    });
    // - click the polygon to show links
    google.maps.event.addListener(polygon, 'click', function (e) {
      if (vaxiMap.selectedMap == 'travel') {
        //vaxiMap.warnCont.hide();
        vaxiMap.linkCont.find('#smart_traveller').unbind('click');
        vaxiMap.linkCont.find('#smart_traveller').click(function () {
          var conf = confirm("You are about to leave this site. This link is provided for information purposes only. You should be aware that sanofi-aventis is not responsible for this external web site (" + region.link + "). Do you wish to proceed?");
          if (conf) {
            window.open(region.link, "smartTraveller");
          } else {
            vaxiMap.linkCont.hide();
          }
        });
        vaxiMap.linkCont.find('#traveller_help').unbind('click');
        vaxiMap.linkCont.find('#traveller_help').click(function () {
          if (region.id !== undefined) {
            var countryID = 'CountryID=' + region.id;
            console.log(countryID);
            $.ajax({
              type: 'POST',
              url: 'http://dev.hcpportal.phcserv.com/flash/proxy.php?http://travellers-help.com/home.cfm?page=4&destination=1',
              data: countryID
            });
          }
        });
        if (region.vaccination !== undefined) {
          var data = region.vaccination;
          console.log(data);
          vaxiMap.vaccinationPopupCont.find('.data').html(data);
          // unbind previous click events
          vaxiMap.linkCont.find('#vaccination').unbind('click');
          // attach click handler to the vaccination link
          vaxiMap.linkCont.find('#vaccination').click(function () {
            var x = $('.map_container').outerWidth() / 2 - 100;
            var y = $('.map_container').outerHeight() / 2 - 50;
            vaxiMap.vaccinationPopupCont.css({
              top: y,
              left: x
            }).show();
            vaxiMap.linkCont.hide();
          });

        }
        vaxiMap.linkCont.css({
          top: vaxiMap.mouseY + 70,
          left: vaxiMap.mouseX + 20
        }).show();
      } else if (vaxiMap.selectedMap == 'flu') {
        var conf = confirm("You are about to leave this site. This link is provided for information purposes only. You should be aware that sanofi-aventis is not responsible for this external web site (" + region.link + "). Do you wish to proceed?");
        if (conf) {
          window.open(region.link, "googleFluTrends");
        } else {
          vaxiMap.linkCont.hide();
        }
      } else if (vaxiMap.selectedMap == 'pertussis') {
        var conf = confirm("You are about to leave this site. This link is provided for information purposes only. You should be aware that sanofi-aventis is not responsible for this external web site (" + region.link + "). Do you wish to proceed?");
        if (conf) {
          window.open(region.link, "ausGov");
        } else {
          vaxiMap.linkCont.hide();
        }
      }
    });
  },



  // THIS IS FOR IPAD
  // attach the polygon event handlers
  // - mouseover of the polygon to show tooltip
  attachTravelRegionEventHandlersIPad: function (section, region, polygon, map) {
    google.maps.event.addListener(polygon, 'click', function (e) {
      //console.log('mouseover');
      if (vaxiMap.currentPolygon !== 0) {
        vaxiMap.currentPolygon.setOptions({
          fillOpacity: vaxiMap.regionFillOpacity
        });
      }
      vaxiMap.warnCont.children('h2').text(region.name).end().children('h3').text(section.warningLevels[region.level][0]).end().show();
      if (section.name == "flu") {
        vaxiMap.warnCont.children('h4').text('Calculated by cases of the flu for the last 2 months compared to the 2 year average');
      }
      if (section.name == "pertussis") {
        vaxiMap.warnCont.children('h3').append(' - ' + region.score);
        vaxiMap.warnCont.children('h4').text('Number of notifications of diseases received from State and Territory health authorities in the month 1 December to 31 December 2010');
      }
      polygon.setOptions({
        fillOpacity: vaxiMap.hoverFillOpacity
      });
      vaxiMap.currentPolygon = polygon;
      if (vaxiMap.selectedMap == 'travel') {
        vaxiMap.linkCont.find('#smart_traveller').unbind('click');

        vaxiMap.linkCont.find('#smart_traveller').click(function () {
          var conf = confirm("You are about to leave this site. This link is provided for information purposes only. You should be aware that sanofi-aventis is not responsible for this external web site (" + region.link + "). Do you wish to proceed?");
          if (conf) {
            window.open(region.link, "smartTraveller");
          } else {
            vaxiMap.warnCont.hide();
          }
          polygon.setOptions({
            fillOpacity: vaxiMap.regionFillOpacity
          });
          vaxiMap.linkCont.find('#smart_traveller').unbind('click');
        });
        if (region.vaccination !== undefined) {
          var data = region.vaccination;
          console.log(data);
          vaxiMap.vaccinationPopupCont.find('.data').html(data);
          // unbind previous click events
          vaxiMap.linkCont.find('#vaccination').unbind('click');
          // attach click handler to the vaccination link
          vaxiMap.linkCont.find('#vaccination').click(function () {
            vaxiMap.warnCont.hide();
            var x = $('.map_container').outerWidth() / 2 - 100;
            var y = $('.map_container').outerHeight() / 2 - 50;
            vaxiMap.vaccinationPopupCont.css({
              top: y,
              left: x
            }).show();
            vaxiMap.linkCont.hide();
            polygon.setOptions({
              fillOpacity: vaxiMap.regionFillOpacity
            });

          });
          vaxiMap.linkCont.find('#traveller_help').unbind('click');
          vaxiMap.linkCont.find('#traveller_help').click(function () {
            if (region.id !== undefined) {
              var countryID = 'CountryID=' + region.id;
              console.log(countryID);
              $.ajax({
                type: 'POST',
                url: 'http://dev.hcpportal.phcserv.com/flash/proxy.php?http://travellers-help.com/home.cfm?page=4&destination=1',
                data: countryID
              });
            }
          });
        }

      } else if (vaxiMap.selectedMap == 'flu') {
        vaxiMap.linkCont.children('h3').remove();
        var newlink = '<h3>Go to Google Flu trends</h3>';
        vaxiMap.linkCont.append(newlink);
        vaxiMap.linkCont.children('h3').click(function () {
          var conf = confirm("You are about to leave this site. This link is provided for information purposes only. You should be aware that sanofi-aventis is not responsible for this external web site (" + region.link + "). Do you wish to proceed?");
          if (conf) {
            window.open(region.link, "googleFluTrends");
          } else {
            vaxiMap.warnCont.hide();
          }
        });
        vaxiMap.linkCont.css({
          top: vaxiMap.mouseY + 70,
          left: vaxiMap.mouseX + 20
        }).show();

      } else if (vaxiMap.selectedMap == 'pertussis') {
        vaxiMap.linkCont.children('h3').remove();
        var newlink = '<h3>Go to National Notifiable Diseases Surveillance System</h3>';
        vaxiMap.linkCont.append(newlink);
        vaxiMap.linkCont.children('h3').click(function () {
          var conf = confirm("You are about to leave this site. This link is provided for information purposes only. You should be aware that sanofi-aventis is not responsible for this external web site (" + region.link + "). Do you wish to proceed?");
          if (conf) {
            window.open(region.link, "ausGov");
          } else {
            vaxiMap.warnCont.hide();
          }
        });
        vaxiMap.linkCont.css({
          top: vaxiMap.mouseY + 70,
          left: vaxiMap.mouseX + 20
        }).show();

      }

    });

  },




  regionScaleLevels: [],

  // function that parses the warning levels and their colours from the xml
  getLevels: function () {
    var travelLevels = vaxiMap.dataXml.getElementsByTagName('linear-region-scale')[0].getElementsByTagName('region-scale-level');
    var travelbars = '';
    var tLen = travelLevels.length;
    for (var i = 0; i < tLen; i++) {
      vaxiMap.travel.warningLevels[i] = [travelLevels[i].getAttribute('label'),
        '#' + travelLevels[i].getAttribute('colour').substr(2)];
      travelbars += '<div class="bar">' + travelLevels[tLen - 1 - i].getAttribute('label') + '</div>';
    }

    var fluLevels = vaxiMap.dataXml.getElementsByTagName('adaptive-region-score-scale')[0].getElementsByTagName('region-scale-level');
    var flubars = '';
    var fLen = fluLevels.length;
    for (var i = 0; i < fluLevels.length; i++) {
      vaxiMap.flu.warningLevels[i] = [fluLevels[i].getAttribute('label'),
        '#' + fluLevels[i].getAttribute('colour').substr(2)];
      flubars += '<div class="bar">' + fluLevels[fLen - 1 - i].getAttribute('label') + '</div>';
    }

    var pertussisLevels = vaxiMap.dataXml.getElementsByTagName('adaptive-region-score-scale')[1].getElementsByTagName('region-scale-level');
    var pertussisbars = '';
    var pLen = pertussisLevels.length;
    for (var i = 0; i < pertussisLevels.length; i++) {
      vaxiMap.pertussis.warningLevels[i] = [pertussisLevels[i].getAttribute('label'),
        '#' + pertussisLevels[i].getAttribute('colour').substr(2)];
      pertussisbars += '<div class="bar">' + pertussisLevels[pLen - 1 - i].getAttribute('label') + '</div>';
    }
    travelbars = '<div class="travel bars">' + travelbars + '</div>';
    flubars = '<div class="flu bars">' + flubars + '</div>';
    pertussisbars = '<div class="pertussis bars">' + pertussisbars + '</div>';
    var allbars = travelbars + flubars + pertussisbars;
    $('.colorbar').append(allbars).delay(1000).fadeIn(300, function () {
      $('.colorbar .travel').fadeIn(400);
    });

  },

  // function that swaps the color bars - warning level color code key
  swapColorBars: function (mapSection) {
    $('.bars:visible').fadeOut(200, function () {
      $('.' + mapSection).fadeIn(400);
    });

  },

  // function that gets the regions list for the travel map
  getRegions: function (mapSection) {
    var sections = vaxiMap.dataXml.getElementsByTagName('section');
    for (var i = 1; i < sections.length; i++) {
      if (sections[i].getAttribute('id').toLowerCase() === mapSection) {
        var regions = sections[i].getElementsByTagName('map-region');
        for (var j = 0; j < regions.length; j++) {
          var name = regions[j].getAttribute('name');
          var compactName = name.replace(/[^\w]/g, "");
          vaxiMap[mapSection].regions[compactName] = {};
          vaxiMap[mapSection].regions[compactName].name = name;
          if (regions[j].getAttribute('code')) {
            vaxiMap[mapSection].regions[compactName].link = "http://www.google.org/flutrends/" + regions[j].getAttribute('code');
          }
        }
      }
    }
  },


  // object that stores all the travel section regions (names) and warnings
  travel: {
    name: 'travel',

    // an array that holds the region names for the travel section of the map
    regions: {},

    // array that holds the various warning levels and their colours
    warningLevels: [],

    // array holding the news
    news: [],

    // map settings for the map section
    mapSettings: {
      zoom: 2,
      lat: 0,
      lng: 0
    }
  },

  // object that stores all the flu regions (names), and warnings
  flu: {
    name: 'flu',

    // an array that holds the region names for the travel section of the map
    regions: {},

    // array that holds the various warning levels and their colours
    warningLevels: [],

    // array holding the news
    news: [],

    // map settings for the map section
    mapSettings: {
      zoom: 2,
      lat: 0,
      lng: 0
    },
    // set high so that a real score will be less
    minScore: 10000,

    // set low so that a real score will be more
    maxScore: 0

  },
  pertussis: {
    name: 'pertussis',

    // an array that holds the region names for the travel section of the map
    regions: {},

    // array that holds the various warning levels and their colours
    warningLevels: [],

    // array holding the news
    news: [],

    // map settings for the map section
    mapSettings: {
      zoom: 3,
      lat: -27,
      lng: 133
    },

    // set high so that a real score will be less
    minScore: 10000,

    // set low so that a real score will be more
    maxScore: 0

  },

  // geometry object
  regionGeometry: {},

  // get the landMasses for each region in the geometry library
  getLandMasses: function (node) {
    var nodes = node.getElementsByTagName("land-mass");
    var items = {};
    items.points = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      items.points.push(node.getAttribute("encoded-points").split('|'));
      for (var j = 0; j < items.points[i].length; j++) {
        items.points[i][j] = items.points[i][j].split(',');
      }
    }
    if (node.getAttribute("single-mass-points-from-string")) {
      items.points.push(node.getAttribute("single-mass-points-from-string").split('|'));
      for (var k = 0; k < items.points[items.points.length - 1].length; k++) {
        items.points[items.points.length - 1][k] = items.points[items.points.length - 1][k].split(',');
      }
    }
    return items;
  },

  // get the regions in the geometry library
  getRegionGeometry: function (nodes) {
    var items = {};
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var item = new Object();
      item.name = node.getAttribute("region-name").replace(/[^\w]/g, "");
      item.landMasses = vaxiMap.getLandMasses(node);
      items[item.name] = item;
    }
    return items;
  },

  // function that parses the basic info from the data xml
  parseVaxiData: function () {
    // load all the geometry
    vaxiMap.regionGeometry = vaxiMap.getRegionGeometry(vaxiMap.dataXml.getElementsByTagName("region-geometry"));

    // load the regions list for the travel map
    vaxiMap.getRegions("travel");

    // load the regions list for the flu map
    vaxiMap.getRegions("flu");

    // load the regions list for the pertussis map
    vaxiMap.getRegions("pertussis");

    // load the traveller help ids
    vaxiMap.parseTravellerHelpIds();

    // load the vaccination data
    vaxiMap.parseVaccination();


    // load default map settings
    vaxiMap.getMapSettings();

    // get the warning levels for the maps
    vaxiMap.getLevels();

    // load the map sections
    vaxiMap.getMapSections();

  },

  // function that loads the default map settings for each type of map
  getMapSettings: function () {
    vaxiMap.travel.mapSettings.zoom = parseInt(vaxiMap.dataXml.getElementsByTagName('map-setup')[0].getAttribute('initial-zoom'));
    vaxiMap.travel.mapSettings.lat = vaxiMap.dataXml.getElementsByTagName('map-setup')[0].getElementsByTagName('lat-long')[0].getAttribute('latitude');
    vaxiMap.travel.mapSettings.lng = vaxiMap.dataXml.getElementsByTagName('map-setup')[0].getElementsByTagName('lat-long')[0].getAttribute('longitude');
    vaxiMap.flu.mapSettings.zoom = parseInt(vaxiMap.dataXml.getElementsByTagName('map-setup')[1].getAttribute('initial-zoom'));
    vaxiMap.flu.mapSettings.lat = vaxiMap.dataXml.getElementsByTagName('map-setup')[1].getElementsByTagName('lat-long')[0].getAttribute('latitude');
    vaxiMap.flu.mapSettings.lng = vaxiMap.dataXml.getElementsByTagName('map-setup')[1].getElementsByTagName('lat-long')[0].getAttribute('longitude');
    vaxiMap.pertussis.mapSettings.zoom = parseInt(vaxiMap.dataXml.getElementsByTagName('map-setup')[2].getAttribute('initial-zoom'));
    vaxiMap.pertussis.mapSettings.lat = vaxiMap.dataXml.getElementsByTagName('map-setup')[2].getElementsByTagName('lat-long')[0].getAttribute('latitude');
    vaxiMap.pertussis.mapSettings.lng = vaxiMap.dataXml.getElementsByTagName('map-setup')[2].getElementsByTagName('lat-long')[0].getAttribute('longitude');
  },

  // array of all the map types
  mapTypes: [],


  // function that gets the map types
  getMapSections: function () {
    var sections = vaxiMap.dataXml.getElementsByTagName('section');
    for (var i = 1; i < sections.length; i++) {
      var sectionName = sections[i].getAttribute('id');
      vaxiMap.mapTypes.push(sectionName);
    }
    vaxiMap.selectedMap = vaxiMap.mapTypes[0];
    vaxiMap.createMapLabels();
  },

  // display the map labels
  createMapLabels: function () {
    var labelDivs = '';
    labelDivs += '<a class="map_label active">' + vaxiMap.mapTypes[0] + '</a>';
    for (var i = 1; i < vaxiMap.mapTypes.length; i++) {
      labelDivs += '<a class="map_label">' + vaxiMap.mapTypes[i] + '</a>';
    }
    var mapLabelCont = '<div class="map_label_container">' + labelDivs + '</div>';
    $('.map_container').append(mapLabelCont);
    $('.map_label').click(function () {
      var mapSection = $(this).text();
      vaxiMap.selectedMap = mapSection;
      $('.map_label').removeClass('active');
      $(this).addClass('active');
      vaxiMap.removeRegionPolygons();
      $('.loading').show();
      vaxiMap.loadRegions(vaxiMap[mapSection], function () {
        $('.loading').hide();
      });

      vaxiMap.swapColorBars(mapSection);
      vaxiMap.showNews(mapSection);
    });
  },

  // parse traveller help Ids
  parseVaccination: function () {
    var regions = vaxiMap.dataXml.getElementsByTagName('traveller-help-country');
    for (var i = 0; i < regions.length; i++) {
      var name = $(regions[i]).attr('name').replace(/[^\w]/g, "");
      var id = $(regions[i]).attr('url-id');
      if (vaxiMap.travel.regions[name] !== undefined) {
        vaxiMap.travel.regions[name].id = id;
      }
    }
  },

  // parse traveller help Ids
  parseTravellerHelpIds: function () {
    var regions = vaxiMap.dataXml.getElementsByTagName('vaccination-data');
    for (var i = 0; i < regions.length; i++) {
      var name = $(regions[i]).attr('country-name').replace(/[^\w]/g, "");
      var data = $(regions[i]).attr('data');
      if (vaxiMap.travel.regions[name] !== undefined) {
        vaxiMap.travel.regions[name].vaccination = data;
      }
    }
  },


  // function that parses the warnings from the warning xml
  // -  also calls the function to setup the map
  parseTravelWarnings: function () {
    var warnings = vaxiMap.warningsXml.getElementsByTagName('item');
    for (var i = 0; i < warnings.length; i++) {
      // this is faster but some of the titles don't match the region-names
      //var title = warnings[i].getElementsByTagName('title')[0].childNodes[0].nodeValue.replace(/[^\w]/g, "");
      var title = $(warnings[i]).find("[nodeName='dc:coverage']").first().text().replace(/[^\w]/g, "");
      var link = warnings[i].getElementsByTagName('link')[0].childNodes[0].nodeValue;
      var $level = $(warnings[i]).find("[nodeName='ta:level']").first();
      var level = 1;
      if ($level.length > 0) {
        level = parseInt($level.text().substr(0, 1));
      }
      if (vaxiMap.travel.regions[title]) {
        vaxiMap.travel.regions[title].level = level - 1;
        vaxiMap.travel.regions[title].link = link;
      }
    }
  },


  // function that parses the flu warnings from the warning xml
  // -  also calls the function to setup the map
  parseFluWarnings: function () {
    var fluWarningsLen = vaxiMap.fluWarnings.length;
    var scores = vaxiMap.fluWarnings[fluWarningsLen - 2];
    var count = 1;
    var countries = vaxiMap.fluWarnings[0];
    console.log(countries);
    //for (var key in vaxiMap.flu.regions) {
    //if (vaxiMap.flu.regions.hasOwnProperty(key)) {
    for (i = 1; i < countries.length; i++) {
      var countryName = countries[i].replace(/[^\w]/g, "");
      var avgScoreLastTwoMonths = vaxiMap.getFluAvgScore(count, 8);
      var avgScoreLastTwoYears = vaxiMap.getFluAvgScore(count, 104);
      var regionScore = avgScoreLastTwoMonths / avgScoreLastTwoYears;
      vaxiMap.flu.minScore = Math.min(vaxiMap.flu.minScore, regionScore);
      vaxiMap.flu.maxScore = Math.max(vaxiMap.flu.maxScore, regionScore);
      vaxiMap.flu.regions[countryName].worldMapScore = regionScore;
      count++;
      //}
    }
    var levels = vaxiMap.flu.warningLevels.length - 1;
    console.log('levels: ' + levels);
    var minScore = vaxiMap.flu.minScore;
    var maxScore = vaxiMap.flu.maxScore;
    for (i = 1; i < countries.length; i++) {
      var countryName = countries[i].replace(/[^\w]/g, "");
      vaxiMap.flu.regions[countryName].level = Math.floor(((vaxiMap.flu.regions[countryName].worldMapScore - minScore) / (maxScore - minScore)) * levels);
    }
  },

  getFluAvgScore: function (countryIndex, weeksRange) {
    var weeksRange = weeksRange || 8;
    var fluWarningsLen = vaxiMap.fluWarnings.length;
    var dateInRange = true;
    var index = 2;
    var curScore = 0;
    var avgScore = 0;
    var rawTotal = 0;
    var scoreCount = 0;
    while (dateInRange) {
      scoreCount++;
      curScore = parseInt(vaxiMap.fluWarnings[fluWarningsLen - index][countryIndex]);
      rawTotal = rawTotal + curScore;
      avgScore = rawTotal / scoreCount;
      //console.log('after score[' + countryIndex + ']: ' + avgScore + '; current score: ' + curScore + '; scoreCount: ' + scoreCount + ', raw total: ' + rawTotal);
      if (scoreCount < weeksRange) {
        dateInRange = true;
      } else {
        dateInRange = false;
      }
      index++;
    }
    return avgScore;

  },

  // function that parses the warnings from the warning xml
  // -  also calls the function to setup the map
  parsePertussisWarnings: function () {
    var scores = vaxiMap.dataXml.getElementsByTagName('section')[3].getElementsByTagName('simple-region-score-provider')[0].getElementsByTagName('region-score');
    var scoreArray = [];
    for (var i = 0; i < scores.length; i++) {
      scoreArray.push(parseInt(scores[i].getAttribute('score')));
      vaxiMap.pertussis.minScore = Math.min(scoreArray[i], vaxiMap.pertussis.minScore);
      vaxiMap.pertussis.maxScore = Math.max(scoreArray[i], vaxiMap.pertussis.maxScore);
    }
    var minScore = vaxiMap.pertussis.minScore;
    var maxScore = vaxiMap.pertussis.maxScore;
    var levels = vaxiMap.pertussis.warningLevels.length - 1;
    for (var i = 0; i < scores.length; i++) {
      var regionName = scores[i].getAttribute('region-name').replace(/[^\w]/g, "");
      vaxiMap.pertussis.regions[regionName].score = scoreArray[i];
      vaxiMap.pertussis.regions[regionName].level = Math.round(((scoreArray[i] - minScore) / (maxScore - minScore)) * levels);
      vaxiMap.pertussis.regions[regionName].link = 'http://www9.health.gov.au/cda/source/Rpt_1_sel_A.cfm';
    }
  }
}
/*
regionRatio = (regionScore – minRegionScore) / (maxRegionScore – minRegionScore);
regionLevel = Math.round(numLevels * regionRatio)

*/
/* END OF VAXIMAP OBJECT */

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function (from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};


// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray(strData, strDelimiter) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
			(
  // Delimiters.
				"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

  // Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

  // Standard fields.
				"([^\"\\" + strDelimiter + "\\r\\n]*))"
			),
			"gi"
			);


  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;


  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec(strData)) {

    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (
				strMatchedDelimiter.length &&
				(strMatchedDelimiter != strDelimiter)
				) {

      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);

    }


    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {

      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      var strMatchedValue = arrMatches[2].replace(
					new RegExp("\"\"", "g"),
					"\""
					);

    } else {

      // We found a non-quoted value.
      var strMatchedValue = arrMatches[3];

    }


    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
  return (arrData);
}
