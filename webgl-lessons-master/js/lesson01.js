
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

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix = mat4.create();
var pMatrix = mat4.create();

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



