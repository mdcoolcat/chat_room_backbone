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
	
	User = Backbone.Model.extend({
		uuid : uuid,
		name : 'Anonymous',
		color: uuid.slice(-3),
		
		changeName: function(name) {
			this.set({'name' : name})
		}
	});

	Users = Backbone.Collection.extend({
		// This is our Users collection and holds our User models
		initialize : function(models, options) {
			username.focus();
			this.bind("add", options.view.addFriendLi);
			// Listen for new additions to the collection and call a view
			// function if so
		}
	});

	AppView = Backbone.View.extend({
		el : $('#appview'),
		initialize : function() {
			this.users = new Users(null, {
				view : this
			});
			// Create a Users collection when the view is initialized.
			// Pass it a reference to this view to create a connection between
			// the two
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
				username.value = '';
				//publish
			}
			return true;
		},
		showPrompt : function() {
			var user_name = prompt("Who is your friend?");
			var user_model = new User({
				name : user_name
			});
			// Add a new User model to our User collection
			this.users.add(user_model);
		},
		addFriendLi : function(model) {
			// The parameter passed is a reference to the model that was added
			$("#users-list").append("<li>" + model.get('name') + "</li>");
			console.log(model.get('uuid'));
		}
	});

	var appview = new AppView;
})();
