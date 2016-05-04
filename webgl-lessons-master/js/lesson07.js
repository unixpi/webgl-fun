
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

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

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


var crateTexture;

function initTexture() {
    crateTexture = gl.createTexture();
    crateTexture.image = new Image();
    crateTexture.image.onload = function () {
	handleLoadedTexture(crateTexture)
    };

    crateTexture.image.src = "crate.gif";
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


//copies the model-view and the projection matrices up to the shader’s uniforms.
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    // Update:
    //   mat4.toInverseMat3(mvMatrix, normalMatrix);
    //   mat3.transpose(normalMatrix);
    // These two methods have been combined into a single method in the mat3 class, mat3.normalFromMat4().

    //As you’d expect from something called a normal matrix, it’s used to transform the normals :-) We can’t transform them in the same way as we transform the vertex positions, using the regular model-view matrix, because normals would be converted by our translations as well as our rotations — for example, if we ignore rotation and assume we’ve done an mvTranslate of (0, 0, -5), the normal (0, 0, 1) would become (0, 0, -4), which is not only too long but is pointing in precisely the wrong direction. We could work around that; you may have noticed that in the vertex shaders, when we multiply the 3-element vertex positions by the 4×4 model-view matrix, in order to make the two compatible we extend the vertex position to four elements by adding an extra 1 onto the end. This 1 is required not just to pad things out, but also to make the multiplication apply translations as well as rotations and other transformations, and it so happens that by adding on a 0 instead of a 1, we could make the multiplication ignore the translations. This would work perfectly well for us right now, but unfortunately wouldn’t handle cases where our model-view matrix included different transformations, specifically scaling and shearing. For example, if we had a model-view matrix that doubled the size of the objects we were drawing, their normals would wind up double-length as well, even with a trailing zero — which would cause serious problems with the lighting. So, in order not to get into bad habits, we’re doing it properly :-)

    //    The proper way to get the normals pointing in the right direction, is to use the transposed inverse of the top-left 3×3 portion of the model-view matrix.

    //Anyway, once we’ve calculated this matrix and done the appropriate magic, it’s put into the shader uniforms just like the other matrices.
    
    mat3.normalFromMat4(normalMatrix, mvMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}


function degToRad(degrees) {
    return degrees * Math.PI / 180;
}



var xRot = 0;
var xSpeed = 3;

var yRot = 0;
var ySpeed = -3;

// Update: z altered to approximate original scene.
var z = -3.9;


var currentlyPressedKeys = {};

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;
}


function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}


function handleKeys() {
    if (currentlyPressedKeys[33]) {
	// Page Up
	z -= 0.05;
    }
    if (currentlyPressedKeys[34]) {
	// Page Down
	z += 0.05;
    }
    if (currentlyPressedKeys[37]) {
	// Left cursor key
	ySpeed -= 1;
    }
    if (currentlyPressedKeys[39]) {
	// Right cursor key
	ySpeed += 1;
    }
    if (currentlyPressedKeys[38]) {
	// Up cursor key
	xSpeed -= 1;
    }
    if (currentlyPressedKeys[40]) {
	// Down cursor key
	xSpeed += 1;
    }
}

var cubeVertexPositionBuffer;
var cubeVertexNormalBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [
	// Front face
	-1.0, -1.0,  1.0,
	 1.0, -1.0,  1.0,
	 1.0,  1.0,  1.0,
	-1.0,  1.0,  1.0,

	// Back face
	-1.0, -1.0, -1.0,
	-1.0,  1.0, -1.0,
	 1.0,  1.0, -1.0,
	 1.0, -1.0, -1.0,

	// Top face
	-1.0,  1.0, -1.0,
	-1.0,  1.0,  1.0,
	 1.0,  1.0,  1.0,
	 1.0,  1.0, -1.0,

	// Bottom face
	-1.0, -1.0, -1.0,
	 1.0, -1.0, -1.0,
	 1.0, -1.0,  1.0,
	-1.0, -1.0,  1.0,

	// Right face
	 1.0, -1.0, -1.0,
	 1.0,  1.0, -1.0,
	 1.0,  1.0,  1.0,
	 1.0, -1.0,  1.0,

	// Left face
	-1.0, -1.0, -1.0,
	-1.0, -1.0,  1.0,
	-1.0,  1.0,  1.0,
	-1.0,  1.0, -1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 3;
    cubeVertexPositionBuffer.numItems = 24;

    cubeVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
    var vertexNormals = [
	// Front face
	 0.0,  0.0,  1.0,
	 0.0,  0.0,  1.0,
	 0.0,  0.0,  1.0,
	 0.0,  0.0,  1.0,

	// Back face
	 0.0,  0.0, -1.0,
	 0.0,  0.0, -1.0,
	 0.0,  0.0, -1.0,
	 0.0,  0.0, -1.0,

	// Top face
	 0.0,  1.0,  0.0,
	 0.0,  1.0,  0.0,
	 0.0,  1.0,  0.0,
	 0.0,  1.0,  0.0,

	// Bottom face
	 0.0, -1.0,  0.0,
	 0.0, -1.0,  0.0,
	 0.0, -1.0,  0.0,
	 0.0, -1.0,  0.0,

	// Right face
	 1.0,  0.0,  0.0,
	 1.0,  0.0,  0.0,
	 1.0,  0.0,  0.0,
	 1.0,  0.0,  0.0,

	// Left face
	-1.0,  0.0,  0.0,
	-1.0,  0.0,  0.0,
	-1.0,  0.0,  0.0,
	-1.0,  0.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
    cubeVertexNormalBuffer.itemSize = 3;
    cubeVertexNormalBuffer.numItems = 24;

    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    var textureCoords = [
	// Front face
	0.0, 0.0,
	1.0, 0.0,
	1.0, 1.0,
	0.0, 1.0,

	// Back face
	1.0, 0.0,
	1.0, 1.0,
	0.0, 1.0,
	0.0, 0.0,

	// Top face
	0.0, 1.0,
	0.0, 0.0,
	1.0, 0.0,
	1.0, 1.0,

	// Bottom face
	1.0, 1.0,
	0.0, 1.0,
	0.0, 0.0,
	1.0, 0.0,

	// Right face
	1.0, 0.0,
	1.0, 1.0,
	0.0, 1.0,
	0.0, 0.0,

	// Left face
	0.0, 0.0,
	1.0, 0.0,
	1.0, 1.0,
	0.0, 1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 24;

    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    var cubeVertexIndices = [
	0, 1, 2,      0, 2, 3,    // Front face
	4, 5, 6,      4, 6, 7,    // Back face
	8, 9, 10,     8, 10, 11,  // Top face
	12, 13, 14,   12, 14, 15, // Bottom face
	16, 17, 18,   16, 18, 19, // Right face
	20, 21, 22,   20, 22, 23  // Left face
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 36;
}


function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update: mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix); mat4.perspective() API has changed.
    mat4.perspective (pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    mat4.identity(mvMatrix);

    // Update: mat4.translate(mvMatrix, [0.0, 0.0, z]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by.
    mat4.translate(mvMatrix, mvMatrix, [0.0, 0.0, z]);

    // Update: mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0]); mat4.rotate() API has changed to mat4.rotate(out, a, rad, axis)
    // where out is the receiving matrix and a is the matrix to rotate.
    mat4.rotate(mvMatrix, mvMatrix, degToRad(xRot), [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(yRot), [0, 1, 0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, crateTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    //The next bit is a little more involved. Firstly, we see if the “lighting” checkbox is checked, and set a uniform for our shaders telling them whether or not it is
    var lighting = document.getElementById("lighting").checked;
    gl.uniform1i(shaderProgram.useLightingUniform, lighting);

    //Next, if lighting is enabled, we read out the red, green and blue values for the ambient lighting as specified in the input fields at the bottom of the page and push them up to the shaders too
    if (lighting) {
	gl.uniform3f(
	    shaderProgram.ambientColorUniform,
	    parseFloat(document.getElementById("ambientR").value),
	    parseFloat(document.getElementById("ambientG").value),
	    parseFloat(document.getElementById("ambientB").value)
	);

	//Next, we want to push up the lighting direction
	//we adjust the lighting direction vector before passing it to the shader, using the vec3 module — which, like the mat4 we use for our model-view and projection matrices, is part of glMatrix. The first adjustment, vec3.normalize, scales it up or down so that its length is one; you will remember that for the cosine of the angle between two vectors to be equal to the dot product, they both need to be of length one. The normals we defined earlier all had the correct length, but as the lighting direction is entered by the user (and it would be a pain for them to have normalise vectors themselves) then we convert this one. The second adjustment is to multiply the vector by a scalar -1 — that is, to reverse its direction. This is because we’re specifying the lighting direction in terms of where the light is going, while the calculations we discussed earlier were in terms of where the light is coming from. Once we’ve done that, we pass it up to the shaders using gl.uniform3fv, which puts a three-element Float32Array (which is what the vec3 functions are dealing with) into a uniform.
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

	//The next bit of code is simpler; it just copies the directional light’s colour components up to the appropriate shader uniform 
	gl.uniform3f(
	    shaderProgram.directionalColorUniform,
	    parseFloat(document.getElementById("directionalR").value),
	    parseFloat(document.getElementById("directionalG").value),
	    parseFloat(document.getElementById("directionalB").value)
	);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}


var lastTime = 0;

function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
	var elapsed = timeNow - lastTime;

	xRot += (xSpeed * elapsed) / 1000.0;
	yRot += (ySpeed * elapsed) / 1000.0;
    }
    lastTime = timeNow;
}


function tick() {
    requestAnimFrame(tick);
    handleKeys();
    drawScene();
    animate();
}


function webGLStart() {
    var canvas = document.getElementById("lesson07-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
}

