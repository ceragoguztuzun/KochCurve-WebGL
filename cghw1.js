
var canvas;
var gl;
var program;

var maxNumVertices  = 200;
var index = 0;

var noOfLaterVertices = 0;

var linesGenerated = [];

var startVertex;
var data;
var vertices = [];

var colorOfLines = vec4( 0.0, 0.0, 0.0, 1.0);
var colorOfCanvas = vec4( 0.8, 0.8, 0.8, 1.0);
var colorOfPolygon = vec4( 0.8, 0.8, 0.8, 0.0); // not visible initially.
var rVal, gVal, bVal;

var isKochCurveApplied = false;
var isPolygonFilled = false;

var colorChangeToggle = 0;
var lineColorToggle;
var backgroundColorToggle;
var polygonColorToggle;

var toggleFlag = 0;

var bufferId;
var inputColor;
var enabled;
var noOfIterations;
//
window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

	var a = document.getElementById("Button1");
	var saveButton = document.getElementById("Button2");

	// save polygon or Koch Curve by generating a txt file.
	// used https://github.com/eligrey/FileSaver.js library for the implementation of save functionality.
	// I used the saveAs function to save the data in created Blob to a txt file.
	saveButton.addEventListener("click", function(){
		// variables to save: isKochCurveApplied, vertices, colorOfLines, colorOfCanvas, colorOfPolygon, isPolygonFilled, linesGenerated, index
		var dataToWrite = writeToTxt();
		var blob = new Blob(dataToWrite);
		saveAs(blob, "kochcurvefile.txt");
	});

	// load inputted txt file
	var input = document.getElementById('txt-input');
	input.addEventListener("change", function(){
		let files = input.files;
	
		if(files.length == 0) return;
	
		const file = files[0];
	
		let reader = new FileReader();
		var lines;

		reader.onload = (e) => {
			var file = e.target.result;
			// parse line by line by splitting the txt input.
			lines = file.split(/\r\n|\n/);

			isKochCurveApplied =  (lines[0] == 'true');
			isPolygonFilled = (lines[1] == 'true');
			colorOfCanvas[0] = parseFloat(lines[2]);
			colorOfCanvas[1] = parseFloat(lines[3]);
			colorOfCanvas[2] = parseFloat(lines[4]);

			if (isPolygonFilled) {
				colorOfPolygon[0] = lines[5] || 0; // to turn NaN values to 0
				colorOfPolygon[1] = lines[6] || 0;
				colorOfPolygon[2] = lines[7] || 0;
			}
			else {
				colorOfLines[0] = lines[5] || 0;
				colorOfLines[1] = lines[6] || 0;
				colorOfLines[2] = lines[7] || 0;
			}

			index = parseInt(lines[8]);
			console.log(index);
			for(var i = 0; i < index; i++){
				var vertex = lines[i+9].split(",");
				vertices[i] = [parseFloat(vertex[0]), parseFloat(vertex[1])];
				console.log(vertex);
			}

			if (isKochCurveApplied) {
				noOfIterations = parseInt(lines[ index + 9]);
				noOfLaterVertices = parseInt(lines[ index + 10]);

				for( var i = 0; i < noOfLaterVertices; i++){
					var kochvertex = lines[index + 11 +i].split(",");
					linesGenerated[i] = vec4( parseFloat(kochvertex[0]), parseFloat(kochvertex[1]), parseFloat(kochvertex[2]), parseFloat(kochvertex[3]));
				}
			}

			//------------form the shape again and render------------
    		gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);

			// change canvas color
			gl.clearColor(colorOfCanvas[0],colorOfCanvas[1],colorOfCanvas[2],1.0);
			
			// drawing polygon
			if( !isPolygonFilled){
				changeColorOfLines();
			}

			// fill polygon 
			if( isPolygonFilled){
				fillPolygon();
			}
		};

		reader.readAsText(file); 

	});

	// Checkboxes
	lineColorToggle = document.getElementById("line-color-change-switch");
	backgroundColorToggle = document.getElementById("background-color-change-switch");
	polygonColorToggle = document.getElementById("polygon-color-change-switch");

	// line color toggle is changed
	lineColorToggle.onchange = function() {
		toggleFlag = 1;
		toggleButtonFnc();
	};
	// background color toggle is on
	backgroundColorToggle.onchange = function() {
		toggleFlag = 2;
		toggleButtonFnc();
	};
	// polygon color toggle is on
	polygonColorToggle.onchange = function() {
		toggleFlag = 3;
		toggleButtonFnc();
	};

	// RGB Slider listeners that change the color component
	document.getElementById("r-slider").onchange = function() {
		rVal  = document.getElementById("r-slider").value;
		changeColor();
	};
	document.getElementById("g-slider").onchange = function() {
		gVal = document.getElementById("g-slider").value;
		changeColor();
	};
	document.getElementById("b-slider").onchange = function() {
        bVal = document.getElementById("b-slider").value;
		changeColor();
	};

    // Generating Koch Curves Recursively
    a.addEventListener("click", function(){

		isKochCurveApplied = true;

    	// get number of iterations from text field.
    	noOfIterations = document.getElementById("iterations-input").value;
    	noOfIterations = parseInt(noOfIterations);

    	if ( isNaN(noOfIterations)) { alert( "Please input the number of iterations." ); }
    	else
    	{
	    	gl.clear(gl.COLOR_BUFFER_BIT);
	    	// Call method for every line drawn by user.
		    for( var i = 0; i < index-1; i++)
			{
				console.log( vertices[i], vertices[i+1]);
			  	formKochCurve(vertices[i],vertices[i+1],noOfIterations);
			}
			
	        var lineColor = vec4(colorOfLines[0]/255, colorOfLines[1]/255, colorOfLines[2]/255, 1.0);
	        var drawMode = gl.LINES;

	    	// Draw the final shape.
	    	gl.clear(gl.COLOR_BUFFER_BIT);
			for( var i = 0; i < noOfLaterVertices; i++)
			{
				drawStaticShape( linesGenerated[i], lineColor, drawMode);
			}

		}
    	
    });

	// specifying viewport and other necessary components.
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(colorOfCanvas[0],colorOfCanvas[1],colorOfCanvas[2],1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);

    // Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );

    var vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );
    
    var cBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    // EVENT LISTENERS
    var isStartVertex = true;
    var drawFlag = false;
	var isFinished = false;
	var clickCoordinates;

	// Method that updates the buffer and calls render function to dynamically draw lines with inputted color
	function updateAndRender(data, r, g, b) {
		gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
		gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(data));
		
		//use uniform color
		inputColor = gl.getUniformLocation(program, 'uColor');
		enabled = gl.getUniformLocation(program, 'uColorEnabled');
		gl.uniform4fv( inputColor, vec4(r, g, b, 1.0));
		gl.uniform1i( enabled, 1);

		render();
	}

	// Method that specifies the vertices with every click on the canvas
    canvas.addEventListener("click", function(event){

		if(isFinished) return;
    	clickCoordinates  = vec2(2*event.clientX/canvas.width-1, 
	           		 2*(canvas.height-event.clientY)/canvas.height-1);
		// if it is the first click
		if (isStartVertex)
    	{
			startVertex = clickCoordinates;
			isStartVertex = false;

			pushToVertices(startVertex);
			index++;
		}
		// strip lines
		else if ( !isStartVertex )
        {
			cx = clickCoordinates[0];
			cy = clickCoordinates[1];
			sx = startVertex[0];
			sy = startVertex[1];
			distsq = (sx-cx)*(sx-cx) + (sy-cy)*(sy-cy)

			// if clicked vertex is near the start vertex
			if(distsq < 0.01)
			{
				pushToVertices(startVertex);
				index++;
			
				var last_line = vec4(startVertex, vertices[index-1]);
				data = new Float32Array(last_line);
				
				updateAndRender(data, rVal/255, gVal/255, bVal/255);
				isFinished = true;
			}
			else
			{
				pushToVertices(clickCoordinates);
				index++;
			}
		}
		
    	drawFlag = true;
    } );

	// Mouse move event listener
    canvas.addEventListener('mousemove', function(event){
        if (drawFlag) {
            //indicate last coordinates by cursor's coordinates.
            lastCoordinates  = vec2(2*event.clientX/canvas.width-1, 
          			 2*(canvas.height-event.clientY)/canvas.height-1);
			// generate line data to be drawn
			var coods = vec4(clickCoordinates, lastCoordinates);
			data = new Float32Array(coods);
			//draw the line
		   	if (!isFinished)
		   	{
		   		updateAndRender(data, rVal/255, gVal/255, bVal/255);
		   	}
		}
    });
    
}

// Method that changes the color of selected component with the input from RGB sliders
function changeColor() {
	//use uniform color
	inputColor = gl.getUniformLocation(program, 'uColor');
	enabled = gl.getUniformLocation(program, 'uColorEnabled');
	gl.uniform4fv( inputColor, vec4(rVal/255, gVal/255, bVal/255, 1.0));
	gl.uniform1i( enabled, 1);

	switch(colorChangeToggle) {
		case 1: // line color will be changed

			// update color of lines values
			colorOfLines[0] = rVal;
			colorOfLines[1] = gVal;
			colorOfLines[2] = bVal;

			console.log("LINE SWITCH ON");
			changeColorOfLines();
			break;

		case 2: // background color will be changed: change background color, then render shapes over it.

			// update color of canvas values
			colorOfCanvas[0] = rVal/225;
			colorOfCanvas[1] = gVal/225;
			colorOfCanvas[2] = bVal/225;
			gl.clear(gl.COLOR_BUFFER_BIT);

			console.log("BACKGROUND SWITCH ON");
			gl.clearColor( colorOfCanvas[0], colorOfCanvas[1], colorOfCanvas[2], 1.0 );
			console.log("---- ",isPolygonFilled);
			if (isPolygonFilled) fillPolygon();
			else changeColorOfLines();
			break;

		case 3: // polygon filling color will be changed

			// update color of polygon values
			colorOfPolygon[0] = rVal;
			colorOfPolygon[1] = gVal;
			colorOfPolygon[2] = bVal;

			console.log("POLYGON SWITCH ON");
			fillPolygon();
			break;
	}
}

// Method that fills the polygon or the koch curve
function fillPolygon() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	// change the format of vertices array
	var vertices_arr = []
	for ( var i = 0; i < index; i++)
	{
		vertices_arr.push(vertices[i][0]);
		vertices_arr.push(vertices[i][1]);
	}
	// draw initial filled polygon
	drawStaticShape(vertices_arr,vec4(colorOfPolygon[0]/255, colorOfPolygon[1]/255, colorOfPolygon[2]/255, 1.0), gl.TRIANGLE_FAN);

	if(isKochCurveApplied) {
		// Recursively add and delete square areas.
		for( var i = 0; i < index-1; i++)
		{
			fillKochCurve(vertices[i],vertices[i+1],noOfIterations);
		}
	}
	isPolygonFilled = true;
}

// Method that redraws the lines with inputted color.
function changeColorOfLines() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	if(!isKochCurveApplied) {
		for( var i = 0; i < index-1; i++)
		{
			drawStaticShape( vec4(vertices[i],vertices[i+1]) ,vec4(colorOfLines[0]/255, colorOfLines[1]/255, colorOfLines[2]/255, 1.0), gl.LINES);
		}
	}
	else {
		for( var i = 0; i < noOfLaterVertices; i++)
		{
			drawStaticShape( linesGenerated[i], vec4(colorOfLines[0]/255, colorOfLines[1]/255, colorOfLines[2]/255, 1.0), gl.LINES);
		}
	}
}

// Method to change which component's color to change using toggles.
function toggleButtonFnc() {

	switch( toggleFlag) {
		case 1:		
			isPolygonFilled = false;
			lineColorToggle.checked = true;
			backgroundColorToggle.checked = false;
			polygonColorToggle.checked = false;
			colorChangeToggle = 1; // line color will be changed
			break;
		case 2:
			backgroundColorToggle.checked = true;
			lineColorToggle.checked = false;
			polygonColorToggle.checked = false;
			colorChangeToggle = 2; // background color will be changed
			break;
		case 3:
			polygonColorToggle.checked = true;
			lineColorToggle.checked = false;
			backgroundColorToggle.checked = false;
			colorChangeToggle = 3; // polygon color will be changed
			break;
		default: // all toggles OFF
			colorChangeToggle = 0;
	}

}

// Method to statically draw shapes
function drawStaticShape( coords, color, drawingMode) {

	// turn coordinates into data
	var data = new Float32Array(coords);

	// buffer logic and program
	var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(program);

	// bind to GPU
    var position = gl.getAttribLocation(program, 'vPosition');
    gl.enableVertexAttribArray(position);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

	// color input
	inputColor = gl.getUniformLocation(program, 'uColor');
	enabled = gl.getUniformLocation(program, 'uColorEnabled');
    gl.uniform4fv( inputColor, color);
    gl.uniform1i( enabled, 1);

	// draw the shape
	gl.drawArrays(drawingMode, 0, coords.length/2);
}

// Method to vertices array with vertices inputted by user
function pushToVertices( v){
	vertices.push(v);
}

// Method that recurively draws Koch Curve from a polygon.
function formKochCurve( vstart, vend, count){
	// base case
	if ( count === 0) {
		return;
	}
	else {
		// Obtain new vertices
		var v1 = mix(vstart, vend, 0.25);
		var v2 = mix(vstart, vend, 0.50);
		var v3 = mix(vend, vstart, 0.25);

		var angleInRadians = -90 * Math.PI / 180;
		var x1 = (vstart[0] - v1[0]) * Math.cos(angleInRadians) - (vstart[1] - v1[1])* Math.sin(angleInRadians) + v1[0];
  		var y1 = (vstart[0] - v1[0]) * Math.sin(angleInRadians) + (vstart[1] - v1[1])* Math.cos(angleInRadians) + v1[1];
  		var v4 = vec2(x1, y1);

  		angleInRadians = 90 * Math.PI / 180;
		x1 = (v1[0] - v4[0]) * Math.cos(angleInRadians) - (v1[1] - v4[1])* Math.sin(angleInRadians) + v4[0];
  		y1 = (v1[0] - v4[0]) * Math.sin(angleInRadians) + (v1[1] - v4[1])* Math.cos(angleInRadians) + v4[1];
  		var v5 = vec2(x1, y1);

		x1 = (v2[0] - v3[0]) * Math.cos(angleInRadians) - (v2[1] - v3[1])* Math.sin(angleInRadians) + v3[0];
  		y1 = (v2[0] - v3[0]) * Math.sin(angleInRadians) + (v2[1] - v3[1])* Math.cos(angleInRadians) + v3[1];
  		var v7 = vec2(x1, y1);

		x1 = (v3[0] - v7[0]) * Math.cos(angleInRadians) - (v3[1] - v7[1])* Math.sin(angleInRadians) + v7[0];
  		y1 = (v3[0] - v7[0]) * Math.sin(angleInRadians) + (v3[1] - v7[1])* Math.cos(angleInRadians) + v7[1];
  		var v6 = vec2(x1, y1);
		
		// line coordinate variables
        var lineCoords1 = vec4(vstart, v1);
        var lineCoords2 = vec4(v3, vend);
        var lineCoords3 = vec4(v1, v4);
        var lineCoords4 = vec4(v3, v7);
        var lineCoords5 = vec4(v4, v5);
        var lineCoords6 = vec4(v7, v6);
        var lineCoords7 = vec4(v5, v2);
        var lineCoords8 = vec4(v2, v6);

        // Save the final form of generated vertices to be drawn
  		if (count === 1)
  		{
  			linesGenerated.push(lineCoords1);
	        linesGenerated.push(lineCoords2);
	        linesGenerated.push(lineCoords3);
	        linesGenerated.push(lineCoords4);
	        linesGenerated.push(lineCoords5);
	        linesGenerated.push(lineCoords6);
	        linesGenerated.push(lineCoords7);
	        linesGenerated.push(lineCoords8);

	        noOfLaterVertices += 8;
  		}

		count--;

		// RECURSIVE STEPS
		formKochCurve( vstart, v1, count);
		formKochCurve( v3, vend, count);
		formKochCurve( v1, v4, count);
		formKochCurve( v3, v7, count);
		formKochCurve( v4, v5, count);
		formKochCurve( v7, v6, count);
		formKochCurve( v5, v2, count);
		formKochCurve( v2, v6, count);
	}
}

// Method to create and return an array to draw a SQUARE.
function pushToPolygonFillingArray( v1, v2, v3, v4){
	var arr = [];
	arr.push(v1[0]);
	arr.push(v1[1]);

	arr.push(v2[0]);
	arr.push(v2[1]);

	arr.push(v4[0]);
	arr.push(v4[1]);

	arr.push(v2[0]);
	arr.push(v2[1]);

	arr.push(v4[0]);
	arr.push(v4[1]);

	arr.push(v3[0]);
	arr.push(v3[1]);

	return arr;
}

// Method to recursively add and delete square areas from the polygon as the koch curve is generated again.
function fillKochCurve( vstart, vend, count){
	// base case
	if ( count === 0) {
		return;
	}
	else {
		// Obtain new vertices
		var v1 = mix(vstart, vend, 0.25);
		var v2 = mix(vstart, vend, 0.50);
		var v3 = mix(vend, vstart, 0.25);

		var angleInRadians = -90 * Math.PI / 180;
		var x1 = (vstart[0] - v1[0]) * Math.cos(angleInRadians) - (vstart[1] - v1[1])* Math.sin(angleInRadians) + v1[0];
  		var y1 = (vstart[0] - v1[0]) * Math.sin(angleInRadians) + (vstart[1] - v1[1])* Math.cos(angleInRadians) + v1[1];
  		var v4 = vec2(x1, y1);

  		angleInRadians = 90 * Math.PI / 180;
		x1 = (v1[0] - v4[0]) * Math.cos(angleInRadians) - (v1[1] - v4[1])* Math.sin(angleInRadians) + v4[0];
  		y1 = (v1[0] - v4[0]) * Math.sin(angleInRadians) + (v1[1] - v4[1])* Math.cos(angleInRadians) + v4[1];
  		var v5 = vec2(x1, y1);

		x1 = (v2[0] - v3[0]) * Math.cos(angleInRadians) - (v2[1] - v3[1])* Math.sin(angleInRadians) + v3[0];
  		y1 = (v2[0] - v3[0]) * Math.sin(angleInRadians) + (v2[1] - v3[1])* Math.cos(angleInRadians) + v3[1];
  		var v7 = vec2(x1, y1);

		x1 = (v3[0] - v7[0]) * Math.cos(angleInRadians) - (v3[1] - v7[1])* Math.sin(angleInRadians) + v7[0];
  		y1 = (v3[0] - v7[0]) * Math.sin(angleInRadians) + (v3[1] - v7[1])* Math.cos(angleInRadians) + v7[1];
  		var v6 = vec2(x1, y1);
		
		// draw the new square area
		var squareCoordsToAdd = [];
		squareCoordsToAdd = pushToPolygonFillingArray(v4, v5, v2, v1);
		drawStaticShape(squareCoordsToAdd,vec4(colorOfPolygon[0]/255, colorOfPolygon[1]/255, colorOfPolygon[2]/255, 1.0), gl.TRIANGLES);

		// delete the excess square area
		var squareCoordsToDelete = [];
		squareCoordsToDelete = pushToPolygonFillingArray(v2, v3, v7, v6);
		drawStaticShape(squareCoordsToDelete,vec4(colorOfCanvas[0], colorOfCanvas[1], colorOfCanvas[2], 1.0), gl.TRIANGLES);

		count--;

		// RECURSIVE STEPS
		fillKochCurve( vstart, v1, count);
		fillKochCurve( v1, v4, count);
		fillKochCurve( v4, v5, count);
		fillKochCurve( v5, v2, count);
		fillKochCurve( v2, v6, count);
		fillKochCurve( v6, v7, count);
		fillKochCurve( v7, v3, count);
		fillKochCurve( v3, vend, count);
	}
}

// Method to create a txt file of the created visual to be saved
function writeToTxt() {
	// things to save: isKochCurveApplied, vertices, colorOfLines, colorOfCanvas, colorOfPolygon, isPolygonFilled, noOfIterations, index 
	var dataToWrite = [];
	dataToWrite.push(isKochCurveApplied, "\n");
	dataToWrite.push(isPolygonFilled, "\n");
	dataToWrite.push(colorOfCanvas[0], "\n");
	dataToWrite.push(colorOfCanvas[1], "\n");
	dataToWrite.push(colorOfCanvas[2], "\n");

	// if the polygon is filled
	if(isPolygonFilled) {
		dataToWrite.push(colorOfPolygon[0], "\n");
		dataToWrite.push(colorOfPolygon[1], "\n");
		dataToWrite.push(colorOfPolygon[2], "\n");
	}
	// if the polygon is not filled, push line colors
	else {
		dataToWrite.push(colorOfLines[0], "\n");
		dataToWrite.push(colorOfLines[1], "\n");
		dataToWrite.push(colorOfLines[2], "\n");
	}
	
	dataToWrite.push( index, "\n");
	
	for(var i = 0; i < index; i++) {
		dataToWrite.push( vertices[i], "\n");
	}

	// push koch curve vertices if koch curve rule was applied.
	if( isKochCurveApplied) {
		dataToWrite.push( noOfIterations, "\n");
		dataToWrite.push( noOfLaterVertices, "\n");
		for(var i = 0; i < noOfLaterVertices; i++) {
			dataToWrite.push( linesGenerated[i], "\n");
		}
	}
	return dataToWrite;
}

// Render function to dynamically draw lines.
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays( gl.LINE_STRIP, 1, index + 1 );
   
}
