

var Painter = {
	init:function(painter_id,size,params) {

		this.$painter = $('#'+painter_id);

		var params = params || {};
		
		this.PARAM = $.extend({
				w:size.painter[0],
				h:size.painter[1],
				c_w:size.canvas[0],
				c_h:size.canvas[1]				
			},params);

		// update for real bounds
		this.PARAM.w = this.$painter.width();
		this.PARAM.h = this.$painter.height();
		console.log('this.PARAM',this.PARAM)

		this.PIXEL_ASPECT = 2;

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

		this.BRUSH = params.brush;
		this.ZOOM = params.zoom;
		this.models = params.models;
		this.textures = params.textures;
		this.CANCELSYSTEM = params.cancelSystem;			

		var init_scale = this.PARAM.init_scale?this.PARAM.init_scale:1;		
		this.SCALE_ASPECT = init_scale;

		this.ALL_READY = false;

		this.pre_build();		
		this.recalc_size();
		this.behavior();		
		// this.textures_preload();

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
	pre_build:function() {

		this.CANVAS_WIDTH = this.PARAM.c_w * this.PIXEL_ASPECT;
		this.CANVAS_HEIGHT = this.PARAM.c_h * this.PIXEL_ASPECT;

		var b = this.get_bounds();
		
		// this.$painter.css({width:this.PARAM.w,height:this.PARAM.h,overflow:'hidden'});

		this.$canvas = $("<canvas></canvas>");		
		this.$canvas.attr({width:this.CANVAS_WIDTH,height:this.CANVAS_HEIGHT});

		this.$canvas.css({background:'#ffffff',position:'absolute'});					
		this.$canvas.css({width:b.w,height:b.h,left:b.left,top:b.top});

		this.$painter.append(this.$canvas);		
		this.ctx = this.$canvas[0].getContext('2d');
		
		this.bg_canvas = document.createElement('canvas');
		this.bg_ctx = this.bg_canvas.getContext('2d');
		this.bg_canvas.width = this.CANVAS_WIDTH;
		this.bg_canvas.height = this.CANVAS_HEIGHT;
		this.draw_bg_canvas();

		this.brush_texture_canvas = document.createElement('canvas');
		this.brush_texture_ctx = this.brush_texture_canvas.getContext('2d',{willReadFrequently: true});
		this.brush_texture_canvas.width = this.CANVAS_WIDTH;
		this.brush_texture_canvas.height = this.CANVAS_HEIGHT;

		this.model_canvas = document.createElement('canvas');
		this.model_ctx = this.model_canvas.getContext('2d');
		this.model_canvas.width = this.CANVAS_WIDTH;
		this.model_canvas.height = this.CANVAS_HEIGHT;		

		this.user_canvas = document.createElement('canvas');
		this.user_ctx = this.user_canvas.getContext('2d');
		this.user_canvas.width = this.CANVAS_WIDTH;
		this.user_canvas.height = this.CANVAS_HEIGHT;

		this.PARAM.onready && this.PARAM.onready();	

		this.CANCELSYSTEM.make_snapshot(this.user_canvas);
		this.set_status('загрузка...');
		this.compose();

	},

	update_texture_layer:function(){
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;		
		var img = this.textures.get_image();
		this.brush_texture_ctx.drawImage(img,0,0,img.width,img.height,0,0,w,h);
	},
	update_model_layer:function(){
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;	


		var img = this.models.get_image();
		var k = Math.min(w,h);	
		var minWidth = k==w;
		
		if(minWidth){			
			var ratio = img.width/w;
			var im_w = w;
			var im_h = img.height/ratio;
		}else{
			var ratio = img.height/h;
			var im_h = h;
			var im_w = img.width/ratio;			
		};
		
		this.model_ctx.drawImage(img,0,0,img.width,img.height,(w-im_w)/2,(h-im_h)/2,im_w,im_h);
		console.log('update_model_layer')
	},	

	is_all_ready:function() {
		if(this.textures.is_ready() && this.models.is_ready()){
			this.ALL_READY = true;
			this.update_texture_layer();
			this.update_model_layer();
			this.compose();
			this.set_status("Все готово");
			return this.ALL_READY;
		}
	},
	behavior:function() {
		var _this=this;		

		$(this.textures).on('all-loaded',function() {
			_this.is_all_ready();
		});
		$(this.models).on('all-loaded',function() {
			_this.is_all_ready();
		});		

		this.$painter[0].onmousemove = function(event){
			if(!_this.ALL_READY) return false;
			if(_this.DRAW_MODE){
				var s = _this.SCALE_ASPECT;
				var b = _this.get_bounds();
				_this.lastX = _this.posX;
				_this.lastY = _this.posY;

				
				_this.posX = (event.pageX - _this.p_offset.left - b.left) / s * _this.PIXEL_ASPECT;
				_this.posY = (event.pageY - _this.p_offset.top - b.top) / s * _this.PIXEL_ASPECT;

				_this.draw();
				_this.compose();
			};
			if(_this.PAN_MODE){
				var x = event.pageX - _this.pan_coord.deltaX;
				var y = event.pageY - _this.pan_coord.deltaY;
				_this.world_coord = [x,y];
				_this.canvas_update_pos();				
			}
		};	

		this.$painter[0].onmousedown = function(event){	
			if(!_this.ALL_READY || _this.ZOOM.is_hover() || _this.BRUSH.is_hover()) return false;
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
				var s = _this.SCALE_ASPECT;
				var b = _this.get_bounds();

				_this.posX = (event.pageX - _this.p_offset.left - b.left) / s * _this.PIXEL_ASPECT;
				_this.posY = (event.pageY - _this.p_offset.top - b.top) / s * _this.PIXEL_ASPECT;


				if(_this.hit_the_canvas()){
					_this.PAN_MODE = false;
					_this.DRAW_MODE = true;
					_this.lastX = _this.posX;
					_this.lastY = _this.posY;
					_this.NEED_TO_SNAPSHOT = true;
					_this.draw_start_cap();	
					_this.compose();					
				}
			}

		};

		this.$painter[0].onmouseup = function(event){
			if(!_this.ALL_READY) return false;
			_this.ending_draw();
		};				

		this.$painter[0].onmouseleave = function(event){
			if(!_this.ALL_READY) return false;
			_this.ending_draw();
		};
		
		document.addEventListener('keydown',function(e){	
			if(!_this.ALL_READY) return false;
			// pan mode
			if (e.key == " " || e.code == "Space" || e.keyCode == 32 ) {
				_this.SPACEBAR_PRESSED = true;
				_this.DRAW_MODE = false;			
				document.body.style.cursor = 'grab';
			};
		});		

		document.addEventListener('keyup',function(e){			
			if(!_this.ALL_READY) return false;
			if (e.key == " " || e.code == "Space" || e.keyCode == 32 ) {		  	
				_this.SPACEBAR_PRESSED = false;
				_this.PAN_MODE = false;
				document.body.style.cursor = 'default';
			}			
		});

		$(this.CANCELSYSTEM).on('make-cancel',function(e,canvas){					
			if(!_this.ALL_READY) return false;			
			_this.user_ctx.clearRect(0, 0, _this.user_ctx.canvas.width, _this.user_ctx.canvas.height)
			_this.user_ctx.drawImage(canvas,0,0);
			_this.compose();
			console.log("make cancel!")
		});

		$(this.ZOOM).on('scale-updated',function(){		
			if(!_this.ALL_READY) return false;
			_this.SCALE_ASPECT = _this.ZOOM.get_scale()/100;	
			_this.canvas_update_pos();			
		});		
		$(this.BRUSH).on('clearall',function(){		
			if(!_this.ALL_READY) return false;
			_this.clear();
		});				

	},
	get_bounds:function(){
		var w = this.PARAM.c_w;
		var h = this.PARAM.c_h;	
		var s = this.SCALE_ASPECT;		
		var w_coord = this.world_coord;
		if(s==1){
			return {w:w,h:h,left:w_coord[0],top:w_coord[1]};
		}else{					
			return {w:w*s, h:h*s, left:w_coord[0]+(w-w*s)*.5, top:w_coord[1]+(h-h*s)*.2};
			// return {w:w*s, h:h*s, left:0, top:0};
		}		
	},
	compose:function(){		
		this.ctx.drawImage(this.bg_canvas,0,0); 		
		this.ctx.drawImage(this.user_canvas,0,0);
		this.ctx.drawImage(this.model_canvas,0,0);  
	},
	canvas_update_pos:function(){		
		var b = this.get_bounds();
		this.$canvas.css({width:b.w,height:b.h,left:b.left,top:b.top});		
	},

	recalc_size:function() {		
		var $p = this.$painter;
		this.p_offset = {top:$p.offset().top,left:$p.offset().left};			
		// this.pixel_size = $p.width()/this.$canvas[0].width;	
		this.pixel_size = 1;
	},
	ending_draw:function() {
		this.DRAW_MODE = false;
		this.PAN_MODE = false;
		this.SPACEBAR_PRESSED = false;		
		if(this.NEED_TO_SNAPSHOT){
			this.CANCELSYSTEM.make_snapshot(this.user_canvas);	
			this.NEED_TO_SNAPSHOT = false;
		}		
	},
	hit_the_canvas:function() {
		var save_area = 200;
		var hitted = this.posX>-save_area && this.posY>-save_area 
			&& this.posX< this.CANVAS_WIDTH+1+save_area 
			&& this.posY < this.CANVAS_HEIGHT+1+save_area;
		return hitted;
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
		var w = _this.$canvas[0].width;
		var h = _this.$canvas[0].height;
		var arr_ctx = [this.ctx,this.user_ctx];
		for(var i in arr_ctx){
		  	arr_ctx[i].fillStyle = "#00000000";
		  	arr_ctx[i].save();
		  	arr_ctx[i].globalCompositeOperation='source-out';	  	
		  	arr_ctx[i].rect(0,0,w,h);
		  	arr_ctx[i].fill();
		  	arr_ctx[i].restore();
		}
		this.compose();
		// this.ctx2 = new canvas2pdf.PdfContext(blobStream());
	},
	draw:function() {
		this.draw_line(this.user_ctx);
		this.brush_show_texture(this.user_ctx);
	},
	draw_start_cap:function() {
		this.draw_circle(this.user_ctx);		
		this.brush_show_texture(this.user_ctx);
	},
	get_color:function(){
		var x = Math.floor(this.posX);
		var y = Math.floor(this.posY);		
		var color = this.brush_texture_ctx.getImageData(x, y, 1, 1).data;
		return 'rgba('+color[0]+','+color[1]+','+color[2]+','+color[3]+')';
	},	
	get_color_rand:function() {
		var r= Math.floor(Math.random() * 254);
		var g= Math.floor(Math.random() * 254);
		var b= Math.floor(Math.random() * 254);
		return 'rgba('+r+','+g+','+b+',1)';
	},
	brush_show_texture:function(ctx){
		var _this=this;
		this.TMR_BRUSH_TEXTURE && clearTimeout(this.TMR_BRUSH_TEXTURE); 
		this.TMR_BRUSH_TEXTURE = setTimeout(function(){
			ctx.save();
			ctx.globalCompositeOperation='source-atop';			
			var img = _this.brush_texture_canvas;
			ctx.drawImage(img, 0, 0);
			ctx.restore();
			_this.compose();
		},0);
	},
	draw_bg_canvas:function(){
		var ctx = this.bg_ctx;
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;
		var counter = -1;
		var row_height = 10;
		var total = h/row_height+1;
		for(var i=0;i<total;i++){
			counter*=-1;
			ctx.fillStyle = counter>0?"#000000":"#444444";
			ctx.fillRect(0, i*row_height, w, row_height);
		}		
	},
	draw_line:function(ctx) {		
		var _this=this;
		
		ctx.strokeStyle = this.get_color();

		ctx.lineCap = 'round';
		ctx.lineJoin = "round";
		
		var brush_size =  this.BRUSH.get_size();			
		var posX = this.posX;
		var posY = this.posY;
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;


		// ctx.lineWidth = Math.min(h,this.gCounter);
		// var delta = Math.hypot(this.lastX - posX, this.lastY - posY);
		// if(delta<h/3) return false;
		// if(this.gCounter<this.gCounterMax)return false;

		// this.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.$canvas[0].width, this.$canvas[0].height);
		
		// ctx.save();
		


		ctx.lineWidth = brush_size;
		ctx.beginPath();       
		ctx.moveTo(this.lastX, this.lastY);	
		ctx.lineTo(posX,posY);  			
		if(this.BRUSH && this.BRUSH.get_drawing_mode()){
			//drawing
			ctx.stroke();			
		}else{
			//erasing
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
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;
			
			ctx.beginPath();
			ctx.arc(this.posX,this.posY, radius, 0, 2 * Math.PI, false);			
			ctx.fillStyle = this.get_color();			
			ctx.lineWidth = 0;
			ctx.strokeStyle = '#00000000';
					
		if(this.BRUSH && this.BRUSH.get_drawing_mode()){
			ctx.stroke();
			ctx.fill();			
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
	init:function(painter_id, arr_params) {
		
		this.$parent = $('#'+painter_id);

		this.BRUSH_SIZE_MIN = arr_params[0];
		this.BRUSH_SIZE_MAX = arr_params[1];
		this.BRUSH_SIZE_STEP = arr_params[2];

		this.BRUSH_SIZE_CURRENT = (this.BRUSH_SIZE_MAX-this.BRUSH_SIZE_MIN)/2+this.BRUSH_SIZE_MIN;		
		this.DRAWING_MODE = true;
		
		this.set_status("режим рисования");
		this.update_drawing_mode(true);

		this.build();		
		this.set_current('brush');

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
	build:function(){
		this.$tools = $([
			'<div id="painter-tools-id" class="noselect skin-green">',
			'<div class="painter-tools-newdoc"></div>',
			'<div class="painter-tools-fill disabled"></div>',
			'<div class="painter-tools-brush current"></div>',
			'<div class="painter-tools-eraser"></div>',
			'<div class="painter-tools-clearall"></div>',
			'<div class="painter-tools-brushsizer"><span><span></span></span></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$tools);

		this.$b_sizer = this.$tools.find('.painter-tools-brushsizer');
		this.B_SIZER_TOP = this.$b_sizer.offset().top;
		this.behavior();
		this.b_size_update();		
	},	
	b_size_update:function(){

	},
	set_current:function(tool_name) {
		var $t = this.$tools.find('.painter-tools-'+ tool_name);
		if($t.length){
			this.$tools.find('>div').removeClass('current');
			$t.addClass('current');
			this.CURRENT_TOOL = tool_name;	
		}
	},
	behavior:function() {
		var _this=this;
		document.onkeydown = function(e) {			
		  if (e.key == "x" || e.code == "KeyX") {
		  	if(_this.get_drawing_mode()){
				_this.update_drawing_mode(false);
				_this.set_current('eraser');
		  	}else{
				_this.update_drawing_mode(true);
				_this.set_current('brush');		  		
		  	}
		  };
		  if (e.key == "b" || e.code == "KeyB") {
				_this.update_drawing_mode(true);
				_this.set_current('brush');
		  };		  
		  if (e.key == "e" || e.code == "KeyE") {
				_this.update_drawing_mode(false);
				_this.set_current('eraser');
		  };
			// clear all
			if (e.key == "c" || e.code == "KeyC" || e.keyCode == 67 ) {
				_this.say("clearall");	 
			}
		};	
		var all_tools = [
			'.painter-tools-newdoc',
			'.painter-tools-fill',
			'.painter-tools-brush',
			'.painter-tools-eraser',
			'.painter-tools-clearall',
			'.painter-tools-brushsizer'
			].join(', '); 
		this.$tools.find(all_tools).hover(function() {			
		 _this.IS_HOVER = true;},function() { _this.IS_HOVER = false;});

		this.$tools.find('.painter-tools-brush').on('touchend, click',function(){
			_this.update_drawing_mode(true);
			_this.set_current('brush');
		});
		this.$tools.find('.painter-tools-eraser').on('touchend, click',function(){
			_this.update_drawing_mode(false);
			_this.set_current('eraser');
		});	
		this.$tools.find('.painter-tools-clearall').on('touchend, click',function(){			
			_this.say("clearall");
		});
		this.$tools.find('.painter-tools-newdoc').on('touchend, click',function(){			
			_this.say("newdoc");
		});			
		console.log('this.$b_sizer',this.$b_sizer[0])
		this.$b_sizer[0].addEventListener('mousemove',function(e) {			
			console.log(e.pageY-_this.B_SIZER_TOP);
		});			

	},
	say:function(msg){		
		$(this).trigger(msg);
	},
	is_hover:function(){		
		return this.IS_HOVER;
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
	// update_label_brush_size:function() {	
	// 	this.$lable_size.html(''+this.BRUSH_SIZE_CURRENT);
	// },
	// prepare:function() {
	// 	var _this=this;
		
	// 	this.update_label_brush_size();
	// 	var sldr = {min:this.BRUSH_SIZE_MIN,max:this.BRUSH_SIZE_MAX,step:this.BRUSH_SIZE_STEP};		

	// 	this.$range_size.slider({min:sldr['min'],max:sldr['max']});
	// 	this.$range_size.slider( "value", this.BRUSH_SIZE_CURRENT );

	// 	this.$range_size.slider({
	// 	    animate: "fast",
	// 	    min:sldr['min'],
	// 	    max:sldr['max'],
	// 	    step:sldr['step'],
	// 	    slide:function(e,ui) {		    	
	// 	    	_this.BRUSH_SIZE_CURRENT = ui.value;
	// 	    	_this.update_label_brush_size();
	// 	    },
	// 	    change:function(e,ui) {		    	
	// 	    	_this.BRUSH_SIZE_CURRENT = ui.value;
	// 	    	_this.update_label_brush_size();
	// 	    }			    
	// 	});
		
	// }
};

var PainterZoom = {
	init:function(painter_id,init_scale){		
		
		this.$parent = $('#'+painter_id);
		var init_scale = init_scale?init_scale:1;
		this.SCALE = init_scale*100;	
		this.STEP_SCALE = 15;	
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
	is_hover:function() {
		return this.IS_HOVER;
	},
	build:function(){
		this.$zoom = $([
			'<div id="painter-zoom-id" class="noselect skin-green">',
			'<div class="painter-zoom-in"></div>',
			'<div class="painter-zoom-out"></div>',
			'<div class="painter-zoom-pan"></div>',
			'<div class="painter-zoom-divider"></div>',
			'<div class="painter-zoom-preview"></div>',
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
		$('#painter-zoom-id').hover(function() {
			_this.IS_HOVER = true;
		},function() {
			_this.IS_HOVER = false;
		});
	},
	zoom_in:function(){
		this.SCALE +=this.STEP_SCALE;
		this.update_status();		
		$(this).trigger('scale-updated');
	},
	zoom_out:function(){
		this.SCALE -=this.STEP_SCALE;
		this.update_status();
		$(this).trigger('scale-updated');
	}
};

var PainterCancelSystem = {
	init:function(painter_id,max_cancel_steps) {
		this.ARR_SNAPSHOTS = [];
		this.MAX_STEPS = max_cancel_steps;		
		this.CURRENT = -1;
		this.behavior();
		this.update_status();
		return this;
	},
	make_snapshot:function(canvas) {
		var cnv = document.createElement('canvas');
		cnv.width = canvas.width;
		cnv.height = canvas.height;
		var ctx = cnv.getContext('2d');
		ctx.drawImage(canvas,0,0);
		this.ARR_SNAPSHOTS.splice(this.CURRENT+1);
		this.ARR_SNAPSHOTS.push(cnv);		
		this.CURRENT++;		
		if(this.ARR_SNAPSHOTS.length>this.MAX_STEPS+1){ 
			this.ARR_SNAPSHOTS.shift();
			this.CURRENT--;
		};		
		this.update_status();
	},
	make_cancel:function() {
		
		// if(this.CURRENT<0) return false;

		if(this.ARR_SNAPSHOTS[this.CURRENT-1]){
			this.CURRENT--;
			var canvas = this.ARR_SNAPSHOTS[this.CURRENT];						
			console.log('this.ARR_SNAPSHOTS3',this.ARR_SNAPSHOTS.length)
			console.log('this.CURRENT',this.CURRENT)
			$(this).trigger('make-cancel',canvas);					
			this.update_status();
		}
	},
	// make_restore:function() {
	// 	if(this.CURRENT>-1 && this.ARR_SNAPSHOTS[this.CURRENT+1]){
	// 		this.CURRENT++;
	// 		var canvas = this.ARR_SNAPSHOTS[this.CURRENT];			
	// 		$(this).trigger('make-cancel',canvas);
	// 		this.update_status();
	// 	}
	// },
	behavior:function() {
		var _this=this;
		document.addEventListener('keydown',function(e){		  			
			// console.log('e',e);
		  if(e.key === 'z' && (e.ctrlKey || e.metaKey) ){ 		  	
		  	_this.make_cancel();		  	
		  }
		});			
	},
	get_status:function() {
		return this.STATUS;
	},
	update_status:function() {		
		var remainder =  this.CURRENT;
		this.STATUS = "доступно<br> отмен: "+remainder;
		$(this).trigger('status-updated');		
	}
}

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
		this.$statusbar.find('span').css({width:100/this.ARR.length+'%'});
	},
	build:function(){
		var str_sections = "";
		for(var i in this.ARR){
			str_sections+="<span>1</span>";
		}
		this.$statusbar = $([
			'<div id="painter-status-bar" class="noselect">',
			str_sections,
			'</div>'
			].join(''));
		this.$parent.append(this.$statusbar);		
	}
};

var PainterModel = {
	init:function(painter_id,arr_models) {
		this.$parent = $('#'+painter_id);
		this.ARR = arr_models || [];
		this.ARR_LOADED = [];
		this.ALL_READY = false;
		this.set_status("Загружаются модели...");
		this.set_current(0);		
		this.preload(0);
		// this.behavior();
		return this;
	},
	is_ready:function() {
		return this.ALL_READY;
	},
	behavior:function() {
		
	},
	set_all_loaded:function() {
		this.ALL_READY = true;
		$(this).trigger('all-loaded');
	},
	get_image:function() {
		return this.ARR_LOADED[this.CURRENT];
	},	
	get_status:function() {
		return this.STATUS;
	},
	set_status:function(msg) {
		this.STATUS = msg;
		$(this).trigger('status-updated');
	},	
	preload:function() {
		var _this=this;								
		this.set_status("Загружено моделей: "+ _this.ARR_LOADED.length);						
		var src = this.ARR.shift();
		if(src){
			var img = new Image();
			img.onload = function() {
				_this.ARR_LOADED.push(this);
				_this.preload();
			};
			img.src = src;
		}else{
			_this.set_all_loaded();	
		}
	},
	set_current:function(index) {
		this.CURRENT = index;
	}

};

var PainterTexture = {
	init:function(painter_id,arr_textures) {
		this.$parent = $('#'+painter_id);
		this.ARR = arr_textures || [];
		this.ARR_LOADED = [];
		this.ALL_READY = false;
		this.set_status("Загружаются текстуры...");
		this.set_current(0);		
		this.preload(0);
		// this.behavior();
		return this;
	},
	is_ready:function() {
		return this.ALL_READY;
	},
	behavior:function() {
		
	},
	get_image:function() {
		return this.ARR_LOADED[this.CURRENT];
	},
	set_all_loaded:function() {
		this.ALL_READY = true;
		$(this).trigger('all-loaded');
	},
	get_status:function() {
		return this.STATUS;
	},
	set_status:function(msg) {
		this.STATUS = msg;
		$(this).trigger('status-updated');
	},	
	preload:function() {
		var _this=this;								
		this.set_status("Загружено текстур: "+ _this.ARR_LOADED.length);						
		var src = this.ARR.shift();
		if(src){
			var img = new Image();
			img.onload = function() {
				_this.ARR_LOADED.push(this);
				_this.preload();
			};
			img.src = src;
		}else{
			_this.set_all_loaded();	
		}
	},
	set_current:function(index) {
		this.CURRENT = index;
	}

};

$(function(){	

	var CFG = {
		size:{ painter:[1000,500], canvas:[1000,800]},
		init_scale:1,
		brush_params:[5,60,5],
		max_cancel_steps:5,
		textures:["img/img1.jpg"],
		models:["img/model-1.png"]		
	};


	Painter.init('painter',CFG.size,{		
		brush:PainterBrush,
		models:PainterModel,
		textures:PainterTexture,
		zoom:PainterZoom,
		cancelSystem:PainterCancelSystem,
		statusbar:PainterStatusbar,
		init_scale:CFG.init_scale,		
		onready:function(){
			this.models.init('painter',CFG.models);
			this.textures.init('painter',CFG.textures);
			this.brush.init('painter',CFG.brush_params);
			this.zoom.init('painter',CFG.init_scale);
			this.cancelSystem.init('painter',CFG.max_cancel_steps);
			this.statusbar.init('painter',[
				Painter,this.brush,this.zoom,this.cancelSystem,this.models,this.textures]);
		}
	});

 
});


