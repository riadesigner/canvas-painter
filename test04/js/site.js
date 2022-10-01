

var Painter = {
	init:function(canvas_id) {
		this.canvas = document.getElementById(canvas_id);
		this.ctx = this.canvas.getContext('2d');
		this.ctx2 = new canvas2pdf.PdfContext(blobStream());
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
		  	_this.clear();
		  }
		};	

		document.getElementById('btn-save').onclick = function(){ _this.save_to_pdf();}	

	},
	save_to_pdf:function(){

		var _this=this;
		this.ctx2.stream.on('finish', function () {
	    	var blob = _this.ctx2.stream.toBlob('application/pdf');
	        var fd = new FormData();
	    	fd.append('file', blob, "picture.pdf");

	        $.ajax({
	            url: 'upload.php',
	            type: 'post',
	            data: fd,
	            contentType: false,
	            processData: false,
	            success: function(response){
	            	console.log('response',response);
	            	location.href="upload/picture.pdf";
	                // if(response != 0){
	                //    alert('file uploaded');
	                // }
	                // else{
	                //     alert('file not uploaded');
	                // }
	                _this.clear();	                
	            },
	        });

		});
		_this.ctx2.end();

	},
	clear:function(){
		var _this=this;
	  	this.ctx.fillStyle = "white";
	  	this.ctx.rect(0,0,_this.canvas.width,_this.canvas.height);  
	  	this.ctx.fill();
		this.ctx2 = new canvas2pdf.PdfContext(blobStream());
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

		this.ctx2.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
		this.ctx2.lineWidth = 20;
		this.ctx2.beginPath();       
		this.ctx2.moveTo(_this.lastX, _this.lastY);	
		this.ctx2.lineTo(_this.posX,_this.posY);  	
		this.ctx2.stroke();

	}

};


$(function(){

	Painter.init('canvas');

 
});



