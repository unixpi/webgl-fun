var gl;
function initGL(canvas) {
    try {
	gl = canvas.getContext("webgl");
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
	alert("Could not initialise WebGL, sorry :-(");
    }
}

//This is another one of those functions that is much simpler than it looks.  All we’re doing here is looking for an element in our HTML page that has an ID that matches a parameter passed in, pulling out its contents, creating either a fragment or a vertex shader based on its type (more about the difference between those in a future lesson) and then passing it off to WebGL to be compiled into a form that can run on the graphics card.  The code then handles any errors, and it’s done! Of course, we could just define shaders as strings within our JavaScript code and not mess around with extracting them from the HTML — but by doing it this way, we make them much easier to read, because they are defined as scripts in the web page, just as if they were JavaScript themselves.


//webGLStart called initShaders, which used getShader to load the fragment and the vertex shaders from scripts in the web page, so that they could be compiled and passed over to WebGL and used later when rendering our 3D scene.
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
	return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
	if (k.nodeType == 3) {
	    str += k.textContent;
	}
	k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
	shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
	shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
	return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	alert(gl.getShaderInfoLog(shader));
	return null;
    }

    return shader;
}

//Now, what is a shader, you may ask?  Well, at some point in the history of 3D graphics they may well have been what they sound like they might be — bits of code that tell the system how to shade, or colour, parts of a scene before it is drawn.  However, over time they have grown in scope, to the extent that they can now be better defined as bits of code that can do absolutely anything they want to bits of the scene before it’s drawn.  And this is actually pretty useful, because (a) they run on the graphics card, so they do what they do really quickly and (b) the kind of transformations they can do can be really convenient even in simple examples like this.
//The reason that we’re introducing shaders in what is meant to be a simple WebGL example (they’re at least “intermediate” in OpenGL tutorials) is that we use them to get the WebGL system, hopefully running on the graphics card, to apply our model-view matrix and our projection matrix to our scene without us having to move around every point and every vertex in (relatively) slow JavaScript.   This is incredibly useful, and worth the extra overhead.

var shaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    //Once the function has set up the program and attached the shaders, it gets a reference to an “attribute”, which it stores in a new field on the program object called vertexPositionAttribute. Once again we’re taking advantage of JavaScript’s willingness to set any field on any object; program objects don’t have a vertexPositionAttribute field by default, but it’s convenient for us to keep the two values together, so we just make the attribute a new field of the program.
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

//we define a variable called mvMatrix to hold the model-view matrix and one called pMatrix for the projection matrix, and then set them to empty (all-zero) matrices to start off with. It’s worth saying a bit more about the projection matrix here. As you will remember, we applied the glMatrix function mat4.perspective to this variable to set up our perspective, right at the start of drawScene. This was because WebGL does not directly support perspective, just like it doesn’t directly support a model-view matrix.  But just like the process of moving things around and rotating them that is encapsulated in the model-view matrix, the process of making things that are far away look proportionally smaller than things close up is the kind of thing that matrices are really good at representing.  And, as you’ve doubtless guessed by now, the projection matrix is the one that does just that.  The mat4.perspective function, with its aspect ratio and field-of-view, populated the matrix with the values that gave use the kind of perspective we wanted.


//Define the model-view matrix mvMatrix and the projection matrix pMatrix, along with the function setMatrixUniforms for pushing them over the JavaScript/WebGL divide so that the shaders can see them.

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

//using the references to the uniforms that represent our projection matrix and our model-view matrix that we got back in initShaders, we send WebGL the values from our JavaScript-style matrices.
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}



var triangleVertexPositionBuffer;
var squareVertexPositionBuffer;

//used to push our objects' (in this case a triangle and a square) vertex
//positions up to the graphics card

function initBuffers() {
    triangleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    var vertices = [
	 0.0,  1.0,  0.0,
	-1.0, -1.0,  0.0,
	 1.0, -1.0,  0.0
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    triangleVertexPositionBuffer.itemSize = 3;
    triangleVertexPositionBuffer.numItems = 3;

    squareVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    vertices = [
	 1.0,  1.0,  0.0,
	-1.0,  1.0,  0.0,
	 1.0, -1.0,  0.0,
	-1.0, -1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    squareVertexPositionBuffer.itemSize = 3;
    squareVertexPositionBuffer.numItems = 4;
}

//here we use the buffers defined above to actually draw the image we're seeing
function drawScene() {
    //The first step is to tell WebGL a little bit about the size of the canvas using the      viewport function
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    //next we clear the canvas in preparation for drawing on it
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update: mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix); mat4.perspective() API has changed.
    //here we are setting up the perspective with which we want to view the scene.
    //By default, WebGL will draw things that are close by the same size as things
    //that are far away (a style of 3D known as orthographic projection).
    //In order to make things that are further away look smaller, we need to tell it
    //a little about the perspective we are using. For this scene, we're saying that
    //our (vertical) field of view is 45 degrees, we're telling it about the width-
    //to-height ratio of our canvas, and saying that we don't want to see things that
    //are closer than 0.1 units to our viewpoint, and that we don't want to see things
    //that are further away than 100 units
    mat4.perspective (pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    //The current position and current rotation are both held in a matrix; as you probably learned at school, matrices can represent translations (moves from place to place), rotations, and other geometrical transformations.  For reasons I won’t go into right now, you can use a single 4×4 matrix (not 3×3) to represent any number of transformations in 3D space; you start with the identity matrix — that is, the matrix that represents a transformation that does nothing at all — then multiply it by the matrix that represents your first transformation, then by the one that represents your second transformation, and so on.   The combined matrix represents all of your transformations in one. The matrix we use to represent this current move/rotate state is called the model-view matrix, and by now you have probably worked out that the variable mvMatrix holds our model-view matrix, and the mat4.identity function that we just called sets it to the identity matrix so that we’re ready to start multiplying translations and rotations into it.  Or, in other words, it’s moved us to an origin point from which we can move to start drawing our 3D world.
    //    Sharp-eyed readers will have noticed that at the start of this discussion of matrices I said “in OpenGL”, not “in WebGL”.  This is because WebGL doesn’t have this stuff built in to the graphics library. Instead, we use a third-party matrix library — Brandon Jones’s excellent glMatrix — plus some nifty WebGL tricks to get the same effect. More about that niftiness later.
    //note, by setting mvMatrix to the identity matrix, we've moved to the centre of our
    //3D Space
    mat4.identity(mvMatrix);

    // Update: mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by. z altered to
    // approximate original scene.

    //Having moved to the centre of our 3D space by setting mvMatrix to the identity matrix, we start the triangle  by moving 1.5 units to the left (that is, in the negative sense along the X axis), and 5.4 units into the scene (that is, away from the viewer; the negative sense along the Z axis).  (mat4.translate, as you might guess, means “multiply the given matrix by a translation matrix with the following parameters”.)
    mat4.translate(mvMatrix, mvMatrix, [-1.5, 0.0, -5.4]);

    //The next step is to actually start drawing something!
    //So, you remember that in order to use one of our buffers, we call gl.bindBuffer to specify a current buffer, and then call the code that operates on it. Here we’re selecting our triangleVertexPositionBuffer, then telling WebGL that the values in it should be used for vertex positions.
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //This tells WebGL to take account of our current model-view matrix (and also the projection matrix, about which more later).   This is required because all of this matrix stuff isn’t built in to WebGL.  The way to look at it is that you can do all of the moving around by changing the mvMatrix variable you want, but this all happens in JavaScript’s private space.  setMatrixUniforms, a function that’s defined further up in this file, moves it over to the graphics card.
    setMatrixUniforms();

    //Once this is done, WebGL has an array of numbers that it knows should be treated as vertex positions, and it knows about our matrices.   The next step tells it what to do with them:
    //Or, put another way, “draw the array of vertices I gave you earlier as triangles, starting with item 0 in the array and going up to the numItemsth element”.
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);


    //Next step, draw the square:
    //We start by moving our model-view matrix three units to the right.  Remember, we’re currently already 1.5 to the left and 7 away from the screen, so this leaves us 1.5 to the right and 7 away.
    mat4.translate(mvMatrix, mvMatrix, [3.0, 0.0, 0.0]);

    //we tell WebGL to use our square’s buffer for its vertex positions
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //we push over the model-view and projection matrices again (so that we take account of that last mvTranslate)
    setMatrixUniforms();

    //Draw the points.  What, you may ask, is a triangle strip?  Well, it’s a strip of triangles :-)   More usefully, it’s a strip of triangles where the first three vertices you give specify the first triangle, then the last two of those vertices plus the next one specify the next triangle, and so on.  In this case, it’s a quick-and-dirty way of specifying a square.  In more complex cases, it can be a really useful way of specifying a complex surface in terms of the triangles that approximate it.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
}



function webGLStart() {
    var canvas = document.getElementById("lesson01-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();

    //when we clear the canvas we should make it black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    //things drawn behind other things should be hidden by the things in front of them
    gl.enable(gl.DEPTH_TEST);

    drawScene();
}



