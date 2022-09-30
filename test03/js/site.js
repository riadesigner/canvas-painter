
var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');


var posX , posY;
var lastX, lastY;

function draw(){
	

	var r= Math.floor(Math.random() * 254);
	var g= Math.floor(Math.random() * 254);
	var b= Math.floor(Math.random() * 254);
	ctx.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
	ctx.lineWidth = 20;

	ctx.beginPath();       
	ctx.moveTo(lastX, lastY);	
	ctx.lineTo(posX,posY);  	
	ctx.stroke();          

	  var thisFrameTime = (thisLoop=new Date) - lastLoop;
	  frameTime+= (thisFrameTime - frameTime) / filterStrength;
	  lastLoop = thisLoop;

	// window.requestAnimationFrame(draw);
}

// window.requestAnimationFrame(draw);

document.querySelector('canvas').onmousemove = function(event){
	lastX = posX;
	lastY = posY;
	posX = event.pageX;
	posY = event.pageY;
	draw();
}

document.body.onkeyup = function(e) {
  if (e.key == " " ||
      e.code == "Space" ||      
      e.keyCode == 32      
  ) {
  	console.log('clear')
  	ctx.fillStyle = "white";
  	ctx.rect(0,0,canvas.width,canvas.height);  
  	ctx.fill();
    
  }
}


// Report the fps only every second, to only lightly affect measurements
var fpsOut = document.getElementById('fps');
setInterval(function(){
  fpsOut.innerHTML = (1000/frameTime).toFixed(1) + " fps";
},1000);


