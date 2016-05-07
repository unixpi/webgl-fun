// ClickedPints.js (c) 2012 matsuda
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

  // // Get the storage location of a_Position
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

    // Register function (event handler) to be called on a mouse press
    //the <canvas> supports special properties for registering event handlers
    //for a specific user input
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_points = []; // The array for the position of a mouse press
function click(ev, gl, canvas, a_Position) {
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect(); //rect.left and rect.top indicate the position of the origin of the <canvas> in the browser's client area

    //note, the x and y coordinates we have saved is the position of the mouseclick in the 'client area' in the browser, not the position in the <canvas>. Furthermore, the co-ordinate
    //system of the <canvas> is different from that of WebGL in terms of its origin and
    //direction of the y-axis
    //So first we need to transform the coordinates from the browser area to the canvas,
    //and then transform them to the WebGL co-ordinate system
    //not in the canvas
    //(x - rect.left) and (y-rect.top) slide the position (x,y) in the client area
    //to the correct position on the <canvas> element
    //to transform the <canvas> position into the WebGL coordinate system we need
    //to know the center position of the canvas ==> (canvas.height/2, canvas.weight/2)
    //Next, you can implement this transformation by sliding the origin of the <canvas>
    //into the origin of the WebGL coordinate system located at the center of the <canvas>
    
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    // Store the coordinates to g_points array
    g_points.push(x); g_points.push(y);
    //you may be wondering why you need to store all the positions rather than just the
    //most recent mouse click. This is because of the way WebGL uses the color buffer.
    //You will remember that in the WebGL system, first the drawing operation is performed
    //to the color buffer, and then the system displays its content to the screen.
    //After tha, the color buffer is reinitialized and its content lost. (this is the
    //default behavior, which you'll investigate in the next section.) Therefore it is
    //necessary to save all the positions of the clicked points in the array, so that on
    //each mouse click, the program can draw all the previous points as the latest. For
    //example the first point is drawn at the first mouse click. The first and second
    //points are drawn at the second mouse click. The first, second, and third points are
    //drawn on the third click and so on.

    
    // Clear <canvas>
    //note: if you specify a clear color, as we have done above, then we must
    //clear the canvas every time before we draw to ensure this clear color is
    //used, otherwise webGL will clear anyway but will resort to the default
    //clear color (0.0,0.0,0.0,0.0) ==> a black color, but with an alpha value of 0.0
    //meaning it is a fully transparent black, i.e a white color.
    gl.clear(gl.COLOR_BUFFER_BIT);

    var len = g_points.length;
    for(var i = 0; i < len; i += 2) {
	// Pass the position of a point to a_Position variable
	gl.vertexAttrib3f(a_Position, g_points[i], g_points[i+1], 0.0);
	// Draw
	gl.drawArrays(gl.POINTS, 0, 1);
    }
}

//Although it's a little complicated, you can see that the use of event handlers combined
//with an attribute variable provides a flexible and generic means for user input to
//change what WebGL draws


