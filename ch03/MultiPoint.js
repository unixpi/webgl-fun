// MultiPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'void main() {\n' +
  '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
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

    // Write the positions of vertices to a vertex shader
    // the return value of this function is the number of
    // vertices being drawn, note that in case of an error,
    // n is negative
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw three points
    //As in the previous examples, the drawing operation is carried out using a single call
    //to gl.drawArrays(). This is similar to clickedPoints.js except that n is passed as the
    //third argument of gl.drawArrays() rather than the value 1
    //Because we are using a buffer object to pass multiple vertices to a vertex shader in
    //initVertexBuffers(), we need to specify the number of vertices in the object as the
    //third parameter of gl.drawArrays() so that WebGL knows to draw a shape using all
    //the vertices in the buffer object
  gl.drawArrays(gl.POINTS, 0, n);
}

function initVertexBuffers(gl) {
    //we use the FLoat32Array object instead of the more usual JavaScript Array object
    //to store the data. This is because the standard array in JavaScript is a general
    //purpose data structure able to hold both numeric data and strings but isn't
    //optimized for large quantities of data of the same type, such as vertices.
    //To address this issue, the typed array, of which one example is Float32Array,
    //has been introduced.
    //Typed arrays are expected by WebGL and are needed for many operations including
    //the second parameter 'data' of gl.bufferData()
  var vertices = new Float32Array([
    0.0, 0.5,   -0.5, -0.5,   0.5, -0.5
  ]);
  var n = 3; // The number of vertices

    // Create a buffer object
    //A buffer object is a mechanism provided by the WebGL system that provides a memory
    //area allocated in the system that holds the vertices you want to draw. By creating
    //a buffer object and then writing the vertices to the object, you can pass multiple
    //vertices to a vertex shader through one of its attribute variables
    
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }

    // Bind the buffer object to target
    // the target tells WebGL what type of data the buffer object contains
    // allowing it to deal with the contents correctly
    // gl.bindbuffer(target, buffer)
    // Target can be one of:
    // gl.ARRAY_BUFFER --> specifies that the buffer object contains vertices
    // gl.Element_ARRAY_BUFFER --> ' ' contains indexes pointing to vertex data
    // buffer --> ' ' created by a previous gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);


    // Allocate storage and Write date into the buffer object
    // this method writes the data specified by the second parameter
    // (vertices) into the buffer object bound to the first parameter
    // (gl.ARRAY_BUFFER)
    // gl.bufferData(target, data, usage)
    // usage --> specifies a hint about how the program is going to use
    // the data stored in the buffer object. This hint helps optimize
    // performance but will not stop your program if you get it wrong
    // usage options:
    // gl.STATIC_DRAW, gl.STREAM_DRAW, gl.DYNAMIC_DRAW
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return -1;
    }
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    return n;
}
