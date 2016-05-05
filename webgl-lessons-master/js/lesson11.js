
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
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 2;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
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

    mat4.identity(mvMatrix);

    // Update: mat4.translate(mvMatrix, [0, 0, -6]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by. z altered to
    // approximate original scene.
    mat4.translate(mvMatrix, mvMatrix, [0, 0, -4.7]);

    mat4.multiply(mvMatrix, mvMatrix, moonRotationMatrix);

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

    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    tick();
}

