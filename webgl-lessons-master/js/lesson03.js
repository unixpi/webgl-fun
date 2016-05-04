
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

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

//We have a list to hold our stack of matrices, and define push and pop appropriately.
function mvPushMatrix() {
    var copy = mat4.create();
    // Update: mat4.set(mvMatrix, copy); mat4.set() was removed from gl-matrix, use mat4.copy().
    mat4.copy(copy, mvMatrix);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
	throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


var triangleVertexPositionBuffer;
var triangleVertexColorBuffer;
var squareVertexPositionBuffer;
var squareVertexColorBuffer;

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

    triangleVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
    var colors = [
	1.0, 0.0, 0.0, 1.0,
	0.0, 1.0, 0.0, 1.0,
	0.0, 0.0, 1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    triangleVertexColorBuffer.itemSize = 4;
    triangleVertexColorBuffer.numItems = 3;


    squareVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    vertices = [
	 1.0,  1.0,  1.0,
	-1.0,  1.0,  1.0,
	 1.0, -1.0,  1.0,
	-1.0, -1.0,  1.0
	];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    squareVertexPositionBuffer.itemSize = 3;
    squareVertexPositionBuffer.numItems = 4;

    squareVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
    colors = [];
    for (var i=0; i < 4; i++) {
	colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    squareVertexColorBuffer.itemSize = 4;
    squareVertexColorBuffer.numItems = 4;
}



//These are used to track the rotation of the triangle and the square respectively. They both start off rotated by zero degrees, and then over time these numbers will increase — you’ll see how later — making them rotate more and more. (A side note — using global variables for things like this in a 3D program that is not a simple demo like this would be really bad practice. I show how to structure things in a more elegant manner in lesson 9.

var rTri = 0;
var rSquare = 0;

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update: mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix); mat4.perspective() API has changed.
    mat4.perspective (pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    mat4.identity(mvMatrix);

    // Update: mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by. z altered to
    // approximate original scene.
    mat4.translate(mvMatrix, mvMatrix, [-1.5, 0.0, -5.4]);

    //Now, what about the calls to mvPushMatrix and mvPopMatrix? As you would expect from the function names, they’re also related to the model-view matrix. Going back to my example of drawing a robot, let’s say your code at the highest level needs to move to point A, draw the robot, then move to some offset from point A and draw a teapot. The code that draws the robot might make all kinds of changes to the model-view matrix; it might start with a body, then move down for the legs, then up for the head, and finish off with the arms. The problem is that if after this you tried to move to your offset, you’d move not relative to point A but instead relative to whatever you last drew, which would mean that if your robot lifted its arms, the teapot would start levitating. Not a good thing.

//    Obviously what is required is some way of storing the state of the model-view matrix before you start drawing the robot, and restoring it afterwards. This is, of course, what mvPushMatrix and mvPopMatrix do. mvPushMatrix puts the matrix onto a stack, and mvPopMatrix gets rid of the current matrix, takes one from the top of the stack, and restores it. Using a stack means that we can have any number of bits of nested drawing code, each of which manipulates the model-view matrix and then restores it afterwards. So once we’ve finished drawing our rotated triangle, we restore the model-view matrix with mvPopMatrix
//    mvPushMatrix();

    // Update: mat4.rotate(mvMatrix, degToRad(rTri), [0, 1, 0]); mat4.rotate() API has changed to mat4.rotate(out, a, rad, axis)
    // where out is the receiving matrix and a is the matrix to rotate.
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rTri), [0, 1, 0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);
  //  mvPopMatrix();


    mat4.translate(mvMatrix, mvMatrix, [3.0, 0.0, 0.0]);

    mvPushMatrix();
    mat4.rotate(mvMatrix, mvMatrix, degToRad(rSquare), [1, 0, 0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);

    mvPopMatrix();
}


var lastTime = 0;
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
	var elapsed = timeNow - lastTime;

	//the triangle is rotating by 90 degrees per second, and the square by 75 degrees per second. The nice thing about doing it this way is that everyone sees the same rate of motion in the scene regardless of how fast their machine is;
	rTri += (90 * elapsed) / 1000.0;
	rSquare += (75 * elapsed) / 1000.0;
    }
    lastTime = timeNow;
}


function tick() {
    //The first line is where tick arranges to be called again when a repaint is needed next. requestAnimFrame is a function in some Google-provided code that we’re including into this web page with a <script> tag at the top, webgl-utils.js. It gives us a browser-independent way of asking the browser to call us back next time it wants to repaint the WebGL scene — for example, next time the computer’s display is refreshing itself. Right now, functions to do this exist in all WebGL-supporting browsers, but they have different names for it (for example, Firefox has a function called mozRequestAnimationFrame, while Chrome and Safari have webkitRequestAnimationFrame). In the future they are expected to all use just requestAnimationFrame. Until then, we can use the Google WebGL utils to have just one call that works everywhere.
    //worth noting that you could get a similar effect to using requestAnimFrame by asking JavaScript to call the drawScene function regularly, for example by using the built-in JavaScript setInterval function. A lot of early WebGL code (including earlier versions of these tutorials) did just that, and it worked fine — right up until people had more than one WebGL page open, in different browser tabs. Because functions scheduled with setInterval are called regardless of whether the browser tab they belong to is showing, using it meant that computers were doing all the work of displaying every open WebGL tab all the time, hidden or not. This was obviously a Bad Thing, and was the reason why requestAnimationFrame was introduced; functions scheduled using it are only called when the tab is visible.
    requestAnimFrame(tick);

    //draw this frame
    drawScene();
    //update our state for the next
    animate();
}


function webGLStart() {
    var canvas = document.getElementById("lesson03-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //The only change here is that instead of calling drawScene at the end to draw the scene, we call a new function, tick. This is the function that needs to be called regularly; it updates the scene’s animation state (eg. the triangle has moved from being 81 degrees rotated to 82 degrees) draws the scene, and also arranges for itself to be called again in an appropriate time.
    tick();
}

