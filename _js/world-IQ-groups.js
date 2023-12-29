Promise.all([
  d3.json("/_data/world-atlas/countries-" + localResolution + ".json"),
  d3.tsv("/_data/world-atlas/mIQ.tsv"),
]).then(function([world, mIQ]) {
  var IQ_threshold = 11.7;
  var mIQ_map = {};
  mIQ.forEach(d => mIQ_map[d.ISO_A3] = parseFloat(d['QNW+SAS+GEO']));

  countries = topojson.feature(world, world.objects.countries);
  countrymesh = topojson.mesh(world, world.objects.countries); //, (a, b) => a !== b)

  const margin = {top: 0, right: 20, bottom: 0, left: 20};

  const width = 928;
  const height = width / 2;

  const svg_width = width + margin.left + margin.right;
  const svg_height = height + margin.top + margin.bottom;

  var svg = d3.select("#world-map-svg")
    .attr("width", svg_width)
    .attr("height", svg_height)
    .attr("viewBox", [0, 0,  svg_width, svg_height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
  var tooltip_div = document.getElementById('tooltip');
  tooltip_div.style.background = "white";

  const chart = svg.append("g")

  const type = "Sphere"
  const projection = d3.geoEqualEarth().fitSize([width, height], {type: type});
  const path = d3.geoPath(projection);

  chart.append("path")
    .datum({type: type})
    .attr("fill", "#dfefff")
    .attr("stroke", "none")
    .attr("d", path);

  var country_paths = chart.append("g")
    .selectAll("path")
    .data(countries.features)
    .join("path")
    .attr("d", path)
    .on("mouseover", function(d) {
        thiz = d3.select(this);
        hoverPath.attr('d', thiz.attr('d'));

        tooltip_div.style.display = "inline";
        p = d.target.__data__.properties
        var p_mIQ;
        if (mIQ_map[p.ISO_A3] == null) p_mIQ = null;
        else p_mIQ = mIQ_map[p.ISO_A3].toFixed(1)
        tooltip_div.innerHTML = p.name.trim() + "<br>mean IQ: " + p_mIQ + "<br>ISO_A3: " + p.ISO_A3;
        window.onmousemove = function (e) {
          var x = e.clientX,
              y = e.clientY;
          tooltip_div.style.left = (x + 20) + 'px';
          tooltip_div.style.top = (y + 20) + 'px';
        };
      })
    .on("mouseout", function(d){
        hoverPath.attr('d', "M0,0");
        tooltip_div.style.display = "none";
      })
    .on("click", function(d){
        thiz = d3.select(this);
        var ISO_A3 = d.target.__data__.properties.ISO_A3;
        paint_comparison(ISO_A3);
        thiz.attr("fill", "black");
      });
  
  country_paths.each(function(d) {
    IQ = mIQ_map[d.properties.ISO_A3];
    if (IQ == null) {
      d.fill="LightGray"
      mIQ_map[d.properties.iSO_A3] = null;
    }
    else d.fill="white";
  });
  country_paths.attr("fill", d => d.fill);

  function paint_comparison(ISO_A3){
    var upper = mIQ_map[ISO_A3] + IQ_threshold;
    var lower = mIQ_map[ISO_A3] - IQ_threshold;
    country_paths.each(function(d) {
      IQ = mIQ_map[d.properties.ISO_A3];
      if (IQ < lower) d.fill="orange";
      else if (IQ > upper) d.fill="royalblue";
      else if (IQ == null) d.fill="LightGray";
      else d.fill="white";
    });
    country_paths.attr("fill", d => d.fill);
  }

  chart.append("path")
    .datum(countrymesh)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("d", path);

  chart.append("path")
    .datum({type: type})
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("d", path);

  var hoverPath = chart.append('path')
    .attr("stroke-width", 2)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("class", "hoverOutline hoverPath")
    .attr("d","M0,0");
  
  function getParentSVG(thiz) {
    while (thiz.tagName != "svg") {
      thiz = thiz.parentNode;
    }
    return d3.select(thiz);
  }
  function zoomed(event) {
    svg = getParentSVG(this);
    svg.selectAll("svg > g, svg > path")
      .attr("transform", event.transform)
      .attr("stroke-width", 1/event.transform.k);
    hoverPath = svg.select(".hoverPath");
    hoverPath.attr("stroke-width", 2/event.transform.k);
  };
  var zoom = d3.zoom()
    .scaleExtent([1, maxScaleExtent])
    .translateExtent([[0,0],[width,height]])
    .extent([[0,0],[width,height]])
    .on("zoom", zoomed);
  svg.call(zoom)

  return svg.node();
} )