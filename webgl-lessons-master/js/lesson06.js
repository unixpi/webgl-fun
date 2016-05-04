
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

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}


function handleLoadedTexture(textures) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    //Nearest filtering
//The first texture has gl.TEXTURE_MAG_FILTER and gl.TEXTURE_MIN_FILTER both set to gl.NEAREST. This is our original set-up, and it means that both when the texture is being scaled up and when it's being scaled down, WebGL should use a filter that determines the colour of a given point just by looking for the nearest point in the original image. This will look just fine if the texture is not scaled at all, and will look OKish if it's scaled down (but see the discussion of aliasing below). However, when it's scaled up, it will look "blocky", as this algorithm effectively scales the pixels in the original image up.
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[0].image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);


    //Linear filtering

 //   For the second texture, gl.TEXTURE_MAG_FILTER and gl.TEXTURE_MIN_FILTER are both gl.LINEAR. Here we're once again using the same filter for both scaling up and scaling down. However, the linear algorithm can work better for scaled-up textures; basically, it just uses linear interpolation between the pixels of the original texture image — roughly speaking, a pixel that is half-way between a black one and a white one comes out grey. This gives a much smoother effect, though (of course) sharp edges get a bit blurred. (To be fair, when you scale an image up it's never going to look perfect — you can't get detail that isn't there.)
    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[1].image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);


    //Mipmaps
    
    //For the third texture, gl.TEXTURE_MAG_FILTER is gl.LINEAR and gl.TEXTURE_MIN_FILTER is gl.LINEAR_MIPMAP_NEAREST. This is the most complex of the three options.

//    Linear filtering gives reasonable results when you scale the texture up, but it's no better than nearest filtering when scaling down; in fact, both filters can cause ugly aliasing effects. To see what these look like, load up the sample again so that it's using nearest filtering (or hit the refresh button to get it back to its initial state), and hold down the Page Up key for a few seconds to zoom out. As the cube moves away, at some point you'll see it start "twinkling", with vertical lines seeming to appear and disappear. Once you see this, stop and try zooming in and out a bit, watching the twinkling, then press F once to switch to linear filtering, move it back and forward a bit more, and note that you get pretty much the same effect. Now press F once more to use mipmap filtering, zoom in and out again, and you should see this effect eliminated or at least very much reduced.

    //Now, while the cube is quite far away — say, 10% of the width/height of the overall canvas — try cycling through the filters without moving it. With nearest or linear filtering, you will notice that in some places the dark lines that make up the grain of the wood in the texture are very clear, whereas in others they have disappeared; the cube looks a bit "splotchy". This is really bad with nearest filtering, but not much better with linear. Only mipmapped filtering works well.

    //What's happening with nearest and linear filtering is that when the texture is scaled down to (say) one-tenth size, the filter uses every tenth pixel in the original image to make up the scaled-down version. The texture has a wooden "grain" pattern, which means that most of it is light brown but there are thin vertical dark lines; let's imagine that the grain is ten pixels wide, or that in other words there is a dark brown pixel every ten pixels horizontally. If the image is scaled down to one tenth, then there is a one-in-ten chance of any given pixel being dark brown, nine-in-ten of it being light. Or to put it another way, one in ten of the dark lines in the original image are shown just as clearly as they were when the image was full-sized, and the others are completely hidden. This causes the splotchy effect, and also adds the twinkling when the scale is changing, because the specific dark lines that are chosen might be completely different at scaling factors of 9.9, 10.0 and 10.1.

//    What we'd really like to do is be in a situation where when the image is scaled to one tenth of its original size, each pixel is coloured based on the average of the ten-by-ten pixel square that it is a scaled-down version of. Doing this smoothly is too computationally expensive for real-time graphics, and this is where mipmap filtering comes in.

//Mipmap filtering solves the problem by generating for the texture a number of subsidiary images (called mip levels), at half, one-quarter, one-eighth, and so on of the original size, all the way down to a one-by-one pixel version. The set of all of these mip levels is called a mipmap. Each mip level is a smoothly averaged version of the next-largest one, and so the appropriate version can be chosen for the current level of scaling; the algorithm for this depends on the value used for gl.TEXTURE_MIN_FILTER, the one we chose being basically meaning "find the closest mip level and do a linear filter on that to get the pixel".
    gl.bindTexture(gl.TEXTURE_2D, textures[2]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[2].image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
}


var crateTextures = [];

function initTexture() {
    var crateImage = new Image();

    for (var i=0; i < 3; i++) {
	var texture = gl.createTexture();
	texture.image = crateImage;
	crateTextures.push(texture);
    }

    crateImage.onload = function () {
	handleLoadedTexture(crateTextures)
    };
    crateImage.src = "crate.gif";
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
}


function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//the current rotation and speed of the cube around the X axes
var xRot = 0;
var xSpeed = 0;

//the current rotation and speed of the cube around Y axes
var yRot = 0;
var ySpeed = 0;

// Update: z altered to approximate original scene.
//he Z-coordinate of the cube — that is, how close it is to the viewer — and will be controlled by the Page Up and Page Down keys
var z = -3.9;

//filter is an integer ranging from 0 to 2, which specifies which of three filters is used on the texture that we’re mapping on to the cube
var filter = 0;


var currentlyPressedKeys = {};

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;

    if (String.fromCharCode(event.keyCode) == "F") {
	filter += 1;
	if (filter == 3) {
	    filter = 0;
	}
    }
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

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, crateTextures[filter]);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

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
    var canvas = document.getElementById("lesson06-canvas");
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
