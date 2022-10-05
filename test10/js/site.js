

var Painter = {
	init:function(painter_id,w,h,params) {
		this.$painter = $('#'+painter_id);
		var params = params || {};
		
		this.PARAM = $.extend({w:w,h:h},params);
		this.TEXTURES = params.textures || [];		
		this.TEXTURES_LOADED = [];
		this.DRAW_MODE = false;			

		this.posX=0;
		this.posY=0;
		this.lastX=0;
		this.lastY=0;
		this.gCounter = 2;
		this.gCounterMax = 10;

		this.BRUSH = params.brush;
		// this.ZOOM = params.zoom;
		// this.STATUSBAR = params.statusbar;

		this.pre_build();		
		this.recalc_size();
		this.behavior();		
		this.textures_preload();

	},
	set_status:function(msg){
		this.STATUS = msg;
		$(this).trigger('status-updated');
	},
	get_status:function(){
		return this.STATUS;
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
						_this.set_status("all ready to draw");
					}
				}
			}
		}		
	},
	pre_build:function() {
		
		this.$painter.css({width:this.PARAM.w,height:this.PARAM.h});
		this.$canvas = $("<canvas></canvas>");
		this.$canvas.attr({width:this.PARAM.w*2,height:this.PARAM.h*2});
		this.$canvas.css({'max-width':'100%',background:'#ffffff'});
		this.$painter.append(this.$canvas);
		this.ctx = this.$canvas[0].getContext('2d');	

		this.PARAM.onready && this.PARAM.onready();	

		this.set_status("loading textures...");

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
		return "#000000";
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
		if(this.BRUSH && this.BRUSH.get_drawing_mode()){			
			ctx.stroke();
			ctx.save();
			ctx.globalCompositeOperation='source-atop';
			var img = this.TEXTURES_LOADED[0]; 
			this.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.$canvas[0].width, this.$canvas[0].height);				
			ctx.restore();
		}else{
			ctx.save();	
			ctx.globalCompositeOperation='destination-out';
			ctx.stroke();
			ctx.restore();
		}

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

var PainterBrush = {
	init:function(painter_id, min,max,step) {

		this.BRUSH_SIZE_MIN = min;
		this.BRUSH_SIZE_MAX = max;
		this.BRUSH_SIZE_STEP = step;
		this.BRUSH_SIZE_CURRENT = (this.BRUSH_SIZE_MAX-this.BRUSH_SIZE_MIN)/2+this.BRUSH_SIZE_MIN;		
		this.DRAWING_MODE = true;

		this.RANGE_BRUSH_SIZE =  'range-1-brush-size';
		this.RANGE_BRUSH_SIZE_LABEL = 'range-1-brush-size-label';				
		this.set_status("режим рисования");

		this.update_drawing_mode(true);

		this.$range_size = $('#'+this.RANGE_BRUSH_SIZE);
		this.$lable_size = $('#'+this.RANGE_BRUSH_SIZE_LABEL+' span');
		
		this.prepare();		
		this.behavior();

		return this;
	},
	//public
	get_size:function() {
		return this.BRUSH_SIZE_CURRENT;
	},		
	set_status:function(msg){		
		this.STATUS = msg;	
		$(this).trigger('status-updated');
	},
	get_status:function(){
		return this.STATUS
	},
	//private	
	behavior:function() {
		var _this=this;
		document.onkeyup = function(e) {			
		  if (e.key == "1" || e.code == "Digit1") {
			_this.update_drawing_mode(true); 	
		  }
		  if (e.key == "2" || e.code == "Digit2") {
			_this.update_drawing_mode(false);	  	
		  }		  
		};	
	},
	get_drawing_mode:function() {
		return this.DRAWING_MODE;
	},
	update_drawing_mode:function(mode) {
		// true - drawing, false – erasing
		this.DRAWING_MODE = mode;		
		var msg = mode ? "Режим рисования" : "Режим стирания";
		this.set_status(msg);				
	},
	update_label_brush_size:function() {	
		this.$lable_size.html(''+this.BRUSH_SIZE_CURRENT);
	},
	prepare:function() {
		var _this=this;
		
		this.update_label_brush_size();
		var sldr = {min:this.BRUSH_SIZE_MIN,max:this.BRUSH_SIZE_MAX,step:this.BRUSH_SIZE_STEP};		

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

var PainterZoom = {
	init:function(painter_id){		
		console.log("init zoom");
		this.$parent = $('#'+painter_id);
		this.SCALE = 1;		
		this.build();
		this.behavior();
		return this;
	},
	set_status:function(msg){
		this.STATUS = msg;
		$(this).trigger('status-updated');
	},
	get_status:function(){
		return this.STATUS;
	},
	build:function(){
		this.$zoom = $([
			'<div id="painter-zoom-id" class="noselect">',
			'<div class="painter-zoom-in"><span>+</span></div>',
			'<div class="painter-zoom-out"><span>-</span></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$zoom);
		this.set_status("Масштаб:"+(100*this.SCALE)+"%");		
	},	
	behavior:function(){

	}
};

var PainterStatusbar = {
	init:function(painter_id,arr){
		this.$parent = $('#'+painter_id);
		this.ARR = arr;		
		this.build();
		this.behavior();
		return this;	
	},
	behavior:function(){
		var _this=this;
		for (var i=0;i<this.ARR.length; i++){			
			(function(obj,index){				
				obj.get_status && _this.set(obj.get_status(),index);
				$(obj).on('status-updated',function(){					
					obj.get_status && _this.set(obj.get_status(),index);
				});
			})(this.ARR[i],i);
		}
	},
	set:function(msg,section){
		var section = section?section:0;
		this.$statusbar.find('span:eq('+section+')').html(msg);
	},
	build:function(){
		this.$statusbar = $([
			'<div id="painter-status-bar" class="noselect">',
			'<span>1</span><span>2</span><span>3</span>',
			'</div>'
			].join(''));
		this.$parent.append(this.$statusbar);
		// this.set(PainterBrush.get_status(),1);
	}
};

$(function(){	

	Painter.init('painter',1000,500,{
		textures:["img/img1.jpg"],		
		brush:PainterBrush,
		zoom:PainterZoom,
		statusbar:PainterStatusbar,
		onready:function(){
			this.brush.init('painter',10,60,2);
			this.zoom.init('painter');
			this.statusbar.init('painter',[Painter,this.brush,this.zoom]);			
		}
	});

 
});



