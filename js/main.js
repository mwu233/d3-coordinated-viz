// Javascripts by Meiliu Wu, 2019

/*eslint-env jquery*/
/*eslint-disable no-extra-semi*/
/*eslint-disable no-unused-vars*/
/*eslint-disable no-undef*/
/*eslint-disable no-console*/

/* Map of population percentage of getting together with family every day in 2015 (Age >= 16) */

//execute script when window is loaded
window.onload = function(){
    // SVG dimension variables
    var w = 1380, h = 600;

    // container block
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //assign a class name
        .style("background-color", "rgba(0,0,0,0.2)"); //svg background color

    // innerRect block
    var innerRect = container.append("rect") //put a new rect in the svg
        .datum(400) //a single value is a datum
        .attr("width", function(d){ //rectangle width
            return d * 3 + 100; //400 * 3 + 100 = 1300
        }) 
        .attr("height", function(d){ //rectangle height
            return d * 1.25; //400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color
    
    // Create only one new element per block.
    
    // data array: Population percentage of getting together with family every day in 2015 (Age >= 16)
    var countryPc = [
        { 
            country: 'EU Average',
            percentage: 16.7
        },
        {
            country: 'Austria',
            percentage: 7.4
        },
        {
            country: 'Belgium',
            percentage: 18.6
        },
        {
            country: 'Bulgaria',
            percentage: 21.9
        },
        {
            country: 'Croatia',
            percentage: 29.7
        },
        {
            country: 'Cyprus',
            percentage: 45.4
        },
        {
            country: 'Czechia',
            percentage: 14.3
        },
        {
            country: 'Denmark',
            percentage: 3.1
        },
        {
            country: 'Estonia',
            percentage: 4.3
        },
        {
            country: 'Finland',
            percentage: 10.0
        },
        {
            country: 'France',
            percentage: 13.7
        },
        {
            country: 'Germany',
            percentage: 14.3
        },
        {
            country: 'Greece',
            percentage: 35.7
        },
        {
            country: 'Hungary',
            percentage: 16.5
        },
        {
            country: 'Iceland',
            percentage: 6.5
        },
        {
            country: 'Ireland',
            percentage: 19.2
        },
        {
            country: 'Italy',
            percentage: 22.4
        },
        {
            country: 'Latvia',
            percentage: 4.3
        },
        {
            country: 'Lithuania',
            percentage: 3.1
        },
        {
            country: 'Luxembourg',
            percentage: 14.7
        },
        {
            country: 'Malta',
            percentage: 34.7
        },
        {
            country: 'Netherlands',
            percentage: 5.9
        },
        {
            country: 'Norway',
            percentage: 11.8
        },
        {
            country: 'Poland',
            percentage: 6.3
        },
        {
            country: 'Portugal',
            percentage: 32.6
        },
        {
            country: 'Romania',
            percentage: 25.3
        },
        {
            country: 'Serbia',
            percentage: 85.8
        },
        {
            country: 'Slovakia',
            percentage: 36.3
        },
        {
            country: 'Slovenia',
            percentage: 10.6
        },
        {
            country: 'Spain',
            percentage: 22.3
        },
        {
            country: 'Sweden',
            percentage: 5.5
        },
        {
            country: 'Switzerland',
            percentage: 9.3
        },
        {
            country: 'Turkey',
            percentage: 25.0
        },
        {
            country: 'United Kingdom',
            percentage: 15.5
        }
    ];
    
    var x = d3.scaleLinear() //create the scale
        .range([80, 1280]) //output min and max
        .domain([0, 33]); //input min and max
    
    //find the minimum value of the array
    var minPc = d3.min(countryPc, function(d){
        return d.percentage;
    });

    //find the maximum value of the array
    var maxPc = d3.max(countryPc, function(d){
        return d.percentage;
    });

    //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([550, 50])
        .domain([0,100]);
    
    //color scale generator 
    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])
        .domain([
            minPc, 
            maxPc
        ]);
    
    //Example 2.6 line 3
    var circles = container.selectAll(".circles") //create an empty selection
        .data(countryPc) //here we feed in an array
        .enter() //one of the great mysteries of the universe
        .append("circle") //inspect the HTML--holy crap, there's some circles there
        .attr("class", "circles")
        .attr("id", function(d){
            return d.country;
        })
        .attr("r", function(d){
            //calculate the radius based on population value as circle area
            var area = d.percentage * 10;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){
            //use the index to place each circle horizontally
            //return 60 + (i * 35);
            return x(i);
        })
        .attr("cy", function(d){
            //subtract value from 450 to "grow" circles up from the bottom instead of down from the top of the SVG
            //return 550 - (d.percentage * 5);
            return y(d.percentage);
        })
        .style("fill", function(d, i){ //add a fill based on the color scale generator
            return color(d.percentage);
        });
        //.style("stroke", "#000"); //black circle stroke;
    
    //create y axis generator
    var yAxis = d3.axisLeft(y);

    //create axis g element and add axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);
    
    yAxis(axis);
    
    //create a text element and add the title
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 650)
        .attr("y", 30)
        .text("Population Percentage of Daily Getting Together With Family in Europe, 2015 (Age >= 16)");
    
    //create circle labels
    var labels = container.selectAll(".labels")
        .data(countryPc)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "middle")
        /*.attr("x", function(d,i){
            //horizontal position to the right of each circle
            //return x(i) + Math.sqrt(d.percentage * 6 / Math.PI) + 5;
            return x(i) - 30;
        })*/
        /*.attr("y", function(d){
            //vertical position centered on each circle
            return y(d.percentage) - Math.sqrt(d.percentage * 30 / Math.PI);
        })*/
        /*.text(function(d){
            return d.country + ", " + d.percentage + "%";
        })*/;
    
    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            //return x(i) + Math.sqrt(d.percentage * 6 / Math.PI) + 5;
            return x(i);
        })
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.percentage) - Math.sqrt(d.percentage * 30 / Math.PI);
        })
        .attr("dy", "-11") //vertical offset
        .text(function(d){
            return d.country;
        });

    //second line of label
    var pcLine = labels.append("tspan")
        .attr("class", "pcLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            //return x(i) + Math.sqrt(d.percentage * 6 / Math.PI) + 5;
            return x(i);
        })
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.percentage) - Math.sqrt(d.percentage * 30 / Math.PI);
        })
        .text(function(d){
            return d.percentage + "%";
        });
    
    //create axis g element and add x axis - dashed line for average value
    var dashedAxis = container.append("g")
        .attr("class", "dashed")
        .attr("transform", "translate(0, 466.7)")
        .call(make_x_axis()
        )

    function make_x_axis() {
        return d3.axisBottom(x)
                    .ticks(0)
  }

};