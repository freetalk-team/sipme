
import { Fields as CommonFields } from '../settings/fields.js';

const kStatusField = CommonFields.string({
	name: 'status'
	, title: 'Status'

});

const kPhotoField = {
	type: 'photo'
	, name: 'photo'
	, title: 'Avatar'
};

const kProfileFields = [ CommonFields.name, kStatusField, kPhotoField ];

AddEditor.register('profile', {
	title: 'Profile'
	, desc: 'Change photo and nickname'
	, icon: 'profile'
	, items: kProfileFields
	, onAdd(data) {
		app.executeCommand('update-user-profile', data);
		app.cancelEditor();
	}
});

App.Commands.register('update-user-profile', async data => {

	console.debug('UPDATE profile:', data);

	const { photo, ...info } = data;

	const form = new FormData;

	for (const [i, v] of Object.entries(info))
		form.append(i, v);

	// form.append('info', new Blob([JSON.stringify(info)], { type: 'application/json' }));

	if (photo) {


		if (app.firebase) {

			try {
				const url = await app.firebase.uploadPhoto(photo);
				form.append('photo', url);
			}
			catch (e) {
				console.error('Failed to upload photo into Firebase', e);
			}
		}
		else {

			const img = dataURIToBlob(photo);

			form.append('file', img, 'avatar.png');
		}

	}

	try {

		const info = await ajax.post('/api/profile', form);

		await app.updateProfile(info);

	}
	catch (e) {
		console.error('Failed to update profile', e);
	}
});

function dataURIToBlob(dataURI) {
	const splitDataURI = dataURI.split(',')
	const byteString = splitDataURI[0].indexOf('base64') >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1])
	const mimeString = splitDataURI[0].split(':')[1].split(';')[0]

	const ia = new Uint8Array(byteString.length)
	for (let i = 0; i < byteString.length; i++)
		ia[i] = byteString.charCodeAt(i)

	return new Blob([ia], { type: mimeString })
}