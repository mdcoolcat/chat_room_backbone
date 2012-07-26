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
		}), color = uuid.slice(-3), my_channel = 'ch' + uuid,//changed to ch+username...
		sys_type = { USER: 0, MENTIONED: 1 },
		sys_color = ['000000', '0099ff']; 
	var message_bubble_tpl = '<div style="display:inline-block;max-width:400px;background-color:#{background};color:#fff;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:0px 0px 7px 0px;padding:6px 40px 6px 20px;border-radius:50px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;"><strong>{username}&nbsp;-&nbsp;</strong>&nbsp;{message}</div></br>';
	var sysinfo_tpl = '<div style="display:inline-block;max-width:400px;background-color:#{background};color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;">{time}&nbsp;-&nbsp;<strong>{username}</strong>&nbsp;{message}</div></br>';
	var member_bubble_tpl = '<div id="{uuid}" style="max-width:400px;background-color:#{background};color:#fff;font-size:12px;text-shadow: #000 0 1px 1px;font-size: 15px;background-image:-moz-linear-gradient(rgba(255,255,255,0.8)0%,rgba(0,0,0,0)100%);background-image:-webkit-gradient(linear,left top,left bottom,from(rgba(255,255,255,0.8)),to(rgba(0,0,0,0)));border:0;margin:2px 0px 5px 0px;padding:3px 20px 3px 10px;border-radius:20px;-moz-border-radius:50px;-webkit-border-radius:50px;overflow:hidden;-o-transition:all 0.3s;-moz-transition:all 0.3s;-webkit-transition:all 0.3s;transition:all 0.3s;position:relative;">{username}</div>';

	
	//initialized
	username.focus();
	counter.innerHTML = max_msg;
	name_change.style.visibility = 'hidden';

	//username input
	PUBNUB.bind('keydown', username, function(e) {
		if (e.keyCode === 13) {
			//var new_name = ;
			if (username.value.replace(space_rx, "").length === 0) {
				username.value = '';
				return false;
			}
			PUBNUB.publish({
				'channel' : pub_channel,
				'message' : {
					'type' : 'user',
					'uuid' : uuid,
					'color' : color,
					'content' : username.value.slice(0, max_name).replace(br_rx, '')
				}
			});
		}
		return true;
	});
	
	//nickname change
	PUBNUB.bind('mousedown,touchstart', name_change, function() {
		if (name_change.innerHTML === 'Change Nickname') {
			name_bar.style.display = 'none';
			//$('#username').show('slide', { direction: 'up' }, 300);
			$('#username').fadeIn(500);
			username.focus();
			name_change.innerHTML = 'Hide Name Input';
		} else {	
			$('#username').fadeOut(300, function() {
				name_bar.style.display = 'block';
			});
			name_change.innerHTML = 'Change Nickname';
		}
		tips.innerHTML = '';
	});
	
	//message input
	PUBNUB.bind('keyup', input, function(e) {	//count chars
		if (e.keyCode !== 13) {
			counter.innerHTML = max_msg - input.value.length;
		}
		return true;
	});
		
	PUBNUB.bind('keydown', input, function(e) {
		if (e.keyCode === 13) {
			if (input.value.replace(space_rx, "").length === 0) {
				//highlight input
				input.value = '';
				return false;
			}
			PUBNUB.publish({
				'channel' : pub_channel,
				'message' : {
					'type' : 'chat',
					'sender' : ids[uuid] || 'Anonymous',	
					'color' : color,
					'uuid' : uuid,
					'content' : input.value.slice(0, max_msg).replace(br_rx, '')
				}
			});
			counter.innerHTML = max_msg;
		} 
		return true;
	});
	
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
				} else {	//change name
					if (name !== ids[the_uuid]) {
						if (!names[name]) {
							var old = ids[the_uuid];
							ids[the_uuid] = name;
							var sysinfo = new_sysinfo(sys_type.USER, old, 'changed nickname: '+ name, format_time());
							list.innerHTML = sysinfo.innerHTML + list.innerHTML;
							document.getElementById(the_uuid).innerHTML = name;	//group member list
							if (the_uuid === uuid)	//its me, change the ui and private ch
								update_namebar(name);
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
				the_content = replace_at(message['content']);
				var bubble = new_bubble(message['sender'], the_content.message, message['color']);
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
					var sysinfo = new_sysinfo(sys_type.MENTIONED, message['sender'], '@you in a message', format_time());
					list.innerHTML = sysinfo.innerHTML + list.innerHTML;
				}
			}
			//ignore other types
		}
	});
	
	//clear message
	PUBNUB.bind('click', clear_chat, function() {
		box.innerHTML = '';
		cur_msgbbl = 0;
	});
	PUBNUB.bind('click', clear_sys, function() {
		list.innerHTML = '';
		cur_sysbbl = 0;
	});
	PUBNUB.bind('click', hide, function() {
		if (hide.innerHTML === 'Hide') {
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
	});
//	
//	PUBNUB.bind('click', show, function() {
//		$('#side').show('slide', { direction: 'right' }, 800);
//		show.style.visibility='hidden';
//	});
	
	//bubbles
	function new_bubble(user, content, color) {
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
	
	//input area resize
	$('#input').focus(function() {
		if (input.style.height !== '100px') {
			$(this).animate(
					{height: "100px"}, 100
			);
			counter_div.style.visibility = 'visible';
			/*counter_div.innerHTML = '<span id="count" style="font-style:italic;"></span> Characters left';
			counter = PUBNUB.$('count');
			counter.innerHTML = max_msg;*/
		}	//else, already resize
			
	});
	$('#input').blur(function() {
		if (input.style.height !== '45px') {
			if (this.value.replace(space_rx, "").length === 0) {
				$(this).animate(
						{height: "45px"}, 100
				);
				this.value = "";
				//counter_div.innerHTML = '';
			counter_div.style.visibility = 'hidden';
			}
		}
	});
	
	
	//@ function
	function replace_at(str) {
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
	
})();
