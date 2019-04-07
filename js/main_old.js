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
    //variables for data join
    var attrArray = ["Satisfaction with financial situation", 
                     "Satisfaction with job", 
                     "Satisfaction with commuting time", 
                     "Satisfaction with time use", 
                     "Satisfaction with recreational and green areas",
                     "Satisfaction with living environment",
                     "Satisfaction with personal relationships",
                     "Overall life satisfaction",
                     "Meaning of life"];
    var expressed = attrArray[7]; //initial attribute
    
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
        .domain([3.5, 9]);

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 600;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([0, 55])
            .rotate([-15, 0, 0])
            .parallels([43, 62])
            .scale(650)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/Average rating of satisfactions 2013_EU_31Countries.csv")); //load attributes from csv
        promises.push(d3.json("data/countries.topojson")); //load background spatial data
        promises.push(d3.json("data/EU_31.topojson")); //load choropleth spatial data
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

            //add background countries to map
            var bgCountries = map.append("path")
                .datum(worldCountries)
                .attr("class", "bgCountries")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            europeCountries = joinData(europeCountries, csvData);
            
            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(europeCountries, map, path, colorScale);
            
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
            
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
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };
    
    function joinData(europeCountries, csvData){
        //...DATA JOIN LOOPS FROM EXAMPLE 1.1
        //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvCountry = csvData[i]; //the current region
                var csvKey = csvCountry["SOVEREIGNT"]; //the CSV primary key

                //loop through geojson regions to find correct region
                for (var a=0; a<europeCountries.length; a++){

                    var geojsonProps = europeCountries[a].properties; //the current euCountries geojson properties
                    var geojsonKey = geojsonProps.SOVEREIGNT; //the geojson primary key

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
        return europeCountries;
    };
    
    //function to create color scale generator
    function makeColorScale(csvData){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);
        
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
        //remove first value from domain array to create class breakpoints
        //console.log("break down by min values: "+domainArray);
        domainArray.shift();
        
        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);
        
        return colorScale;
    };
    
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

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
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
            .attr("x", 40)
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

        //recreate the color scale
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

        updateChart(bars, csvData.length, colorScale);
        
    };//end of changeAttribute()
    
    
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
    
    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.SOVEREIGNT)
            .style("stroke", "blue")
            .style("stroke-width", "2px");
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




