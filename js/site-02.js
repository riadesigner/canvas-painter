
var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// var DRAW_MODE = false;
var posX , posY;
// var lastX, lastY;


function draw(event){
	

	var r= Math.floor(Math.random() * 254);
	var g= Math.floor(Math.random() * 254);
	var b= Math.floor(Math.random() * 254);
	ctx.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
	ctx.lineWidth = 20;

	var x = Math.random()*600;
	var y = Math.random()*400;

	ctx.beginPath();       
	ctx.moveTo(x, y);	
	ctx.lineTo(posX,posY);  	
	ctx.stroke();          

	  var thisFrameTime = (thisLoop=new Date) - lastLoop;
	  frameTime+= (thisFrameTime - frameTime) / filterStrength;
	  lastLoop = thisLoop;

	window.requestAnimationFrame(draw);
}


window.requestAnimationFrame(draw);

document.querySelector('canvas').onmousemove = function(event){
	posX = event.pageX;
	posY = event.pageY;
}

// document.querySelector('body').onmousemove = function(event){
// 	console.log(event.pageY);
// }




// Report the fps only every second, to only lightly affect measurements
var fpsOut = document.getElementById('fps');
setInterval(function(){
  fpsOut.innerHTML = (1000/frameTime).toFixed(1) + " fps";
},1000);


