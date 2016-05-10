// TexturedQuad.js (c) 2012 matsuda and kanda
// Vertex shader program
// note: texture mapping in WebGL seems a complex process partly because it must deal
// with an image and request the browser to load it, and partly because you are required
// to use the texture unit even if you use only a single texture. However, once you master
// the basic steps, they are the same each time you want to map a texture


//Part 1
// Receive the texture coordinates in the vertex shader and then pass them to
// the fragment shader
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

// Fragment shader program
//Part 2
// Paste the texture image onto the geometric shape inside the fragment shader
var FSHADER_SOURCE =
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
    //  '#endif\n' +
    //the uniform variable must be declared using the special data type for textures
    // sampler2D : Data type for accessing the texture bound to gl.TEXTURE_2D
    // samplerCube: Data type '                               ' gl.TEXTURE_CUBE_MAP
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
    'void main() {\n' +
    //read the color of the texel located at the corresponding texture coordinates
    //from the texture image and then use it to set the color of the fragment
    //here we use the GLSL ES built-in function texture2D() to read out the texel color
    //from the shader. specify the texture unit number in the first parameter (type sampler)
    //and the texture coordinates in the second.
    //the return value is the texel color (vec4) for the coordinates. the color format used
    //is the internalformat specified by gl.texImage2D()
    //gl.RGB -->               (R , G , B , 1.0)
    //gl.RGBA -->              (R , G , B , A )
    //gl.ALPHA -->             (0.0,0.0,0.0,A)
    //gl.LUMINANCE -->         (L , L , L , 1.0)    where L indicates luminance
    //gl.LUMINANCE_ALPHA -->   (L , L , L , A )
    //if the texture image is not available for some reason, returns (0.0,0.0,0.0,1.0)
    //The texture magnification and minification parameters determine the return value in
    //cases where WebGL interpolates the texel.
    //Once this function executes, by assigning the return value to gl_FragColor, the
    //fragment is displayed using the color. As a result of this operation, the texture
    //image is mapped to the shape to be drawn (in this case, a rectangle)
  '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '}\n';

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

    // Set the vertex information
    //part 3
    //Set the texture coordinates 
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Set texture
  if (!initTextures(gl, n)) {
    console.log('Failed to intialize the texture.');
    return;
  }
}

function initVertexBuffers(gl) {
  var verticesTexCoords = new Float32Array([
    // Vertex coordinates, texture coordinate
    -0.5,  0.5,   0.0, 1.0,
    -0.5, -0.5,   0.0, 0.0,
     0.5,  0.5,   1.0, 1.0,
     0.5, -0.5,   1.0, 0.0,
  ]);
  var n = 4; // The number of vertices

  // Create the buffer object
  var vertexTexCoordBuffer = gl.createBuffer();
  if (!vertexTexCoordBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

  var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
  gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_TexCoord
  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord < 0) {
    console.log('Failed to get the storage location of a_TexCoord');
    return -1;
  }
  // Assign the buffer object to a_TexCoord variable
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
  gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

  return n;
}

    //part 4
    //prepare the texture image for loading, and request the browser to read it
function initTextures(gl, n) {
    // Create a texture object
    // for managing the texture image in the WebGL system
    var texture = gl.createTexture();  //returns null if failed to create
    // this call creates the texture object in the WebGL system.
    // gl.TEXTURE0 to gl.TEXTURE7 are texture units for managing a
    // texture image, and each has an associated gl.TEXTURE_2D,
    // which is the texture target for specifying the type of texture.
    // this will be explained in detail later.
    // the texture object can be deleted using gl.deleteTexture(texture)
    
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

    // Get the storage location of u_Sampler (a uniform variable to pass
    // the texture image to the fragment shader()
  var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }
    // Create the image object
    // it's necessary to request that the browser load the image that will
    // be mapped to the rectangle. We us the JS built in Image object for this
    // purpose
  var image = new Image(); 
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called on loading an image
  image.onload = function(){ loadTexture(gl, n, texture, u_Sampler, image); };
  // Tell the browser to load an image
  image.src = '../resources/sky.jpg';

  return true;
}
//part 5
// configure the loaded texture so that it can be used in WebGL
function loadTexture(gl, n, texture, u_Sampler, image) {

    // Flip the image's y axis (when it's loaded)
    // before using the loaded images as a texture, you need
    // to flip the y-axis
    // this is because the t-axis direction of the WebGL texture
    // coordinate system is the inverse of the y-axis direction of
    // the coordinate system used by PNG, BMP, JPG and so on
    // note (you could also flip the t coordinates by hand instead of
    // flipping the image
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 


    // Enable texture unit0
    //WebGL supports multiple texture images (multitexturing) using
    //a mechanism called a texture unit. A texture unit manages texture
    //images by using a unit number for each texture.
    //Because of this, even if you only want to use a single texture image
    //you must specify and use a texture unit
    //The number of texture units supported varies according to your hardware and
    //WebGL implementation, but by default at least eight texture units are supported
    //The built in constants gl.TEXTURE0, gl.TEXTURE1, ..., and gl.TEXTURE7, represent
    //each texture unit
    //Before using a texture unit, it must be made active using a call to gl.activeTexture()
    gl.activeTexture(gl.TEXTURE0);

    
    // Bind the texture object to the target
    // if  a texture unit was made active by gl.activeTexture(), the
    // texture object is also bound to the texture unit (in this case gl.TEXTURE0)
    // We need to tell the WebGL system what type
    // of texture image is used in the texture object
    // We do this by binding the texture object to the target
    // in a similar way to that of the buffer objects
    // The allowed types are gl.TEXTURE_2D and gl.TEXTURE_CUBE_MAP
    // Note that this method performs two tasks:
    // (1) enabling the texture object and binding it to the target
    // (2) binding it to the active texture unit
    // At this stage, the program has specified the type of texture that is used
    // in the texture object (gl.TEXTURE_2D) and that will be used to deal with
    // the texture object in the future. This is important, because in WebGL, you
    // cannot manipulate the texture object directly. You need to do that through
    // the binding
    gl.bindTexture(gl.TEXTURE_2D, texture);


    
    // Set the texture parameters of the texture object
    // these specify how the texture image will be processed when it is mapped to the shapes
    // gl.texParameteri(target, pname, param)
    // pname specifies the name of the texture parameter
    // param specifies the value set to the texture parameter
    // There are four texture parameters available:
    // (1) gl.TEXTURE_MAG_FILTER (Magnification method)
    //     The method to magnify a texture image when you map the texture to a shape
    //     whose drawing area is larger than the size of the texture
    //     Default params value is gl.LINEAR
    
    // (2) gl.TEXTURE_MIN_FILTER (Minification method)
    //     The method to magnify a texture image when you map the texture to a shape
    //     whose drawing area is smaller than the size of the texture
    //     Default params value is gl.NEAREST_MIPMAP_LINEAR
    
    // (3) gl.TEXTURE_WRAP_S (Wrapping method on the left and right side)
    //     How to fill the remaining regions on the left side and the right side of a
    //     of a subregion when you map a texture image to the subregion of a shape
    //     Default params value is gl.REPEAT

    // (4) gl.TEXTURE_WRAP_T (Wrapping method on top and bottom)
    //     How to fill the remaining regions on the top and bottom of a
    //     of a subregion when you map a texture image to the subregion of a shape
    //     Default params value is gl.REPEAT

  
    // texture filtering or texture smoothing is the method used to determine the texture color for a texture mapped pixel, using the colors of nearby texels (pixels of the texture)

    //During the texture mapping process, a 'texture lookup' takes place to find out where on the texture each pixel center falls. Since the textured surface may be at an arbitrary distance and orientation relative to the viewer, one pixel does not usually correspond directly to one texel. Some form of filtering has to be applied to determine the best color for the pixel. Insufficient or incorrect filtering will show up in the image as artifacts (errors in the image), such as 'blockiness', jaggies, or shimmering.

    //There can be different types of correspondence between a pixel and the texel/texels it represents on the screen. These depend on the position of the textured surface relative to the viewer, and different forms of filtering are needed in each case. Given a square texture mapped on to a square surface in the world, at some viewing distance the size of one screen pixel is exactly the same as one texel. Closer than that, the texels are larger than screen pixels, and need to be scaled up appropriately - a process known as texture magnification. Farther away, each texel is smaller than a pixel, and so one pixel covers multiple texels. In this case an appropriate color has to be picked based on the covered texels, via texture minification. Graphics APIs such as OpenGL allow the programmer to set different choices for minification and magnification filters.

//    Note that even in the case where the pixels and texels are exactly the same size, one pixel will not necessarily match up exactly to one texel. It may be misaligned or rotated, and cover parts of up to four neighboring texels. Hence some form of filtering is still required.
    
    //Possible params constant values:
    // gl.NEAREST: Uses the value of the texel that is nearest (in Manhattan distance)
    //             to the center of the pixel being textured
    // gl.LINEAR: Uses the weighted average of the four texels that are nearest the
    //            center of the pixel being textured (the quality of the result is
    //            clearer than that of gl.NEAREST, but it takes more time)
    // gl.REPEAT: Use a texture image repeatedly
    // gl.MIRRORED_REPEAT
    // gl.CLAMP_TO_EDGE: use the edge color of a texture image
    // gl.NEAREST_MIPMAP_NEAREST
    // gl.LINEAR_MIPMAP_NEAREST
    // gl.NEAREST_MIPMAP_LINEAR
    // gl.LINEAR_MIPMAP_LINEAR

    //Mipmapping is a standard technique used to save some of the filtering work needed during texture minification. During texture magnification, the number of texels that need to be looked up for any pixel is always four or fewer; during minification, however, as the textured polygon moves farther away potentially the entire texture might fall into a single pixel. This would necessitate reading all of its texels and combining their values to correctly determine the pixel color, a prohibitively expensive operation. Mipmapping avoids this by prefiltering the texture and storing it in smaller sizes down to a single pixel. As the textured surface moves farther away, the texture being applied switches to the prefiltered smaller size. Different sizes of the mipmap are referred to as 'levels', with Level 0 being the largest size (used closest to the viewer), and increasing levels used at increasing distances.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);


    // Assign a texture Image to a texture Object
    // in addition to assigning a texture, this method allows you to tell the
    // WebGL system about the image characteristics
    // gl.texImage2D(target, level, internalformat, format, type, image)
    // after executing this method, the texture imageloaded into the Image object
    // passed in throught the 'image' argument is passed to the WebGL system
    // A note on formats: JPG img --> gl.RGB format, PNG --> gl.RGBA
    // BMP --> gl.RGB
    // gl.LUMINANCE and gl.LUMINANCE_ALPHA are used for grayscale images
    // where luminance is the perceived brightness of a surface.
    // It is often calculated as a weighted average of red, green, and blue color
    // values that give the perceived brightness of a surface
    // the type specifies the data type of the texel data. Usually we specify
    // gl.UNSIGNED_BYTE as the data type. other data types are also available
    // such as gl.UNSIGNED_SHORT_5_6_5 (which packs RGB components into 16bits)
    // these types are used for passing compressed images to the WebGL system
    // to reduce loading time
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
    // Set the texture unit 0 to the sampler
    // Here we pass the texture unit to the fragement shader
    // we specify '0' because we are using the texture object bound to gl.TEXTURE0
    // once the texture image has been passed to the WebGL system, it must be passed
    // to the fragment shader to map it to the surface of the shape
    // As explained before, a uniform variable is used for this purpose because the
    // texture image does not change for each fragment
    gl.uniform1i(u_Sampler, 0);

    gl.clear(gl.COLOR_BUFFER_BIT);   // Clear <canvas>

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
}
