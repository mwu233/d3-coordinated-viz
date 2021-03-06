// Javascripts by Meiliu Wu, 2019

/*eslint-env jquery*/
/*eslint-disable no-extra-semi*/
/*eslint-disable no-unused-vars*/
/*eslint-disable no-undef*/
/*eslint-disable no-console*/
/*eslint-disable no-unreachable*/

/* Map of Average rating of satisfactions from EU Countries in 2013  */

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    
    //variable names, i.e., attributes of geofeatures 
    var attrArray = ["Satisfaction with financial situation", 
                     "Satisfaction with job", 
                     "Satisfaction with commuting time", 
                     "Satisfaction with time use", 
                     "Satisfaction with recreational and green areas",
                     "Satisfaction with living environment",
                     "Satisfaction with personal relationships",
                     "Overall life satisfaction",
                     "Meaning of life"];
    var expressed = attrArray[7]; //initial attribute: Overall life satisfaction
    
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 600,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([590, 0])
        .domain([4.5, 8.5]);
    
    //color scheme
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];
    // end of pseudo-global variables
    
    
    //begin script when window loads
    window.onload = setMap();

    //set up the choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 600;

        //create new svg container within body for the map 
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom()
                    .scaleExtent([0.3,8])
                    .on("zoom", function () {
                                map.attr("transform", d3.event.transform);
                    }))
            .append("g");

        //create Albers equal area conic projection centered on Europe
        var projection = d3.geoAlbers()
            .center([0, 55])
            .rotate([-15, 0, 0])
            .parallels([43, 62])
            .scale(650)
            .translate([width / 2, height / 2]);
        
        //create projected geoPath for the geofeatures
        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/Average rating of satisfactions 2013_EU_31Countries.csv")); //load attributes from csv
        promises.push(d3.json("data/countries.topojson")); //load background spatial data, all countries in the map 
        promises.push(d3.json("data/EU_31.topojson")); //load choropleth spatial data, only European countries
        Promise.all(promises).then(callback);

        function callback(data){
            
            //place graticule on the map
            setGraticule(map, path);
            
            csvData = data[0];
            world = data[1];
            europe = data[2];
            /*console.log(csvData);
            console.log(world);
            console.log(europe);*/

            //translate world and europe TopoJSON
            var worldCountries = topojson.feature(world, world.objects.ne_110m_admin_0_countries_lakes),
                europeCountries = topojson.feature(europe, europe.objects.EU_31).features;

            //examine the results
            /*console.log(worldCountries);
            console.log(europeCountries);*/

            //append projected path to the map, and add background countries to the projected path
            var bgCountries = map.append("path")
                .datum(worldCountries)
                .attr("class", "bgCountries")
                .attr("d", path);

            //join csv data to TopoJSON enumeration units
            europeCountries = joinData(europeCountries, csvData);
            
            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(europeCountries, map, path, colorScale);
            
            //add a coordinated bar chart to the map
            setChart(csvData, colorScale);
            
            //add a coordinated legend to the map
            setLegend(csvData, colorScale);
            
            //create a drop-down menu
            createDropdown(csvData);
            
        }; //end of callback
    };// end of setMap()
    
    function setGraticule(map, path){

        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background to the projected path 
            .attr("class", "gratBackground") //assign class for styling, i.e., make it blue
            .attr("d", path) //project graticule (background)

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a projected path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };
    
    function joinData(europeCountries, csvData){
        
        //loop through csv to assign each set of csv attribute values to geojson EU countries
        for (var i=0; i<csvData.length; i++){
            var csvCountry = csvData[i]; //the current country
            var csvKey = csvCountry["SOVEREIGNT"]; //the CSV primary key - the country name

            //loop through geojson EU countries to find the corresponding one
            for (var a=0; a<europeCountries.length; a++){

                var geojsonProps = europeCountries[a].properties; //the current euCountries geojson properties
                var geojsonKey = geojsonProps.SOVEREIGNT; //the geojson primary key - the country name

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCountry[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        //console.log(val);

                    });
                };
                //console.log("next");
            };

        };
        // return the geojson EU countries with the added csv attributes/variables
        return europeCountries;
    };
    
    //function to create color scale generator
    function makeColorScale(csvData){

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
        
        //create a domain array for this expressed attribute
        var domainArray = makeDomainArray(csvData);
        
        //remove first value from domain array to create class breakpoints
        domainArray.shift();
        
        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);
        
        return colorScale;
    };
    
    //create a domain array for the current expressed attribute
    function makeDomainArray(csvData){
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<csvData.length; i++){
            var val = parseFloat(csvData[i][expressed]);
            domainArray.push(val);
        };
        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        
        return domainArray;
    }
    
    function setEnumerationUnits(europeCountries, map, path, colorScale){
        //...REGIONS BLOCK FROM MODULE 8
        //add EU countries to map
        var euCountries = map.selectAll(".eu")
            .data(europeCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "eu " + d.properties.SOVEREIGNT;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties); 
            })
            .on("mousemove", moveLabel);
        
        var desc = euCountries.append("desc")
            .text('{"stroke": "#FFF", "stroke-width": "0.8px"}');
    };
    
    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } 
        else {
            return "#CCC";
        };
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bars for each country
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed];
            })
            .attr("class", function(d){
                return "bar " + d.SOVEREIGNT;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
        
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 60)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text(expressed + " in Europen Union, 2013");
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
        
    }; //end of setChart()
    
    function setLegend(csvData, colorScale){
        
        //build array of all values of the current expressed attribute
        var domainArray = makeDomainArray(csvData);
        
        // create an svg for legend
        var legend = d3.select("body")
                        .append("svg")
                        .attr("class", "legend")
                        .attr("width", 90)
                        .attr("height", 100)
                        .selectAll("g")
                        .data(domainArray.slice())
                        .enter()
                        .append("g")
                        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
        
        // append a rectangle background for the legend
        legend.append("rect")
              .attr("width", 18)
              .attr("height", 18)
              .style("fill", colorScale);
        
        // set up the range of each class, and store the ranges into an array
        var rangeArray = [];
        var nClasses = domainArray.length;
        for(var i=0; i < nClasses-1; i++){
            rangeArray[i] = domainArray[i] + " - " + Math.round( (domainArray[i+1]-0.1) * 100 ) / 100;
        }
        rangeArray[nClasses-1] = domainArray[nClasses-1] + "+"
        
        // append the rangeArray as text for the legend
        var legendTexts = legend.append("text")
                            .data(rangeArray)
                            .attr("class","legendTexts")
                            .attr("x", 24)
                            .attr("y", 9)
                            .attr("dy", ".35em")
                            .text(function(d) { return d; });
        
    }
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData) //the attribute value
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale based on the new expressed attribute
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var euCountries = d3.selectAll(".eu")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });
        
        //re-sort bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        //function to adjust y-axis range in chart
        updateYaxis(csvData);
        
        //function to position, size, and color bars in chart
        updateChart(bars, csvData.length, colorScale);
        
        //function to update legend
        updateLegend(csvData);
        
    };//end of changeAttribute()
    
    //function to adjust y-axis range after the expressed attribute is changed
    function updateYaxis(csvData){
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<csvData.length; i++){
            var val = parseFloat(csvData[i][expressed]);
            domainArray.push(val);
        };
        var min = Math.round(d3.min(domainArray));
        var max = Math.round(d3.max(domainArray));
        
        yScale = d3.scaleLinear()
            .range([590, 0])
            .domain([min-0.5, max+0.5]);
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = d3.selectAll(".axis")
            .attr("transform", translate)
            .call(yAxis);
    }
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 590 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });
        
        //add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in European Union, 2013");
        
    };// end of updateChart
    
    function updateLegend(csvData){
        //build array of all values of the current/updated expressed attribute
        var domainArray = makeDomainArray(csvData);
        
        // set up the range of each class, and store the ranges into an array
        var rangeArray = [];
        var nClasses = domainArray.length;
        for(var i=0; i < nClasses-1; i++){
            rangeArray[i] = domainArray[i] + " - " + Math.round( (domainArray[i+1]-0.1) * 100 ) / 100;
        }
        rangeArray[nClasses-1] = domainArray[nClasses-1] + "+"
        
        // update the range of each class in the legend
        var legendTexts = d3.selectAll(".legendTexts")
                            .data(rangeArray)
                            .attr("x", 24)
                            .attr("y", 9)
                            .attr("dy", ".35em")
                            .text(function(d) { return d; });
    }
    
    // function to moveToFront when highlighting
    // https://github.com/wbkd/d3-extended
    d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
    
    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.SOVEREIGNT)
            .moveToFront()
            .style("stroke", "blue")
            .style("stroke-width", "3px");
        setLabel(props);
    };
    
    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.SOVEREIGNT)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){ //element: each eu country
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        
        d3.select(".infolabel")
            .remove();
    };
    
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + "scores for " + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.SOVEREIGNT + "_label")
            .html(labelAttribute);

        var euCountryName = infolabel.append("div")
            .attr("class", "labelname")
            .html("<b>" + props.SOVEREIGNT + "</b>");
    };
    
    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    

})(); //last line of main.js




