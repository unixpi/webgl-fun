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
	    "  gl_FragColor = vec4(0.8, 0.5, 0.0, 1.0);  \n"+
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

	//After the linking, the WebGL implementation has bound the attributes used in the
	//vertex shader to a generic attribute index. The WebGL implementation has a fixed number of
	//'slots' for attributes and the generic attribute index identifies one of these 'slots'.
	//You need to know the generic attribute index for each attribute in the vertex shader,
	//since during the draw process the index is used to connect the buffer that contains the
	//vertex data with the correct attribute in the vertex shader. There are two strategies that
	//one can use to know the index:
	//(1) use the method gl.bindAttribLocation() to specify which index which index to bind your
	//attributes to before linking
	//(2) let WebGL decide which index it should use for a specific attribute, and when the
	//linking is done, use the method gl.getAttribLocation() to ask which generic attribute
	//index has been used for a certain attribute (as we have done below))

	//create a new property of the object shaderProgram called vertexPositionAttribute
	//and use it to store the generic attribute index
	//we will later use the index saved in this property to connect the buffer containing
	//the vertex data to the attribute aVertexPosition in the vertex shader.
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,
								     "aVertexPosition");
    }

    function setupBuffers() {
	//Setting up the buffers
	//After once has the shaders in place, the next step is to set up the buffers that
	//will contain the vertex data. In this example, the only buffer we need is the one for
	//the vertex positions for the triangle.

	//create a WEBGLBuffer object and assign it to the global variable vertexBuffer
	vertexBuffer = gl.createBuffer();

	//bind the created WEBGLBuffer object to the current array buffer object.
	//this tells WebGL that from now on, you are working with this buffer object.
	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

	//specify the vertices for the triangle
	//note, the default WebGL coordinate system has its origin with coordinates (0,0,0)
	//in the middle of the viewport.
	//All three axes stretch from -1 to 1
	var triangleVertices = [     0.0,  0.5,  0.0,
				    -0.5, -0.5,  0.0,
				     0.5, -0.5,  0.0
			       ];

	//a Float32Array object is created based on the Javascript array that contains the
	//vertices: it is used to send in the vertex data to WebGL.
	//the call to gl.bufferData() writes the vertices data to the currently bound WebGLBuffer
	//object
	//this call tells WebGL which data it should place in the buffer object that was created
	//with gl.createBuffer
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

	//the last thing that is done in this function is to add two new properties with info
	//that will be needed later to the vertexBuffer object

	//the property itemSize defined below specifies how many components exist for each attribute
	vertexBuffer.itemSize = 3;

	//numberOfItems specifies the number of items or vertices that exist in this buffer
	vertexBuffer.numberOfItems = 3;

	//the information from the above two properties is needed when the scene is drawn
	//in this case we have added the info to the vertexBuffer, i.e close to the location
	//where the vertex data is specified. this will make it easier to remember to update
	//the two properties when we update the structure of the vertex data
    }

    function draw() {
	//the viewport defines where the rendering results will end up
	//in the drawing buffer. When a WebGL context is created, the
	//viewport is initialized to a rectangle with its origin at
	//(0,0) and a width and height equal to the canvas width and
	//height. This means that the call to gl.viewPort() does not
	//actually modify anything in this example (included for completeness)
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

	//the method gl.clear() with the argument gl.COLOR_BUFFER_BIT tells
	//WebGL to clear the color buffer to the color that was previously
	//specified with gl.ClearColor() ( see startup() )
	gl.clear(gl.COLOR_BUFFER_BIT);

	//In the function setupBuffers(), a WebGLBuffer object was already
	//created and bound to the gl.ARRAY_BUFFER target with the method
	//gl.bindBuffer(). The vertex data was sent to this bound buffer with
	//the method gl.bufferData().
	//But what has not been done yet is to tell
	//WebGL which attribute in the vertex shader shoudl take its input from
	//the bound buffer object.
	//In this example there is only one buffer object and one attribute in
	//the vertex shader, but normally there would be several buffers and
	//attributes, and these have to be connected somehow
	
	//the WebGL method gl.vertexAttribPointer() assigns the WebGLBuffer object
	//currently bound to the gl.ARRAY_BUFFER target to a vertex attribute passed
	//in as index in the first argument.
	//the second argument of this method is the size or the number of components
	//per attribute. The number of components per attribute is 3 here since there
	//is an x,y, and z coordinate for each vertex position and we storeed this value
	//in the method setupBuffers() as a property named itemSize of the vertexBuffer object.
	//the third argument specifies that the values in the vertex buffer object should be
	//interpreted as floats. If you send in data that does not consist of floats, the data
	//needs to be converted to floats before it is used in the vertex shader.
	//the fourth argument is called the normalized flag, and it decides how non-floating
	//point data should be converted to floats. In this example, the values in the buffer
	//are floats, so the argument will not be used anyway.
	//the fifth argument is called stride, and specifying zero means that the data is
	//stored sequentially in memory.
	//The sixth and last argument is the offset into the buffer, and since the data starts
	//at the start of the buffer, this argument is set to zero as well.
	
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
	//this example uses gl.clearColor() to specify black as the clear color
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	draw();
    }
    
}
