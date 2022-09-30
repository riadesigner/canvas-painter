

var Painter = {
	init:function(canvas_id) {
		this.canvas = document.getElementById(canvas_id);
		this.ctx = this.canvas.getContext('2d');
		this.posX=0;
		this.posY=0;
		this.lastX=0;
		this.lastY=0;
		this.behavior();		
	},
	behavior:function() {
		var _this=this;
		
		//draw line
		this.canvas.onmousemove = function(event){
			_this.lastX = _this.posX;
			_this.lastY = _this.posY;
			_this.posX = event.pageX;
			_this.posY = event.pageY;
			_this.draw();
		};		
		//draw canvas
		document.body.onkeyup = function(e) {
		  if (e.key == " " || e.code == "Space" || e.keyCode == 32 ) {		  	
		  	_this.ctx.fillStyle = "white";
		  	_this.ctx.rect(0,0,_this.canvas.width,_this.canvas.height);  
		  	_this.ctx.fill();		    
		  }
		};	
				
	},
	draw:function() {
			var _this=this;
			var r= Math.floor(Math.random() * 254);
			var g= Math.floor(Math.random() * 254);
			var b= Math.floor(Math.random() * 254);
			this.ctx.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
			this.ctx.lineWidth = 20;
			this.ctx.beginPath();       
			this.ctx.moveTo(_this.lastX, _this.lastY);	
			this.ctx.lineTo(_this.posX,_this.posY);  	
			this.ctx.stroke();
	}

};

Painter.init('canvas');




