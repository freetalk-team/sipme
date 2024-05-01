
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files'
	, DRIVE_API_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
	, DRIVE_URL = 'https://drive.google.com';

const PHOTO_API_URL = 'https://photoslibrary.googleapis.com';

const API_KEY = Config.gapi ? Config.gapi.key : Config.gapiKey;

	
const GoogleApiMixin = {

	async startGoogleAPI() {

		// await this.google.listAlbums();
		//await this.google.refreshToken();

		return;

		const config = Config.gapi;

		if (!config) {
			console.error('Failed to start GAPI, no config');
			return;
		}

		// Old API !!!
		gapi.load('client', async () => {

			const clientId = Config.gapi.id;
			const apiKey = Config.gapi.key;
			const scope = 'profile contacts';

			console.debug('GAPI ID:', clientId);
			console.debug('GAPI KEY', apiKey);

			try {

				await gapi.client.init({ apiKey, clientId, scope });
	
				console.log('Setting access token:', this.accessToken);
				gapi.client.setToken({ access_token: this.accessToken });
	
				const res = await gapi.client.request({
					//'path': 'https://people.googleapis.com/v1/people/me?requestMask.includeField=person.names',
					'path': 'https://people.googleapis.com/v1/people/me/connections?personFields=names,nicknames,emailAddresses,phoneNumbers,photos,birthdays,sipAddresses',
					// 'path': 'https://people.googleapis.com/v1/people/me/connections',
				  });
	
				console.log('Got reponse', res);
			}
			catch (e) {
				console.error('Gapi failed:', e);
			}
		});
		
	}

	, google: {

		signOut() {
			this.token = null;
		}

		, async contacts() {

			const url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,photos';
			const contacts = [];

			try {

				const accessToken = await this.refreshToken();

				if (!accessToken)
					throw new Error('GAPI: No access token');

				const headers = {
					'authorization': `Bearer ${accessToken}`
					, 'accept': 'application/json'
				};

				const res = await ajax.get(url, headers);

				if (res.connections) {
					for (const i of res.connections) {

						const data = {};

						data.name = i.names[0].displayName;

						if (i.photos)
							data.photo = i.photos[0].url;

						if (!i.emailAddresses) {
							console.debug('GAPI skiping contact without email:', name);
							continue;
						}

						for (const email of i.emailAddresses) {

							// todo: add more domains ???
							if (email.value.endsWith('gmail.com')) {
								data.email = email.value;
								break;
							}
						}

						if (!data.email) {
							console.debug('GAPI skiping contact with non gmail address:', name);
							continue;
						}

						contacts.push(data);
					}
				}
			}
			catch (e) {
				console.error('GAPI Failed to load contacts:', e);
			}

			return contacts;
		}

		, async files() {

			// not working. return 403
			try {
				const response = await gapi.client.drive.files.list({
				  'pageSize': 10,
				  'fields': 'files(id, name)',
				});

				console.debug('GAPI ls got result:', response);

			  } catch (err) {
				console.error('GAPI FAILED to list files', this.token, err);
				return;
			  }
		}

		, async upload(content, type, name, onupdate) {

			//this.files();

			if (!onupdate) {
				if (typeof type == 'function') onupdate = type;
				else if (typeof name == 'function') onupdate = name;
			}

			if (content instanceof Blob) {
				type = content.type;
				
				if (content instanceof File)
					name = content.name;

			} else {
				type = fileX.getMimeType(type)
				content = new Blob([content], { type });
			}

			// todo: load pub dir
			// const pubdir = '1ic3Lw0hFedwd03QCpTBqwzM0CF3f9zIi';
			const pubdir = app.drivePublicDir;

			const metadata = { name, mimeType: type, 
				// TODO [Optional]: Set the below credentials
				// Note: remove this parameter, if no target is needed
				// 'parents': ['pub'], // Folder ID at Google Drive which is optional
				parents: [pubdir]
			};

			console.debug('DRIVE metadata', metadata);

			const url = DRIVE_API_UPLOAD_URL;
			const accessToken = await this.refreshToken();

			type = fileX.getType(type);

			return new Promise((resolve, reject) => {

				// var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
				//var accessToken = app.accessToken; // Here gapi is used for retrieving the access token.
				var form = new FormData();
				form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
				form.append('file', content);

				var xhr = new XMLHttpRequest();
				xhr.open('post', url);
				xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
				xhr.responseType = 'json';
				xhr.onload = () => {

					const res = xhr.response;

					if (res.error) {
						reject(res.error);
						return;
					}

					console.log('### FILE uploaded successfully', res);
					//document.getElementById('content').innerHTML = "File uploaded successfully. The Google Drive file id is <b>" + xhr.response.id + "</b>";
					//document.getElementById('content').style.display = 'block';

					if (onupdate)
						onupdate(res);

					const url = `drive://${res.id}?type=${type}`;

					resolve(url);
				};


				xhr.send(form);
			});
		}

		, async getDirectoryId(name) {

			const accessToken = await this.refreshToken();

			const q = `parents in 'root' and mimeType = 'application/vnd.google-apps.folder' and name ='${name}'`;

			// `https://www.googleapis.com/drive/v3/files?q=parents%20in%20%27root%27%20and%20mimeType%20%3D%20%27application%2Fvnd.google-apps.folder%27%20and%20name%20%3D%27${name}%27`;
			const url = DRIVE_API_URL + '?q=' + encodeURIComponent(q);
			const info = await ajax.token(accessToken).get(url);

			const id = info.files.length > 0 ? info.files[0].id : null;
			console.debug('DRIVE PUBLIC DIR:', id);

			return id;
		}

		, async refreshToken(now=Date.now()) {

			if (!this.token) {

				this.token = { 
					token: app.user.accessToken,
					expire: app.user.accessTokenExpire
				}
			}

			if (!this.token.token || this.token.expire < now) {
				console.debug('GAPI: Requesting new access token');

				const req = {};
				if (app.loggedIn)
					req.uid = app.uid;

				this.token = await ajax.post('/auth/refresh', req);

				// if (gapi) {
				// 	// gapi.client.setToken({ access_token: this.token.token });
				// 	gapi.client.setToken(this.token.token);
				// }
			}

			console.debug('Token expires in:', Math.ceil((this.token.expire - now) / 60000), 'min');
			// console.debug('#', now, this.token);

			return this.token.token;
		}

		, viewLink(id) {
			return DRIVE_URL + `/file/d/$id}/view`;
		}

		, async loadImage(id, size=600) {

			let src;

			const params = new URLSearchParams;

			params.set('fields', 'thumbnailLink');
			params.set('key', API_KEY);

			const url = DRIVE_API_URL + '/' + id + '?' + params.toString();
			console.debug('GAPI Image load request:', url);

			try {
				const res = await ajax.get(url);
				src = res.thumbnailLink;

				// changing resolution
				const i = src.lastIndexOf('=');
				if (i != -1)
					src = src.slice(0, i);

				src += `=s${size}`;
			}
			catch (e) {
				console.error('Failed to load image from Google Drive', id);
			}

			return src;
		}

		, async createAlbum(name, share=true) {

			try {

				const token = await this.refreshToken();
				const info = await ajax.token(token).post(PHOTO_API_URL + '/v1/albums', { album: { title: 'sipme' } });

				console.debug('Album created', info);
			}
			catch (e) {
				console.error('Failed to create Photo library album', e);
			}

		}

		, async listAlbums() {
			let info;

			try {

				const token = await this.refreshToken();

				info = await ajax.token(token).get(PHOTO_API_URL + '/v1/albums');

				console.debug('Albums', info);
			}
			catch (e) {
				console.error('Failed to create Photo library album', e);
			}

			return info;
		}

		, async uploadPhoto(blob) {

			let url;

			try {

				const token = await this.refreshToken();

				const headers = { 
					'Content-type': 'application/octet-stream',
					// 'X-Goog-Upload-Content-Type': fileX.getMimeType(type),
					'X-Goog-Upload-Content-Type': blob.type,
					'X-Goog-Upload-Protocol': 'raw'
				};

				const { post, post2, options } = ajax.token(token);

				const uploadToken = await post('https://photoslibrary.googleapis.com/v1/uploads', blob, headers);

				console.debug('Image uploaded token:', uploadToken);

				// await options('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreat', {
				// 	'Access-Control-Request-Method': 'POST',
				// 	'Access-Control-Request-Headers': 'X-PINGOTHER, Content-Type'
				// });

				const r = await post('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', { newMediaItems: [ {
					description: "item-description",
					simpleMediaItem: {
						fileName: blob.name,
						uploadToken
					}
				}]});

				console.debug('Media item created:', r);

				const { mediaItem } = r.newMediaItemResults[0];

				url = mediaItem.productUrl;


			}
			catch (e) {
				console.error('Failed to upload image', e);
			}

			return url;
		}
	} 

}



export { GoogleApiMixin }
