
export class CommentBottom {

	static from(container) {
		const e = container.classList.contains('bottom') ? container : container.querySelector('.comment-bottom');
		return new CommentBottom(e);
	}

	static render(data) {

		const e = dom.renderTemplate('channel-comment-bottom', data);
		return e;
	}

	#container;

	constructor (container) {
		this.#container = container;
	}

	get count() {
		const e = this.#container.querySelector('.replies > [data-count]');
		return e && e.dataset.count ? parseInt(e.dataset.count) : 0;
	}

	addComments(comments) {
		this.#container.appendChild(comments.container);
	}

	addComment(user) {

		console.debug('Comments BOTTOM: add comment');

		let replies = this.#container.querySelector('.replies');

		if (replies) {
			

			const e = replies.querySelector('[data-total]');

			const total = parseInt(e.dataset.total) + 1;
			e.dataset.total = total;
			e.dataset.count = count(total);

			const avatars = replies.querySelector('.avatars');
			const photos = avatars.querySelectorAll('img.photo');

			if (photos.length < 2) {

				const imgs = [];
				for (const i of photos) imgs.push(i.src.hashCode());

				if (!imgs.includes(user.photo.hashCode())) {
					const img = dom.createElement('img', 'photo');
					img.src = user.photo;

					if (photos.length > 0)
						avatars.insertBefore(img, photos[0]);
					else
						avatars.appendChild(img);
				}
			}
			else {

				// todo:
			}
		}
		else {

			const data = {
				count: 1,
				recent: [user]
			};

			replies = this.updateReplies(data);
		}

		dom.highlightElement(replies);
	}

	addLike(type) {

		console.debug('Comment bottom adding like:', type);

		// todo: add like
		this.disableLike(type);

		let e = this.#container.querySelector('.likes');

		if (e) {

			const icons = e.querySelectorAll('i.fa[value]');
			const emos = Array.from(icons).map(i => i.getAttribute('value'));

			if (!emos.includes(type)) {
				const ico = dom.createElement('i', 'fa');
				ico.setAttribute('value', type);

				if (['like', 'love'].includes(type))
					ico.classList.add('w3-circle');

				e.insertBefore(ico, e.firstElementChild);
			}

			e.dataset.count = incrementCount(e.dataset.count);
		}
		else {

			const data = { l: 0, o: 0, s: 0, u: 0 };
			data[getLikeId(type)]++;

			e = this.updateLikes(data);
		}

		dom.highlightElement(e);

		// const likebtn = this.#container.querySelector('button[name="like"]');
		// if (likebtn) {

		// }
	}

	updateReplies(replies) {
		if (replies.count == 0) return;

		console.debug('Comments BOTTOM: update replies');

		let e = this.#container.querySelector(':scope > .replies');
		if (e) dom.removeElement(e);

		// console.log('Updating replies:', replies);

		e = dom.renderTemplate('channel-comment-replies', replies, 'span');
		this.#container.appendChild(e);

		return e;
	}

	updateLikes(data) {
		console.debug('Comment BOTTOM updating likes:', data);

		let e = this.#container.querySelector(':scope > .likes');
		if (e) dom.removeElement(e);
		else console.debug('> Likes not found !');

		// console.log('Updating likes:', data);

		e = dom.renderTemplate('channel-comment-likes', data, 'b');
		e.dataset.count = count(data);
		this.#container.appendChild(e);

		return e;
	}

	update(m) {
		if (m.likes) 	this.updateLikes(m.likes);
		if (m.replies) 	this.updateReplies(m.replies);

		if (m.like) {
			const kLikes = { l: 'like', o: 'love', u: 'laugh', s: 'sad' };
			this.disableLike(kLikes[m.like]);
		}

		dom.highlightElement(this.#container);
	}

	disableLike(value='like') {
		const btn = this.#container.querySelector('button[name="like"]');
		btn.disabled = true;
		btn.value = value;

		const reaction = btn.querySelector('.reaction');
		if (reaction) dom.removeElement(reaction);
	}

}

function incrementCount(n) {
	if (!n) return 1;
	if (/(K|M)$/.test(n)) return n;
	let c = parseInt(n) + 1;
	return c == 1000 ? '1K' : c;
}

export function getLikeId(type) {
	const kLikes = { like: 'l', love: 'o', laugh: 'u', sad: 's' };
	return kLikes[type];
}
