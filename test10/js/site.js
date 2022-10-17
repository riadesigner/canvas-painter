

var Painter = {
	init:function(painter_id,size,params) {

		this.$painter = $('#'+painter_id);

		var params = params || {};
		
		this.PARAM = $.extend({
				w:1000,
				h:500,
				c_w:size.width,
				c_h:size.height				
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
		this.CANCELSYSTEM = params.cancelSystem;	
		this.themesSystem = params.themesSystem;				

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

	pre_build:function() {

		this.CANVAS_WIDTH = this.PARAM.c_w * this.PIXEL_ASPECT;
		this.CANVAS_HEIGHT = this.PARAM.c_h * this.PIXEL_ASPECT;

		var b = this.get_bounds();

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
	update_user_layer:function() {
		this.brush_show_texture(this.user_ctx);
	},
	update_texture_layer:function(){
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;		
		var img = this.themesSystem.get_image();
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
		this.model_ctx.clearRect(0, 0,w,h);
		this.model_ctx.drawImage(img,0,0,img.width,img.height,(w-im_w)/2,(h-im_h)/2,im_w,im_h);		
	},	

	is_all_ready:function() {
		if(this.themesSystem.is_ready() && this.models.is_ready()){
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
			
			if(!_this.ALL_READY || 
				_this.ZOOM.is_hover() || 
				_this.BRUSH.is_hover() ||
				_this.CANCELSYSTEM.is_hover() ||
				_this.themesSystem.is_hover() ||
				_this.models.is_hover() ) return false;

			if(_this.SPACEBAR_PRESSED || _this.ZOOM.pan_chosen() ){
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
			console.log("make cancel!!!!")
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

		$(this.themesSystem).on('all-loaded',()=>{ this.is_all_ready(); });		
		$(this.models).on('all-loaded',()=> { this.is_all_ready(); });		
		$(this.themesSystem).on('onchanged',()=>{
			this.update_texture_layer();
			this.update_user_layer();
			this.compose();
		});		
		$(this.models).on('onchanged',()=>{
			this.update_model_layer();
			// this.update_texture_layer();
			// this.update_user_layer();
			console.log("models onchanged")
			this.compose();
		});				


	},
	get_bounds:function(){
		var c_w = this.PARAM.c_w;
		var c_h = this.PARAM.c_h;	
		var w = this.PARAM.w;
		var h = this.PARAM.h;			
		var s = this.SCALE_ASPECT;		
		var w_coord = this.world_coord;		
		var bounds = {w:c_w*s, c_h:h*s, left:w_coord[0]+(w-c_w*s)*.5, top:w_coord[1]+(h-c_h*s)*.4};		
		return bounds;
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
		this.DRAWING_MODE = true;
		
		this.set_status("режим рисования");
		this.update_drawing_mode(true);

		this.build();			
		this.set_current('brush');
		this.b_size_update(50);

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
			'<div id="painter-tools-id" class="noselect">',
			'<div class="painter-tools-newdoc"></div>',
			'<div class="painter-tools-fill disabled"></div>',
			'<div class="painter-tools-brush current"></div>',
			'<div class="painter-tools-eraser"></div>',
			'<div class="painter-tools-clearall"></div>',
			'<div class="painter-tools-brushsizer"><span class="header"><span></span></span></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$tools);

		this.$b_sizer = this.$tools.find('.painter-tools-brushsizer');
		this.$b_sizer_header = this.$b_sizer.find('.header');
		this.B_SIZER_TOP = this.$b_sizer.offset().top;
		this.B_SIZER_HEIGHT = this.$b_sizer.height();
		this.B_SIZER_HEADER_HEIGHT = this.$b_sizer_header.height();
		this.behavior();
		this.b_size_update(0);
	},	
	b_size_update:function(pr){		
		var topY = (this.B_SIZER_HEIGHT-this.B_SIZER_HEADER_HEIGHT)/100*pr;
		var scale = 1;
		var scale = map_range((100-pr),0,100,45,85) / 100;
		this.$b_sizer_header.css({transform:"translateY("+topY+"px) scale("+scale+")"});				
		this.BRUSH_SIZE_CURRENT = map_range((100-pr),0,100,this.BRUSH_SIZE_MIN,this.BRUSH_SIZE_MAX);		
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
		
		this.$tools.find(all_tools).hover(()=> { this.IS_HOVER = true;},()=>{ this.IS_HOVER = false;});

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
		
		var foo = {
			calc:function(e){
			if(!_this.B_SIZER_HANDLED)return false;
			var SPECIAL_OFFSET = 24; 
			var h = _this.B_SIZER_HEIGHT-SPECIAL_OFFSET*2;
			if(e.touches && e.touches.length){
				var posY = e.touches[0].pageY;
			}else{
				var posY = e.pageY;
			};
			var pos = posY-_this.B_SIZER_TOP-SPECIAL_OFFSET;			
			var persents = 100/h*pos;
			persents = persents<0?0:persents;
			persents = persents>100?100:persents;
			_this.b_size_update(persents);
			}
		};
		this.$b_sizer[0].addEventListener('mousemove',(e)=> {foo.calc(e);});
		this.$b_sizer[0].addEventListener('touchmove',(e)=> {foo.calc(e);});
		this.$b_sizer[0].addEventListener('touchstart',(e)=>{ this.B_SIZER_HANDLED = true;foo.calc(e); });
		this.$b_sizer[0].addEventListener('mousedown',(e)=>{ this.B_SIZER_HANDLED = true;foo.calc(e);});
		this.$b_sizer[0].addEventListener('touchend',(e)=>{this.B_SIZER_HANDLED = false; });		
		document.addEventListener('mouseup',(e)=>{ this.B_SIZER_HANDLED = false;});		
		
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
		this.PAN_CHOSEN = false;
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
	pan_chosen:function(){
		return this.PAN_CHOSEN;
	},
	//private
	toggle_pan_tool:function() {
		if(!this.PAN_CHOSEN){
			this.PAN_CHOSEN = true;
			this.$pan_tool.addClass('chosen');
			document.body.style.cursor = 'grab';
		}else{
			this.$pan_tool.removeClass('chosen');
			this.PAN_CHOSEN = false;
			document.body.style.cursor = 'default';
		}
	},
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
			'<div id="painter-zoom-id" class="noselect">',
			'<div class="painter-zoom-in"></div>',
			'<div class="painter-zoom-out"></div>',
			'<div class="painter-zoom-pan"></div>',
			'<div class="painter-zoom-divider"></div>',
			'<div class="painter-zoom-preview"></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$zoom);
		this.$pan_tool = this.$zoom.find('.painter-zoom-pan');
		this.$zoom_in_tool = this.$zoom.find('.painter-zoom-in');
		this.$zoom_out_tool = this.$zoom.find('.painter-zoom-out');
		this.behavior();
		this.update_status();
	},		
	behavior:function(){
		
		this.$zoom_in_tool.on("touchend, click",()=>{ this.zoom_in(); return false; });
		this.$zoom_out_tool.on("touchend, click",()=>{ this.zoom_out(); return false; });				
		this.$pan_tool.on("touchend, click", ()=>{ this.toggle_pan_tool(); });		
		this.$zoom.hover(() =>{ this.IS_HOVER = true;},()=> {this.IS_HOVER = false;});

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

var PainterThemes = {
	init:function(painter_id,themes){		
		
		this.$parent = $('#'+painter_id);				
		this.STATUS = "";
		this.IS_READY = false;

		this.THEMES = themes; 		
		this.TEXTURES = this.THEMES.textures;
		this.SETS = this.THEMES.sets;
		this.LINES = this.THEMES.lines;		
		this.NAMES = this.get_all_names();		

		this.ARR_TEXTURES_LOADED = [];
		this.build();		
		this.load_textures();
		this.set_current(1);
		
		return this;
	},
	//public
	get_status:function(){
		return this.STATUS;
	},
	is_ready:function() {
		return this.IS_READY;
	},
	get_image:function() {		
		return this.ARR_TEXTURES_LOADED[this.SETS[this.CURRENT].texture];
	},	
	//private
	get_all_names:function() {
		var arr_nm = []; 
		for (var i in this.THEMES.sets){
			arr_nm.push(this.THEMES.sets[i].name);
		};
		return arr_nm;		
	},	
	load_textures:function() {
		var _this=this;		
		if(!this.ARR_TEXTURES_LOADED.length){
			this.NEED_TO_LOAD = [];
			for (var i in this.TEXTURES){
				this.NEED_TO_LOAD.push(this.TEXTURES[i].img);
			}
		};
		var src = this.NEED_TO_LOAD.shift();

		if(src){						
			var counter = this.ARR_TEXTURES_LOADED.length +1;			
			this.set_status("Загрузка текстуры ... " + counter );
			var img = new Image();
			img.onload = function(){
				_this.ARR_TEXTURES_LOADED.push(img);
				_this.load_textures();			
			}
			img.src = src;			
		}else{						
			this.IS_READY = true;			
			this.set_status("Загружено текстур: " + this.ARR_TEXTURES_LOADED.length );			
			$(this).trigger('all-loaded');			
		}
	},	

	set_status:function(msg){
		this.STATUS = msg;		
		$(this).trigger('status-updated');
	},
	is_hover:function() {
		return this.IS_HOVER;
	},
	set_current:function(index) {
		var _this=this;
		this.CURRENT = index;
		var msg = 'Тема:'+ index;		
		$.each(this.NAMES,function(i) { _this.$parent.removeClass(_this.NAMES[i]); });
		this.$parent.addClass(this.NAMES[index]);
		this.$parent.find('li').removeClass('current').eq(index).addClass('current');
		this.set_status(msg);
		$(this).trigger('onchanged',this.CURRENT);

	},
	build:function(){
		var themes = ""; 
		for (var i=0; i<this.SETS.length; i++){			
			var color1 = this.LINES[this.SETS[i].lines];
			var color2 = this.TEXTURES[this.SETS[i].texture].color;			
			themes+=['<li>',
					'<div><span style="background:'+color1+'"></span></div>',
					'<div><span style="background:'+color2+'"></span></div>',
				'</li>'].join('');
			};

		this.$themesTool = $([
			'<div id="painter-themes-tool" class="noselect">',
			'<div class="content">',
				'<ul>' +themes + '</ul>',
			'</div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$themesTool);
		this.behavior();		
	},
	behavior:function(){
		var _this=this;

		this.$themesTool.hover((e)=>{this.IS_HOVER=true;},(e)=>{this.IS_HOVER=false;});
		this.$themesTool.find('li').each(function(index){
			$(this).on("touchend, click",(e)=>{
				_this.set_current(index);				
			});
		});
	}
};

var PainterCancelSystem = {
	init:function(painter_id,max_cancel_steps) {
		this.$parent = $('#'+painter_id);
		this.ARR_SNAPSHOTS = [];
		this.MAX_STEPS = max_cancel_steps;		
		this.CURRENT = -1;
		this.build();	
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
	build:function(){
		this.$btns = $([
			'<div id="painter-cancel-tool" class="noselect">',
			'<div class="painter-cancel-back disabled"><span></span></div>',
			'<div class="painter-cancel-forward disabled"><span></span></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$btns);		
		this.$btnBack = this.$btns.find('.painter-cancel-back');
		this.$btnForw = this.$btns.find('.painter-cancel-forward');
	},	
	make_cancel:function() {
		if(this.ARR_SNAPSHOTS[this.CURRENT-1]){			
			this.CURRENT--;
			var canvas = this.ARR_SNAPSHOTS[this.CURRENT];		
			this.update_status();
			$(this).trigger('make-cancel',canvas);			
		}
	},
	make_restore:function() {
		if(this.CURRENT>-1 && this.ARR_SNAPSHOTS[this.CURRENT+1]){
			this.CURRENT++;
			var canvas = this.ARR_SNAPSHOTS[this.CURRENT];			
			$(this).trigger('make-cancel',canvas);
			this.update_status();
		}
	},
	behavior:function() {
		var _this=this;
		
		document.addEventListener('keydown',(e)=>{			
		  if(e.key === 'z' && (e.ctrlKey || e.metaKey) ){ 		  	
		  	_this.make_cancel();
		  }
		});

		this.$btns.hover((e)=>{this.IS_HOVER = true;},(e)=>{this.IS_HOVER = false;});
		this.$btnBack.on('touchend, click',(e)=> {this.make_cancel();});
		this.$btnForw.on('touchend, click',(e)=> {this.make_restore();});
		
	},
	is_hover:function() {
		return this.IS_HOVER;
	},
	get_status:function() {
		return this.STATUS;
	},
	update_status:function() {		
		var remainder =  this.CURRENT;
		var restore = (this.ARR_SNAPSHOTS.length - 1 - this.CURRENT);
		
		remainder>0 ? this.$btnBack.removeClass('disabled'):this.$btnBack.addClass('disabled');
		restore >0 ? this.$btnForw.removeClass('disabled'):this.$btnForw.addClass('disabled');		

		this.STATUS = "Отмен: "+remainder;
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
		// this.$statusbar.find('span').css({width:100/(this.ARR.length+2)+'%'});
		this.$statusbar.find('span').css({'margin-right':'20px'});
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
		this.ARR_IMAGE_LOADED = [];
		this.ARR_MASK_LOADED = [];
		this.ARR_PREVIEW_LOADED = [];
		this.ALL_READY = false;		
		this.CURRENT = 0;
		this.set_status("Загрузка моделей ...");
		this.preload();
		// this.behavior();
		return this;
	},
	is_ready:function() {
		return this.ALL_READY;
	},
	is_hover:function() {
		return this.IS_HOVER;
	},
	behavior:function() {
		var _this=this;		
		this.$modelTools.find('>div').each(function(index){
			$(this).on("touchend, click",function(e) {
				_this.set_current(index);
			});
		});
		this.$modelTools.hover(()=>{this.IS_HOVER=true;},()=>{this.IS_HOVER=false;});
	},
	set_all_loaded:function() {
		this.ALL_READY = true;		
		this.build();		
		$(this).trigger('all-loaded');
		this.set_status("Всего моделей "+ this.ARR.length);
	},
	build:function() {
		this.$modelTools = $([
			'<div id="painter-model-tools" class="noselect">',
			'<div class="painter-model-tools-01 current"></div>',
			'<div class="painter-model-tools-02"></div>',
			'<div class="painter-model-tools-03"></div>',
			'</div>'
			].join(''));
		this.$parent.append(this.$modelTools);
		this.behavior();		
	},
	get_image:function() {		
		return this.ARR_IMAGE_LOADED[this.CURRENT];
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
		if(!this.NEED_TO_LOAD){
			this.NEED_TO_LOAD = [];
			for(var i in this.ARR){
				this.NEED_TO_LOAD.push(this.ARR[i]);
			}
		};		
		var data = this.NEED_TO_LOAD.shift();
		if(data){
			
			var img = new Image();
			img.onload = function() {
				_this.ARR_IMAGE_LOADED.push(this);
				//
				var mask = new Image();
				mask.onload = function() {
					_this.ARR_MASK_LOADED.push(this);
					//
					var preview = new Image();
					preview.onload = function() {
						_this.ARR_PREVIEW_LOADED.push(this);
						_this.preload();
					};			
					preview.src = data.preview;
				};			
				mask.src = data.mask;					
			};			
			img.src = data.img;

		}else{
			_this.set_all_loaded();	
		}
	},
	set_current:function(index) {		
		this.CURRENT = index;
		this.$modelTools && this.$modelTools.find('>div').removeClass('current').eq(index).addClass('current');
		$(this).trigger('onchanged');
	}

};


$(function(){	



var ARR_THEMES = {
		textures:[
			{img:"img/green.jpg",color:"#04a098"},
			{img:"img/sky.jpg",color:"#418dcc"},
			{img:"img/blue.jpg",color:"#0d4bac"},
			{img:"img/purple.jpg",color:"#8E6386"}
			],
		lines:{
			black:"#000000",
			red:"#f20c28",
			blue:"#0d4bac"
			},
		sets:[
			{lines:"black", texture:0, name:'theme-green'},
			{lines:"black", texture:1, name:'theme-sky'},
			{lines:"black", texture:2, name:'theme-blue'},
			{lines:"black", texture:3, name:'theme-purple'},
			{lines:"red", texture:3, name:'theme-purple'},
			{lines:"blue", texture:3, name:'theme-purple'},
			{lines:"blue", texture:0, name:'theme-green'}
			]		
		};

var ARR_MODELS = [
		{pos:0,img:"i/model-1.png",title:"тельняшка с рукавами",mask:"i/model-1-mask.png",preview:"i/model-1-preview.png"},
		{pos:1,img:"i/model-2.png",title:"тельняшка без рукавов",mask:"i/model-1-mask.png",preview:"i/model-1-preview.png"},
		{pos:2,img:"i/model-3.png",title:"тельняшка-платье с рукавами",mask:"i/model-1-mask.png",preview:"i/model-1-preview.png"}
		];

	var CFG = {
		size:{ width:1000,height:800},
		init_scale:.85,
		brush_params:[5,60],
		max_cancel_steps:5,
		themes:ARR_THEMES,
		models:ARR_MODELS		
	};


	Painter.init('painter',CFG.size,{		
		brush:PainterBrush,
		models:PainterModel,
		zoom:PainterZoom,
		cancelSystem:PainterCancelSystem,
		themesSystem:PainterThemes,
		statusbar:PainterStatusbar,
		init_scale:CFG.init_scale,		
		onready:function(){
			this.models.init('painter',CFG.models);
			this.brush.init('painter',CFG.brush_params);
			this.zoom.init('painter',CFG.init_scale);
			this.cancelSystem.init('painter',CFG.max_cancel_steps);
			this.themesSystem.init('painter',CFG.themes);			
			this.statusbar.init('painter',[
				Painter,this.models,this.zoom,this.themesSystem]);
		}
	});

 
});

function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

