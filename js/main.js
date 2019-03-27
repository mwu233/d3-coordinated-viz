// Javascripts by Meiliu Wu, 2019

/*eslint-env jquery*/
/*eslint-disable no-extra-semi*/
/*eslint-disable no-unused-vars*/
/*eslint-disable no-undef*/
/*eslint-disable no-console*/

/* Map of Average rating of satisfactions from EU Countries in 2013  */

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 800,
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
    promises.push(d3.json("data/EU_31countries.topojson")); //load choropleth spatial data
    Promise.all(promises).then(callback);
    
    function callback(data){
        
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
        
        csvData = data[0];
        world = data[1];
        europe = data[2];
        console.log(csvData);
        console.log(world);
        console.log(europe);
        
        //translate world and europe TopoJSON
        var worldCountries = topojson.feature(world, world.objects.ne_110m_admin_0_countries_lakes),
            europeCountries = topojson.feature(europe, europe.objects.EU_31countries).features;

        //examine the results
        console.log(worldCountries);
        console.log(europeCountries);
        
        //add background countries to map
        var bgCountries = map.append("path")
            .datum(worldCountries)
            .attr("class", "bgCountries")
            .attr("d", path);

        //add EU countries to map
        var euCountries = map.selectAll(".eu")
            .data(europeCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
                console.log(d.properties.SOVEREIGNT);
                return d.properties.SOVEREIGNT;
            })
            .attr("d", path);
        
    };
};