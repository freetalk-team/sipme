
import { VideoEditor } from "./page.js";

// App.Editor.register(VideoEditor);

App.Commands.register('video-call-user', id => app.call(id));
App.Commands.register('video-call-hangup', id => app.hangup());
App.Commands.register('video-toggle-camera', id => app.toggleCamera());
App.Commands.register('video-screen-share', () => {

	app.messenger.startScreenSharing();

});


export default VideoEditor;