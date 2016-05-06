// HelloPoint1.js (c) 2012 matsuda

//why do we need shaders?
//simply put, in a 3D scene, it's not enough just to draw graphics.
//one must also account for how they are viewed as light sources hit them
//or the viewer's perspective changes. Shading does this with a high degree of flexibility


// Vertex shader program
//the vertex shader specifies the position of a point and its size. In this sample program,
//the position is (0.0,0.0,0.0), and the size is 10.0
var VSHADER_SOURCE = 
    'void main() {\n' +
    //the following two variables are built-in variables available only in a
    //vertex shader and have a special meaning:
    //gl_Position specifies a position of a vertex (in this case, the position of the point)
    //gl_PointSize specifies the size of the point (in pixels)
    //note that gl_position should always be written, if you don't specify it, the shader's
    //behaviour is implementation dependent and may not work as expected
    //in contrast, gl_PointSize is only required when drawing points and defaults
    //to a point size of 1.0 if you don't specify anything.
    //vec4 type indicates a vector of four floating point numbers
    //the type of gl_PointSize is always float
    //the type of gl_Position is always vec4
    //the built in function vec4 constructs a vec4 object from the four inputs you
    //give it
    //note that the value assigned to gl_Position has 1.0 added as a fouth component.
    //this four-component coordinate is called a homogeneous coordinate and is often used
    //in 3D graphics for processing 3-dimensional information efficiently.
    //Although the homogeneous coordinate is a 4-d coordinate, if the last component
    //of the homogeneous coordinate is 1.0, the coordinate indicates the same position
    //as the 3-dimensional one.
    //Homogeneous coordinates make it possible to represent vertex transformations
    //as a multiplication of a matrix and the coordinates and are often uses as
    //as internal representation of a vertex in 3D graphics systems
  '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);\n' + // Set the vertex coordinates of the point
  '  gl_PointSize = 10.0;\n' +                    // Set the point size
  '}\n';

// Fragment shader program
//the fragment shader specifies the color of the fragments displaying the point. In this
//sample program, they are all red.
//technically a fragment is a pixel along with its position, color, and other information
var FSHADER_SOURCE =
    'void main() {\n' +
    //gl_FragColor is a built-in variable only available in a fragment shader.
    //it controls the color of a fragment
    //when we assign a color value to the built-in variable, the fragment is displayed
    //using that color. Just like the position in the vertex shader, the color value
    //is  a vec4 data type consisting of four floating point numbers representing
    //the RGBA values.
  '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' + // Set the point color
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
    // Initialize shaders --> see cuon-utils.js for initShaders function definition
    //after executing initShaders(), the shader programs that are passed as a string
    //to the parameters of initShaders() are set up in the containers in the WebGL
    //system and then made ready for use.
    //in this case the vertex shader assigns values to gl_Position and gl_PointSize
    //and then passes these variables to the fragment shader which then executes it's
    //own code (simplified high level view). In reality there is a step in between in which
    //fragements are generated after processing the vertex shader values, and it is these
    //fragments which are then passed to the fragment shader
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
	console.log('Failed to intialize shaders.');
	return;
    }

    //once you set up the shaders, the remaining task is to draw the shape, or in our case,
    //a point.

    //As before, one needs to clear the drawing area
    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);


    // Draw a point
    //Once the drawing area is cleared, one cand draw the point using gl.drawArrays
    //gl.drawArrays(mode, first, count)
    //'mode' specifies the type of shape to be drawn. The following constants are accepted:
    //gl.POINTS, gl.LINES, gl.LINE_LOOP, gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN
    //'first' (integer) specifies which vertex to start drawing from
    //'count' (integer) specifies the number of vertices to be used (integer)
    //now, when the progam makes a call to gl.drawArrays(mode,first,count),
    //the vertex shader is executed 'count' times, each time working with the new vertex
    //once the vertex shader executes, the fragment shader is executed by calling its
    //main() function
    gl.drawArrays(gl.POINTS, 0, 1);
}
