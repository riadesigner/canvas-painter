
var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');




function draw(){
	var r= Math.floor(Math.random() * 254);
	var g= Math.floor(Math.random() * 254);
	var b= Math.floor(Math.random() * 254);
	ctx.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
	ctx.lineWidth = 20;
	var mode = Math.random() < 0.5;
	var x = Math.floor(Math.random() * 600);
	var y = Math.floor(Math.random() * 400);
	
	ctx.beginPath();       
	if(mode){
		ctx.moveTo(x-100, y-100);    
	}else{
		ctx.moveTo(x+100, y-100);    
	}
	
	ctx.lineTo(x, y);  
	ctx.stroke();          

	  var thisFrameTime = (thisLoop=new Date) - lastLoop;
	  frameTime+= (thisFrameTime - frameTime) / filterStrength;
	  lastLoop = thisLoop;

	window.requestAnimationFrame(draw);
}


window.requestAnimationFrame(draw);





// Report the fps only every second, to only lightly affect measurements
var fpsOut = document.getElementById('fps');
setInterval(function(){
  fpsOut.innerHTML = (1000/frameTime).toFixed(1) + " fps";
},1000);


