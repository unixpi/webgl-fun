
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

    mat4.identity(mvMatrix);

    // Update: mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by. z altered to
    // approximate original scene.
    mat4.translate(mvMatrix, mvMatrix, [-1.5, 0.0, -5.4]);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);



    mat4.translate(mvMatrix, mvMatrix, [3.0, 0.0, 0.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    setMatrixUniforms();
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



