

var Painter = {
	init:function(painter_id,w,h,params) {
		this.$painter = $('#'+painter_id);
		var params = params || {};
		
		this.PARAM = $.extend({w:w,h:h},params);
		this.TEXTURES = params.textures || [];		
		this.TEXTURES_LOADED = [];
		
		this.DRAW_MODE = false;
		this.PAN_MODE = false;
		this.SPACEBAR_PRESSED = false;


		this.world_coord = [0,0];
		this.p_offset = {top:0,left:0};
		this.pixel_size = 1;
		this.painterY=0;
		this.posX=0;
		this.posY=0;
		this.lastX=0;
		this.lastY=0;

		this.SCALE_ASPECT = 1;
		
		this.BRUSH = params.brush;
		this.ZOOM = params.zoom;		

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
		var bounds = this.get_bounds();
		this.$painter.css({width:bounds.w,height:bounds.h,overflow:'hidden'});
		this.$canvas = $("<canvas></canvas>");
		this.$canvas.attr({width:bounds.w*2,height:bounds.h*2});
		this.$canvas.css({background:'#ffffff',position:'absolute'});			
		this.$canvas.css({width:bounds.w,height:bounds.h,left:bounds.left,top:bounds.top});
		this.$painter.append(this.$canvas);
		this.ctx = this.$canvas[0].getContext('2d');
		this.PARAM.onready && this.PARAM.onready();	
		this.set_status("loading textures...");
	},
	get_bounds:function(){
		var w = this.PARAM.w;
		var h = this.PARAM.h;		
		var s = this.SCALE_ASPECT;
		var w_coord = this.world_coord;
		if(s==1){
			return {w:w,h:h,left:w_coord[0],top:w_coord[1]};
		}else{					
			return {w:w*s, h:h*s, left:w_coord[0]+(w-w*s)/2, top:w_coord[1]+(h-h*s)/2};
		}		
	},
	canvas_update_pos:function(){		
		var b = this.get_bounds();
		this.$canvas.css({width:b.w,height:b.h,left:b.left,top:b.top});		
	},
	recalc_size:function() {
		var $p = this.$painter;
		this.p_offset = {top:$p.offset().top,left:$p.offset().left};			
		this.pixel_size = $p.width()/this.$canvas[0].width;		
		console.log('p_offset',this.p_offset)
	},
	behavior:function() {
		var _this=this;		

		this.$painter[0].onmousemove = function(event){

			if(_this.DRAW_MODE){
				var s = _this.SCALE_ASPECT;
				var b = _this.get_bounds();
				_this.lastX = _this.posX;
				_this.lastY = _this.posY;
				_this.posX = ((event.pageX-_this.p_offset.left- b.left) / _this.pixel_size)/s;
				_this.posY = ((event.pageY-_this.p_offset.top- b.top) / _this.pixel_size)/s;				
				_this.draw();
			};
			if(_this.PAN_MODE){
				var x = event.pageX - _this.pan_coord.deltaX;
				var y = event.pageY - _this.pan_coord.deltaY;
				_this.world_coord = [x,y];
				_this.canvas_update_pos();
			}
		};	

		this.$painter[0].onmousedown = function(event){									
			if(_this.SPACEBAR_PRESSED){
				// PAN
				_this.DRAW_MODE = false;
				_this.PAN_MODE = true;
				_this.pan_coord = {
					deltaX:event.pageX - _this.world_coord[0],
					deltaY:event.pageY - _this.world_coord[1]
				};
			}else{
				// DRAWING
				_this.PAN_MODE = false;
				_this.DRAW_MODE = true;				
				var s = _this.SCALE_ASPECT;
				var b = _this.get_bounds();				
				_this.posX = (event.pageX-_this.p_offset.left- b.left) / _this.pixel_size /s;
				_this.posY = (event.pageY-_this.p_offset.top- b.top) / _this.pixel_size /s;
				_this.lastX = _this.posX;
				_this.lastY = _this.posY;				
				_this.draw_start_cap();				
			}

		};

		this.$painter[0].onmouseup = function(event){
			_this.DRAW_MODE = false;
			_this.PAN_MODE = false;
			_this.SPACEBAR_PRESSED = false;
		};				

		this.$painter[0].onmouseleave = function(event){
			_this.DRAW_MODE = false;
			_this.PAN_MODE = false;
			_this.SPACEBAR_PRESSED = false;
		};
		
		document.addEventListener('keydown',function(e){			
		  if (e.key == " " || e.code == "Space" || e.keyCode == 32 ) {
			_this.SPACEBAR_PRESSED = true;
			_this.DRAW_MODE = false;			
			document.body.style.cursor = 'grab';
		  }			
		});		
		document.addEventListener('keyup',function(e){			
		  if (e.key == " " || e.code == "Space" || e.keyCode == 32 ) {		  	
			_this.SPACEBAR_PRESSED = false;
			_this.PAN_MODE = false;
			document.body.style.cursor = 'default';
		  }			
		});

		document.addEventListener('keydown',function(e){			
		  if (e.key == "c" || e.code == "KeyC" || e.keyCode == 67 ) {
			_this.clear();	 
		  }			
		});		

		$(this.ZOOM).on('scale-updated',function(){		
			_this.SCALE_ASPECT = _this.ZOOM.get_scale()/100;	
			_this.canvas_update_pos();
		});
		
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
		// this.gCounter++;		
		this.draw_line(this.ctx);		

		// this.draw_circle(this.ctx);
	},
	draw_start_cap:function() {
		this.draw_circle(this.ctx);		
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
		
		var h =  this.BRUSH.get_size();			
		var posX = this.posX;
		var posY = this.posY;
		// ctx.lineWidth = Math.min(h,this.gCounter);
		// var delta = Math.hypot(this.lastX - posX, this.lastY - posY);
		// if(delta<h/3) return false;
		// if(this.gCounter<this.gCounterMax)return false;

		ctx.lineWidth = h;
		ctx.beginPath();       
		ctx.moveTo(this.lastX, this.lastY);	
		ctx.lineTo(posX,posY);  			
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
		var radius = this.BRUSH.get_size()/2;
		// var s = this.SCALE_ASPECT;
		var b = this.get_bounds();
			
			ctx.beginPath();
			ctx.arc(this.posX,this.posY, radius, 0, 2 * Math.PI, false);
			// console.log('this.posX,this.posY',this.posX,this.posY)
			ctx.fillStyle = this.get_color();			
			ctx.lineWidth = 0;
			ctx.strokeStyle = '#00000000';
					
		if(this.BRUSH && this.BRUSH.get_drawing_mode()){
			ctx.stroke();
			ctx.fill();
			ctx.save();
			ctx.globalCompositeOperation='source-atop';
			var img = this.TEXTURES_LOADED[0]; 
			this.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.$canvas[0].width, this.$canvas[0].height);				
			ctx.restore();			
		}else{
			ctx.save();	
			ctx.globalCompositeOperation='destination-out';
			ctx.stroke();
			ctx.fill();
			ctx.restore();
		}

		
		
		// if(this.gCounter<this.gCounterMax){
		// 	h -= (this.gCounterMax-this.gCounter);
		// }
		// var radius = Math.min(h,this.gCounter);
		
	
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
		this.SCALE = 100;		
		this.build();
		return this;
	},
	//public
	get_status:function(){
		return this.STATUS;
	},	
	get_scale:function(){
		return this.SCALE;
	},
	//private
	update_status:function(){
		this.set_status("Масштаб: "+this.SCALE+"%");
	},
	set_status:function(msg){
		this.STATUS = msg;		
		$(this).trigger('status-updated');
	},
	build:function(){
		this.$zoom = $([
			'<div id="painter-zoom-id" class="noselect">',
			'<div class="painter-zoom-in"><span>+</span></div>',
			'<div class="painter-zoom-out"><span>-</span></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$zoom);
		this.behavior();
		this.update_status();
	},		
	behavior:function(){
		var _this=this;
		$('#painter-zoom-id .painter-zoom-in').on("touchend, click",function(){			
			_this.zoom_in();
			return false;
		});
		$('#painter-zoom-id .painter-zoom-out').on("touchend, click",function(){			
			_this.zoom_out();
			return false;
		});		
	},
	zoom_in:function(){
		this.SCALE +=10;
		this.update_status();		
		$(this).trigger('scale-updated');
	},
	zoom_out:function(){
		this.SCALE -=10;
		this.update_status();
		$(this).trigger('scale-updated');
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



