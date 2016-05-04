
//how to get “proper” transparency? Well, the OpenGL FAQ says that you need to use a source factor of SRC_ALPHA and a destination factor of ONE_MINUS_SRC_ALPHA. But we still have the problem that the source and the destination fragments are treated differently, and so there’s a dependency on the order in which stuff is drawn. And this point finally gets us to what I think of as the dirty secret of transparency in Open-/WebGL; again, quoting the OpenGL FAQ:

//When using depth buffering in an application, you need to be careful about the order in which you render primitives. Fully opaque primitives need to be rendered first, followed by partially opaque primitives in back-to-front order. If you don’t render primitives in this order, the primitives, which would otherwise be visible through a partially opaque primitive, might lose the depth test entirely.

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
    shaderProgram.alphaUniform = gl.getUniformLocation(shaderProgram, "uAlpha");
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


var glassTexture;

function initTexture() {
    glassTexture = gl.createTexture();
    glassTexture.image = new Image();
    glassTexture.image.onload = function () {
	handleLoadedTexture(glassTexture)
    };

    glassTexture.image.src = "glass.gif";
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
    gl.bindTexture(gl.TEXTURE_2D, glassTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);
//Firstly, we check whether the “blending” checkbox is checked
    var blending = document.getElementById("blending").checked;
    
    //If it is, we set the function that will be used to combine the two fragments:
    if (blending) {

	//The parameters to this function define how the blending is done. This is fiddly, but not difficult. Firstly, let’s define two terms: the source fragment is the one that we’re drawing right now, and the destination fragment is the one that’s already in the frame buffer. The first parameter to the gl.blendFunc determines the source factor, and the second the destination factor; these factors are numbers used in the blending function. In this case, we’re saying that the source factor is the source fragment’s alpha value, and the destination factor is a constant value of one. There are other possibilities; for example, if you use SRC_COLOR to specify the source colour, you wind up with separate source factors for the red, green, blue and alpha values, each of which is equal to the original RGBA components.

	//Now, let’s imagine that WebGL is trying to work out the colour of a fragment when it has a destination with RGBA values of (Rd, Gd, Bd, Ad) and an incoming source fragment with values (Rs, Gs, Bs, As).

//	    In addition, let’s say that we’ve got RGBA source factors of (Sr, Sg, Sb, Sa) and destination factors of (Dr, Dg, Db, Da)

//	For each colour component WebGL will calculate as follows:

//	Rresult = Rs * Sr + Rd * Dr
//	Gresult = Gs * Sg + Gd * Dg
//	Bresult = Bs * Sb + Bd * Db
//	Aresult = As * Sa + Ad * Da
//	So, in our case, we’re saying (just giving the calculation for the red component, to keep things simple):

//	Rresult = Rs * As + Rd
//	Normally this wouldn’t be an ideal way of creating transparency, but it happens to work very nicely in this case when the lighting is switched on. And this point is well worth emphasising; blending is not the same as transparency, it’s just a technique that can be used (among others) to get transparent-style effects.
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

	//like many things in WebGL, blending is disabled by default, so we need to switch it on.
	gl.enable(gl.BLEND);

	//we have to switch off depth testing. If we don’t do this, then the blending will happen in some cases and not in others. For example, if we draw a face of our cube that happens to be at the back before one at the front, then when the back face is drawn it will be written to the frame buffer, and then the front one will be blended on top of it, which is what we want. However, if we draw the front face first and then the back one, the back one will be discarded by the depth test before we get to the blending function, so it will not contribute to the image. This is not what we want.
	gl.disable(gl.DEPTH_TEST);

//	Here we’re loading an alpha value from a text field in the page and pushing it up to the shaders. This is because the image we’re using for the texture doesn’t have an alpha channel of its own (it’s just RGB, so has an implicit alpha value of 1 for every pixel) so it’s nice to be able to adjust the alpha to see how it affects the image
	gl.uniform1f(shaderProgram.alphaUniform, parseFloat(document.getElementById("alpha").value));
    } else {
	//The remainder of the code in drawScene is just that which is necessary to handle things in the normal fashion when blending is switched off:
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
    }

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
    var canvas = document.getElementById("lesson08-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //This is an instruction to the WebGL system about what to do when writing a new fragment to the frame buffer, and basically means “pay attention to the depth buffer”. It’s taken in combination with another WebGL setting, the depth function. This actually has a sensible value by default, but if we were we actively set it to its default value, it would look like this:

//    gl.depthFunc(gl.LESS);
//  This means “if our fragment has a Z value that is less than the one that is currently there, use our new one rather than the old one”. This test on its own, combined with the code to enable it, is enough to give us sensible behaviour; things that are close up obscure things that are further away. (You can also set the depth function to various other values, though I suspect they’re more rarely used.)
    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
}
