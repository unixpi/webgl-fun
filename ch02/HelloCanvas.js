// HelloCanvas.js (c) 2012 matsuda
function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
    //var gl = canvas.getContext('webgl');
    //getWebGLContext is a convenience function defined in cuon-utils.js
    //which actually uses a function defined in webgl-utils
    //it gets the rendering context for WebGL, sets the debug setting for WebGL
    //and displays any error message in the browser console
    //we use this helper function to ensure consistency across all browsers
    //n.b in 2016 might be sufficient to check for 'webgl' and 'experimental-webgl'
    //contexts
    var gl = getWebGLContext(canvas)  
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Set clear color
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    //clearing the color buffer will actually cause WebGL to clear the
    //<canvas> area on the web page
    //if no clear color is specified then the default value of (0.0,0.0,0.0,0.0)
    //is used
  gl.clear(gl.COLOR_BUFFER_BIT);
}
