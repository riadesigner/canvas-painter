

var Painter = {
	init:function(painter_id,w,h,params) {
		this.$painter = $('#'+painter_id);
		var params = params || {};
		
		this.PARAM = $.extend({w:w,h:h},params);
		this.TEXTURES = params.textures || [];		
		this.TEXTURES_LOADED = [];
		this.DRAW_MODE = false;		

		this.$statusbar = $('#'+this.PARAM.statusbar);

		this.posX=0;
		this.posY=0;
		this.lastX=0;
		this.lastY=0;
		this.gCounter = 2;
		this.gCounterMax = 10;
		
		this.BRUSH_DEFAULT = {
			size:40,
			color:'#000000'
		}
		this.BRUSH = params.brush;

		this.pre_build();		
		this.recalc_size();
		this.behavior();		
		this.textures_preload();

	},
	statusbar_show:function(msg){		
		if(this.$statusbar.length){
			this.$statusbar.html(msg);
		}
	},
	show_background:function(){
		var img = this.TEXTURES_LOADED[0]; 
		this.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.$canvas[0].width, this.$canvas[0].height);		
	},
	textures_loaded_all:function(){
		return this.TEXTURES.length==this.TEXTURES_LOADED.length;
	},
	textures_preload:function(){
		var _this=this;
		this.TEXTURES_READY = false;		
		if(this.TEXTURES.length){
			for(var i in this.TEXTURES){				
				var img = new Image();
				img.src = this.TEXTURES[i];
				img.onload = function(){					
					_this.TEXTURES_LOADED.push(this);
					if(_this.textures_loaded_all()){
						// _this.show_background();	
						_this.statusbar_show("all ready to draw");
					}
				}
			}
		}		
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
			_this.gCounter = 0;
			_this.posX = (event.pageX-_this.p_offset.left) / _this.m_offset;
			_this.posY = (event.pageY-_this.p_offset.top) / _this.m_offset;
			_this.draw_start_cap();
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

		// document.getElementById('btn-save').onclick = function(){ _this.save_to_pdf();}	

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
	  	this.ctx.fillStyle = "#00000000";
	  	this.ctx.save();
	  	this.ctx.globalCompositeOperation='source-out';	  	
	  	this.ctx.rect(0,0,_this.$canvas[0].width,_this.$canvas[0].height);  
	  	this.ctx.fill();
	  	this.ctx.restore();
		// this.ctx2 = new canvas2pdf.PdfContext(blobStream());
	},
	draw:function() {
		this.gCounter++;		
		this.draw_line(this.ctx);		

		// this.draw_circle(this.ctx);
	},
	draw_start_cap:function() {
		// this.draw_circle(this.ctx);		
	},
	get_color:function() {
		// return this.get_color_rand();	
		return this.BRUSH.color;
	},
	get_color_rand:function() {
		var r= Math.floor(Math.random() * 254);
		var g= Math.floor(Math.random() * 254);
		var b= Math.floor(Math.random() * 254);
		return 'rgba('+r+','+g+','+b+',1)';
	},
	draw_line:function(ctx) {		
		
		ctx.strokeStyle = this.get_color();
		ctx.lineCap = 'round';
		ctx.lineJoin = "round";
		
		if(this.BRUSH){
			var h =  this.BRUSH.get_size();	
		}else{
			var h =  this.BRUSH_DEFAULT.size;
		} 

		// ctx.lineWidth = Math.min(h,this.gCounter);
		var delta = Math.hypot(this.lastX - this.posX, this.lastY - this.posY);
		// if(delta<h/3) return false;
		// if(this.gCounter<this.gCounterMax)return false;

		ctx.lineWidth = h;
		ctx.beginPath();       
		ctx.moveTo(this.lastX, this.lastY);	
		ctx.lineTo(this.posX,this.posY);  	
		ctx.stroke();
		ctx.save();
		ctx.globalCompositeOperation='source-atop';
		var img = this.TEXTURES_LOADED[0]; 
		this.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.$canvas[0].width, this.$canvas[0].height);				
		ctx.restore();
	},
	draw_circle:function(ctx) {
	
		// var h = Math.hypot(this.lastX - this.posX, this.lastY - this.posY);
		// var radius = Math.min(h,30);
		if(this.BRUSH){
			var h = this.BRUSH.get_size()/2;	
		}else{
			var h = this.BRUSH_DEFAULT.size/2;
		}
		
		// if(this.gCounter<this.gCounterMax){
		// 	h -= (this.gCounterMax-this.gCounter);
		// }
		// var radius = Math.min(h,this.gCounter);
		var radius = h;
		ctx.beginPath();
		ctx.arc(this.posX,this.posY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = this.get_color();
		ctx.fill();
		ctx.lineWidth = 0;
		ctx.strokeStyle = '#00000000';
		ctx.stroke();	
	}

};

var Brush = {
	init:function(min,max,brash_size_range_id, brash_size_range_label_id) {
		this.RANGE_BRUSH_SIZE =  brash_size_range_id;
		this.RANGE_BRUSH_SIZE_LABEL = brash_size_range_label_id;
		
		this.BRUSH_SIZE_MIN = min;
		this.BRUSH_SIZE_MAX = max;
		this.BRUSH_SIZE_CURRENT = (this.BRUSH_SIZE_MAX-this.BRUSH_SIZE_MIN)/2+this.BRUSH_SIZE_MIN;

		this.$range_size = $('#'+this.RANGE_BRUSH_SIZE);
		this.$lable_size = $('#'+this.RANGE_BRUSH_SIZE_LABEL+' span');
		
		this.prepare();		
	},
	//public
	get_size:function() {
		return this.BRUSH_SIZE_CURRENT;
	},
	//private
	update_label_brush_size:function() {	
		this.$lable_size.html(''+this.BRUSH_SIZE_CURRENT);
	},
	prepare:function() {
		var _this=this;
		
		this.update_label_brush_size();
		var sldr = {min:this.BRUSH_SIZE_MIN,max:this.BRUSH_SIZE_MAX,step:1};		

		this.$range_size.slider({min:sldr['min'],max:sldr['max']});
		this.$range_size.slider( "value", this.BRUSH_SIZE_CURRENT );

		this.$range_size.slider({
		    animate: "fast",
		    min:sldr['min'],
		    max:sldr['max'],
		    step:sldr['step'],
		    slide:function(e,ui) {		    	
		    	_this.BRUSH_SIZE_CURRENT = ui.value;
		    	_this.update_label_brush_size();
		    },
		    change:function(e,ui) {		    	
		    	_this.BRUSH_SIZE_CURRENT = ui.value;
		    	_this.update_label_brush_size();
		    }			    
		});
		
	}
};


$(function(){

	Brush.init(10,40,'range-1-brush-size','range-1-brush-size-label');

	Painter.init('painter',1000,500,{
		textures:["img/img1.jpg"],
		statusbar:'painter-status',
		brush:Brush
	});

 
});



