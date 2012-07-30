(function() {
	var pub_channel = 'chat',
		//boxes
		box = PUBNUB.$('box'), list = PUBNUB.$('info-list'), members = PUBNUB.$('member-list'), input = PUBNUB.$('input'),  username = PUBNUB.$('username'), 
		name_change = PUBNUB.$('nickname-change'),  name_bar = PUBNUB.$('namebar'), tips = PUBNUB.$('tips'), counter_div = PUBNUB.$('count-div'), counter  = PUBNUB.$('count'),
		//buttons
		clear_chat = PUBNUB.$('clear-chat'), clear_sys = PUBNUB.$('clear-sys'), hide = PUBNUB.$('hide'),  
		//backend variables
		ids = {}, names = {}, publishes = 1, br_rx = /[\r\n<>]/g, space_rx = /^\s+|\s+$/g, 
		max_name = 20, max_msg = 140, max_bbl = 10, cur_msgbbl = 0, cur_sysbbl = 0;
		//user related
		uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		    return v.toString(16);
		}), color = uuid.slice(-3),
		sys_type = { USER: 0, MENTIONED: 1 },
		sys_color = ['000000', '0099ff']; 
	
	var message_bubble_tpl = '<div style="display:inline-block;max-width:400px;background-color:#{background};color:#fff;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:0px 0px 7px 0px;padding:6px 40px 6px 20px;border-radius:50px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;"><strong>{username}&nbsp;-&nbsp;</strong>&nbsp;{message}</div></br>';
	var sysinfo_tpl = '<div style="display:inline-block;max-width:400px;background-color:#{background};color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;">{time}&nbsp;-&nbsp;<strong>{username}</strong>&nbsp;{message}</div></br>';
	var member_bubble_tpl = '<div id="{uuid}" style="max-width:400px;background-color:#{background};color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;">{username}</div>';
	
	function new_sysinfo(sys_type, name, info, time) {
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
	
	function new_member(id, user, the_color) {
		var bubble = document.createElement('div');
		// Update The Message Text Body
		bubble.innerHTML = PUBNUB.supplant(member_bubble_tpl,
				{
					'uuid' : id,
					'username' : user,
					'background' : the_color
				});
		return bubble;
	}
	
	function update_namebar(new_name) {
		//my_channel = 'ch' + name;//easy for finding private
		username.value = '';
		$('#username').fadeOut(300, function() {
			name_bar.innerHTML = new_name;
			name_bar.style.display = 'block';
		});
		
		//username.style.display = 'none';
		name_change.innerHTML = 'Change Nickname';
		name_change.style.visibility = 'visible';
		input.focus();
		tips.innerHTML = '';
	}
	
	//time format
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
	
	PUBNUB.subscribe({
		'channel' : pub_channel,
		'callback' : function(message) {
			if (message['type'] === 'user') {
				var name = message['content'];
				var the_uuid = message['uuid'];
				if (!ids[the_uuid]) {	//new user
					ids[the_uuid] = name;
					names[name] = true;
					var sysinfo = new_sysinfo(sys_type.USER, name, 'joins the chat', format_time());
					var member_bbl = new_member(the_uuid, name, message['color']);
					list.innerHTML = sysinfo.innerHTML + list.innerHTML;
					members.innerHTML += member_bbl.innerHTML;	//maybe sort by name?
					
					if (the_uuid === uuid)	{//its me, change the ui and private ch
						update_namebar(name);
					}
				} 
			} //message type
		} 
	});
	
	User = Backbone.Model.extend({
		uuid : uuid,
		name : 'Anonymous',
		color: uuid.slice(-3),
		
		changeName: function(name) {
			this.set({'name' : name})
		}
	});

	Users = Backbone.Collection.extend({
		model: User,
		// This is our Users collection and holds our User models
		initialize : function(models, options) {
			username.focus();
			this.bind("add", options.view.addFriendLi);
		},
		
		comparator: function() {
			return model.get('name');
		}
	});

	//var userList = new 
	AppView = Backbone.View.extend({
		el : $('#appview'),
		initialize : function() {
			username.focus();
			counter.innerHTML = max_msg;
			name_change.style.visibility = 'hidden';
			
			this.users = new Users(null, {
				view : this
			});
		},
		events : {
			//"click #add-user" : "showPrompt",
			'keydown #username' : 'newUser'
		},
		'newUser' : function(e) {
			if (e.keyCode === 13) {
				//var name = $(e.currentTarget).val();
				if (username.value.replace(space_rx, "").length === 0) {
					username.value = '';
					return false;
				}
				var name = username.value.slice(0, max_name).replace(br_rx, '');
				this.users.add(new User({
					uuid: uuid,
					name : name
					})
				);
				PUBNUB.publish({
					'channel' : pub_channel,
					'message' : {
						'type' : 'user',
						'uuid' : uuid,
						'color' : color,
						'content' : username.value.slice(0, max_name).replace(br_rx, '')
					}
				});
				username.value = '';
			}
			return true;
		},
		
		addFriendLi : function(model) {
			// The parameter passed is a reference to the model that was added
			$("#users-list").append("<li>" + model.get('name') + "</li>");
			members.innerHTML += "<li>" + model.get('name') + "</li>";
		}
	});

	var appview = new AppView;
})();
