

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
		// console.log('this.PARAM',this.PARAM)

		this.PIXEL_ASPECT = 2;

		this.DRAW_MODE = false;
		this.PAN_MODE = false;
		this.SPACEBAR_PRESSED = false;
		this.PREVIEW_MODE = false;		

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
		this.saveSystem = params.saveSystem;

		var init_scale = this.PARAM.init_scale?this.PARAM.init_scale:1;		
		this.SCALE_ASPECT = init_scale;

		this.ALL_READY = false;
		this.LOADING_MESSAGES = {};
		this.LOADING_MESSAGES.painter = "Загрузка...";

		 
		this.$loader = $('#painter-loader');
		this.loader_show();

		this.pre_build();		
		this.recalc_size();
		this.behavior();		
		// this.textures_preload();

	},	

	loader_show:function() {
		this.NOW_LOADING = true;
		
		this.$loader.show();
		this.TMR_LOADER && clearTimeout(this.TMR_LOADER);
		this.TMR_LOADER = setTimeout(()=>{ this.$loader.addClass('now-loading'); },0);
		
		var str = "";
		for (var i in this.LOADING_MESSAGES){
			str += "<p>"+this.LOADING_MESSAGES[i]+"</p>";
		};
		this.$loader.find(".message").html(str);

	},
	loader_hide:function() {	
		this.NOW_LOADING = false;
		this.$loader.removeClass('now-loading');
		this.TMR_LOADER && clearTimeout(this.TMR_LOADER);
		this.TMR_LOADER = setTimeout(()=>{ this.$loader.hide(); },300);
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
		this.update_bg_layer();

		this.brush_texture_canvas = document.createElement('canvas');
		this.brush_texture_ctx = this.brush_texture_canvas.getContext('2d',{willReadFrequently: true});
		this.brush_texture_canvas.width = this.CANVAS_WIDTH;
		this.brush_texture_canvas.height = this.CANVAS_HEIGHT;

		this.model_canvas = document.createElement('canvas');
		this.model_ctx = this.model_canvas.getContext('2d');
		this.model_canvas.width = this.CANVAS_WIDTH;
		this.model_canvas.height = this.CANVAS_HEIGHT;

		this.masked_canvas = document.createElement('canvas');
		this.masked_ctx = this.masked_canvas.getContext('2d');
		this.masked_canvas.width = this.CANVAS_WIDTH;
		this.masked_canvas.height = this.CANVAS_HEIGHT;		

		this.user_canvas = document.createElement('canvas');
		this.user_ctx = this.user_canvas.getContext('2d');
		this.user_canvas.width = this.CANVAS_WIDTH;
		this.user_canvas.height = this.CANVAS_HEIGHT;

		this.PARAM.onready && this.PARAM.onready();	

		this.CANCELSYSTEM.make_snapshot(this.user_canvas);
		this.set_status('загрузка...');
		this.compose();

	},
	update_bg_layer:function(){
		var ctx = this.bg_ctx;
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;

		if(this.ZOOM.is_preview_mode()){
			ctx.fillStyle = "#444444";
			ctx.fillRect(0, 0, w, h);
		}else{
			var counter = -1;
			var row_height = 10;
			var total = h/row_height+1;
			for(var i=0;i<total;i++){
				counter*=-1;
				ctx.fillStyle = counter>0?"#000000":"#444444";
				ctx.fillRect(0, i*row_height, w, row_height);
			}
		}
	},	
	update_user_layer:function() {
		this.brush_show_texture(this.user_ctx,"fast");
	},
	update_texture_layer:function(){
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;		
		var img = this.themesSystem.get_image();		
		this.brush_texture_ctx.drawImage(img,0,0,img.width,img.height,0,0,w,h);
	},
	update_masked_layer:function(){
		var img = this.models.get_mask();		
		var size = this.calc_model_size(img);
		this.masked_ctx.clearRect(0, 0,size.w,size.h);
		this.masked_ctx.drawImage(img, 0, 0, img.width, img.height, size.left, size.top, size.im_w, size.im_h );		
		this.masked_ctx.save();
		this.masked_ctx.globalCompositeOperation='source-in';			
		this.masked_ctx.drawImage(this.user_canvas, 0, 0);
		this.masked_ctx.restore();		
	},
	update_model_layer:function(){	

		if(this.ZOOM.is_preview_mode()){
			var img = this.models.get_preview();
		}else{
			var img = this.models.get_image();
		};	

		var size = this.calc_model_size(img);
		this.model_ctx.clearRect(0, 0,size.w,size.h);
		this.model_ctx.drawImage(img, 0, 0, img.width, img.height, size.left, size.top, size.im_w, size.im_h );		
	},	
	calc_model_size:function(img){
		var w = this.$canvas[0].width;
		var h = this.$canvas[0].height;
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
		var size = 	{
			w:w, h:h,
			left:(w-im_w)/2, top:(h-im_h)/2,
			im_w:im_w, im_h:im_h
			};
		return size;
	},
	is_all_ready:function() {
		if(this.themesSystem.is_ready() && this.models.is_ready()){
			this.ALL_READY = true;
			this.update_texture_layer();
			this.update_model_layer();
			this.compose();
			this.set_status("Все готово");
			setTimeout(()=>{ this.loader_hide();},300);
			return this.ALL_READY;
		}
	},
	behavior:function() {
		var _this=this;
		
		var foo = {
			onmousedown:function(event) {
				var pageX = event.touches?event.touches[0].pageX:event.pageX;
				var pageY = event.touches?event.touches[0].pageY:event.pageY;

				if(!_this.ALL_READY || 
					_this.ZOOM.is_hover() || 
					_this.BRUSH.is_hover() ||
					_this.CANCELSYSTEM.is_hover() ||
					_this.themesSystem.is_hover() ||
					_this.models.is_hover() ||
					_this.saveSystem.is_opened() ||
					_this.saveSystem.is_hover() ) return false;

				if(_this.SPACEBAR_PRESSED || _this.ZOOM.pan_chosen() ){
					// PAN
					_this.DRAW_MODE = false;
					_this.PAN_MODE = true;
					_this.pan_coord = {
						deltaX:pageX - _this.world_coord[0],
						deltaY:pageY - _this.world_coord[1]
					};
				}else{
					// DRAWING
					var s = _this.SCALE_ASPECT;
					var b = _this.get_bounds();

					_this.posX = (pageX - _this.p_offset.left - b.left) / s * _this.PIXEL_ASPECT;
					_this.posY = (pageY - _this.p_offset.top - b.top) / s * _this.PIXEL_ASPECT;


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
			},
			onmousemove:function(event) {
				if(!_this.ALL_READY) return false;

				var pageX = event.touches?event.touches[0].pageX:event.pageX;
				var pageY = event.touches?event.touches[0].pageY:event.pageY;				

				if(_this.DRAW_MODE){
					var s = _this.SCALE_ASPECT;
					var b = _this.get_bounds();
					_this.lastX = _this.posX;
					_this.lastY = _this.posY;
					
					_this.posX = (pageX - _this.p_offset.left - b.left) / s * _this.PIXEL_ASPECT;
					_this.posY = (pageY - _this.p_offset.top - b.top) / s * _this.PIXEL_ASPECT;

					_this.draw();
					_this.compose();
				};
				if(_this.PAN_MODE){
					var x = pageX - _this.pan_coord.deltaX;
					var y = pageY - _this.pan_coord.deltaY;
					_this.world_coord = [x,y];
					_this.canvas_update_pos();				
				}
			},
			onmouseup:function(event) {
				if(!_this.ALL_READY) return false;
				_this.ending_draw();
			},
			onmouseleave:function() {
				if(!_this.ALL_READY) return false;
				_this.ending_draw();
			}			
		};

		this.$painter[0].ontouchstart = function(event){  foo.onmousedown(event);};
		this.$painter[0].ontouchmove = function(event){ foo.onmousemove(event);};
		this.$painter[0].ontouchend = function(event){  foo.onmouseup(event);};

		this.$painter[0].onmousemove = function(event){ foo.onmousemove(event);};	
		this.$painter[0].onmousedown = function(event){ foo.onmousedown(event);};
		this.$painter[0].onmouseup = function(event){ foo.onmouseup(event); };				
		this.$painter[0].onmouseleave = function(event){ foo.onmouseleave(event); };
		
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
			_this.ZOOM.change_preview_mode(false);
			_this.updated_preview_mode();
		});

		$(this.ZOOM).on('scale-updated',function(){		
			if(!_this.ALL_READY) return false;
			_this.SCALE_ASPECT = _this.ZOOM.get_scale()/100;	
			_this.canvas_update_pos();
		});	

		$(this.ZOOM).on('pan-mode-updated',(e, panChosen)=>{
			if(!this.ALL_READY) return false;
			this.updated_pan_mode(panChosen);
		});

		$(this.ZOOM).on('preview-mode-updated',(e, previewMode)=>{
			if(!this.ALL_READY) return false;
			this.updated_preview_mode();
		});

		$(this.BRUSH).on('current-updated',(e)=>{		
			if(!this.ALL_READY) return false;
			this.ZOOM.change_pan_mode(false);
			this.updated_pan_mode(false);
			this.ZOOM.change_preview_mode(false);
			this.updated_preview_mode();
		});				

		$(this.BRUSH).on('brushsize-updated',(e)=>{
			if(!this.ALL_READY) return false;
			this.ZOOM.change_pan_mode(false);			
			this.updated_pan_mode(false);
			this.ZOOM.change_preview_mode(false);
			this.updated_preview_mode();
		});

		$(this.BRUSH).on('clearall',(e)=>{
			if(!this.ALL_READY) return false;
			this.clear();
			this.ZOOM.change_pan_mode(false);
			this.updated_pan_mode(false);
			this.ZOOM.change_preview_mode(false);
			this.updated_preview_mode();			
		});
		$(this.BRUSH).on('newdoc',(e)=>{
			if(!this.ALL_READY) return false;
			this.clear();
			this.ZOOM.change_pan_mode(false);
			this.updated_pan_mode(false);
			this.ZOOM.change_preview_mode(false);
			this.updated_preview_mode();			
		});		

		$(this.themesSystem).on('all-loaded',()=>{ this.is_all_ready(); });		
		$(this.models).on('all-loaded',()=> { this.is_all_ready(); });			
		$(this.themesSystem).on('theme-changed',(index)=>{ this.theme_changed(index);});		
		$(this.models).on('onchanged',(index)=>{ this.model_changed(index); });

	},
	model_changed:function(index){
		this.update_masked_layer();
		this.update_model_layer(); 
		this.compose();
	},
	theme_changed:function(index){
		//xxx
		var _this =this;
		var foo = {
			change_theme:()=>{
				if(this.ZOOM.is_preview_mode()){
				
					console.log("!! need change theme")	
					// this.update_bg_layer();
					this.update_texture_layer();
					this.update_user_layer();
					this.update_masked_layer();
					this.update_model_layer();
					this.compose();

				}else{
					this.update_texture_layer();
					this.update_user_layer();
					this.compose();			
				}				
			}
		};
		
		var set = this.themesSystem.get();
		this.models.set_current_lines(set.lines);

		if(this.models.is_theme_loaded(set)){
			foo.change_theme();
		}else{
			this.loader_show();
			this.models.load_theme(set,{
				onReady:function() {
					_this.loader_hide();
					foo.change_theme();
				}
			});
		}


	},
	compose:function(){		
		if(this.ZOOM.is_preview_mode()){
			this.ctx.drawImage(this.bg_canvas,0,0);
			this.ctx.drawImage(this.model_canvas,0,0);
			this.ctx.drawImage(this.masked_canvas,0,0);
		}else{
			this.ctx.drawImage(this.bg_canvas,0,0);
			this.ctx.drawImage(this.user_canvas,0,0);
			this.ctx.drawImage(this.model_canvas,0,0);
		}
	},	
	updated_pan_mode:function(panChosen) {
		if(panChosen){
			this.BRUSH.switch_off_all_brushes();
		}else{
			this.BRUSH.switch_on_last_brush();
		}
	},
	updated_preview_mode:function() {
		this.update_bg_layer();
		this.update_masked_layer();
		this.update_model_layer();
		this.compose();
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
	brush_show_texture:function(ctx,fast){		
		var _this=this;
		var foo = {
			draw:function(){
				ctx.save();
				ctx.globalCompositeOperation='source-atop';			
				var img = _this.brush_texture_canvas;
				ctx.drawImage(img, 0, 0);
				ctx.restore();
				_this.compose();
			}
		};		
		this.TMR_BRUSH_TEXTURE && clearTimeout(this.TMR_BRUSH_TEXTURE); 
		if(fast){
			foo.draw();
		}else{
			this.TMR_BRUSH_TEXTURE = setTimeout(function(){ foo.draw(); },0);	
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
						
		// this.DRAWING_MODE = true;		
		this.CURRENT_BRUSH_TOOL = 'brush';
		this.LAST_BRUSH_TOOL = this.CURRENT_BRUSH_TOOL;
			
		this.build();			
		this.set_current(this.CURRENT_BRUSH_TOOL);
		this.update_drawing_mode(this.DRAWING_MODE);

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

		this.$brushTool = this.$tools.find('.painter-tools-brush');
		this.$eraserTool = this.$tools.find('.painter-tools-eraser');
		this.$newdocTool = this.$tools.find('.painter-tools-newdoc');
		this.$clearallTool = this.$tools.find('.painter-tools-clearall');
		
		this.behavior();
		this.b_size_update(0);
	},
	say:function(toolsName){			
		$(this).trigger(toolsName);

	},	
	switch_on_last_brush:function(){
		var last_brush = this.LAST_BRUSH_TOOL;
		this.set_current(last_brush);
	},
	switch_off_all_brushes:function() {
		this.set_current(false);
	},	
	b_size_update:function(pr){		
		var topY = (this.B_SIZER_HEIGHT-this.B_SIZER_HEADER_HEIGHT)/100*pr;
		var scale = 1;
		var scale = map_range((100-pr),0,100,45,85) / 100;
		this.$b_sizer_header.css({transform:"translateY("+topY+"px) scale("+scale+")"});				
		this.BRUSH_SIZE_CURRENT = map_range((100-pr),0,100,this.BRUSH_SIZE_MIN,this.BRUSH_SIZE_MAX);		
	},
	set_current:function(tool_name) {			


		if(!tool_name){
			this.$tools.find('>div').removeClass('current');			
			this.CURRENT_BRUSH_TOOL = false;	
		}else{			
			var $t = this.$tools.find('.painter-tools-'+ tool_name);	
			if($t.length){				
				var drawmode =  tool_name==='brush';
				this.update_drawing_mode(drawmode);			
				this.LAST_BRUSH_TOOL = tool_name;			
				this.$tools.find('>div').removeClass('current');
				$t.addClass('current');
				this.CURRENT_BRUSH_TOOL = tool_name;	
			}
		}		
	},
	behavior:function() {
		var _this=this;
		document.onkeydown = function(e) {			
		  if (e.key == "x" || e.code == "KeyX") {
		  	if(_this.get_drawing_mode()){
				_this.set_current('eraser');
				$(_this).trigger('current-updated');
		  	}else{
				_this.set_current('brush');
				$(_this).trigger('current-updated');
		  	}
		  };
		  if (e.key == "b" || e.code == "KeyB") {				
				_this.set_current('brush');
				$(_this).trigger('current-updated');
		  };		  
		  if (e.key == "e" || e.code == "KeyE") {				
				_this.set_current('eraser');
				$(_this).trigger('current-updated');
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

		this.$brushTool.on('touchend, click',function(){
			_this.update_drawing_mode(true);
			_this.set_current('brush');
			$(_this).trigger('current-updated');
		});
		this.$eraserTool.on('touchend, click',function(){
			_this.update_drawing_mode(false);
			_this.set_current('eraser');
			$(_this).trigger('current-updated');
		});	


		this.$clearallTool.on('touchend, click',function(){						
			_this.say("clearall");
			_this.set_current('brush');
		});
		this.$newdocTool.on('touchend, click',function(){			
			_this.say("newdoc");
			_this.set_current('brush');
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
		this.$b_sizer[0].addEventListener('touchstart',(e)=>{ this.B_SIZER_HANDLED = true;foo.calc(e);  this.say("brushsize-updated"); });
		this.$b_sizer[0].addEventListener('mousedown',(e)=>{ this.B_SIZER_HANDLED = true;foo.calc(e); this.say("brushsize-updated"); });
		this.$b_sizer[0].addEventListener('touchend',(e)=>{this.B_SIZER_HANDLED = false; });		
		document.addEventListener('mouseup',(e)=>{ this.B_SIZER_HANDLED = false;});	

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
		this.PREVIEW_MODE = false;
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
	is_preview_mode:function(){
		return this.PREVIEW_MODE;
	},
	//private
	change_pan_mode(mode){
		if(mode){
			this.PAN_CHOSEN = true;
			this.$pan_tool.addClass('chosen');
			document.body.style.cursor = 'grab';			
		}else{
			this.$pan_tool.removeClass('chosen');
			this.PAN_CHOSEN = false;
			document.body.style.cursor = 'default';				
		}
	},
	change_preview_mode:function(mode){
		if(mode){
			this.PREVIEW_MODE=true;
			this.$preview_tool.addClass('chosen');			
		}else{
			this.PREVIEW_MODE=false;
			this.$preview_tool.removeClass('chosen');						
		};		
	},	
	toggle_pan_tool:function() {		
		if(!this.PAN_CHOSEN) {
			this.change_pan_mode(true);
		}else{
			this.change_pan_mode(false);			
			this.PREVIEW_MODE && this.change_preview_mode(false);				
		}
	},
	toggle_preview_mode:function() {
		if(!this.PREVIEW_MODE) {
			this.change_preview_mode(true);			
			!this.PAN_CHOSEN && this.change_pan_mode(true);
		}else{
			this.change_preview_mode(false);
			this.PAN_CHOSEN && this.change_pan_mode(false);			
		}
	},

	behavior:function(){
		
		this.$zoom_in_tool.on("touchend, click",()=>{ this.zoom_in(); return false; });
		this.$zoom_out_tool.on("touchend, click",()=>{ this.zoom_out(); return false; });				
		this.$zoom.hover(() =>{ this.IS_HOVER = true;},()=> {this.IS_HOVER = false;});

		this.$pan_tool.on("touchend, click", ()=>{ 			
			this.toggle_pan_tool(); 
			$(this).trigger("pan-mode-updated",this.PAN_CHOSEN); 
			$(this).trigger("preview-mode-updated",this.PREVIEW_MODE);
		});				
		
		this.$preview_tool.on("touchend, click",()=>{ 
			this.toggle_preview_mode(); 
			$(this).trigger("preview-mode-updated",this.PREVIEW_MODE);
			$(this).trigger("pan-mode-updated",this.PAN_CHOSEN);
		});
		

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
		this.$preview_tool = this.$zoom.find('.painter-zoom-preview');
		this.behavior();
		this.update_status();
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
		this.$body = $('body');

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
	get:function() {
		return this.SETS[this.CURRENT];
	},
	get_current_texture_name:function() {
		var s = this.SETS[this.CURRENT]; 
		return this.TEXTURES[s.texture].title;	
	},
	get_current_lines_color:function() {
		var lines = this.SETS[this.CURRENT].lines; 
		var colors = {black:"черные",red:"красные",blue:"синие"};		
		return colors[lines];
	},
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

		$.each(this.NAMES,function(i) { _this.$body.removeClass(_this.NAMES[i]); });
		this.$body.addClass(this.NAMES[index]);

		this.$parent.find('li').removeClass('current').eq(index).addClass('current');
		this.set_status(msg);
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
				$(_this).trigger('theme-changed',index);
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
			this.update_status();	
		}
	},
	make_restore:function() {
		if(this.CURRENT>-1 && this.ARR_SNAPSHOTS[this.CURRENT+1]){
			this.CURRENT++;
			this.update_status();
		}
	},
	behavior:function() {
		var _this=this;
		
		var foo = {
			say_make_cancel:()=>{
				var canvas = this.ARR_SNAPSHOTS[this.CURRENT];
				$(this).trigger('make-cancel',canvas);
			}
		};

		document.addEventListener('keydown',(e)=>{			
		  if(e.key === 'z' && (e.ctrlKey || e.metaKey) ){ 		  	
		  	this.make_cancel();
		  	foo.say_make_cancel();
		  }
		});

		this.$btns.hover((e)=>{this.IS_HOVER = true;},(e)=>{this.IS_HOVER = false;});
		this.$btnBack.on('touchend, click',(e)=> {this.make_cancel(); foo.say_make_cancel();});
		this.$btnForw.on('touchend, click',(e)=> {this.make_restore(); foo.say_make_cancel();});
		
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
		this.ARR_PREVIEW_LOADED = {black:[],blue:[],red:[]};
		this.ALL_READY = false;		
		this.CURRENT = 0;
		this.CURRENT_LINES = "black";
		this.set_status("Загрузка моделей ...");
		this.preload();
		// this.behavior();
		return this;
	},
	get_current_name:function() {
		return this.ARR[this.CURRENT].title;
	},
	is_theme_loaded:function(set) {
		var lines = set.lines;
		var loaded = this.ARR_PREVIEW_LOADED[lines].length;
		return loaded;
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
	load_theme:function(set,opt) {
		var _this=this;

		var lines = set.lines;
		var loaded = this.ARR_PREVIEW_LOADED[lines].length;
		
		if(loaded){
			opt.onReady && opt.onReady();	
			return;
		};		

		var arr_src = [];
		
		for(var i in this.ARR){				
			var src  = this.ARR[i].preview[lines];
			arr_src.push(src);  
		};		

		var foo = {
			load_image:function() {
				var src = arr_src.shift();
				if(src){
					var img = new Image();
					img.onload = function() {
						_this.ARR_PREVIEW_LOADED[lines].push(this);										
						foo.load_image();
					};
					img.src = src;					
				}else{									
					opt.onReady && opt.onReady();	
				}
			}
		};

		foo.load_image();

	},
	set_current_lines:function(lines) {
		this.CURRENT_LINES = lines;
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
	get_mask:function() {			
		return this.ARR_MASK_LOADED[this.CURRENT];
	},		
	get_preview:function() {		
		return this.ARR_PREVIEW_LOADED[this.CURRENT_LINES][this.CURRENT];
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
						//xxx
						_this.ARR_PREVIEW_LOADED['black'].push(this);
						_this.preload();
					};					
					preview.src = data.preview.black; // loading black image
				};			
				mask.src = data.mask; // loading mask image
			};			
			img.src = data.img; // loading model image

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

var PainterSave = {
	init:function(painter_id,params){
		this.$painter = $('#'+painter_id);
		this.params = params;
		this.NOW_SAVING = false;
		this.WIN_VISIBLE = false;
		this.IS_HOVER = false;
		this.COUNTER=0;
		this.build();
	},	
	is_opened:function(){		
		return this.WIN_VISIBLE;
	},
	is_hover:function(){
		return this.IS_HOVER;
	},
	build:function(){
		this.$btnSave = $('<div id="painter-button-save" class="noselect">Сохранить</div>');

		this.ARR_SIZES = ['XS','S','M','L','XL','2XL']; 
		var size_str = "";
		for(var i=0;i<this.ARR_SIZES.length;i++){
			var current = i===1 ? "class='current'":"";
			size_str+="<span "+current+">"+this.ARR_SIZES[i]+"</span>";
		};
		size_str = '<div class="size-btns">'+size_str+'</div>';

		var page1 = [
				'<div class="page page-ask current">',
					'<div class="painter-win-content_title">Выберите действие:</div>',
					'<div class="buttons">',
						'<div class="painter-win-content_btn painter-win-button__save-and-close">Сохранить к себе на компьютер</div>',
						'<div class="painter-win-content_btn painter-win-button__make-order">Оформить заказ</div>',
					'</div>',
				'</div>'
		].join(''); 

		var page2 = [
				'<div class="page page-form">',
					'<div class="painter-win-content_title">Заполните бланк заказа:</div>',
					'<div class="painter-order-blank">',
						'<div class="order-row"><div class="label">Ваше имя:</div><div><input type="text" name="your-name"></div></div>',
						'<div class="order-row"><div class="label">Телефон:</div><div><input type="text" name="your-phone"></div></div>',
						'<div class="order-row"><div class="label">Размер <br>изделия:</div><div>'+size_str+'</div></div>',
						'<div class="order-wrong "></div>',
						'<div class="order-footer">',
							'<div class="order-ajax-loader"> <span></span> </div>',
							'<div class="order-button"> <div class="btn-send-order">ОТПРАВИТЬ ЗАКАЗ</div> </div>',
						'</div>',
					'</div>',
				'</div>'
		].join(''); 

		var page3 = [
				'<div class="page page-ok">',
					'<h2>Спасибо.<br>Ваш заказ отправлен</h2>',
					'<p>От: <span class="from-name">&nbsp;</span><br>',					
					'Тел: <span class="from-phone">&nbsp;</span><br>',
					'Модель: <span class="item-model">&nbsp;</span><br>',
					'Размер: <span class="item-size">&nbsp;</span><br>',
					'Ткань: <span class="item-texture">&nbsp;</span><br>',
					'Полоски: <span class="item-lines">&nbsp;</span></p>',
				'</div>'
		].join(''); 		

		var winSaveContent = [
			'<div class="painter-win-content noselect">',							
				'<div class="pages">'+page1+page2+page3+'</div>',
				'<div class="painter-win-btn-close"><span></span><span></span></div>',
			'</div>'
			].join('');

		this.$saveWin = $('<div id="painter-save-win">'+winSaveContent+'</div>').hide();		
		this.$painter.append(this.$btnSave);
		this.$painter.append(this.$saveWin);		

		this.$pages = this.$saveWin.find('.page'); 
		this.$btnClose = this.$saveWin.find('.painter-win-btn-close');
		this.$btnMakeOrder =  this.$saveWin.find('.painter-win-button__make-order');		
		this.$btnSaveAndClose =  this.$saveWin.find('.painter-win-button__save-and-close');
		this.$btnSendOrder =  this.$saveWin.find('.btn-send-order');
		//page-form
		this.$msgWrong =  this.$saveWin.find('.order-wrong');
		this.$btnSize =  this.$saveWin.find('.size-btns span');		
		this.$usrName =  this.$saveWin.find('input[name=your-name]');
		this.$usrPhone =  this.$saveWin.find('input[name=your-phone]');
		//page-ok
		this.$fromName = this.$saveWin.find('.page-ok .from-name'); 
		this.$fromPhone = this.$saveWin.find('.page-ok .from-phone');
		this.$itemModel = this.$saveWin.find('.page-ok .item-model');
		this.$itemSize = this.$saveWin.find('.page-ok .item-size');
		this.$itemTexture = this.$saveWin.find('.page-ok .item-texture');
		this.$itemLines = this.$saveWin.find('.page-ok .item-lines');
		
		this.behavior();

	},
	say:function(msg){
		$(this).trigger(msg);
	},
	set_page_current:function(index){
		this.$pages.removeClass('current').eq(index).addClass('current');
	},
	show_wrong_order:function(msg){
		if(msg){						
			this.$msgWrong.removeClass('show-err-message').html("&nbsp;");
			this.$msgWrong.show();
			this.TMR_WRONG_MSG && clearTimeout(this.TMR_WRONG_MSG);
			this.TMR_WRONG_MSG = setTimeout(()=>{
				this.$msgWrong.addClass('show-err-message').html(msg);		
			},300);			
		}else{
			this.$msgWrong.removeClass('show-err-message').html("&nbsp;");
			this.TMR_WRONG_MSG && clearTimeout(this.TMR_WRONG_MSG);
			this.TMR_WRONG_MSG = setTimeout(()=>{
				this.$msgWrong.hide();				
			},300);
		}		
	},
	now_sending:function(mode){
		this.NOW_SENDING = mode;
		if(mode){
			this.$saveWin.addClass('now-sending');
			this.TMR_SENDING && clearTimeout(this.TMR_SENDING);
			this.TMR_SENDING = setTimeout(()=>{
				this.now_sending(false);	
			},1000);
		}else{
			this.$saveWin.removeClass('now-sending');
		}
	},
	show_page_ok:function(){		
		this.set_page_current(2);
	},
	save_image_and_close:function(){
		// save picture 
		// ...
		// close win
		this.close_win(); 		
	},
	get_wrong_user_inputs:function() {
		
		this.ORDER = {
			name:this.$usrName.val(),
			phone:this.$usrPhone.val(),
			size:this.$btnSize.filter('.current').html()
		};
		
		if(!this.ORDER.name){
			return "Укажите ваше имя, пожалуйста"; 
		}else if(!this.ORDER.phone){
			return "Укажите ваш телефон, пожалуйста"; 
		}else{
			return "";
		}
	},
	verify_and_send_order:function(){
		this.now_sending(true);	
		var msg_err = this.get_wrong_user_inputs();
		if(!msg_err){
			this.send_order();			
		}else{
			this.now_sending(false);	
			this.show_wrong_order(msg_err);
		}
	},
	reset_form:function() {
		this.ORDER = {name:"",phone:"",size:""};
		this.$usrName.val("");
		this.$usrPhone.val("");
		this.$fromName.html("");
		this.$fromPhone.html("");
		this.$itemModel.html("");
		this.$itemSize.html("");
		this.$itemTexture.html("");
		this.$itemLines.html("");
	},
	send_order:function() {

		var texture = PainterThemes.get_current_texture_name();
		var lines = PainterThemes.get_current_lines_color();
		console.log('texture,lines',texture,lines)
		setTimeout(()=>{
			this.now_sending(false);
			this.$fromName.html(this.ORDER.name);
			this.$fromPhone.html(this.ORDER.phone);
			this.$itemModel.html(PainterModel.get_current_name());
			this.$itemSize.html(this.ORDER.size);
			this.$itemTexture.html(texture);
			this.$itemLines.html(lines);			
			this.show_page_ok();
		},1000);		
	},
	open_win_make_order:function(){		
		this.set_page_current(1);
	},	
	choose_size:function(index) {
		this.$btnSize.removeClass('current').eq(index).addClass('current');
	},
	behavior:function(){
		var _this=this;

		this.$btnSaveAndClose.on("touchend, click",(e)=>{ !this.NOW_SENDING && this.save_image_and_close();});		
		this.$btnMakeOrder.on("touchend, click",(e)=>{ !this.NOW_SENDING && this.open_win_make_order();});
		this.$btnSendOrder.on("touchend, click",(e)=>{ !this.NOW_SENDING && this.verify_and_send_order();});
		this.$btnSize.each(function(index) {
			$(this).on("touchend, click",(e)=>{ !_this.NOW_SENDING && _this.choose_size(index);});
		});
		
		this.$btnSave.on("touchend, click",(e)=>{ this.open_win(); });
		this.$btnClose.on("touchend, click",(e)=>{  this.close_win(); });
		this.$btnSave.hover(()=>{this.IS_HOVER=true;},()=>{this.IS_HOVER=false;});
	},
	open_win:function(){
		this.WIN_VISIBLE = true;
		this.reset_form();
		this.set_page_current(0);
		this.$btnSave.hide();
		this.$saveWin.show();
		this.TMR_WIN && clearTimeout(this.TMR_WIN);
		this.TMR_WIN = setTimeout(()=>{
			this.$saveWin.addClass("shown");
			this.say("changed-visibility");			
		},0);
	},
	close_win:function(){
		this.WIN_VISIBLE = false;		
		this.$saveWin.removeClass("shown");
		this.TMR_WIN && clearTimeout(this.TMR_WIN);		
		this.TMR_WIN = setTimeout(()=>{			
			this.$saveWin.hide();
			this.$btnSave.show();
			this.say("changed-visibility");			
		},300);
	}
};


$(function(){	



var ARR_THEMES = {
		textures:[
			{img:"textures/green.jpg",color:"#04a098",title:"Морская капуста"},
			{img:"textures/sky.jpg",color:"#418dcc",title:"Морской прибой"},
			{img:"textures/blue.jpg",color:"#0d4bac",title:"Морская пена"},
			{img:"textures/purple.jpg",color:"#8E6386",title:"Вечерний бриз"}
			],
		lines:{
			black:"#000000",
			red:"#f20c28",
			blue:"#0d4bac"
			},
		sets:[
			{lines:"black", texture:0, name:'theme-green-black'},
			{lines:"black", texture:1, name:'theme-sky-black'},
			{lines:"black", texture:2, name:'theme-blue-black'},
			{lines:"black", texture:3, name:'theme-purple-black'},
			{lines:"red", texture:3, name:'theme-purple-red'},
			{lines:"blue", texture:3, name:'theme-purple-blue'},
			{lines:"blue", texture:0, name:'theme-green-blue'}
			]		
		};

var ARR_MODELS = [
		{pos:0,
			img:"models/model-1.png",
			title:"тельняшка с рукавами",
			mask:"models/model-1-mask.png",
			preview:{
				black:"models/model-1-black.png",
				blue:"models/model-1-blue.png",
				red:"models/model-1-red.png"}},
		{pos:1,
			img:"models/model-2.png",
			title:"тельняшка без рукавов",
			mask:"models/model-2-mask.png",
			preview:{
				black:"models/model-2-black.png",
				blue:"models/model-2-blue.png",
				red:"models/model-2-red.png"}},
		{pos:2,
			img:"models/model-3.png",
			title:"тельняшка-платье с рукавами",
			mask:"models/model-3-mask.png",
			preview:{
				black:"models/model-3-black.png",
				blue:"models/model-3-blue.png",
				red:"models/model-3-red.png"}}
		];

	var CFG = {
		size:{ width:1000,height:800},
		init_scale:.85,
		brush_params:[5,60],
		max_cancel_steps:5,
		themes:ARR_THEMES,
		models:ARR_MODELS,
		save_params:{email:'e.pogrebnyak@mail.ru'}		
	};


	Painter.init('painter',CFG.size,{		
		brush:PainterBrush,
		models:PainterModel,
		zoom:PainterZoom,
		cancelSystem:PainterCancelSystem,
		themesSystem:PainterThemes,
		statusbar:PainterStatusbar,
		init_scale:CFG.init_scale,		
		saveSystem:PainterSave,
		onready:function(){
			this.models.init('painter',CFG.models);
			this.brush.init('painter',CFG.brush_params);
			this.zoom.init('painter',CFG.init_scale);
			this.cancelSystem.init('painter',CFG.max_cancel_steps);
			this.themesSystem.init('painter',CFG.themes);			
			this.saveSystem.init('painter',CFG.save_params);
			this.statusbar.init('painter',[
				Painter,this.models,this.zoom,this.themesSystem]);
		}
	});

 
});

function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

