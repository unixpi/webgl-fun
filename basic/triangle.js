function drawTriangle() {
    console.log("start");

    var gl;
    var canvas;
    var shaderProgram;
    var vertexBuffer;

    startup();
    
    function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
	    try {
		context = canvas.getContext(names[i]);
	    } catch(e) {}
	    if (context) {
		break;
	    }
	}
	if (context) {
	    context.viewportWidth = canvas.width;
	    context.viewportHeight = canvas.height;
	} else {
	    alert("Failed to create WebGL context!");
	}
	return context;
    }

    function loadShader(type, shaderSource) {
	//load the source code into the shader object
	//and then compile the shader

	//create shader object
	var shader = gl.createShader(type);

	//load source code into shader object
	gl.shaderSource(shader, shaderSource);

	//compile shader object
	gl.compileShader(shader);

	//check compilation status
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	    alert("Error compiling shader" + gl.getShaderInfoLog(shader));
	    gl.deleteShader(shader);
	    return null;
	}
	//if no compile errors, return shader
	return shader;
    }

    function setupShaders() {
	var vertexShaderSource =
	    //attributes are special input variables that are used
	    //to pass per vertex data from the WEBGL API to the vertex
	    //shader
	    //the aVertexPosition attribute is defined and used here to
	    //pass the position of each vertex that webgl should use
	    //for drawing the triangle
	    //To make the vertices go through the API and end up in the
	    //aVertexPosition attribute, you also have to set up a buffer
	    //for the vertices and connect the buffer to the aVertexPosition
	    //attribute. These two steps occur later in the functions
	    //setupBuffers
	    //gl_Position is a predefined variable, and all vertex shaders must
	    //assign a value to it. It contains the position of the vertex when
	    //the vertex shader is finished with it, and it is passed on to the
	    //next stage in the WebGL pipeline
	    
	    "attribute vec3 aVertexPosition;                 \n" +
	    "void main() {                                   \n" +
	    "  gl_Position = vec4(aVertexPosition, 1.0);     \n" +
	    "}                                               \n";

	var fragmentShaderSource =
	    //the first line uses what is called a precision qualifier
	    //to declare that the precision used for floats in the
	    //fragment shader should be of medium precision
	    //the body of the main() function writes a vec4 representing
	    //the color white into the built in variable gl_FragColor
	    //gl_FragColor is defined as a four component vector that
	    //contains the output color in RGBA format that the fragment
	    //has when the fragment shader is finished with it
	    "precision mediump float;                    \n"+
	    "void main() {                               \n"+
	    "  gl_FragColor = vec4(1.0, 1.0, .0, 1.0);  \n"+
	    "}                                           \n";

	//Compiling Shaders
	//to create a WebGL shader that one can upload to the GPU and use for rendering
	//one first needs to create a shader object, load the source code into the shader
	//object, and then compile and link the shader
	//the homemade helper function loadShader() can create either a vertex shader or a
	//fragment shader, depending on which arguments are sent to the function.
	//the function is called once with the type argument set to gl.VERTEX_SHADER and
	//once with the type argument set to gl.FRAGMENT_SHADER
	
	var vertexShader = loadShader(gl.VERTEX_SHADER, vertexShaderSource);
	var fragmentShader = loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

	//Creating the Program Object and Linking the Shaders

	//create a program object
	shaderProgram = gl.createProgram();

	//attach the compiled vertex shader to the program
	gl.attachShader(shaderProgram, vertexShader);

	//attach the compiled fragment shader to the program;
	gl.attachShader(shaderProgram, fragmentShader);

	//link everything together to a shader program that webgl can use
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	    alert("Failed to setup shaders");
	}

	//if linking succeeds we have a program object and we can call
	//gl.useProgram() to tell WebGL that this program object should
	//be used for the rendering
	gl.useProgram(shaderProgram);

	

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    }

    function setupBuffers() {
	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	var triangleVertices = [
	    0.0,  0.5,  0.0,
	        -0.5, -0.5,  0.0,
	    0.5, -0.5,  0.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
	vertexBuffer.itemSize = 3;
	vertexBuffer.numberOfItems = 3;
    }

    function draw() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
			       vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numberOfItems);
    }

    function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	setupShaders();
	setupBuffers();
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	draw();
    }
    
}
