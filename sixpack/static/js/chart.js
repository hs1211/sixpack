var Chart;
$(function () {

  Chart = function (experiment, callback) {
    var that = {}, my = {};

    my.el = null;
    my.experiment = experiment;
    my.callback = callback;

    my.getMeasurements = function () {
      my.margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
      };
      my.width = my.el.width();
      my.height = my.el.height();
      my.xScale = d3.time.scale().range([0, my.width]);
      my.yScale = d3.scale.linear().range([my.height, 0]);
    };

    my.drawLabels = function (data) {
      var xValues, yValues, yMin, yMax;

      xValues = _.map(data, function (d) {
        return d[0];
      });
      yValues = _.map(data, function (d) {
        return parseFloat(d[1]);
      });
      yMin = _.min(yValues);
      yMax = _.max(yValues);
      yValues = [yMin, ((yMax - yMin) * 0.5) + yMin, yMax];

      my.xAxis = d3.svg.axis()
        .scale(my.xScale)
        .ticks(4)
        .tickSize(0)
        .tickValues(xValues)
        .orient("bottom");

      my.yAxis = d3.svg.axis()
        .scale(my.yScale)
        .ticks(yValues.length)
        .tickValues(yValues)
        .tickSize(0)
        .tickFormat(d3.format(".1%"))
        .orient("left");
    };

    my.drawLine = function (data, color) {
      color = color || "#9d5012";
      var line = d3.svg.line()
        .x(function (d) {
          return my.xScale(d.date);
        })
        .y(function (d) {
          return my.yScale(d.close);
        });

      my.svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line)
        .attr("style", "stroke:" + color);
    };

    my.drawArea = function (data) {
      var area = d3.svg.area()
        .x(function (d) {
          return my.xScale(d.date);
        })
        .y0(my.height)
          .y1(function (d) {
          return my.yScale(d.close);
        });

      my.svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);
    };

    // Compose a D3-friendly data structure
    my.formatChartData = function (rates) {
      return rates.map(function (d) {
        return {
          date: d3.time.format("%Y-%m-%d").parse(d[0]),
          close: d[1]
        };
      });
    };

    my.drawBase = function () {
      my.svg = d3.select('#' + my.el.attr('id')).append("svg")
        .attr("width", my.width + my.margin.left + my.margin.right)
        .attr("height", my.height + my.margin.top + my.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + my.margin.left + "," + my.margin.top + ")");
    };

    my.drawBackground = function (data) {
      my.xScale.domain(d3.extent(data, function (d) {
        return d.date;
      }));

      my.yScale.domain(d3.extent(data, function (d) {
        return d.close;
      }));

      my.svg.append("g")
        .attr("class", "y axis")
        .call(my.yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end");

      my.svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + my.height + ")")
        .call(d3.svg.axis()
          .scale(my.xScale)
          .orient("bottom")
          .ticks(data.length)
        .tickSize(-my.height, 0, 0)
        .tickFormat(""));
    };

    my.dataExists = function (data) {
      if (data.rate_data.length <= 2) {
        my.el.append("<p>Not enough data to chart</p>");
        return false;
      }
      return true;
    };

    my.getData = function (callback) {
      var url = '/experiment/' + my.experiment + '.json?period=day';
      $.getJSON(url, function (data) {
        var alternatives = {};
        var cumulative = {
          participants: 0,
          conversions: 0
        };
        var rate_data = [];
        var rate = 0;

        _.each(data.alternatives, function (alt, k) {
          cumulative.participants = 0;
          cumulative.conversions = 0;
          rate_data = [];

          _.each(alt.data, function (period) {
            cumulative.participants += period.participants;
            cumulative.conversions += period.conversions;

            rate = Number(cumulative.conversions / cumulative.participants).toFixed(5);
            if (isNaN(rate)) rate = 0.00;
            rate_data.push([period.date, rate]);
          });

          alternatives[alt.name] = {
            'rate_data': rate_data,
            'd3_data': my.formatChartData(rate_data)
          };
        });

        callback(alternatives);
      });
    };


    that.drawExperiment = function (experiment_name, colors) {
      my.el = $('#chart-' + experiment_name);

      // Get the aggregate data intervals for drawing labels + background
      var aggregate_rates = [];
      _.each(my.data, function (alt, k) {
        _.each(alt.rate_data, function (rate, k) {
          aggregate_rates.push(rate);
        });
      });

      var data_intervals = _.uniq(_.map(aggregate_rates, function (d, k) {
        return d[0];
      }));

      var min_rate = _.min(_.map(aggregate_rates, function (n) {
        return parseFloat(n[1]);
      }));

      var max_rate = _.max(_.map(aggregate_rates, function (n) {
        return parseFloat(n[1]);
      }));

      var rate_data = _.map(data_intervals, function (date, index) {
        return [date, min_rate];
      });
      rate_data[0][1] = max_rate;

      var data = {
        rate_data: rate_data,
        d3_data: my.formatChartData(rate_data)
      };

      if (!my.dataExists(data)) return;

      my.getMeasurements();
      my.drawBase();
      my.drawLabels(data.rate_data);
      my.drawBackground(data.d3_data);

      var i = 0;
      _.each(my.data, function (data) {
        my.drawLine(data.d3_data, colors[i]);
        i++;
      });
    };

    that.drawAlternative = function (alternative_name, color) {
      var data = my.data[alternative_name];
      my.el = $('#chart-' + alternative_name);
      if (!my.dataExists(data)) return;

      my.getMeasurements();
      my.drawBase();
      my.drawLabels(data.rate_data);
      my.drawBackground(data.d3_data);
      my.drawLine(data.d3_data, color);
      my.drawArea(data.d3_data);
    };

    my.getData(function (data) {
      my.data = data;
      my.callback();
    });

    return that;
  };

});