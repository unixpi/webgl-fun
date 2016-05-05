
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
    shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
}


function handleLoadedTexture(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);
}


var starTexture;
function initTexture() {
    starTexture = gl.createTexture();
    starTexture.image = new Image();
    starTexture.image.onload = function () {
	handleLoadedTexture(starTexture)
    };

    starTexture.image.src = "star.gif";
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


var currentlyPressedKeys = {};

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;
}


function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}


var zoom = -12;


var tilt = 90;
var spin = 0;


function handleKeys() {
    if (currentlyPressedKeys[33]) {
	// Page Up
	zoom -= 0.1;
    }
    if (currentlyPressedKeys[34]) {
	// Page Down
	zoom += 0.1;
    }
    if (currentlyPressedKeys[38]) {
	// Up cursor key
	tilt += 2;
    }
    if (currentlyPressedKeys[40]) {
	// Down cursor key
	tilt -= 2;
    }
}


var starVertexPositionBuffer;
var starVertexTextureCoordBuffer;
function initBuffers() {
    starVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starVertexPositionBuffer);
    vertices = [
	-1.0, -1.0,  0.0,
	 1.0, -1.0,  0.0,
	-1.0,  1.0,  0.0,
	 1.0,  1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    starVertexPositionBuffer.itemSize = 3;
    starVertexPositionBuffer.numItems = 4;

    starVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starVertexTextureCoordBuffer);
    var textureCoords = [
	0.0, 0.0,
	1.0, 0.0,
	0.0, 1.0,
	1.0, 1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    starVertexTextureCoordBuffer.itemSize = 2;
    starVertexTextureCoordBuffer.numItems = 4;
}

//the (rather dull) code that draws the star: it just draws a square in a manner that will be familiar from the first lesson, using an appropriate texture and vertex position/texture coordinate buffers
function drawStar() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, starTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, starVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, starVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, starVertexPositionBuffer.numItems);
}



//JavaScript's object model is very different to other languages'. The way I've found it easiest to understand is that each object is created as a dictionary (or hashtable, or associative array) and then is turned into a fully-fledged object by putting values into it. The object's fields are simply entries in the dictionary that map to values, and the methods are entries that map to functions. Now, we add to that the fact that for single-word keys, the syntax foo.bar is a valid JavaScript shortcut for foo["bar"], and you can see how you get syntax similar to other languages' from a very different starting point.

//Next, when you're in any JavaScript function, there is an implicitly-bound variable called this which refers to the function's "owner". For global functions this is a global per-page "window" object, but if you put the keyword new before it then it will be a brand-new object instead. So, if you have a function that sets this.foo to 1 and this.bar to a function, and then you make sure you always call it with the new keyword, it's basically the same as a constructor combined with a class definition.

//Next, we can note that if a function is called using method invocation-like syntax (that is, foo.bar()), then this will be bound to the function's owner (foo), just as we'd expect, so the object's methods can do stuff to the object itself.

//Finally, there's one special attribute associated with a function, prototype. This is a dictionary of values that are associated with every object that is created using the new keyword with that function; this is a good way of setting values that will be the same for every object of that "class" — for example, methods.

// in the constructor function, the star is initialised with the values we provide and a starting angle of zero, and then a method is called.
function Star(startingDistance, rotationSpeed) {
    this.angle = 0;
    this.dist = startingDistance;
    this.rotationSpeed = rotationSpeed;

    // Set the colors to a starting value.
    this.randomiseColors();
}

// The next step is to bind the methods to the Star function's associated prototype so that all new Stars have the same methods

//draw is defined to take the parameters we passed in to it back in the main drawScene function. 
Star.prototype.draw = function (tilt, spin, twinkle) {
    //We start it off by pushing the current model-view matrix onto the matrix stack so that we can move around without fear of having side-effects elsewhere.
    mvPushMatrix();

    //Next we rotate around the Y axis by the star's own angle, and move out by the star's distance from the centre.This puts us in the correct position to draw the star.
    // Move to the star's position
    // Update: mat4.rotate(mvMatrix, degToRad(this.angle), [0.0, 1.0, 0.0]); mat4.rotate() API has changed to mat4.rotate(out, a, rad, axis)
    // where out is the receiving matrix and a is the matrix to rotate.
    mat4.rotate(mvMatrix, mvMatrix, degToRad(this.angle), [0.0, 1.0, 0.0]);
    // Update: mat4.translate(mvMatrix, [this.dist, 0.0, 0.0]); mat4.translate() API has changed to mat4.translate(out, a, v)
    // where out is the receiving matrix, a is the matrix to translate, and v is the vector to translate by.
    mat4.translate(mvMatrix, mvMatrix, [this.dist, 0.0, 0.0]);

    
    // Rotate back before drawing so that the star is facing the viewer
    //These lines are required so that when we alter the tilt of the scene using the cursor keys, the stars still look right. They are drawn as a 2D texture on a square, which looks right when we're looking at it straight on, but would just look like a line if we tilted the scene so that we were viewing it from the side. For similar reasons, we also need to back out the rotation required to position the star. When you "undo" rotations like this, you need to do so in the reverse of the order you did them in the first place, so first we undo the rotation from our positioning, and then the tilt (which was done in drawScene).
   mat4.rotate(mvMatrix, mvMatrix, degToRad(-this.angle), [0.0, 1.0, 0.0]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(-tilt), [1.0, 0.0, 0.0]);

    //The next lines are to draw the star
    if (twinkle) {

	//the star has two colours associated with it — its normal colour, and its "twinkling colour". To make it twinkle, before we draw the star itself we draw a non-spinning star in a different colour. This means that the two stars are blended together, making a nice bright colour, but also means that rays that come out of the first star to be drawn are stationary while the ones that come out of the second star are rotating, giving a nice effect. That's our twinkling.
	
	// Draw a non-rotating star in the alternate "twinkling" color
	gl.uniform3f(shaderProgram.colorUniform, this.twinkleR, this.twinkleG, this.twinkleB);
	drawStar();
    }


    //The star is drawn by first rotating around the Z axis by the spin that was passed in, so that it rotates around its own centre while it orbits the centre of the scene. We then push the star's colour up to the graphics card in a shader uniform, and then call a global drawStar function (which we'll come to in a moment).
    
    // All stars spin around the Z axis at the same rate
    mat4.rotate(mvMatrix, mvMatrix, degToRad(spin), [0.0, 0.0, 1.0]);

    // Draw the star in its main color
    gl.uniform3f(shaderProgram.colorUniform, this.r, this.g, this.b);
    drawStar();

    //once we've drawn the star, we just pop our model-view matrix from the stack and we're done
    mvPopMatrix();
};


//The next method we bind to the prototype is the one to animate the star
// instead of just getting the scene to update as fast as it can, I've chosen to make it change at a steady pace for everyone, so people with faster computers get smoother animations and people with slower ones jerkier. Now, I think that the numbers for the angular speed at which the stars orbit the centre of the scene and at which they move towards the centre were carefully calculated by NeHe, so rather than messing around with them I decided that it was best to assume that the numbers were calibrated for 60 frames per second and then use that and the elapsedTime (which you'll remember is the time between calls to the animate function) to scale the amount we move at each animation "tick" appropriately. elapsedTime is in milliseconds, and so we want an effective frames-per-millisecond of 60 / 1000. We put this into a global variable outside the animate method, so that it won't be recalculated every time we paint a star
var effectiveFPMS = 60 / 1000;
Star.prototype.animate = function (elapsedTime) {
    //now we have this number we can adjust the star's angle — that is, how far around its orbit of the centre of the scene it is
    this.angle += this.rotationSpeed * effectiveFPMS * elapsedTime;

    //and we can adjust its distance from the centre, moving it out to the outside of the scene and resetting its colours to something random when it finally reaches the centre
    
    // Decrease the distance, resetting the star to the outside of
    // the spiral if it's at the center.
    this.dist -= 0.01 * effectiveFPMS * elapsedTime;
    if (this.dist < 0.0) {
	this.dist += 5.0;
	this.randomiseColors();
    }

};


//The final bit of code that makes up the Star's prototype is that code we saw used in the constructor and just now in the animation code to randomise its twinkling and non-twinkling colours
Star.prototype.randomiseColors = function () {
    // Give the star a random color for normal
    // circumstances...
    this.r = Math.random();
    this.g = Math.random();
    this.b = Math.random();

    // When the star is twinkling, we draw it twice, once
    // in the color below (not spinning) and then once in the
    // main color defined above.
    this.twinkleR = Math.random();
    this.twinkleG = Math.random();
    this.twinkleB = Math.random();
};


//create stars
var stars = [];
function initWorldObjects() {
    var numStars = 200;

    for (var i=0; i < numStars; i++) {
	// Each star is given a first parameter specifying a starting distance from the centre of the scene and a second specifying a speed to orbit the centre of the scene, both of which come from their position in the list.
	stars.push(new Star((i / numStars) * 5.0, i / numStars));
    }
}


function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update: mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix); mat4.perspective() API has changed.
    mat4.perspective (pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    //we switch on blending. We’re using the same blending as we did in the last lesson; you will remember that this allows objects to “shine through” each other. Usefully, it also means that black parts of an object are drawn as if they were transparent;
    //What this means is that when we are drawing the stars that make up our scene, the black bits will seem transparent; indeed, the less bright a part of the star is, the more transparent it will seem
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);

  //  here we just move to the centre of the scene, and then zoom in appropriately. We also tilt the scene around the X axis; the zoom and the tilt are still global variables controlled from the keyboard.
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, mvMatrix, [0.0, 0.0, zoom]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(tilt), [1.0, 0.0, 0.0]);

    //We’re now pretty much ready to draw the scene, so first we check whether the “twinkle” checkbox is checked:
    var twinkle = document.getElementById("twinkle").checked;
    
    //we iterate over the list of stars and tell each one to draw itself,
    //passing in the current tilt of the scene and the twinkle value. We also tell it what the current “spin” is — this is used to make the stars spin around their centres as they orbit the centre of the scene
    for (var i in stars) {
	stars[i].draw(tilt, spin, twinkle);
	spin += 0.1;
    }

}


var lastTime = 0;

function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
	var elapsed = timeNow - lastTime;

	for (var i in stars) {
	    stars[i].animate(elapsed);
	}
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
    var canvas = document.getElementById("lesson09-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();
    initWorldObjects();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
}
