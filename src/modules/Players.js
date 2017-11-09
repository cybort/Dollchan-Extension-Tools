/* ==[ Players.js ]===========================================================================================
                                          PLAYERS / LINKS EMBEDDERS
                                youtube, vimeo, mp3, vocaroo embedding players
=========================================================================================================== */

class Videos {
	constructor(post, player = null, playerInfo = null) {
		this.currentLink = null;
		this.hasLinks = false;
		this.linksCount = 0;
		this.loadedLinksCount = 0;
		this.playerInfo = null;
		this.post = post;
		this.titleLoadFn = null;
		this.vData = [[], []];
		if(player && playerInfo) {
			Object.defineProperty(this, 'player', { value: player });
			this.playerInfo = playerInfo;
		}
	}
	static addPlayer(el, m, isYtube, enableJsapi = false) {
		let txt;
		if(isYtube) {
			const list = m[0].match(/list=[^&#]+/);
			txt = `<iframe class="de-video-player" src="https://www.youtube.com/embed/${ m[1] }?start=` +
				(m[2] ? m[2] * 3600 : 0) + (m[3] ? m[3] * 60 : 0) + (m[4] ? +m[4] : 0) +
				(enableJsapi ? '&enablejsapi=1' : Cfg.addYouTube === 3 ? '&autoplay=1' : '') +
				(list ? '&' + list[0] : '') + (Cfg.YTubeType === 1 ?
					'&html5=1" type="text/html"' : '" type="application/x-shockwave-flash"') +
				' frameborder="0" allowfullscreen="1"></iframe>';
		} else {
			const id = m[1] + (m[2] ? m[2] : '');
			txt = Cfg.YTubeType === 1 ?
				`<iframe class="de-video-player" src="${ aib.prot }//player.vimeo.com/video/${ id }` +
					(Cfg.addYouTube === 3 ? '?autoplay=1' : '') +
					'" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>' :
				'<embed class="de-video-player" type="application/x-shockwave-flash" src="' + aib.prot +
					'//vimeo.com/moogaloop.swf?clip_id=' + id + (Cfg.addYouTube === 3 ? '&autoplay=1' : '') +
					'&server=vimeo.com&color=00adef&fullscreen=1" ' +
					'allowscriptaccess="always" allowfullscreen="true"></embed>';
		}
		el.innerHTML = txt + (enableJsapi ? '' :
			`<span class="de-video-resizer" title="${ Lng.expandVideo[lang] }"></span>`);
		$show(el);
		if(!enableJsapi) {
			el.lastChild.onclick = ({ target }) => target.parentNode.classList.toggle('de-video-expanded');
		}
	}
	static setLinkData(link, [title, author, views, publ, duration]) {
		link.textContent = title;
		link.classList.add('de-video-title');
		link.setAttribute('de-author', author);
		link.title = (duration ? Lng.duration[lang] + duration : '') +
			(publ ? ', ' + Lng.published[lang] + publ + '\n' : '') +
			Lng.author[lang] + author + (views ? ', ' + Lng.views[lang] + views : '');
	}
	get player() {
		const { post } = this;
		const val = aib.insertYtPlayer(post.msg, '<div class="de-video-obj' +
			(post.images.hasAttachments && !post.isOp ? ' de-video-obj-inline' : '') + '"></div>');
		Object.defineProperty(this, 'player', { value: val });
		return val;
	}
	addLink(m, loader, link, isYtube) {
		this.hasLinks = true;
		this.linksCount++;
		if(this.playerInfo === null) {
			if(Cfg.addYouTube === 2) {
				this.addPlayer(m, isYtube);
			} else if(Cfg.addYouTube > 2) {
				this._addThumb(m, isYtube);
			}
		} else if(!link && $q(`.de-video-link[href*="${ m[1] }"]`, this.post.msg)) {
			return;
		}
		let dataObj;
		if(loader && (dataObj = Videos._global.vData[isYtube ? 0 : 1][m[1]])) {
			this.vData[isYtube ? 0 : 1].push(dataObj);
		}
		let time;
		[time, m[2], m[3], m[4]] = Videos._fixTime(m[4], m[3], m[2]);
		if(link) {
			link.href = link.href.replace(/^http:/, 'https:');
			if(time) {
				link.setAttribute('de-time', time);
			}
			link.className = 'de-video-link ' + (isYtube ? 'de-ytube' : 'de-vimeo');
		} else {
			const src = isYtube ?
				aib.prot + '//www.youtube.com/watch?v=' + m[1] + (time ? '#t=' + time : '') :
				aib.prot + '//vimeo.com/' + m[1];
			link = $bEnd(this.post.msg, '<p class="de-video-ext"><a class="de-video-link ' +
				(isYtube ? 'de-ytube' : 'de-vimeo') + (time ? '" de-time="' + time : '') +
				`" href="${ src }">${ dataObj ? '' : src }</a></p>`).firstChild;
		}
		if(dataObj) {
			Videos.setLinkData(link, dataObj);
		}
		if(this.playerInfo === null || this.playerInfo === m) {
			this.currentLink = link;
		}
		link.videoInfo = m;
		if(loader && !dataObj) {
			loader.run([link, isYtube, this, m[1]]);
		}
	}
	addPlayer(m, isYtube) {
		this.playerInfo = m;
		Videos.addPlayer(this.player, m, isYtube);
	}
	clickLink(el, mode) {
		const m = el.videoInfo;
		if(this.playerInfo !== m) {
			this.currentLink.classList.remove('de-current');
			this.currentLink = el;
			if(mode > 2) {
				this._addThumb(m, el.classList.contains('de-ytube'));
			} else {
				el.classList.add('de-current');
				this.addPlayer(m, el.classList.contains('de-ytube'));
			}
			return;
		}
		if(mode === 3) {
			if($q('.de-video-thumb', this.player)) {
				el.classList.add('de-current');
				this.addPlayer(m, el.classList.contains('de-ytube'));
			} else {
				el.classList.remove('de-current');
				this._addThumb(m, el.classList.contains('de-ytube'));
			}
		} else {
			el.classList.remove('de-current');
			$hide(this.player);
			this.player.innerHTML = '';
			this.playerInfo = null;
		}
	}
	updatePost(oldLinks, newLinks, cloned) {
		const loader = !cloned && Videos._getTitlesLoader();
		let j = 0;
		for(let i = 0, len = newLinks.length; i < len; ++i) {
			const el = newLinks[i];
			const link = oldLinks[j];
			if(link && link.classList.contains('de-current')) {
				this.currentLink = el;
			}
			if(cloned) {
				el.videoInfo = link.videoInfo;
				j++;
			} else {
				const m = el.href.match(Videos.ytReg);
				if(m) {
					this.addLink(m, loader, el, true);
					j++;
				}
			}
		}
		this.currentLink = this.currentLink || newLinks[0];
		if(loader) {
			loader.complete();
		}
	}

	static _fixTime(seconds = 0, minutes = 0, hours = 0) {
		if(seconds >= 60) {
			minutes += Math.floor(seconds / 60);
			seconds %= 60;
		}
		if(minutes >= 60) {
			hours += Math.floor(seconds / 60);
			minutes %= 60;
		}
		return [
			(hours ? hours + 'h' : '') +
			(minutes ? minutes + 'm' : '') +
			(seconds ? seconds + 's' : ''),
			hours, minutes, seconds
		];
	}
	static _getYTInfoAPI(info, num, id) {
		return $ajax(
			`https://www.googleapis.com/youtube/v3/videos?key=${ Cfg.ytApiKey }&id=${ id }` +
			'&part=snippet,statistics,contentDetails&fields=items/snippet/title,items/snippet/publishedAt,' +
			'items/snippet/channelTitle,items/statistics/viewCount,items/contentDetails/duration',
			null, false
		).then(xhr => {
			const items = JSON.parse(xhr.responseText).items[0];
			return Videos._titlesLoaderHelper(
				info, num,
				items.snippet.title,
				items.snippet.channelTitle,
				items.statistics.viewCount,
				items.snippet.publishedAt.substr(0, 10),
				items.contentDetails.duration.substr(2).toLowerCase());
		}).catch(() => Videos._getYTInfoOembed(info, num, id));
	}
	static _getYTInfoOembed(info, num, id) {
		return (nav.isGM ?
			$ajax(`https://www.youtube.com/oembed?url=http%3A//youtube.com/watch%3Fv%3D${ id }&format=json`,
				null, false) :
			$ajax(`https://noembed.com/embed?url=http%3A//youtube.com/watch%3Fv%3D${ id }&callback=?`)
		).then(xhr => {
			const json = JSON.parse(xhr.responseText);
			return Videos._titlesLoaderHelper(info, num, json.title, json.author_name, null, null, null);
		}).catch(() => Videos._titlesLoaderHelper(info, num));
	}
	static _getTitlesLoader() {
		return Cfg.YTubeTitles && new TasksPool(4, function(num, info) {
			const [, isYtube,, id] = info;
			if(isYtube) {
				return Videos[Cfg.ytApiKey ? '_getYTInfoAPI' : '_getYTInfoOembed'](info, num, id);
			}
			return $ajax(`${ aib.prot }//vimeo.com/api/v2/video/${ id }.json`, null, false).then(xhr => {
				const entry = JSON.parse(xhr.responseText)[0];
				return Videos._titlesLoaderHelper(
					info, num,
					entry.title,
					entry.user_name,
					entry.stats_number_of_plays,
					(/(.*)\s(.*)?/.exec(entry.upload_date))[1],
					Videos._fixTime(entry.duration)[0]);
			}).catch(() => Videos._titlesLoaderHelper(info, num));
		}, () => (sesStorage['de-videos-data2'] = JSON.stringify(Videos._global.vData)));
	}
	static _titlesLoaderHelper([link, isYtube, videoObj, id], num, ...data) {
		if(data.length !== 0) {
			Videos.setLinkData(link, data);
			Videos._global.vData[isYtube ? 0 : 1][id] = data;
			videoObj.vData[isYtube ? 0 : 1].push(data);
			if(videoObj.titleLoadFn) {
				videoObj.titleLoadFn(data);
			}
		}
		videoObj.loadedLinksCount++;
		// Wait for 3 sec every 30 links
		if(num % 30 === 0) {
			return Promise.reject(new TasksPool.PauseError(3e3));
		}
		return sleep(250);
	}
	_addThumb(m, isYtube) {
		const el = this.player;
		this.playerInfo = m;
		$show(el);
		const str = `<a class="de-video-player" href="${ aib.prot }`;
		if(isYtube) {
			el.innerHTML = `${ str }//www.youtube.com/watch?v=${ m[1] }" target="_blank">` +
				`<img class="de-video-thumb de-ytube" src="https://i.ytimg.com/vi/${ m[1] }/0.jpg"></a>`;
			return;
		}
		el.innerHTML = `${ str }//vimeo.com/${ m[1] }" target="_blank">` +
			'<img class="de-video-thumb de-vimeo" src=""></a>';
		$ajax(`${ aib.prot }//vimeo.com/api/v2/video/${ m[1] }.json`, null, false).then(xhr => {
			try {
				el.firstChild.firstChild.setAttribute('src', JSON.parse(xhr.responseText)[0].thumbnail_large);
			} catch(e) {}
		});
	}
}
Videos.ytReg =
	/^https?:\/\/(?:www\.|m\.)?youtu(?:be\.com\/(?:watch\?.*?v=|v\/|embed\/)|\.be\/)([a-zA-Z0-9-_]+).*?(?:t(?:ime)?=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?)?$/;
Videos.vimReg =
	/^https?:\/\/(?:www\.)?vimeo\.com\/(?:[^?]+\?clip_id=|.*?\/)?(\d+).*?(#t=\d+)?$/;
Videos._global = {
	get vData() {
		let val;
		try {
			sesStorage.removeItem('de-videos-data1');
			val = Cfg.YTubeTitles ? JSON.parse(sesStorage['de-videos-data2'] || '[{}, {}]') : [{}, {}];
		} catch(e) {
			val = [{}, {}];
		}
		Object.defineProperty(this, 'vData', { value: val });
		return val;
	}
};

class VideosParser {
	constructor() {
		this._loader = Videos._getTitlesLoader();
	}
	end() {
		if(this._loader) {
			this._loader.complete();
		}
	}
	parse(data) {
		const isPost = data instanceof AbstractPost;
		const loader = this._loader;
		let links = $Q('a[href*="youtu"]', isPost ? data.el : data);
		for(let i = 0, len = links.length; i < len; ++i) {
			const link = links[i];
			const m = link.href.match(Videos.ytReg);
			if(m) {
				const mPost = isPost ? data : aib.getPostOfEl(link);
				if(mPost) {
					mPost.videos.addLink(m, loader, link, true);
				}
			}
		}
		if(Cfg.addVimeo) {
			links = $Q('a[href*="vimeo.com"]', isPost ? data.el : data);
			for(let i = 0, len = links.length; i < len; ++i) {
				const link = links[i];
				const m = link.href.match(Videos.vimReg);
				if(m) {
					var mPost = isPost ? data : aib.getPostOfEl(link);
					if(mPost) {
						mPost.videos.addLink(m, loader, link, false);
					}
				}
			}
		}
		const vids = aib.fixVideo(isPost, data);
		for(let i = 0, len = vids.length; i < len; ++i) {
			const [pst, m, isYtube] = vids[i];
			if(pst) {
				pst.videos.addLink(m, loader, null, isYtube);
			}
		}
		return this;
	}
}

// Embed .mp3 and Vocaroo links
function embedMediaLinks(data) {
	const isPost = data instanceof AbstractPost;
	if(Cfg.addMP3) {
		const els = $Q('a[href*=".mp3"]', isPost ? data.el : data);
		for(let i = 0, len = els.length; i < len; ++i) {
			const link = els[i];
			if((link.target !== '_blank' && link.rel !== 'nofollow') || !link.pathname.includes('.mp3')) {
				continue;
			}
			const src = link.href;
			const el = (isPost ? data : aib.getPostOfEl(link)).mp3Obj;
			if(nav.canPlayMP3) {
				if(!$q(`audio[src="${ src }"]`, el)) {
					el.insertAdjacentHTML('beforeend',
						`<p><audio src="${ src }" preload="none" controls></audio></p>`);
				}
			// Flash plugin for old browsers that not support HTML5 audio
			} else if(!$q('object[FlashVars*="' + src + '"]', el)) {
				el.insertAdjacentHTML('beforeend', '<object data="' +
					'http://junglebook2007.narod.ru/audio/player.swf" type="application/x-shockwave-flash" ' +
					'wmode="transparent" width="220" height="16" FlashVars="playerID=1&amp;' +
					'bg=0x808080&amp;leftbg=0xB3B3B3&amp;lefticon=0x000000&amp;rightbg=0x808080&amp;' +
					'rightbghover=0x999999&amp;rightcon=0x000000&amp;righticonhover=0xffffff&amp;' +
					'text=0xffffff&amp;slider=0x222222&amp;track=0xf5f5dc&amp;border=0x666666&amp;' +
					'loader=0x7fc7ff&amp;loop=yes&amp;autostart=no&amp;soundFile=' + src + '"><br>');
			}
		}
	}
	if(Cfg.addVocaroo) {
		const els = $Q('a[href*="vocaroo.com"]', isPost ? data.el : data);
		for(let i = 0, len = els.length; i < len; ++i) {
			const link = els[i];
			const el = link.previousSibling;
			if(!el || el.className !== 'de-vocaroo') { // Don't embed already embedded links
				link.insertAdjacentHTML('beforebegin', `<div class="de-vocaroo">
					<embed src="http://vocaroo.com/player.swf?playMediaID=` + link.href.split('/').pop() +
						`" width="148" height="44" wmode="transparent" type="application/x-shockwave-flash">
				</div>`);
			}
		}
	}
}
