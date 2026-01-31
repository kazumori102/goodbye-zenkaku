// urlMatcher関数をローカルにコピー（background.jsから）
var urlMatcher = function(url){
	if( !url )return;
	var match = url.match(/^(.*:\/\/)?(([^\/]+)(\/[^?#]*)?)/);
	if( match ){
		var page = match[2];
		if( page.indexOf("/") < 0 ){
			page += "/";
		}
		return {
			protocol : match[1],
			page : match[2],
			domain : match[3]
		};
	}
};

window.addEvent("domready", function () {
	// waitForInitをメッセージングで実行
	chrome.runtime.sendMessage({cmd: "waitForInit"}, function(){
		// getSettingsをメッセージングで取得
		chrome.runtime.sendMessage({cmd: "getSettings"}, function(response){
			var settingsData = response ? response.settings : {};

			// Store APIのモックを作成
			var mockStore = {
				_data: settingsData,
				changedListeners: {},
				get: function(key) {
					return this._data[key];
				},
				set: function(key, value) {
					this._data[key] = value;
					// バックグラウンドに設定を送信
					chrome.runtime.sendMessage({cmd: "setSetting", key: key, value: value});
				},
				addListener: function(name, fn) {
					this.changedListeners[name] = fn;
				},
				toObject: function() {
					return this._data;
				}
			};

			// chrome.storage.onChangedリスナーで他のタブからの変更を検知
			chrome.storage.onChanged.addListener(function(changes, namespace){
				if( namespace === "sync" ){
					for( var key in changes ){
						var newv = changes[key].newValue;
						if( mockStore.changedListeners[key] ){
							var isDefault = (newv === undefined);
							mockStore.changedListeners[key](newv, isDefault);
						}
						if( newv !== undefined ){
							mockStore._data[key] = newv;
						}
					}
				}
			});

		    new FancySettings.initWithManifest(mockStore, function (settings) {
		    	// ignorePages validation
		    	settings.manifest.ignorePages.addEvent("validate", function(value, callback){
		    		var urls = value;
		    		var validated = [];
		    		for( var i =0; i < urls.length; ++i ){
		    			var m = urlMatcher(urls[i]);
		    			if( m && m.page && ! validated.contains(m.page) ){
		    				validated.push(m.page);
		    			}
		    		}
		    		callback(validated);
		    	});
		    	settings.manifest.ignoreDomains.addEvent("validate", function(value, callback){
		    		var urls = value;
		    		var validated = [];
		    		for( var i =0; i < urls.length; ++i ){
		    			var m = urlMatcher(urls[i]);
		    			if( m && m.domain && ! validated.contains(m.domain) ){
		    				validated.push(m.domain);
		    			}
		    		}
		    		callback(validated);
		    	});
		    	chrome.runtime.sendMessage({cmd: "getSyms"}, function(response){
		    		var syms = response ? response.syms : [];
			    	var replaceSymOptions = settings.create({
			            "tab": i18n.get("details"),
			            "group": i18n.get("replace"),
			            "name": "replaceSymOptions",
			            "type": "checkboxTable",
			            "count": syms.length,
			            "label": syms
			    	});
			    	settings.manifest.replaceSymOptions = replaceSymOptions;
			    	if(!settings.manifest.replace_sym.get()){
						settings.manifest.replaceSymOptions.container.addClass("disabled");
			    		settings.manifest.replaceSymOptions.elements.each(function(elm){
			    			elm.set("disabled","disabled");
			    		});
			    	}
			    	settings.manifest.replace_sym.addEvent("action", function(checked){
			    		if( checked ){
			    			settings.manifest.replaceSymOptions.container.removeClass("disabled");
			   	    		settings.manifest.replaceSymOptions.elements.each(function(elm){
			   	    			elm.erase("disabled");
			   	    		});
			    		}else{
			    			settings.manifest.replaceSymOptions.container.addClass("disabled");
			   	    		settings.manifest.replaceSymOptions.elements.each(function(elm){
			   	    			elm.set("disabled","disabled");
			   	    		});
			    		}
			    	});
			    	settings.manifest.replaceSymOptions.addEvent("action", function(values){
			    		// updateSettingsをメッセージングで実行
			    		chrome.runtime.sendMessage({cmd: "updateSettings", symValues: this.get()});
			    	});

			    	if( !settings.manifest.replace_space.get() ){
			    		settings.manifest.keepHeadingMBSpace.container.addClass("disabled");
			    		settings.manifest.keepHeadingMBSpace.element.set("disabled","disabled");
			    	}
			    	settings.manifest.replace_space.addEvent("action", function(checked){
			    		if( checked ){
			        		settings.manifest.keepHeadingMBSpace.container.removeClass("disabled");
			        		settings.manifest.keepHeadingMBSpace.element.erase("disabled");
			    		}else{
			        		settings.manifest.keepHeadingMBSpace.container.addClass("disabled");
			        		settings.manifest.keepHeadingMBSpace.element.set("disabled","disabled");
			    		}
			    	});

			    	settings.manifest.keepHeadingMBSpace.container.setStyles({
			    		marginLeft:"32px"
			    	});
			    	settings.manifest.supportHttps.label.innerHTML += '<span class="beta">[Beta]</span>';
			    	settings.manifest.supportAjax.label.innerHTML += '<span class="beta">[Beta]</span>';
			    	settings.manifest.keepHeadingMBSpace.label.innerHTML += '<span class="beta">[Beta]</span>';
		    	});

		    }, this.extraTypes );
		});
	}.bind(this));
});
