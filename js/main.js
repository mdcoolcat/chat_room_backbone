(function() {
	var pub_channel = 'chat',
		// boxes
		box = PUBNUB.$('box'), list = PUBNUB.$('info-list'), members = PUBNUB.$('member-list'), input = PUBNUB.$('input'),  username = PUBNUB.$('username'), 
		name_change = PUBNUB.$('nickname-change'), tips = PUBNUB.$('tips'), counter = PUBNUB.$('count'),
		// buttons
		clear_chat = PUBNUB.$('clear-chat'), clear_sys = PUBNUB.$('clear-sys'),  
		// backend variables
		ids = {}, names = {}, publishes = 1, brReg = /[\r\n<>]/g, spaceReg = /^\s+|\s+$/g, 
		max_name = 20, max_msg = 140, max_bbl = 10, cur_msgbbl = 0, cur_sysbbl = 0;
		// user related
		uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		    return v.toString(16);
		}), color = uuid.slice(-3),
		sys_type = { USER: 0, MENTIONED: 1 },
		sys_color = ['000000', '0099ff']; 
	
	var message_bubble_tpl = '<div style="display:inline-block;max-width:400px;background-color:#{background};color:#fff;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:0px 0px 7px 0px;padding:6px 40px 6px 20px;border-radius:50px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;"><strong>{username}&nbsp;-&nbsp;</strong>&nbsp;{message}</div></br>';
	var sysinfo_tpl = '<div style="display:inline-block;max-width:400px;background-color:#{background};color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;">{time}&nbsp;-&nbsp;<strong>{username}</strong>&nbsp;{message}</div></br>';
	//var member_bubble_tpl = '<div id="{uuid}" style="max-width:400px;background-color:#{background};color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;">{username}</div>';
	
	//global functions
	function newSysInfo(sys_type, name, info, time) {
		var bubble = document.createElement('div');
		// Update The Message Text Body
		bubble.innerHTML = PUBNUB.supplant(sysinfo_tpl,
				{
					'username' : name || 'Anonymous',
					'background' : sys_color[sys_type],
					'message' : info,
					'time' : time
				});
		return bubble;
	}
	
	function newMember(id, user, color) {
		var bubble = document.createElement('div');
		// Update The Message Text Body
		bubble.innerHTML = PUBNUB.supplant(member_bubble_tpl,
				{
					'uuid' : id,
					'username' : user,
					'background' : color
				});
		return bubble;
	}
	
	function newMessage(user, content, color) {
		var bubble = document.createElement('div');
		// Update The Message Text Body
		bubble.innerHTML = PUBNUB.supplant(message_bubble_tpl,
				{
					'username' : user
							|| 'Anonymous',
					'background' : color,
					'message' : content
				});
		return bubble;
	}
	
	function updateNamebar(newName) {
		// my_channel = 'ch' + name;//easy for finding private
		var namebar = document.getElementById('namebar');
		var namechange = document.getElementById('nickname-change');
		username.value = '';
		$('#username').fadeOut(300, function() {
			namebar.innerHTML = newName;
			namebar.style.display = 'block';
		});
		
		namechange.innerHTML = 'Change Nickname';
		namechange.style.visibility = 'visible';
		input.focus();
		tips.innerHTML = '';
	}
	
	// time format
	function format_time() {
		var dt = new Date();
	    var hours = dt.getHours();
	    var minutes = dt.getMinutes();
	    // the above dt.get...() functions return a single digit
	    // so I prepend the zero here when needed
	    if (hours < 10) 
	    	hours = '0' + hours;
	    if (minutes < 10) 
	    	minutes = '0' + minutes;
	    return hours + ":" + minutes;
	}
	
	//@ function
	function replaceAt(str) {
		var r, k;	
		var users = new Array();
		var ss = str;
		r = ss.replace(/\@([^\@|.|^ ]+)/g, function(word) {
			//console.log('after',word.replace(/\@/g,""));
			k = word.replace(/\@/g,"");
			users.push(k);
			return "<a href=\"#"+ k +"\" usercard=\"name="+ k +"\">" + word + "</a>";
		});
		return {message: r, mentioned: users};	//replace the @xxx as href
		//return r;
	}
	
	PUBNUB.subscribe({
		'channel' : pub_channel,
		'callback' : function(message) {
			if (message['type'] === 'user') {
				var name = message['content'];
				var the_uuid = message['uuid'];
				if (!ids[the_uuid]) {	// new user
					ids[the_uuid] = name;
					names[name] = true;
					var sysinfo = newSysInfo(sys_type.USER, name, 'joins the chat', format_time());
					list.innerHTML = sysinfo.innerHTML + list.innerHTML;
					// members.innerHTML += member_bbl.innerHTML;
					// //maybe sort by name?
					users.add(new User({
						uuid: uuid,
						name : name,
						color: message['color']
						})
					);
					if (the_uuid === uuid)	{// its me, change the ui
						updateNamebar(name);
					}
				} else {	//change name
					if (name !== ids[the_uuid]) {
						if (!names[name]) {
							var old = ids[the_uuid];
							ids[the_uuid] = name;
							var sysinfo = newSysInfo(sys_type.USER, old, 'changed nickname: '+ name, format_time());
							list.innerHTML = sysinfo.innerHTML + list.innerHTML;
							//users collection...
							if (document.getElementById(the_uuid))
								document.getElementById(the_uuid).innerHTML = name;	//group member list
							if (the_uuid === uuid)	//its me, change the ui and private ch
								updateNamebar(name);
						} else 
							tips.innerHTML = 'This name already taken :-(';
					} else
						tips.innerHTML = 'This is your current name :-)';
				} 
				//username.parentElement.innerText = ids[uuid] || '';
				if (cur_sysbbl === max_bbl) {
					//remove the last one
				} else
					cur_sysbbl++;
			} else if (message['type'] === 'chat') {	//chat message
				the_content = replaceAt(message['content']);
				var bubble = newMessage(message['sender'], the_content.message, message['color']);
				box.innerHTML = bubble.innerHTML + box.innerHTML;
				input.value = '';
				input.focus();
				//I sent this msg, and containing @, send notification to the person...
				if (message['sender'] === ids[uuid] && (the_content.mentioned.length > 0)) {
					var l = the_content.mentioned;
					for (var i = 0; i < l.length; i++) {
							PUBNUB.publish({
								'channel' : pub_channel,	
								'message' : {
									'type' : 'mentioned',
									'sender' : message['sender'],
									'receiver' : l[i] 
								}
							});
							console.log('publish', message['sender']+' mentioned '+l[i]);
					}
				}//end @list
				
				if (cur_msgbbl === max_bbl) {
					//remove the last one
				} else
					cur_msgbbl++;
			} else if (message['type'] === 'mentioned') {
				console.log('mentioned:', message['receiver']+' from '+message['sender']);
				if (message['receiver'] === ids[uuid]) {	//make sure its for me...
					var sysinfo = newSysInfo(sys_type.MENTIONED, message['sender'], '@you in a message', format_time());
					list.innerHTML = sysinfo.innerHTML + list.innerHTML;
				}
			}
		}
	});
	
	var UserList = Backbone.View.extend({
		el : document.getElementById('member-list'),
		
		addOne : function(model) {
			// The parameter passed is a reference to the model that was added
			//var member_bbl = newMember(model.get('uuid'), model.get('name'), model.get('color'));
			var member_bbl = new UserView({model: model}).render().el;
			this.userlist.el.innerHTML += member_bbl.innerHTML;
		}
	});
	
	var UserView = Backbone.View.extend({
		tagName: 'div',
		template: _.template('<div class="member-name" style="max-width:400px;color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;"></div>'),
		
		initialize: function() {
			_.bindAll(this, 'render');
			this.model.bind('change', this.render);
			this.model.view = this;
		},
		
		render: function() {
			var _model = this.model.toJSON();
			this.el.innerHTML = this.template(_model);
			this.el.setAttribute('id', _model.uuid);
			this.el.firstChild.innerHTML = _model.name;
			this.el.firstChild.style.backgroundColor = '#' + _model.color;
			return this;
		}
	});
	
	var User = Backbone.Model.extend({
		changeName: function(name) {
			this.set({'name' : name})
		}
	});
	
	var Users = Backbone.Collection.extend({
		model: User,
		initialize: function(){
            // When initialized we want to associate a view with this collection
            this.userlist = new UserList;
            this.bind('add', this.userlist.addOne);	// later change to render?
													// because sort
        },
		comparator: function(user) {
			return user.get('name');
		}
	});

	var users = new Users;
	
	AppView = Backbone.View.extend({
		el : document.getElementById('appview'),
		initialize : function() {
			username.focus();
			counter.innerHTML = max_msg;
			name_change.style.visibility = 'hidden';
			//input.style.height = '45px';
// this.users = new Users(null, {
// view : this
// });	
		},
		events : {
			'keydown #username' : 'newUser',
			//may put into a single View...
			'keydown #input' : 'newMessage',
			'keyup #input' : 'countChar',
			'focus #input' : 'resize',
			'blur #input' : 'resize',
			'mousedown #nickname-change' : 'namebarLink',
			'touchstart #nickname-change' : 'namebarLink',
			'click #hide' : 'sidebar'
		},
		'newUser' : function(e) {
			if (e.keyCode === 13) {
				var that = e.currentTarget;
				if (that.value.replace(spaceReg, "").length === 0) {
					that.value = '';
					return false;
				}
				var name = that.value.slice(0, max_name).replace(brReg, '');
				PUBNUB.publish({
					'channel' : pub_channel,
					'message' : {
						'type' : 'user',
						'uuid' : uuid,
						'color' : color,
						'content' : name
					}
				});
				that.value = '';
			}
			return true;
		},
		
		'newMessage' : function(e) {
			if (e.keyCode === 13) {
				var that = e.currentTarget;
				if (that.value.replace(spaceReg, '').length === 0) {
					//highlight input
					that.value = '';
					return false;
				}
				PUBNUB.publish({
					'channel' : pub_channel,
					'message' : {
						'type' : 'chat',
						'sender' : ids[uuid] || 'Anonymous',	
						'color' : color,
						'uuid' : uuid,
						'content' : that.value.slice(0, max_msg).replace(brReg, '')
					}
				});
				counter.innerHTML = max_msg;
			return true;
			} 
		},
		
		'countChar' : function(e) {
			if (e.keyCode !== 13) {
				counter.innerHTML = max_msg - e.currentTarget.value.length;
			}
			return true;
		},
		
		'resize' : function(e) {
			var that = e.currentTarget;
			var counter = document.getElementById('count-div');
			if (that.style.height !== '100px') {
				$(that).animate(
						{height: '100px'}, 100
				);
				counter.style.visibility = 'visible';
			} else {//blur
				if (that.value.replace(spaceReg, "").length === 0) {
					$(that).animate(
							{height: '45px'}, 100
					);
					that.value = '';
				counter.style.visibility = 'hidden';
				}
			}
		},
		
		'namebarLink' : function(e) {
			var that = e.currentTarget;
			var namebar = document.getElementById('namebar');
			//var $username = $('#username');
			if (that.innerHTML === 'Change Nickname') {
				namebar.style.display = 'none';
				$(username).fadeIn(500);
				username.focus();
				that.innerHTML = 'Hide Name Input';
			} else {	
				$(username).fadeOut(300, function() {
					namebar.style.display = 'block';
				});
				that.innerHTML = 'Change Nickname';
			}
			tips.innerHTML = '';
		},
		
		'sidebar' : function(e) {
			var that = e.currentTarget;
			if (that.innerHTML === 'Hide') {
				$('#side').animate({
					'width': '110px'
				  }, {
				    duration: 800
				  });
				hide.innerHTML = 'Show';
			} else {
				$('#side').animate({
					'width': '420px' 
				  }, {
				    duration: 800
				  });
				hide.innerHTML = 'Hide';
			}
		}
	});

	var appview = new AppView;
 
})();
