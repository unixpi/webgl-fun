
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

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
    shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
}


function handleLoadedTexture(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
}


var moonTexture;

function initTexture() {
    moonTexture = gl.createTexture();
    moonTexture.image = new Image();
    moonTexture.image.onload = function () {
	handleLoadedTexture(moonTexture)
    };

    moonTexture.image.src = "moon.gif";
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

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

    var normalMatrix = mat3.create();
    // Update:
    //   mat4.toInverseMat3(mvMatrix, normalMatrix);
    //   mat3.transpose(normalMatrix);
    // These two methods have been combined into a single method in the mat3 class, mat3.normalFromMat4().
    mat3.normalFromMat4(normalMatrix, mvMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}


function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

//We keep a matrix to store the current rotation state of the moon, logically enough called moonRotationMatrix. When the user drags the mouse around, we get a sequence of mouse-move events, and each time we see one we work out how many degrees of rotation around the current X and Y axes as seen by the user that drag amounts to. We then calculate a matrix that represents those two rotations, and pre-multiply the moonRotationMatrix by it
var moonRotationMatrix = mat4.create();
mat4.identity(moonRotationMatrix);

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}


function handleMouseUp(event) {
    mouseDown = false;
}

function handleMouseMove(event) {
    if (!mouseDown) {
	return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var newRotationMatrix = mat4.create();
    mat4.identity(newRotationMatrix);
    // Update: mat4.rotate(newRotationMatrix, degToRad(deltaX / 10), [0, 1, 0]); mat4.rotate() API has changed to mat4.rotate(out, a, rad, axis)
    // where out is the receiving matrix and a is the matrix to rotate.
    mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaX / 10), [0, 1, 0]);

    var deltaY = newY - lastMouseY;
    mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaY / 10), [1, 0, 0]);

    // Update: mat4.multiply(newRotationMatrix, moonRotationMatrix, moonRotationMatrix); API has changed.
    mat4.multiply(moonRotationMatrix, newRotationMatrix, moonRotationMatrix);

    lastMouseX = newX;
    lastMouseY = newY;
}



var moonVertexPositionBuffer;
var moonVertexNormalBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexIndexBuffer;
function initBuffers() {
    //what are the latitude and longitude bands? In order to draw a set of triangles that are an approximation to a sphere, we need to divide it up. There are many clever ways of doing it, and one simple way based on high school geometry that (a) gets perfectly decent results and (b) I can actually understand without making my head hurt. So here’s that one :-) It’s based on one of the demos on the Khronos website, was originally developed by the WebKit team, and it works like this:

//    Let’s start by defining the terminology: the lines of latitude are the ones that, on a globe, tell you how far north or how far south you are. The distance between them, as measured along the surface of the sphere, is constant. If you were to slice up a sphere from top to bottom along its lines of latitude, you’d wind up with thin lense-shaped bits for the top and the bottom, and then increasingly thick disc-like slices for the middle. (If this is hard to visualise, imagine slicing a tomato into discs for a salad, but trying to keep the same length of skin from the top to the bottom of each slice. Obviously the slices in the middle would be thicker than those at the top.)

//    The lines of longitude are different; they divide the sphere into segments. If you were to slice a sphere up along its lines of longitude, it would come apart rather like an orange.

    //Now, to draw our sphere, imagine that we’ve drawn the lines of latitude from top to bottom, and the lines of longitude around it. What we want to do is work out all of the points where those lines intersect, and use those as vertex positions. We can then split each square formed by two adjacent lines of longitude and two adjacent lines of latitude into two triangles, and draw them.
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 2;

    
    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    //loop through all of the latitudinal slices, then within that loop we run through the longitudinal segments, and we generate the normals, texture coordinates, and vertex positions for each. The only oddity to note is that our loops terminate when the index is greater than the number of longitudinal/latitudinal lines — that is, we use <= rather than < in the loop conditions. This means that for, say, 30 longitudes, we will generate 31 vertices per latitude. Because the trigonometric functions cycle, the last one will be in the same position as the first, and so this gives us an overlap so that everything joins up.
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
	var theta = latNumber * Math.PI / latitudeBands;
	var sinTheta = Math.sin(theta);
	var cosTheta = Math.cos(theta);

	for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
	    var phi = longNumber * 2 * Math.PI / longitudeBands;
	    var sinPhi = Math.sin(phi);
	    var cosPhi = Math.cos(phi);

	    var x = cosPhi * sinTheta;
	    var y = cosTheta;
	    var z = sinPhi * sinTheta;
	    var u = 1 - (longNumber / longitudeBands);
	    var v = 1 - (latNumber / latitudeBands);

	    normalData.push(x);
	    normalData.push(y);
	    normalData.push(z);
	    textureCoordData.push(u);
	    textureCoordData.push(v);
	    vertexPositionData.push(radius * x);
	    vertexPositionData.push(radius * y);
	    vertexPositionData.push(radius * z);
	}
    }

    var indexData = [];
    //Now that we have the vertices, we need to stitch them together by generating a list of vertex indices that contains sequences of six values, each representing a square expressed as a pair of triangles.

    //We loop through our vertices, and for each one, we store
    //its index in first, and then count longitudeBands + 1 indices forward to find its counterpart one latitude band down — adding the one because of the extra vertices we had to add to allow for the overlap — and store that in second. We then generate two triangles, as in the diagram.
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
	for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
	    var first = (latNumber * (longitudeBands + 1)) + longNumber;
	    var second = first + longitudeBands + 1;
	    indexData.push(first);
	    indexData.push(second);
	    indexData.push(first + 1);

	    indexData.push(second);
	    indexData.push(second + 1);
	    indexData.push(first + 1);
	}
    }

    moonVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    moonVertexNormalBuffer.itemSize = 3;
    moonVertexNormalBuffer.numItems = normalData.length / 3;

    moonVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    moonVertexTextureCoordBuffer.itemSize = 2;
    moonVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    moonVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    moonVertexPositionBuffer.itemSize = 3;
    moonVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    moonVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    moonVertexIndexBuffer.itemSize = 1;
    moonVertexIndexBuffer.numItems = indexData.length;
}


function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update: mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix); mat4.perspective() API has changed.
    mat4.perspective (pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    //setup lighting (same as chapter 7)
    var lighting = document.getElementById("lighting").checked;
    gl.uniform1i(shaderProgram.useLightingUniform, lighting);
    if (lighting) {
	gl.uniform3f(
	    shaderProgram.ambientColorUniform,
	    parseFloat(document.getElementById("ambientR").value),
	    parseFloat(document.getElementById("ambientG").value),
	    parseFloat(document.getElementById("ambientB").value)
	);

	var lightingDirection = [
	    parseFloat(document.getElementById("lightDirectionX").value),
	    parseFloat(document.getElementById("lightDirectionY").value),
	    parseFloat(document.getElementById("lightDirectionZ").value)
	];
	var adjustedLD = vec3.create();
	// Update: vec3.normalize(lightingDirection, adjustedLD); vec3.normalize() API has reversed the parameters.
	vec3.normalize(adjustedLD, lightingDirection);
	// Update: vec3.scale(adjustedLD, -1); vec3.scale() API has changed to vec3.scale(out, a, b)
	// where out is the receiving vector and a is the vector to scale.
	vec3.scale(adjustedLD, adjustedLD, -1);
	gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

	gl.uniform3f(
	    shaderProgram.directionalColorUniform,
	    parseFloat(document.getElementById("directionalR").value),
	    parseFloat(document.getElementById("directionalG").value),
	    parseFloat(document.getElementById("directionalB").value)
	);
    }


    //move to the correct position to draw the moon
    mat4.identity(mvMatrix);

    // Update: mat4.translate(mvMatrix, [0, 0, -6]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by. z altered to
    // approximate original scene.
    mat4.translate(mvMatrix, mvMatrix, [0, 0, -4.7]);

    //we’re storing the current rotational state of the moon in a matrix; this matrix starts off as the identity matrix (ie., we don’t rotate it at all) and then as the user manipulates it with the mouse, it changes to reflect those manipulations. So, before we draw the moon, we need to apply the rotation matrix to the current model-view matrix, which we can do with the mat4.multiply function:
    mat4.multiply(mvMatrix, mvMatrix, moonRotationMatrix);

    //Once that’s done, all that remains is to actually draw the moon. This code is pretty standard — we just set the texture then use the same kind of code as we’ve used many times before to tell WebGL to use some pre-prepared buffers to draw a bunch of triangles
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, moonTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}


function tick() {
    //schedule the next frame and calls drawScene
    requestAnimFrame(tick);
    drawScene();
}


function webGLStart() {
    var canvas = document.getElementById("lesson11-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //These three new lines allow us to detect mouse events and thus spin the moon when the user drags it around.
    canvas.onmousedown = handleMouseDown;
    //we want to listen for mouse-up and -move events on the document rather than the canvas; by doing this, we are able to pick up drag events even when the mouse is moved or released outside the 3D canvas, so long as the drag started in the canvas — this stops us from being one of those irritating pages where you press the mouse button inside the scene you want to spin, and then release it outside, only to find that when you move the mouse back over the scene the mouse-up has not taken effect and it still thinks you’re dragging stuff around until you click somewhere.
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    tick();
}

