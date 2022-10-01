

var Painter = {
	init:function(painter_id,w,h,params) {
		this.$painter = $('#'+painter_id);
		
		this.PARAM = {w:w,h:h};
		this.DRAW_MODE = false;

		this.posX=0;
		this.posY=0;
		this.lastX=0;
		this.lastY=0;

		this.pre_build();
		this.recalc_size();
		this.behavior();		

	},
	pre_build:function() {
		
		this.$painter.css({width:this.PARAM.w,height:this.PARAM.h});
		this.$canvas = $("<canvas></canvas>");
		this.$canvas.attr({width:this.PARAM.w*2,height:this.PARAM.h*2});
		this.$canvas.css({'max-width':'100%','border':'2px solid green'});
		this.$painter.append(this.$canvas);

		this.ctx = this.$canvas[0].getContext('2d');
		this.ctx2 = new canvas2pdf.PdfContext(blobStream());		

	},
	recalc_size:function() {
		var $p = this.$painter;
		this.p_offset = {top:$p.offset().top,left:$p.offset().left};			
		this.m_offset = $p.width()/this.$canvas[0].width;		
	},
	behavior:function() {
		var _this=this;
		
		//draw line
		this.$canvas[0].onmousemove = function(event){
			if(_this.DRAW_MODE){
				_this.lastX = _this.posX;
				_this.lastY = _this.posY;
				_this.posX = (event.pageX-_this.p_offset.left) / _this.m_offset;
				_this.posY = (event.pageY-_this.p_offset.top) / _this.m_offset;				
				_this.draw();
			}
		};	

		this.$canvas[0].onmouseleave = function(event){
			_this.DRAW_MODE = false;
		};			


		this.$canvas[0].onmousedown = function(event){
			_this.DRAW_MODE = true;
			_this.posX = (event.pageX-_this.p_offset.left) / _this.m_offset;
			_this.posY = (event.pageY-_this.p_offset.top) / _this.m_offset;
		};				

		document.body.onmouseup = function(){
			console.log("end draw")
			_this.DRAW_MODE = false;
		}

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
	  	this.ctx.rect(0,0,_this.$canvas[0].width,_this.$canvas[0].height);  
	  	this.ctx.fill();
		this.ctx2 = new canvas2pdf.PdfContext(blobStream());
	},
	draw:function() {
		// this.draw_line(this.ctx);
		// this.draw_line(this.ctx2);
		this.draw_circle(this.ctx);
		this.draw_circle(this.ctx2);		
	},
	draw_line:function(ctx) {		
		var r= Math.floor(Math.random() * 254);
		var g= Math.floor(Math.random() * 254);
		var b= Math.floor(Math.random() * 254);
		ctx.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
		ctx.lineWidth = 20;
		ctx.beginPath();       
		ctx.moveTo(this.lastX, this.lastY);	
		ctx.lineTo(this.posX,this.posY);  	
		ctx.stroke();
	},
	draw_circle:function(ctx) {
		var r= Math.floor(Math.random() * 254);
		var g= Math.floor(Math.random() * 254);
		var b= Math.floor(Math.random() * 254);		
		var h = Math.hypot(this.lastX - this.posX, this.lastY - this.posY);
		var radius = h;
		ctx.beginPath();
		ctx.arc(this.posX,this.posY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = 'rgba('+r+','+g+','+b+',1)';
		ctx.fill();
		ctx.lineWidth = 0;
		ctx.strokeStyle = '#00000000';
		ctx.stroke();	
	}

};


$(function(){

	Painter.init('painter',1000,500);

 
});



