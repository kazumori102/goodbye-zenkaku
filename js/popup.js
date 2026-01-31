$(function(){
	// 設定ボタンのクリックハンドラー
	$(".setting").click(function(){
		chrome.runtime.sendMessage({cmd: "showOptionPage"});
	});

	// 現在のタブ情報を取得
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
		if(!tabs || tabs.length === 0) return;

		var tab = tabs[0];

		// tabStatusとurlMatcherを並行取得
		chrome.runtime.sendMessage({cmd: "getTabStatus", tabId: tab.id}, function(response){
			var tabStatusData = response ? response.tabStatus : null;
			chrome.runtime.sendMessage({cmd: "urlMatcher", url: tab.url}, function(response2){
				var match = response2 ? response2.match : null;

				if( !match ){
					return;
				}

				var siteStatus = tabStatusData ? tabStatusData.siteStatus : "ENABLE";
				var status = tabStatusData ? tabStatusData.status : "";

				// ステータス表示
				$("#status_ph").text(status);

				// メニューアイテム追加のヘルパー関数
				function addItem(text, cmd, params){
					$("<div>").addClass("item selectable")
					.append('<div class="arrow">')
					.append('<div class="text">'+text+'</div>')
					.appendTo(".items")
					.click(function(){
						chrome.runtime.sendMessage(Object.assign({cmd: cmd}, params), function(){
							chrome.tabs.reload(tab.id);
							window.close();
						});
					});
				}

				switch(siteStatus){
				case "ENABLE":
					addItem("このページでの半角変換を無効にする", "addIgnorePage", {
						page: match.page
					});
					addItem('このドメイン('+match.domain+')での半角変換を無効にする', "addIgnoreDomain", {
						domain: match.domain
					});
					addItem("このページの全角英数を強調表示する", "setHighlight", {
						page: match.page, enable: true
					});
					break;
				case "HIGHLIGHT":
					addItem("全角英数の強調表示を終了する", "setHighlight", {
						page: match.page, enable: false
					});
					break;
				case "IGNORE_PAGE":
					addItem("このページでの半角変換を有効にする", "removeIgnorePage", {
						page: match.page
					});
					break;
				case "IGNORE_DOMAIN":
					addItem('このドメイン('+match.domain+')での半角変換を有効にする', "removeIgnoreDomain", {
						domain: match.domain
					});
					break;
				}
			});
		});
	});
});
