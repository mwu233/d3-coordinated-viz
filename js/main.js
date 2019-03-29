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
                var csvKey = csvCountry["Country"]; //the CSV primary key

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
        console.log(domainArray);
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
            });
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
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 600,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([590, 0])
            .domain([3, 9]);

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.Country;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 590 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
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
        
        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.Country;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartInnerWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2 + 25;
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
            });
    };
    

})(); //last line of main.js




